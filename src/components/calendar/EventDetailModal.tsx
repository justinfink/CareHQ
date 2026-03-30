import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Clock, MapPin, User, Repeat, Bell, Trash2, Edit3, Loader2, Cloud } from 'lucide-react'
import Modal from '../ui/Modal'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import type { CalendarEvent } from '../../types/calendar'
import { useAppStore } from '../../store/useAppStore'

interface EventDetailModalProps {
  event: CalendarEvent | null
  open: boolean
  onClose: () => void
  onEdit: (event: CalendarEvent) => void
  onDelete: (eventId: string) => void | Promise<void>
  isConnected?: boolean
}

const typeLabels: Record<string, string> = {
  shift: 'Shift',
  appointment: 'Appointment',
  task: 'Task',
  reminder: 'Reminder',
}

const typeVariants: Record<string, 'professional' | 'info' | 'default' | 'alert'> = {
  shift: 'professional',
  appointment: 'info',
  task: 'default',
  reminder: 'alert',
}

export default function EventDetailModal({
  event,
  open,
  onClose,
  onEdit,
  onDelete,
  isConnected,
}: EventDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  if (!event) return null

  const careTeam = useAppStore((s) => s.careTeam)
  const start = parseISO(event.startTime)
  const end = parseISO(event.endTime)
  const assigned = careTeam.filter((m) => event.assignedTo.includes(m.id))

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(event.id)
    } catch (err) {
      console.error('Failed to delete event:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={event.title}>
      <div className="space-y-5">
        {/* Type + color + sync */}
        <div className="flex items-center gap-2">
          <Badge variant={typeVariants[event.type]}>{typeLabels[event.type]}</Badge>
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: event.color }}
          />
          {isConnected && (
            <div className="flex items-center gap-1 text-[10px] text-[var(--color-brand-primary)] ml-auto">
              <Cloud size={11} />
              <span>Synced</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 text-sm text-[var(--color-text-primary)]">
          <Clock size={15} className="text-[var(--color-text-tertiary)]" />
          <span>
            {format(start, 'EEEE, MMMM d, yyyy')}
            <br />
            {event.allDay
              ? 'All day'
              : `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`}
          </span>
        </div>

        {event.location && (
          <div className="flex items-center gap-2.5 text-sm text-[var(--color-text-primary)]">
            <MapPin size={15} className="text-[var(--color-text-tertiary)]" />
            <span>{event.location}</span>
          </div>
        )}

        {event.recurring && (
          <div className="flex items-center gap-2.5 text-sm text-[var(--color-text-secondary)]">
            <Repeat size={15} className="text-[var(--color-text-tertiary)]" />
            <span>Repeats {event.recurring.frequency}</span>
          </div>
        )}

        {event.reminders.length > 0 && (
          <div className="flex items-center gap-2.5 text-sm text-[var(--color-text-secondary)]">
            <Bell size={15} className="text-[var(--color-text-tertiary)]" />
            <span>
              {event.reminders
                .map((m) =>
                  m >= 1440
                    ? `${m / 1440}d before`
                    : m >= 60
                      ? `${m / 60}h before`
                      : `${m}m before`
                )
                .join(', ')}
            </span>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div className="border-t border-[var(--color-border-subtle)] pt-4">
            <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
              {event.description}
            </p>
          </div>
        )}

        {/* Assigned to */}
        {assigned.length > 0 && (
          <div className="border-t border-[var(--color-border-subtle)] pt-4">
            <div className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
              Assigned to
            </div>
            <div className="space-y-2">
              {assigned.map((member) => (
                <div key={member.id} className="flex items-center gap-2.5 text-sm">
                  <User size={14} className="text-[var(--color-text-tertiary)]" />
                  <span className="text-[var(--color-text-primary)] font-medium">
                    {member.name}
                  </span>
                  <span className="text-[var(--color-text-tertiary)]">{member.role}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="border-t border-[var(--color-border-subtle)] pt-4 flex gap-2">
          <Button size="sm" onClick={() => onEdit(event)} disabled={isDeleting}>
            <Edit3 size={14} />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-[var(--color-status-alert)] hover:bg-[var(--color-status-alert-bg)]"
          >
            {isDeleting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={14} />
                Delete
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
