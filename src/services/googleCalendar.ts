import type { CalendarEvent, CalendarEventType, RecurrenceRule } from '../types/calendar'

const GCAL_BASE = 'https://www.googleapis.com/calendar/v3'

// ── Google Calendar REST API event shape ──────────────────────────────

interface GCalEvent {
  id?: string
  summary?: string
  description?: string
  location?: string
  start?: { dateTime?: string; date?: string; timeZone?: string }
  end?: { dateTime?: string; date?: string; timeZone?: string }
  recurrence?: string[]
  colorId?: string
  reminders?: {
    useDefault: boolean
    overrides?: { method: string; minutes: number }[]
  }
  extendedProperties?: {
    private?: Record<string, string>
  }
  status?: string
}

interface GCalCalendar {
  id: string
  summary: string
  description?: string
  timeZone?: string
  backgroundColor?: string
}

// ── Color mapping ─────────────────────────────────────────────────────

const typeToColorId: Record<CalendarEventType, string> = {
  shift: '2',        // sage
  appointment: '9',  // blueberry
  task: '8',         // graphite
  reminder: '11',    // tomato
}

const colorIdToType: Record<string, CalendarEventType> = {
  '2': 'shift',
  '10': 'shift',
  '9': 'appointment',
  '1': 'appointment',
  '8': 'task',
  '5': 'task',
  '11': 'reminder',
  '4': 'reminder',
}

const typeColors: Record<CalendarEventType, string> = {
  shift: '#0A7B6E',
  appointment: '#2563EB',
  task: '#5C6270',
  reminder: '#DC2626',
}

// ── Helpers ───────────────────────────────────────────────────────────

function localTz(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

function stripTimezone(dt: string): string {
  const d = new Date(dt)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${y}-${mo}-${da}T${h}:${mi}:${s}`
}

function inferTypeFromSummary(summary: string): CalendarEventType {
  const lower = summary.toLowerCase()
  if (
    lower.includes('shift') ||
    lower.includes('morning') ||
    lower.includes('afternoon') ||
    lower.includes('weekend care')
  )
    return 'shift'
  if (
    lower.includes('dr.') ||
    lower.includes('session') ||
    lower.includes('follow-up') ||
    lower.includes('neurology') ||
    lower.includes('cardiology')
  )
    return 'appointment'
  if (lower.includes('remind') || lower.includes('call') || lower.includes('follow up'))
    return 'reminder'
  return 'task'
}

function parseRecurrence(rrule: string): RecurrenceRule | null {
  if (!rrule.startsWith('RRULE:')) return null

  const params: Record<string, string> = {}
  rrule
    .replace('RRULE:', '')
    .split(';')
    .forEach((p) => {
      const [k, v] = p.split('=')
      if (k && v) params[k] = v
    })

  const freqMap: Record<string, RecurrenceRule['frequency']> = {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
  }

  let frequency = freqMap[params.FREQ] || 'weekly'
  if (frequency === 'weekly' && params.INTERVAL === '2') {
    frequency = 'biweekly'
  }

  const dayMap: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }
  const daysOfWeek = params.BYDAY
    ? params.BYDAY.split(',')
        .map((d) => dayMap[d])
        .filter((d) => d !== undefined)
    : undefined

  return { frequency, daysOfWeek }
}

// ── CareHQ → Google ───────────────────────────────────────────────────

export function toGoogleEvent(event: CalendarEvent): GCalEvent {
  const recurrence: string[] = []
  if (event.recurring) {
    const freqMap: Record<string, string> = {
      daily: 'DAILY',
      weekly: 'WEEKLY',
      biweekly: 'WEEKLY',
      monthly: 'MONTHLY',
    }
    let rule = `RRULE:FREQ=${freqMap[event.recurring.frequency]}`
    if (event.recurring.frequency === 'biweekly') rule += ';INTERVAL=2'
    if (event.recurring.daysOfWeek?.length) {
      const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
      rule += `;BYDAY=${event.recurring.daysOfWeek.map((d) => dayNames[d]).join(',')}`
    }
    recurrence.push(rule)
  }

  const tz = localTz()

  return {
    summary: event.title,
    description: event.description || undefined,
    location: event.location || undefined,
    start: event.allDay
      ? { date: event.startTime.split('T')[0] }
      : { dateTime: event.startTime, timeZone: tz },
    end: event.allDay
      ? { date: event.endTime.split('T')[0] }
      : { dateTime: event.endTime, timeZone: tz },
    recurrence: recurrence.length ? recurrence : undefined,
    colorId: typeToColorId[event.type],
    reminders:
      event.reminders.length > 0
        ? {
            useDefault: false,
            overrides: event.reminders.map((m) => ({ method: 'popup' as const, minutes: m })),
          }
        : { useDefault: true },
    extendedProperties: {
      private: {
        carehq_type: event.type,
        carehq_assignedTo: JSON.stringify(event.assignedTo),
        carehq_createdBy: event.createdBy,
        carehq_color: event.color,
      },
    },
  }
}

// ── Google → CareHQ ───────────────────────────────────────────────────

export function fromGoogleEvent(gEvent: GCalEvent): CalendarEvent {
  const props = gEvent.extendedProperties?.private || {}

  const type: CalendarEventType =
    (props.carehq_type as CalendarEventType) ||
    (gEvent.colorId ? colorIdToType[gEvent.colorId] : undefined) ||
    inferTypeFromSummary(gEvent.summary || '')

  let assignedTo: string[] = []
  try {
    assignedTo = props.carehq_assignedTo ? JSON.parse(props.carehq_assignedTo) : []
  } catch {
    assignedTo = []
  }

  let recurring: RecurrenceRule | null = null
  if (gEvent.recurrence?.length) {
    recurring = parseRecurrence(gEvent.recurrence[0])
  }

  const reminders = gEvent.reminders?.overrides?.map((o) => o.minutes) || []
  const isAllDay = !gEvent.start?.dateTime

  const startTime = gEvent.start?.dateTime
    ? stripTimezone(gEvent.start.dateTime)
    : gEvent.start?.date
      ? `${gEvent.start.date}T00:00:00`
      : ''

  const endTime = gEvent.end?.dateTime
    ? stripTimezone(gEvent.end.dateTime)
    : gEvent.end?.date
      ? `${gEvent.end.date}T23:59:59`
      : ''

  return {
    id: gEvent.id || `gcal-${Date.now()}`,
    title: gEvent.summary || 'Untitled',
    description: gEvent.description || '',
    type,
    startTime,
    endTime,
    allDay: isAllDay,
    assignedTo,
    createdBy: props.carehq_createdBy || 'user-001',
    color: props.carehq_color || typeColors[type],
    recurring,
    location: gEvent.location,
    reminders,
  }
}

// ── Generic fetch wrapper ─────────────────────────────────────────────

async function gcalFetch(token: string, path: string, options: RequestInit = {}) {
  const res = await fetch(`${GCAL_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  if (res.status === 401) {
    throw new Error('TOKEN_EXPIRED')
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(
      (error as { error?: { message?: string } }).error?.message ||
        `Google Calendar API error: ${res.status}`
    )
  }

  if (res.status === 204) return null
  return res.json()
}

// ── Calendar management ───────────────────────────────────────────────

const CAREHQ_CALENDAR_SUMMARY = 'CareHQ — Robert\'s Care'
const CAREHQ_CALENDAR_DESCRIPTION = 'Care coordination calendar managed by CareHQ. Contains shifts, appointments, tasks, and reminders for Robert\'s home care.'

/**
 * Find or create the dedicated CareHQ calendar.
 * Returns the calendar ID to use for all event operations.
 */
export async function ensureCareHQCalendar(token: string): Promise<string> {
  // Check localStorage first
  const cached = localStorage.getItem('carehq_calendar_id')
  if (cached) {
    // Verify it still exists
    try {
      await gcalFetch(token, `/calendars/${encodeURIComponent(cached)}`)
      return cached
    } catch {
      localStorage.removeItem('carehq_calendar_id')
    }
  }

  // Search existing calendars
  const listData = (await gcalFetch(token, '/users/me/calendarList')) as {
    items?: GCalCalendar[]
  }
  const existing = listData.items?.find(
    (cal) =>
      cal.summary === CAREHQ_CALENDAR_SUMMARY ||
      cal.summary.toLowerCase().includes('carehq') ||
      cal.description?.toLowerCase().includes('carehq')
  )

  if (existing) {
    localStorage.setItem('carehq_calendar_id', existing.id)
    return existing.id
  }

  // Create the calendar
  const newCal = (await gcalFetch(token, '/calendars', {
    method: 'POST',
    body: JSON.stringify({
      summary: CAREHQ_CALENDAR_SUMMARY,
      description: CAREHQ_CALENDAR_DESCRIPTION,
      timeZone: localTz(),
    }),
  })) as GCalCalendar

  // Set the calendar color to teal (CareHQ brand)
  await gcalFetch(token, `/users/me/calendarList/${encodeURIComponent(newCal.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      backgroundColor: '#0A7B6E',
      foregroundColor: '#ffffff',
      colorRgbFormat: true,
    }),
  }).catch(() => {
    // Non-critical — color is cosmetic
  })

  localStorage.setItem('carehq_calendar_id', newCal.id)
  return newCal.id
}

/**
 * Get the stored CareHQ calendar ID (without network call).
 * Returns null if not yet initialized.
 */
export function getCachedCalendarId(): string | null {
  return localStorage.getItem('carehq_calendar_id')
}

// ── Event CRUD ────────────────────────────────────────────────────────

export async function fetchEvents(
  token: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: new Date(timeMin).toISOString(),
    timeMax: new Date(timeMax).toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  })

  const data = await gcalFetch(
    token,
    `/calendars/${encodeURIComponent(calendarId)}/events?${params}`
  )
  return ((data as { items?: GCalEvent[] }).items || [])
    .filter((e: GCalEvent) => e.status !== 'cancelled')
    .map(fromGoogleEvent)
}

export async function createGoogleEvent(
  token: string,
  calendarId: string,
  event: CalendarEvent
): Promise<CalendarEvent> {
  const gEvent = toGoogleEvent(event)
  const data = await gcalFetch(
    token,
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      body: JSON.stringify(gEvent),
    }
  )
  return fromGoogleEvent(data as GCalEvent)
}

export async function updateGoogleEvent(
  token: string,
  calendarId: string,
  eventId: string,
  event: CalendarEvent
): Promise<CalendarEvent> {
  const gEvent = toGoogleEvent(event)
  const data = await gcalFetch(
    token,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(gEvent),
    }
  )
  return fromGoogleEvent(data as GCalEvent)
}

export async function deleteGoogleEvent(
  token: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  await gcalFetch(
    token,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: 'DELETE' }
  )
}

// ── Seed events ───────────────────────────────────────────────────────

/**
 * Populates a fresh CareHQ calendar with the standard care schedule.
 * Only runs once — checks for existing events first.
 */
export async function seedCalendarEvents(
  token: string,
  calendarId: string
): Promise<void> {
  // Check if calendar already has events (don't double-seed)
  const now = new Date()
  const twoMonthsOut = new Date(now)
  twoMonthsOut.setMonth(twoMonthsOut.getMonth() + 2)

  const existing = await fetchEvents(
    token,
    calendarId,
    now.toISOString(),
    twoMonthsOut.toISOString()
  )

  if (existing.length > 0) return // Already seeded

  const tz = localTz()

  // Recurring shifts
  const seedEvents: GCalEvent[] = [
    {
      summary: 'Maria Reyes — Morning Shift',
      description: 'Morning routine, medication reminders, ADL support',
      location: 'Home — 1847 Maple Street',
      start: { dateTime: '2026-03-30T08:00:00', timeZone: tz },
      end: { dateTime: '2026-03-30T12:00:00', timeZone: tz },
      recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'],
      colorId: '2',
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 30 }] },
      extendedProperties: {
        private: {
          carehq_type: 'shift',
          carehq_assignedTo: '["ct-001"]',
          carehq_createdBy: 'user-001',
          carehq_color: '#0A7B6E',
        },
      },
    },
    {
      summary: 'James Okonkwo — Afternoon Shift',
      description: 'Afternoon companionship, walks, engagement activities',
      location: 'Home — 1847 Maple Street',
      start: { dateTime: '2026-03-30T12:00:00', timeZone: tz },
      end: { dateTime: '2026-03-30T16:00:00', timeZone: tz },
      recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'],
      colorId: '6',
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 30 }] },
      extendedProperties: {
        private: {
          carehq_type: 'shift',
          carehq_assignedTo: '["ct-002"]',
          carehq_createdBy: 'user-001',
          carehq_color: '#F0A830',
        },
      },
    },
    {
      summary: 'Pat Nguyen — Weekend Shift',
      description: 'Full weekend care coverage',
      location: 'Home — 1847 Maple Street',
      start: { dateTime: '2026-04-04T09:00:00', timeZone: tz },
      end: { dateTime: '2026-04-04T17:00:00', timeZone: tz },
      recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=SA,SU'],
      colorId: '3',
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 60 }] },
      extendedProperties: {
        private: {
          carehq_type: 'shift',
          carehq_assignedTo: '["ct-003"]',
          carehq_createdBy: 'user-001',
          carehq_color: '#8B5CF6',
        },
      },
    },
    {
      summary: 'PT Session — Kevin Thomas',
      description: 'Gait training and fall prevention. Balance on tandem stance improving.',
      location: 'ProMotion Physical Therapy',
      start: { dateTime: '2026-03-31T10:00:00', timeZone: tz },
      end: { dateTime: '2026-03-31T10:45:00', timeZone: tz },
      recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=TU,TH'],
      colorId: '9',
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 },
          { method: 'popup', minutes: 1440 },
        ],
      },
      extendedProperties: {
        private: {
          carehq_type: 'appointment',
          carehq_assignedTo: '["ct-006"]',
          carehq_createdBy: 'user-001',
          carehq_color: '#2563EB',
        },
      },
    },
    {
      summary: 'Dr. Kapoor — Neurology Follow-up',
      description:
        'Quarterly visit. Discuss tremor increase, orientation episodes, medication review.',
      location: 'Northwestern Medicine — Neurology',
      start: { dateTime: '2026-05-14T14:30:00', timeZone: tz },
      end: { dateTime: '2026-05-14T15:15:00', timeZone: tz },
      colorId: '11',
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 },
          { method: 'popup', minutes: 1440 },
          { method: 'email', minutes: 10080 },
        ],
      },
      extendedProperties: {
        private: {
          carehq_type: 'appointment',
          carehq_assignedTo: '["ct-004"]',
          carehq_createdBy: 'user-001',
          carehq_color: '#DC2626',
        },
      },
    },
    {
      summary: "Call Dr. Kapoor's office — follow up on tremor",
      description: 'Follow up on tremor increase callback. Ask for nurse line specifically.',
      start: { dateTime: '2026-03-31T10:00:00', timeZone: tz },
      end: { dateTime: '2026-03-31T10:15:00', timeZone: tz },
      colorId: '11',
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 15 }] },
      extendedProperties: {
        private: {
          carehq_type: 'reminder',
          carehq_assignedTo: '[]',
          carehq_createdBy: 'user-001',
          carehq_color: '#DC2626',
        },
      },
    },
    {
      summary: 'Follow up on insurance claim',
      description:
        'Check if Comfort Care resubmitted the missing date of service form to Mutual of Omaha.',
      start: { dateTime: '2026-03-31T09:00:00', timeZone: tz },
      end: { dateTime: '2026-03-31T09:30:00', timeZone: tz },
      colorId: '8',
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 30 }] },
      extendedProperties: {
        private: {
          carehq_type: 'task',
          carehq_assignedTo: '[]',
          carehq_createdBy: 'user-001',
          carehq_color: '#5C6270',
        },
      },
    },
  ]

  // Create all seed events (sequential to avoid rate limits)
  for (const evt of seedEvents) {
    await gcalFetch(token, `/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: 'POST',
      body: JSON.stringify(evt),
    })
  }
}
