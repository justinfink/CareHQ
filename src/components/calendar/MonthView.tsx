import { useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isToday,
  isSameDay,
  parseISO,
} from 'date-fns'
import type { CalendarEvent } from '../../types/calendar'

interface MonthViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onDayClick: (date: Date) => void
}

const typeColors: Record<string, string> = {
  shift: 'bg-[var(--color-brand-primary)]',
  appointment: 'bg-[var(--color-status-info)]',
  task: 'bg-[var(--color-text-secondary)]',
  reminder: 'bg-[var(--color-status-alert)]',
}

export default function MonthView({ currentDate, events, onEventClick, onDayClick }: MonthViewProps) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const days: Date[] = []
  let day = calStart
  while (day <= calEnd) {
    days.push(day)
    day = addDays(day, 1)
  }

  const weeks = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

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
      <div className="grid grid-cols-7 border-b border-[var(--color-border-default)]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="p-3 text-center text-[11px] font-medium text-[var(--color-text-tertiary)] uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-[var(--color-border-subtle)] last:border-b-0">
          {week.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const dayEvents = eventsByDay.get(dateKey) || []
            const inMonth = isSameMonth(day, currentDate)
            const today = isToday(day)

            return (
              <div
                key={day.toISOString()}
                onClick={() => onDayClick(day)}
                className={`min-h-[100px] p-1.5 border-l border-[var(--color-border-subtle)] first:border-l-0 cursor-pointer hover:bg-[var(--color-surface-alt)]/50 transition-colors ${
                  !inMonth ? 'opacity-40' : ''
                } ${today ? 'bg-[var(--color-brand-primary-light)]/40' : ''}`}
              >
                <div
                  className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                    today
                      ? 'bg-[var(--color-brand-primary)] text-white'
                      : 'text-[var(--color-text-primary)]'
                  }`}
                >
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((event) => (
                    <button
                      key={event.id}
                      onClick={(e) => { e.stopPropagation(); onEventClick(event) }}
                      className="w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        backgroundColor: `${event.color}18`,
                        color: event.color,
                      }}
                    >
                      {event.title.split('—')[0].trim()}
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-[var(--color-text-tertiary)] px-1.5">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
