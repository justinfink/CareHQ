import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, subDays } from 'date-fns'
import { useGoogleAuth } from '../contexts/GoogleCalendarContext'
import {
  fetchEvents,
  createGoogleEvent,
  updateGoogleEvent,
  deleteGoogleEvent,
} from '../services/googleCalendar'
import type { CalendarEvent } from '../types/calendar'
import { calendarEvents as initialMockEvents } from '../data/mockCalendar'

interface UseCalendarEventsOptions {
  viewType: 'week' | 'month'
  currentDate: Date
}

export function useCalendarEvents({ viewType, currentDate }: UseCalendarEventsOptions) {
  const { isConnected, token, calendarId, isProvisioning } = useGoogleAuth()
  const queryClient = useQueryClient()

  // ── Date range for the visible window ──────────────────────────────
  const { timeMin, timeMax } = useMemo(() => {
    if (viewType === 'week') {
      const start = subDays(startOfWeek(currentDate, { weekStartsOn: 0 }), 1)
      const end = addDays(endOfWeek(currentDate, { weekStartsOn: 0 }), 1)
      return { timeMin: start.toISOString(), timeMax: end.toISOString() }
    } else {
      const start = subDays(startOfMonth(currentDate), 7)
      const end = addDays(endOfMonth(currentDate), 7)
      return { timeMin: start.toISOString(), timeMax: end.toISOString() }
    }
  }, [viewType, currentDate])

  // ── Google Calendar query (uses dedicated CareHQ calendar) ─────────
  const {
    data: googleEvents,
    isLoading: isGoogleLoading,
    error: googleError,
  } = useQuery({
    queryKey: ['gcal-events', calendarId, timeMin, timeMax],
    queryFn: () => fetchEvents(token!, calendarId!, timeMin, timeMax),
    enabled: isConnected && !!token && !!calendarId && !isProvisioning,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message === 'TOKEN_EXPIRED') return false
      return failureCount < 2
    },
  })

  // ── Local fallback state ───────────────────────────────────────────
  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>(initialMockEvents)

  // ── Unified events ─────────────────────────────────────────────────
  const events = isConnected && !isProvisioning ? googleEvents || [] : localEvents
  const isLoading = isConnected ? isGoogleLoading || isProvisioning : false
  const error = isConnected ? googleError : null

  // ── Google Calendar mutations ──────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (event: CalendarEvent) => createGoogleEvent(token!, calendarId!, event),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gcal-events'] }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ eventId, event }: { eventId: string; event: CalendarEvent }) =>
      updateGoogleEvent(token!, calendarId!, eventId, event),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gcal-events'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (eventId: string) => deleteGoogleEvent(token!, calendarId!, eventId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gcal-events'] }),
  })

  // ── Unified CRUD ───────────────────────────────────────────────────

  const saveEvent = useCallback(
    async (event: CalendarEvent, isEdit: boolean) => {
      if (isConnected && token && calendarId) {
        if (isEdit) {
          await updateMutation.mutateAsync({ eventId: event.id, event })
        } else {
          await createMutation.mutateAsync(event)
        }
      } else {
        setLocalEvents((prev) => {
          const idx = prev.findIndex((e) => e.id === event.id)
          if (idx >= 0) {
            const updated = [...prev]
            updated[idx] = event
            return updated
          }
          return [...prev, event]
        })
      }
    },
    [isConnected, token, calendarId, createMutation, updateMutation]
  )

  const removeEvent = useCallback(
    async (eventId: string) => {
      if (isConnected && token && calendarId) {
        await deleteMutation.mutateAsync(eventId)
      } else {
        setLocalEvents((prev) => prev.filter((e) => e.id !== eventId))
      }
    },
    [isConnected, token, calendarId, deleteMutation]
  )

  const refetch = useCallback(() => {
    if (isConnected) {
      queryClient.invalidateQueries({ queryKey: ['gcal-events'] })
    }
  }, [isConnected, queryClient])

  return {
    events,
    isLoading,
    error,
    isConnected,
    saveEvent,
    removeEvent,
    refetch,
    isSaving: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
