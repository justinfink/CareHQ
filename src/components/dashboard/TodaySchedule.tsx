import { AlertCircle } from 'lucide-react'
import Card from '../ui/Card'
import Avatar from '../ui/Avatar'
import Badge from '../ui/Badge'
import { careTeam } from '../../data/mockCareTeam'

export default function TodaySchedule() {
  const hour = new Date().getHours()

  const shifts = [
    {
      member: careTeam[0],
      time: '8:00 \u2013 12:00 PM',
      status: hour >= 8 && hour < 12 ? 'active' : hour >= 12 ? 'completed' : 'upcoming',
    },
    {
      member: careTeam[1],
      time: '12:00 \u2013 4:00 PM',
      status: hour >= 12 && hour < 16 ? 'active' : hour >= 16 ? 'completed' : 'upcoming',
    },
  ]

  return (
    <Card>
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Today&apos;s shifts</h3>

      <div className="space-y-4">
        {shifts.map((shift) => (
          <div key={shift.member.id} className="flex items-center gap-3">
            <Avatar src={shift.member.photo} name={shift.member.name} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[var(--color-text-primary)]">{shift.member.name}</div>
              <div className="text-xs text-[var(--color-text-tertiary)]">{shift.member.role}</div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-[var(--color-text-tertiary)]">{shift.time}</span>
              {shift.status === 'active' && (
                <Badge variant="ok">On shift</Badge>
              )}
              {shift.status === 'upcoming' && (
                <span className="w-2 h-2 rounded-full bg-[var(--color-text-tertiary)]" />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--color-border-subtle)]">
        <div className="flex items-center gap-2 text-xs">
          <AlertCircle size={14} className="text-[var(--color-status-warning)]" />
          <span className="text-[var(--color-status-warning)] font-medium">No coverage after 4pm today.</span>
        </div>
        <button className="mt-2 text-sm text-[var(--color-text-brand)] font-medium hover:underline cursor-pointer">
          + Schedule coverage &rarr;
        </button>
      </div>
    </Card>
  )
}
