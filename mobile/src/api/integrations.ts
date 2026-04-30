import { supabase } from '../lib/supabase'

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE || 'https://carehq-app.vercel.app'

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not signed in')
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  })
}

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
  const cfg = (data as any).config as
    | { from?: string; account_friendly_name?: string }
    | null
  return {
    connected: (data as any).status === 'active',
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

export async function testTwilio(input: {
  recipientId: string
  to: string
}): Promise<{ twilioSid: string | null; status: string | null }> {
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
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Disconnect failed (${res.status})`)
  }
}
