import { useState, useCallback } from 'react'
import CalendarHeader from '../components/calendar/CalendarHeader'
import WeekView from '../components/calendar/WeekView'
import MonthView from '../components/calendar/MonthView'
import EventDetailModal from '../components/calendar/EventDetailModal'
import AddEventModal from '../components/calendar/AddEventModal'
import PermissionsPanel from '../components/calendar/PermissionsPanel'
import type { CalendarView, CalendarEvent } from '../types/calendar'
import { useCalendarEvents } from '../hooks/useCalendarEvents'

export default function Calendar() {
  const [view, setView] = useState<CalendarView>({
    type: 'week',
    currentDate: new Date().toISOString(),
  })

  const {
    events,
    isLoading,
    isConnected,
    saveEvent,
    removeEvent,
    refetch,
  } = useCalendarEvents({
    viewType: view.type,
    currentDate: new Date(view.currentDate),
  })

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null)
  const [slotDate, setSlotDate] = useState<Date | undefined>()
  const [slotHour, setSlotHour] = useState<number | undefined>()

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event)
    setDetailOpen(true)
  }, [])

  const handleSlotClick = useCallback((date: Date, hour: number) => {
    setSlotDate(date)
    setSlotHour(hour)
    setEditEvent(null)
    setAddOpen(true)
  }, [])

  const handleDayClick = useCallback((date: Date) => {
    setView({ type: 'week', currentDate: date.toISOString() })
  }, [])

  const handleAddEvent = useCallback(() => {
    setSlotDate(undefined)
    setSlotHour(undefined)
    setEditEvent(null)
    setAddOpen(true)
  }, [])

  const handleSaveEvent = useCallback(
    async (event: CalendarEvent) => {
      const isEdit = !!editEvent
      await saveEvent(event, isEdit)
    },
    [editEvent, saveEvent]
  )

  const handleEditFromDetail = useCallback((event: CalendarEvent) => {
    setDetailOpen(false)
    setEditEvent(event)
    setAddOpen(true)
  }, [])

  const handleDeleteEvent = useCallback(
    async (eventId: string) => {
      await removeEvent(eventId)
      setDetailOpen(false)
    },
    [removeEvent]
  )

  return (
    <div>
      <CalendarHeader
        view={view}
        onViewChange={setView}
        onAddEvent={handleAddEvent}
        isLoading={isLoading}
        onRefresh={refetch}
      />

      {view.type === 'week' ? (
        <WeekView
          currentDate={new Date(view.currentDate)}
          events={events}
          onEventClick={handleEventClick}
          onSlotClick={handleSlotClick}
        />
      ) : (
        <MonthView
          currentDate={new Date(view.currentDate)}
          events={events}
          onEventClick={handleEventClick}
          onDayClick={handleDayClick}
        />
      )}

      <PermissionsPanel />

      <EventDetailModal
        event={selectedEvent}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteEvent}
        isConnected={isConnected}
      />

      <AddEventModal
        open={addOpen}
        onClose={() => {
          setAddOpen(false)
          setEditEvent(null)
        }}
        onSave={handleSaveEvent}
        initialDate={slotDate}
        initialHour={slotHour}
        editEvent={editEvent}
        isConnected={isConnected}
      />
    </div>
  )
}
