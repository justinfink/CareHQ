import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format, isSameDay, parseISO } from 'date-fns'
import { CalendarDays, ExternalLink, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getMyPrimaryRecipient } from '../api/recipient'
import {
  getGoogleStatus,
  syncGoogleCalendar,
  type GoogleCalendarEvent,
} from '../api/integrations'

function eventStartLabel(e: GoogleCalendarEvent): { date: Date; allDay: boolean } | null {
  if (e.start?.dateTime) return { date: parseISO(e.start.dateTime), allDay: false }
  if (e.start?.date) return { date: parseISO(e.start.date), allDay: true }
  return null
}

export default function WebCalendar() {
  const { user } = useAuth()

  const recipientQuery = useQuery({
    queryKey: ['recipient', user?.id],
    queryFn: () => (user ? getMyPrimaryRecipient(user.id) : Promise.resolve(null)),
    enabled: !!user,
  })

  const statusQuery = useQuery({
    queryKey: ['google_status', recipientQuery.data?.id],
    queryFn: () =>
      recipientQuery.data
        ? getGoogleStatus(recipientQuery.data.id)
        : Promise.resolve({
            calendarConnected: false,
            gmailConnected: false,
            account: null,
            lastSyncAt: null,
            lastSyncCount: null,
          }),
    enabled: !!recipientQuery.data,
  })

  const eventsQuery = useQuery({
    queryKey: ['google_calendar', recipientQuery.data?.id],
    queryFn: () =>
      recipientQuery.data
        ? syncGoogleCalendar(recipientQuery.data.id)
        : Promise.resolve({ events: [] as GoogleCalendarEvent[] }),
    enabled: !!recipientQuery.data && !!statusQuery.data?.calendarConnected,
  })

  const events = eventsQuery.data?.events ?? []

  const grouped: Array<{ day: Date; items: GoogleCalendarEvent[] }> = []
  for (const e of events) {
    const start = eventStartLabel(e)
    if (!start) continue
    const last = grouped[grouped.length - 1]
    if (last && isSameDay(last.day, start.date)) {
      last.items.push(e)
    } else {
      grouped.push({ day: start.date, items: [e] })
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Calendar</h1>
      <p className="text-sm text-[var(--color-text-secondary)] mt-1 mb-6">
        Upcoming appointments, shifts, and reminders the agent is tracking.
      </p>

      {!recipientQuery.data ? (
        <div className="bg-white rounded-lg border border-[var(--color-border-subtle)] p-8 text-center">
          <CalendarDays size={28} className="inline-block text-[var(--color-text-tertiary)] mb-3" />
          <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
            Add a care recipient first
          </p>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            Once you set up the person you're caring for in the Care tab, your
            connected calendars will appear here.
          </p>
        </div>
      ) : !statusQuery.data?.calendarConnected ? (
        <Link
          to="/settings"
          className="block bg-white rounded-lg border border-[var(--color-border-subtle)] p-8 text-center hover:bg-[var(--color-surface-alt)] transition"
        >
          <CalendarDays size={28} className="inline-block text-[var(--color-text-tertiary)] mb-3" />
          <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
            Connect Google Calendar
          </p>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-3">
            Click to head to Settings → Channels → Google. We pull the next 60
            days of events from your primary calendar (read-only).
          </p>
          <div className="inline-block bg-[#0A7B6E] hover:bg-[#0a6a5f] text-white px-4 py-1.5 rounded-md text-sm font-semibold">
            Open Settings
          </div>
        </Link>
      ) : eventsQuery.isLoading ? (
        <div className="bg-white rounded-lg border border-[var(--color-border-subtle)] p-8 text-center">
          <Loader2 className="inline-block animate-spin text-[#0A7B6E]" size={20} />
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-lg border border-[var(--color-border-subtle)] p-8 text-center">
          <CalendarDays size={28} className="inline-block text-[var(--color-text-tertiary)] mb-3" />
          <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
            Nothing on the calendar
          </p>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            No upcoming events from your primary Google Calendar in the next 60
            days.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.day.toISOString()}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)] mb-2">
                {format(group.day, 'EEEE, MMMM d')}
              </h3>
              <div className="space-y-2">
                {group.items.map((e) => {
                  const start = eventStartLabel(e)
                  const end = e.end?.dateTime ? parseISO(e.end.dateTime) : null
                  return (
                    <div
                      key={e.id}
                      className="flex gap-4 bg-white rounded-lg border border-[var(--color-border-subtle)] p-4"
                    >
                      <div className="w-16 shrink-0 text-xs font-medium text-[var(--color-text-tertiary)]">
                        {start?.allDay
                          ? 'All day'
                          : start
                            ? format(start.date, 'h:mm a')
                            : ''}
                        {end && !start?.allDay ? (
                          <div className="mt-0.5">{format(end, 'h:mm a')}</div>
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                          {e.summary || '(no title)'}
                        </div>
                        {e.description ? (
                          <p className="text-sm text-[var(--color-text-secondary)] mt-1 line-clamp-2">
                            {e.description}
                          </p>
                        ) : null}
                        {(e.attendees ?? []).length > 0 ? (
                          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                            {(e.attendees ?? [])
                              .map((a) => a.displayName || a.email)
                              .filter(Boolean)
                              .slice(0, 3)
                              .join(', ')}
                            {(e.attendees ?? []).length > 3 ? ` +${(e.attendees ?? []).length - 3}` : ''}
                          </p>
                        ) : null}
                        {e.hangoutLink ? (
                          <a
                            href={e.hangoutLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#0A7B6E] mt-1"
                          >
                            <ExternalLink size={12} /> Google Meet
                          </a>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {eventsQuery.isError ? (
        <div className="mt-4 bg-[var(--color-status-alert-light,#fef2f2)] rounded-md p-3">
          <p className="text-sm text-[var(--color-status-alert)]">
            {(eventsQuery.error as Error).message}
          </p>
        </div>
      ) : null}
    </div>
  )
}
