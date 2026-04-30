import { supabase } from '../lib/supabase'
import { authFetch } from './client'

// ─── Twilio ────────────────────────────────────────────────────────────

export interface TwilioStatus {
  connected: boolean
  accountFriendlyName?: string | null
  from?: string | null
}

export async function getTwilioStatus(recipientId: string): Promise<TwilioStatus> {
  const { data } = await supabase
    .from('integrations')
    .select('external_account, config, status')
    .eq('recipient_id', recipientId)
    .eq('provider', 'twilio')
    .maybeSingle()
  if (!data) return { connected: false }
  const cfg = (data as { config: { from?: string; account_friendly_name?: string } | null }).config
  return {
    connected: (data as { status: string }).status === 'active',
    accountFriendlyName: cfg?.account_friendly_name ?? null,
    from: cfg?.from ?? null,
  }
}

export async function connectTwilio(input: {
  recipientId: string
  accountSid: string
  authToken: string
  from: string
}): Promise<{ accountFriendlyName: string | null; from: string }> {
  const res = await authFetch('/api/integrations/twilio', {
    method: 'POST',
    body: JSON.stringify({ ...input, action: 'connect' }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Connect failed (${res.status})`)
  }
  return (await res.json()) as { accountFriendlyName: string | null; from: string }
}

export async function testTwilio(input: { recipientId: string; to: string }) {
  const res = await authFetch('/api/integrations/twilio', {
    method: 'POST',
    body: JSON.stringify({ ...input, action: 'test' }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Test send failed (${res.status})`)
  }
  return (await res.json()) as { twilioSid: string | null; status: string | null }
}

export async function disconnectTwilio(recipientId: string): Promise<void> {
  const res = await authFetch('/api/integrations/twilio', {
    method: 'POST',
    body: JSON.stringify({ recipientId, action: 'disconnect' }),
  })
  if (!res.ok) throw new Error('Disconnect failed')
}

// ─── Google ────────────────────────────────────────────────────────────

export interface GoogleConnections {
  calendarConnected: boolean
  gmailConnected: boolean
  account: string | null
  lastSyncAt: string | null
  lastSyncCount: number | null
}

export async function getGoogleStatus(recipientId: string): Promise<GoogleConnections> {
  const res = await authFetch('/api/integrations/google', {
    method: 'POST',
    body: JSON.stringify({ recipientId, action: 'status' }),
  })
  if (!res.ok) throw new Error((await res.text()).slice(0, 200))
  const body = (await res.json()) as {
    connections: Array<{
      provider: string
      external_account: string | null
      config: { last_sync_at?: string; last_sync_count?: number } | null
    }>
  }
  const cal = body.connections.find((c) => c.provider === 'google_calendar')
  const gm = body.connections.find((c) => c.provider === 'gmail')
  const last = gm?.config?.last_sync_at ?? cal?.config?.last_sync_at ?? null
  return {
    calendarConnected: !!cal,
    gmailConnected: !!gm,
    account: cal?.external_account || gm?.external_account || null,
    lastSyncAt: last,
    lastSyncCount: gm?.config?.last_sync_count ?? null,
  }
}

export async function initGoogleOAuth(recipientId: string): Promise<{ url: string }> {
  const res = await authFetch('/api/integrations/google', {
    method: 'POST',
    body: JSON.stringify({ recipientId, action: 'init' }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `init failed (${res.status})`)
  }
  return (await res.json()) as { url: string }
}

export interface GoogleCalendarEvent {
  id: string
  summary?: string
  description?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  htmlLink?: string
  hangoutLink?: string
  attendees?: Array<{ email?: string; displayName?: string }>
}

export async function syncGoogleCalendar(recipientId: string): Promise<{ events: GoogleCalendarEvent[] }> {
  const res = await authFetch('/api/integrations/google', {
    method: 'POST',
    body: JSON.stringify({ recipientId, action: 'sync_calendar' }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Calendar sync failed (${res.status})`)
  }
  return (await res.json()) as { events: GoogleCalendarEvent[] }
}

export async function syncGmail(recipientId: string) {
  const res = await authFetch('/api/integrations/google', {
    method: 'POST',
    body: JSON.stringify({ recipientId, action: 'sync_gmail' }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Gmail sync failed (${res.status})`)
  }
  return (await res.json()) as {
    messageCount: number
    messages: Array<{ id: string; subject: string; from: string; snippet: string; receivedAt: string | null }>
  }
}

export async function disconnectGoogle(recipientId: string): Promise<void> {
  const res = await authFetch('/api/integrations/google', {
    method: 'POST',
    body: JSON.stringify({ recipientId, action: 'disconnect' }),
  })
  if (!res.ok) throw new Error('Disconnect failed')
}
