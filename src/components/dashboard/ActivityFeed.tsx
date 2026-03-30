import { useState } from 'react'
import { Pill, PersonStanding, Brain, AlertTriangle, Stethoscope, Calendar, Flag, Activity } from 'lucide-react'
import Badge from '../ui/Badge'
import { useAppStore } from '../../store/useAppStore'
import { formatDistanceToNow, parseISO } from 'date-fns'

const categoryIcons: Record<string, any> = {
  medication: Pill,
  mobility: PersonStanding,
  behavior: Brain,
  cognitive: Brain,
  incident: AlertTriangle,
  medical: Stethoscope,
  coordination: Calendar,
  therapy: Activity,
}

const categoryColors: Record<string, string> = {
  medication: 'text-[var(--color-brand-primary)]',
  mobility: 'text-[var(--color-brand-accent)]',
  behavior: 'text-[var(--color-status-info)]',
  cognitive: 'text-[var(--color-status-info)]',
  incident: 'text-[var(--color-status-alert)]',
  medical: 'text-purple-500',
  coordination: 'text-[var(--color-text-secondary)]',
  therapy: 'text-[var(--color-status-ok)]',
}

export default function ActivityFeed({ limit = 8 }: { limit?: number }) {
  const events = useAppStore((s) => s.events)
  const [showCount, setShowCount] = useState(limit)
  const displayed = events.slice(0, showCount)

  return (
    <div>
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Recent activity</h3>
      <div className="space-y-1">
        {displayed.map((event) => {
          const Icon = categoryIcons[event.category] || Calendar
          const colorClass = categoryColors[event.category] || 'text-[var(--color-text-secondary)]'

          return (
            <div
              key={event.id}
              className={`flex items-start gap-3 px-3 py-3 rounded-[10px] hover:bg-[var(--color-surface-alt)] transition-colors ${
                event.flagged ? 'border-l-[3px] border-[var(--color-status-warning)]' : ''
              }`}
            >
              <div className={`mt-0.5 flex-shrink-0 ${colorClass}`}>
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                      {event.summary}
                    </div>
                    <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">{event.loggedBy}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-[var(--color-text-tertiary)]">
                      {formatDistanceToNow(parseISO(event.timestamp), { addSuffix: true })}
                    </span>
                    {event.flagged && <Flag size={12} className="text-[var(--color-status-warning)]" />}
                  </div>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {event.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="default">{tag}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {showCount < events.length && (
        <button
          onClick={() => setShowCount((c) => c + 8)}
          className="mt-4 text-sm text-[var(--color-text-brand)] font-medium hover:underline cursor-pointer"
        >
          Load more
        </button>
      )}
    </div>
  )
}

export { categoryIcons, categoryColors }
