import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { format, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns'
import Button from '../ui/Button'
import GoogleCalendarStatus from './GoogleCalendarStatus'
import type { CalendarView } from '../../types/calendar'

interface CalendarHeaderProps {
  view: CalendarView
  onViewChange: (view: CalendarView) => void
  onAddEvent: () => void
  isLoading?: boolean
  onRefresh?: () => void
}

export default function CalendarHeader({ view, onViewChange, onAddEvent, isLoading, onRefresh }: CalendarHeaderProps) {
  const currentDate = new Date(view.currentDate)

  const navigate = (direction: 'prev' | 'next') => {
    const fn = view.type === 'week'
      ? (direction === 'prev' ? subWeeks : addWeeks)
      : (direction === 'prev' ? subMonths : addMonths)
    onViewChange({ ...view, currentDate: fn(currentDate, 1).toISOString() })
  }

  const goToday = () => {
    onViewChange({ ...view, currentDate: new Date().toISOString() })
  }

  const headerLabel = format(currentDate, 'MMMM yyyy')

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Calendar</h1>
          <GoogleCalendarStatus isLoading={isLoading} onRefresh={onRefresh} />
        </div>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Shifts, appointments, and tasks for Robert&apos;s care.
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* View toggle */}
        <div className="flex bg-[var(--color-surface-alt)] rounded-[10px] p-0.5">
          {(['week', 'month'] as const).map((t) => (
            <button
              key={t}
              onClick={() => onViewChange({ ...view, type: t })}
              className={`px-3.5 py-1.5 rounded-[8px] text-xs font-medium capitalize transition-all cursor-pointer ${
                view.type === t
                  ? 'bg-white text-[var(--color-text-primary)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('prev')}
            className="p-1.5 rounded-[8px] hover:bg-[var(--color-surface-alt)] transition-colors cursor-pointer"
          >
            <ChevronLeft size={18} className="text-[var(--color-text-secondary)]" />
          </button>
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] rounded-[8px] transition-colors cursor-pointer"
          >
            Today
          </button>
          <button
            onClick={() => navigate('next')}
            className="p-1.5 rounded-[8px] hover:bg-[var(--color-surface-alt)] transition-colors cursor-pointer"
          >
            <ChevronRight size={18} className="text-[var(--color-text-secondary)]" />
          </button>
        </div>

        <span className="text-sm font-semibold text-[var(--color-text-primary)] min-w-[140px] text-center hidden sm:block">
          {headerLabel}
        </span>

        <Button size="sm" onClick={onAddEvent}>
          <Plus size={16} />
          Add event
        </Button>
      </div>
    </div>
  )
}
