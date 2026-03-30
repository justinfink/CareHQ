import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Loader2, Cloud } from 'lucide-react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import { useAppStore } from '../../store/useAppStore'
import type { CalendarEvent, CalendarEventType, RecurrenceRule } from '../../types/calendar'

interface AddEventModalProps {
  open: boolean
  onClose: () => void
  onSave: (event: CalendarEvent) => void | Promise<void>
  initialDate?: Date
  initialHour?: number
  editEvent?: CalendarEvent | null
  isConnected?: boolean
}

const eventTypeColors: Record<CalendarEventType, string> = {
  shift: '#0A7B6E',
  appointment: '#2563EB',
  task: '#5C6270',
  reminder: '#DC2626',
}

export default function AddEventModal({
  open,
  onClose,
  onSave,
  initialDate,
  initialHour,
  editEvent,
  isConnected,
}: AddEventModalProps) {
  const careTeam = useAppStore((s) => s.careTeam)

  const defaultDate = initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  const defaultStartHour = initialHour ?? 9

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<CalendarEventType>('appointment')
  const [date, setDate] = useState(defaultDate)
  const [startTime, setStartTime] = useState(`${String(defaultStartHour).padStart(2, '0')}:00`)
  const [endTime, setEndTime] = useState(`${String(defaultStartHour + 1).padStart(2, '0')}:00`)
  const [location, setLocation] = useState('')
  const [assignedTo, setAssignedTo] = useState<string[]>([])
  const [recurring, setRecurring] = useState<string>('none')
  const [isSaving, setIsSaving] = useState(false)

  // Reset form when editEvent changes or modal opens
  useEffect(() => {
    if (open) {
      if (editEvent) {
        setTitle(editEvent.title)
        setDescription(editEvent.description)
        setType(editEvent.type)
        setDate(editEvent.startTime.split('T')[0])
        setStartTime(format(new Date(editEvent.startTime), 'HH:mm'))
        setEndTime(format(new Date(editEvent.endTime), 'HH:mm'))
        setLocation(editEvent.location || '')
        setAssignedTo(editEvent.assignedTo)
        setRecurring(editEvent.recurring?.frequency || 'none')
      } else {
        setTitle('')
        setDescription('')
        setType('appointment')
        setDate(initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
        setStartTime(`${String(initialHour ?? 9).padStart(2, '0')}:00`)
        setEndTime(`${String((initialHour ?? 9) + 1).padStart(2, '0')}:00`)
        setLocation('')
        setAssignedTo([])
        setRecurring('none')
      }
    }
  }, [open, editEvent, initialDate, initialHour])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    const recurrenceRule: RecurrenceRule | null =
      recurring !== 'none' ? { frequency: recurring as RecurrenceRule['frequency'] } : null

    const event: CalendarEvent = {
      id: editEvent?.id || `cal-${Date.now()}`,
      title,
      description,
      type,
      startTime: `${date}T${startTime}:00`,
      endTime: `${date}T${endTime}:00`,
      allDay: false,
      assignedTo,
      createdBy: 'user-001',
      color: eventTypeColors[type],
      recurring: recurrenceRule,
      location: location || undefined,
      reminders: [30],
    }

    try {
      await onSave(event)
      onClose()
    } catch (err) {
      console.error('Failed to save event:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleAssigned = (id: string) => {
    setAssignedTo((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editEvent ? 'Edit event' : 'New event'}
      width="max-w-[520px]"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., PT Session, Morning Shift"
          required
        />

        {/* Event type */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">Type</label>
          <div className="grid grid-cols-4 gap-2">
            {(['shift', 'appointment', 'task', 'reminder'] as CalendarEventType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`px-3 py-2 rounded-[8px] text-xs font-medium capitalize transition-all cursor-pointer border ${
                  type === t
                    ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary-light)] text-[var(--color-brand-primary)]'
                    : 'border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)]'
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full mx-auto mb-1"
                  style={{ backgroundColor: eventTypeColors[t] }}
                />
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Date + time row */}
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Input
            label="Start"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
          <Input
            label="End"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>

        <Input
          label="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g., Northwestern Medicine"
        />

        {/* Recurrence */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">Repeats</label>
          <select
            value={recurring}
            onChange={(e) => setRecurring(e.target.value)}
            className="w-full bg-white border border-[var(--color-border-default)] rounded-[10px] px-3.5 py-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] cursor-pointer"
          >
            <option value="none">Does not repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Every 2 weeks</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        {/* Assign to care team */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            Assign to
          </label>
          <div className="flex flex-wrap gap-2">
            {careTeam.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => toggleAssigned(member.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                  assignedTo.includes(member.id)
                    ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary-light)] text-[var(--color-brand-primary)]'
                    : 'border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)]'
                }`}
              >
                {member.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">Notes</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Additional details or instructions..."
            rows={3}
            className="w-full bg-white border border-[var(--color-border-default)] rounded-[10px] px-3.5 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] resize-none"
          />
        </div>

        {/* Sync indicator */}
        {isConnected && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-brand-primary)]">
            <Cloud size={13} />
            <span>This event will sync to Google Calendar</span>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" className="flex-1" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {isConnected ? 'Syncing...' : 'Saving...'}
              </>
            ) : editEvent ? (
              'Save changes'
            ) : (
              'Add to calendar'
            )}
          </Button>
          <Button variant="ghost" type="button" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}
