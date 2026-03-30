import { useMemo } from 'react'
import { format, startOfWeek, addDays, isToday, parseISO } from 'date-fns'
import { motion } from 'framer-motion'
import type { CalendarEvent } from '../../types/calendar'

interface WeekViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onSlotClick: (date: Date, hour: number) => void
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 6) // 6am to 7pm

function getEventPosition(event: CalendarEvent) {
  const start = parseISO(event.startTime)
  const end = parseISO(event.endTime)
  const startHour = start.getHours() + start.getMinutes() / 60
  const endHour = end.getHours() + end.getMinutes() / 60
  const top = (startHour - 6) * 64 // 64px per hour
  const height = Math.max((endHour - startHour) * 64, 24)
  return { top, height }
}

function EventBlock({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  const { top, height } = getEventPosition(event)
  const start = parseISO(event.startTime)
  const end = parseISO(event.endTime)

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className="absolute left-1 right-1 rounded-[8px] px-2 py-1 text-left overflow-hidden cursor-pointer transition-shadow hover:shadow-md z-10"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: `${event.color}18`,
        borderLeft: `3px solid ${event.color}`,
      }}
    >
      <div className="text-[11px] font-semibold truncate" style={{ color: event.color }}>
        {event.title}
      </div>
      {height > 36 && (
        <div className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">
          {format(start, 'h:mm a')} – {format(end, 'h:mm a')}
        </div>
      )}
      {height > 56 && event.location && (
        <div className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5 truncate">
          {event.location}
        </div>
      )}
    </motion.button>
  )
}

export default function WeekView({ currentDate, events, onEventClick, onSlotClick }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    events.forEach((event) => {
      const dateKey = format(parseISO(event.startTime), 'yyyy-MM-dd')
      if (!map.has(dateKey)) map.set(dateKey, [])
      map.get(dateKey)!.push(event)
    })
    return map
  }, [events])

  return (
    <div className="bg-white rounded-[14px] shadow-[var(--shadow-sm)] overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-[var(--color-border-default)]">
        <div className="p-2" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={`p-3 text-center border-l border-[var(--color-border-subtle)] ${
              isToday(day) ? 'bg-[var(--color-brand-primary-light)]' : ''
            }`}
          >
            <div className="text-[11px] font-medium text-[var(--color-text-tertiary)] uppercase">
              {format(day, 'EEE')}
            </div>
            <div
              className={`text-lg font-semibold mt-0.5 ${
                isToday(day) ? 'text-[var(--color-brand-primary)]' : 'text-[var(--color-text-primary)]'
              }`}
            >
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] overflow-y-auto max-h-[calc(100vh-320px)]">
        {/* Hour labels */}
        <div>
          {HOURS.map((hour) => (
            <div key={hour} className="h-16 flex items-start justify-end pr-2 pt-0">
              <span className="text-[11px] text-[var(--color-text-tertiary)] -translate-y-2">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const dayEvents = eventsByDay.get(dateKey) || []

          return (
            <div
              key={day.toISOString()}
              className={`relative border-l border-[var(--color-border-subtle)] ${
                isToday(day) ? 'bg-[var(--color-brand-primary-light)]/30' : ''
              }`}
            >
              {/* Hour lines */}
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="h-16 border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-alt)]/50 cursor-pointer"
                  onClick={() => onSlotClick(day, hour)}
                />
              ))}

              {/* Events */}
              {dayEvents.map((event) => (
                <EventBlock
                  key={event.id}
                  event={event}
                  onClick={() => onEventClick(event)}
                />
              ))}

              {/* Current time line */}
              {isToday(day) && (
                <div
                  className="absolute left-0 right-0 h-0.5 bg-[var(--color-status-alert)] z-20 pointer-events-none"
                  style={{
                    top: `${(new Date().getHours() + new Date().getMinutes() / 60 - 6) * 64}px`,
                  }}
                >
                  <div className="absolute -left-1 -top-1 w-2.5 h-2.5 rounded-full bg-[var(--color-status-alert)]" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
