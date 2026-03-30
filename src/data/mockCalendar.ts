import type { CalendarEvent, CalendarPermission } from '../types/calendar'

// Generate recurring shift events for the current week
function generateWeekShifts(): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - today.getDay() + 1) // Get Monday

  // Maria Reyes — Mon-Fri 8am-12pm
  for (let i = 0; i < 5; i++) {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    const dateStr = day.toISOString().split('T')[0]
    events.push({
      id: `shift-maria-${dateStr}`,
      title: 'Maria Reyes — Morning Shift',
      description: 'Morning routine, medication reminders, ADL support',
      type: 'shift',
      startTime: `${dateStr}T08:00:00`,
      endTime: `${dateStr}T12:00:00`,
      allDay: false,
      assignedTo: ['ct-001'],
      createdBy: 'user-001',
      color: '#0A7B6E',
      recurring: { frequency: 'weekly', daysOfWeek: [1, 2, 3, 4, 5] },
      location: 'Home — 1847 Maple Street',
      reminders: [30],
    })
  }

  // James Okonkwo — Mon-Fri 12pm-4pm
  for (let i = 0; i < 5; i++) {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    const dateStr = day.toISOString().split('T')[0]
    events.push({
      id: `shift-james-${dateStr}`,
      title: 'James Okonkwo — Afternoon Shift',
      description: 'Afternoon companionship, walks, engagement activities',
      type: 'shift',
      startTime: `${dateStr}T12:00:00`,
      endTime: `${dateStr}T16:00:00`,
      allDay: false,
      assignedTo: ['ct-002'],
      createdBy: 'user-001',
      color: '#F0A830',
      recurring: { frequency: 'weekly', daysOfWeek: [1, 2, 3, 4, 5] },
      location: 'Home — 1847 Maple Street',
      reminders: [30],
    })
  }

  // Pat Nguyen — Sat-Sun 9am-5pm
  const saturday = new Date(monday)
  saturday.setDate(monday.getDate() + 5)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  for (const day of [saturday, sunday]) {
    const dateStr = day.toISOString().split('T')[0]
    events.push({
      id: `shift-pat-${dateStr}`,
      title: 'Pat Nguyen — Weekend Shift',
      description: 'Full weekend care coverage',
      type: 'shift',
      startTime: `${dateStr}T09:00:00`,
      endTime: `${dateStr}T17:00:00`,
      allDay: false,
      assignedTo: ['ct-003'],
      createdBy: 'user-001',
      color: '#8B5CF6',
      recurring: { frequency: 'weekly', daysOfWeek: [0, 6] },
      location: 'Home — 1847 Maple Street',
      reminders: [60],
    })
  }

  return events
}

// Static appointments and tasks
function generateAppointments(): CalendarEvent[] {
  const today = new Date()
  const tuesday = new Date(today)
  tuesday.setDate(today.getDate() + ((2 - today.getDay() + 7) % 7 || 7))
  const thursday = new Date(today)
  thursday.setDate(today.getDate() + ((4 - today.getDay() + 7) % 7 || 7))

  const tuesStr = tuesday.toISOString().split('T')[0]
  const thursStr = thursday.toISOString().split('T')[0]

  return [
    {
      id: 'appt-pt-tues',
      title: 'PT Session — Kevin Thomas',
      description: 'Gait training and fall prevention. Balance on tandem stance improving.',
      type: 'appointment',
      startTime: `${tuesStr}T10:00:00`,
      endTime: `${tuesStr}T10:45:00`,
      allDay: false,
      assignedTo: ['ct-006'],
      createdBy: 'user-001',
      color: '#2563EB',
      recurring: { frequency: 'weekly', daysOfWeek: [2, 4] },
      location: 'ProMotion Physical Therapy',
      reminders: [60, 1440],
    },
    {
      id: 'appt-pt-thurs',
      title: 'PT Session — Kevin Thomas',
      description: 'Gait training and fall prevention.',
      type: 'appointment',
      startTime: `${thursStr}T10:00:00`,
      endTime: `${thursStr}T10:45:00`,
      allDay: false,
      assignedTo: ['ct-006'],
      createdBy: 'user-001',
      color: '#2563EB',
      recurring: { frequency: 'weekly', daysOfWeek: [2, 4] },
      location: 'ProMotion Physical Therapy',
      reminders: [60],
    },
    {
      id: 'appt-kapoor',
      title: 'Dr. Kapoor — Neurology Follow-up',
      description: "Quarterly visit. Discuss tremor increase, orientation episodes, medication review.",
      type: 'appointment',
      startTime: '2026-05-14T14:30:00',
      endTime: '2026-05-14T15:15:00',
      allDay: false,
      assignedTo: ['ct-004'],
      createdBy: 'user-001',
      color: '#DC2626',
      recurring: null,
      location: 'Northwestern Medicine — Neurology',
      reminders: [60, 1440, 10080],
    },
    {
      id: 'task-insurance',
      title: 'Follow up on insurance claim',
      description: 'Check if Comfort Care resubmitted the missing date of service form to Mutual of Omaha.',
      type: 'task',
      startTime: `${tuesStr}T09:00:00`,
      endTime: `${tuesStr}T09:30:00`,
      allDay: false,
      assignedTo: [],
      createdBy: 'user-001',
      color: '#5C6270',
      recurring: null,
      reminders: [30],
    },
    {
      id: 'reminder-kapoor-callback',
      title: "Call Dr. Kapoor's office again",
      description: "Follow up on tremor increase callback. Ask for nurse line specifically.",
      type: 'reminder',
      startTime: `${tuesday.toISOString().split('T')[0]}T10:00:00`,
      endTime: `${tuesday.toISOString().split('T')[0]}T10:15:00`,
      allDay: false,
      assignedTo: [],
      createdBy: 'user-001',
      color: '#DC2626',
      recurring: null,
      reminders: [15],
    },
  ]
}

export const calendarEvents: CalendarEvent[] = [
  ...generateWeekShifts(),
  ...generateAppointments(),
]

export const calendarPermissions: CalendarPermission[] = [
  {
    memberId: 'user-001',
    memberName: 'Sarah Chen',
    memberRole: 'Primary coordinator',
    accessLevel: 'admin',
    canViewAllEvents: true,
    canEditOwnEvents: true,
    canEditAllEvents: true,
    canManagePermissions: true,
  },
  {
    memberId: 'ct-001',
    memberName: 'Maria Reyes',
    memberRole: 'Home Health Aide',
    accessLevel: 'edit',
    canViewAllEvents: false,
    canEditOwnEvents: true,
    canEditAllEvents: false,
    canManagePermissions: false,
  },
  {
    memberId: 'ct-002',
    memberName: 'James Okonkwo',
    memberRole: 'Home Health Aide',
    accessLevel: 'edit',
    canViewAllEvents: false,
    canEditOwnEvents: true,
    canEditAllEvents: false,
    canManagePermissions: false,
  },
  {
    memberId: 'ct-003',
    memberName: 'Patricia "Pat" Nguyen',
    memberRole: 'Weekend Caregiver',
    accessLevel: 'edit',
    canViewAllEvents: false,
    canEditOwnEvents: true,
    canEditAllEvents: false,
    canManagePermissions: false,
  },
  {
    memberId: 'ct-004',
    memberName: 'Dr. Anita Kapoor',
    memberRole: 'Neurologist',
    accessLevel: 'view',
    canViewAllEvents: false,
    canEditOwnEvents: false,
    canEditAllEvents: false,
    canManagePermissions: false,
  },
  {
    memberId: 'ct-005',
    memberName: 'Dr. Marcus Webb',
    memberRole: 'Cardiologist',
    accessLevel: 'view',
    canViewAllEvents: false,
    canEditOwnEvents: false,
    canEditAllEvents: false,
    canManagePermissions: false,
  },
  {
    memberId: 'ct-006',
    memberName: 'Kevin Thomas, PT',
    memberRole: 'Physical Therapist',
    accessLevel: 'edit',
    canViewAllEvents: false,
    canEditOwnEvents: true,
    canEditAllEvents: false,
    canManagePermissions: false,
  },
  {
    memberId: 'ct-007',
    memberName: 'Linda Chen',
    memberRole: 'Spouse / Primary family',
    accessLevel: 'view',
    canViewAllEvents: true,
    canEditOwnEvents: false,
    canEditAllEvents: false,
    canManagePermissions: false,
  },
  {
    memberId: 'ct-008',
    memberName: 'David Chen',
    memberRole: 'Sibling / Remote family',
    accessLevel: 'view',
    canViewAllEvents: true,
    canEditOwnEvents: false,
    canEditAllEvents: false,
    canManagePermissions: false,
  },
]
