import { ArrowRight, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import { useAppStore } from '../../store/useAppStore'
import { careTeam } from '../../data/mockCareTeam'
import { formatDistanceToNow, parseISO } from 'date-fns'

export default function CareStatusCard() {
  const events = useAppStore((s) => s.events)
  const navigate = useNavigate()

  const lastEvent = events[0]
  const flaggedThisWeek = events.filter((e) => e.flagged).length

  // Find who's on shift now (simplistic: Maria in morning, James afternoon)
  const hour = new Date().getHours()
  const onShift = hour < 12 ? careTeam[0] : hour < 16 ? careTeam[1] : null
  const shiftLabel = hour < 12 ? '8:00 AM \u2013 12:00 PM' : '12:00 \u2013 4:00 PM'

  // Mini bar chart data for the week
  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const weekValues = [4, 3, 5, 3, 2, 1, 2]

  return (
    <Card>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Care Status &mdash; Today</h3>
        <button
          onClick={() => navigate('/log')}
          className="text-sm text-[var(--color-text-brand)] font-medium hover:underline flex items-center gap-1 cursor-pointer"
        >
          View all <ArrowRight size={14} />
        </button>
      </div>

      {/* Today's shift */}
      <div className="flex items-center justify-between py-3 border-b border-[var(--color-border-subtle)]">
        <div>
          <div className="text-xs text-[var(--color-text-secondary)] font-medium mb-0.5">Today&apos;s shift</div>
          <div className="text-sm text-[var(--color-text-primary)] font-medium">
            {onShift ? `${onShift.name} \u2014 ${hour < 12 ? 'Morning' : 'Afternoon'}` : 'No one on shift'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-tertiary)]">{onShift ? shiftLabel : ''}</span>
          {onShift && (
            <Badge variant="ok">Active</Badge>
          )}
        </div>
      </div>

      {/* Last logged */}
      {lastEvent && (
        <div className="flex items-center justify-between py-3 border-b border-[var(--color-border-subtle)]">
          <div>
            <div className="text-xs text-[var(--color-text-secondary)] font-medium mb-0.5">Last logged event</div>
            <div className="text-sm text-[var(--color-text-primary)] font-medium">{lastEvent.summary}</div>
            <div className="text-xs text-[var(--color-text-tertiary)]">{lastEvent.loggedBy}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-text-tertiary)]">
              {formatDistanceToNow(parseISO(lastEvent.timestamp), { addSuffix: true })}
            </span>
            <Badge variant="default">{lastEvent.tags[0]}</Badge>
          </div>
        </div>
      )}

      {/* Week at a glance */}
      <div className="pt-3">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-[var(--color-text-secondary)] font-medium">Week at a glance</div>
          {flaggedThisWeek > 0 && (
            <div className="flex items-center gap-1 text-xs text-[var(--color-status-warning)] font-medium">
              <AlertTriangle size={13} />
              {flaggedThisWeek} flags this week
            </div>
          )}
        </div>
        <div className="flex items-end gap-1.5 h-14">
          {weekValues.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-sm bg-[var(--color-brand-primary)] opacity-60"
                style={{ height: `${(v / 5) * 100}%`, minHeight: 4 }}
              />
              <span className="text-[10px] text-[var(--color-text-tertiary)]">{weekDays[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
