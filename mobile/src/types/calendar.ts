export type CalendarEventType = 'shift' | 'appointment' | 'task' | 'reminder'

export type AccessLevel = 'admin' | 'edit' | 'view'

export interface CalendarEvent {
  id: string
  title: string
  description: string
  type: CalendarEventType
  startTime: string // ISO datetime
  endTime: string   // ISO datetime
  allDay: boolean
  assignedTo: string[]     // care team member IDs
  createdBy: string        // user ID
  color: string
  recurring: RecurrenceRule | null
  location?: string
  reminders: number[]      // minutes before event
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  endDate?: string
  daysOfWeek?: number[]    // 0=Sun, 1=Mon, etc.
}

export interface CalendarPermission {
  memberId: string
  memberName: string
  memberRole: string
  accessLevel: AccessLevel
  canViewAllEvents: boolean
  canEditOwnEvents: boolean
  canEditAllEvents: boolean
  canManagePermissions: boolean
}

export interface CalendarView {
  type: 'week' | 'month'
  currentDate: string
}
