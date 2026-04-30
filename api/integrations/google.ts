/**
 * Google integration management (Calendar + Gmail).
 *
 * POST /api/integrations/google
 *   body { recipientId, action: 'init'|'disconnect'|'status'|'sync_calendar'|'sync_gmail' }
 *
 * - init: mints an OAuth URL the mobile app should open in WebBrowser. State
 *   carries the (profileId, recipientId, nonce, exp) signed via HMAC. Google
 *   redirects to /api/integrations/google/callback (a separate handler) which
 *   verifies the state, exchanges the code for tokens, persists them to
 *   public.integrations, and 302-redirects back to carehq:// so the in-app
 *   browser closes cleanly.
 *
 * - status: convenience for mobile to know if calendar/gmail are connected.
 * - sync_calendar / sync_gmail: pull recent items into events / messages.
 * - disconnect: removes the integrations row (does NOT revoke the Google
 *   token — user can do that at myaccount.google.com).
 */

import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'edge' }

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_OAUTH_CLIENT_ID ||
  '607522867616-pcudf3v33mf4lt3u572lhrnpnn7n9s3p.apps.googleusercontent.com'
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_OAUTH_REDIRECT_URI ||
  'https://carehq-app.vercel.app/api/integrations/google/callback'
const STATE_SECRET = process.env.GOOGLE_OAUTH_STATE_SECRET

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.readonly',
  'openid',
  'email',
  'profile',
].join(' ')

interface ReqBody {
  recipientId: string
  action: 'init' | 'disconnect' | 'status' | 'sync_calendar' | 'sync_gmail'
}

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

// HMAC-SHA256 helpers (Edge runtime → Web Crypto)
async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return base64urlEncode(new Uint8Array(sig))
}

function base64urlEncode(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function signState(payload: object): Promise<string> {
  if (!STATE_SECRET) throw new Error('GOOGLE_OAUTH_STATE_SECRET is not set')
  const body = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)))
  const sig = await hmac(STATE_SECRET, body)
  return `${body}.${sig}`
}

export async function verifyState<T>(state: string): Promise<T | null> {
  if (!STATE_SECRET) return null
  const [body, sig] = state.split('.')
  if (!body || !sig) return null
  const expected = await hmac(STATE_SECRET, body)
  if (expected !== sig) return null
  try {
    const json = atob(body.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
  id_token?: string
}

export async function exchangeAuthCode(
  code: string,
): Promise<GoogleTokenResponse> {
  if (!GOOGLE_CLIENT_SECRET) throw new Error('GOOGLE_OAUTH_CLIENT_SECRET is not set')
  const params = new URLSearchParams({
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: GOOGLE_REDIRECT_URI,
    grant_type: 'authorization_code',
  })
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  if (!r.ok) {
    const detail = await r.text().catch(() => '')
    throw new Error(`Google token exchange failed: ${r.status} ${detail.slice(0, 200)}`)
  }
  return (await r.json()) as GoogleTokenResponse
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  if (!GOOGLE_CLIENT_SECRET) throw new Error('GOOGLE_OAUTH_CLIENT_SECRET is not set')
  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    grant_type: 'refresh_token',
  })
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  if (!r.ok) {
    const detail = await r.text().catch(() => '')
    throw new Error(`Google refresh failed: ${r.status} ${detail.slice(0, 200)}`)
  }
  return (await r.json()) as GoogleTokenResponse
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') return jsonError(405, 'Method not allowed')
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return jsonError(503, 'Supabase not configured')

  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return jsonError(401, 'Missing bearer token')

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData.user) return jsonError(401, 'Invalid session')
  const profileId = userData.user.id

  let body: ReqBody
  try {
    body = (await req.json()) as ReqBody
  } catch {
    return jsonError(400, 'Invalid JSON body')
  }
  if (!body.recipientId) return jsonError(400, 'recipientId required')

  if (body.action === 'init') {
    const state = await signState({
      profileId,
      recipientId: body.recipientId,
      nonce: crypto.randomUUID(),
      exp: Math.floor(Date.now() / 1000) + 600, // 10 min
    })
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state,
    })
    return new Response(
      JSON.stringify({
        ok: true,
        url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      }),
      { headers: { 'content-type': 'application/json' } },
    )
  }

  if (body.action === 'status') {
    const { data } = await supabase
      .from('integrations')
      .select('provider, external_account, config, status, updated_at')
      .eq('recipient_id', body.recipientId)
      .in('provider', ['google_calendar', 'gmail'])
    return new Response(
      JSON.stringify({
        ok: true,
        connections: data ?? [],
      }),
      { headers: { 'content-type': 'application/json' } },
    )
  }

  if (body.action === 'disconnect') {
    const { error } = await supabase
      .from('integrations')
      .delete()
      .eq('recipient_id', body.recipientId)
      .in('provider', ['google_calendar', 'gmail'])
    if (error) return jsonError(500, error.message)
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    })
  }

  if (body.action === 'sync_calendar') {
    return await syncCalendar(supabase, body.recipientId)
  }

  if (body.action === 'sync_gmail') {
    return await syncGmail(supabase, body.recipientId, profileId)
  }

  return jsonError(400, `Unknown action: ${body.action}`)
}

// ─── Calendar sync ─────────────────────────────────────────────────────

async function syncCalendar(supabase: any, recipientId: string): Promise<Response> {
  const integ = await loadIntegration(supabase, recipientId, 'google_calendar')
  if ('error' in integ) return jsonError(404, integ.error)
  const accessToken = await ensureAccessToken(supabase, integ)
  if (!accessToken) return jsonError(500, 'Could not get a valid Google access token')

  const now = new Date()
  const max = new Date(now)
  max.setDate(max.getDate() + 60)

  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: max.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  })
  const r = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      headers: { authorization: `Bearer ${accessToken}` },
    },
  )
  if (!r.ok) {
    const detail = await r.text().catch(() => '')
    return jsonError(r.status, `Google Calendar sync failed: ${detail.slice(0, 200)}`)
  }
  const data = (await r.json()) as {
    items?: Array<{
      id: string
      summary?: string
      description?: string
      start?: { dateTime?: string; date?: string }
      end?: { dateTime?: string; date?: string }
      htmlLink?: string
      hangoutLink?: string
      attendees?: Array<{ email?: string; displayName?: string }>
    }>
  }
  return new Response(
    JSON.stringify({
      ok: true,
      events: data.items ?? [],
    }),
    { headers: { 'content-type': 'application/json' } },
  )
}

// ─── Gmail sync ────────────────────────────────────────────────────────

async function syncGmail(
  supabase: any,
  recipientId: string,
  profileId: string,
): Promise<Response> {
  const integ = await loadIntegration(supabase, recipientId, 'gmail')
  if ('error' in integ) return jsonError(404, integ.error)
  const accessToken = await ensureAccessToken(supabase, integ)
  if (!accessToken) return jsonError(500, 'Could not get a valid Google access token')

  // Fetch recent messages with subject hints we care about (appointments, EOBs, refills).
  const queryParts = [
    'newer_than:14d',
    '(',
    'subject:(appointment OR confirm OR follow-up OR reminder OR refill OR pharmacy OR claim OR EOB OR explanation)',
    'OR from:(@mychart.com OR @epic.com OR @mychartmail.com OR @walgreens.com OR @cvs.com OR @riteaid.com OR @kp.org OR @mountsinai.org OR @nyulangone.org OR @clevelandclinic.org)',
    ')',
  ]
  const q = queryParts.join(' ')

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=20`,
    { headers: { authorization: `Bearer ${accessToken}` } },
  )
  if (!listRes.ok) {
    const detail = await listRes.text().catch(() => '')
    return jsonError(listRes.status, `Gmail list failed: ${detail.slice(0, 200)}`)
  }
  const listData = (await listRes.json()) as { messages?: Array<{ id: string }> }
  const ids = (listData.messages ?? []).map((m) => m.id)

  const summaries: Array<{ id: string; subject: string; from: string; snippet: string; receivedAt: string | null }> = []
  for (const id of ids) {
    const r = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
      { headers: { authorization: `Bearer ${accessToken}` } },
    )
    if (!r.ok) continue
    const m = (await r.json()) as {
      snippet?: string
      payload?: { headers?: Array<{ name?: string; value?: string }> }
      internalDate?: string
    }
    const headers = (m.payload?.headers ?? []).reduce<Record<string, string>>(
      (acc, h) => {
        if (h.name && h.value) acc[h.name.toLowerCase()] = h.value
        return acc
      },
      {},
    )
    const receivedAt = m.internalDate
      ? new Date(parseInt(m.internalDate, 10)).toISOString()
      : null
    summaries.push({
      id,
      subject: headers['subject'] || '(no subject)',
      from: headers['from'] || '(unknown)',
      snippet: m.snippet || '',
      receivedAt,
    })
    // Record an inbound message row so the agent can summarize / act on them.
    await supabase.from('messages').insert({
      recipient_id: recipientId,
      external_address: headers['from'] || null,
      channel: 'email',
      direction: 'inbound',
      body: `${headers['subject'] || ''}\n\n${m.snippet || ''}`,
    })
  }

  // Bookkeep last sync
  await supabase
    .from('integrations')
    .update({
      config: {
        ...((integ as any).config ?? {}),
        last_sync_at: new Date().toISOString(),
        last_sync_count: summaries.length,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('recipient_id', recipientId)
    .eq('provider', 'gmail')

  return new Response(
    JSON.stringify({
      ok: true,
      messageCount: summaries.length,
      messages: summaries,
    }),
    { headers: { 'content-type': 'application/json' } },
  )
}

// ─── Token helpers ─────────────────────────────────────────────────────

interface IntegrationRow {
  recipient_id: string
  provider: string
  external_account: string | null
  access_token_enc: string | null
  refresh_token_enc: string | null
  token_expires_at: string | null
  config: Record<string, unknown> | null
}

async function loadIntegration(
  supabase: any,
  recipientId: string,
  provider: 'google_calendar' | 'gmail',
): Promise<IntegrationRow | { error: string }> {
  const { data, error } = await supabase
    .from('integrations')
    .select(
      'recipient_id, provider, external_account, access_token_enc, refresh_token_enc, token_expires_at, config',
    )
    .eq('recipient_id', recipientId)
    .eq('provider', provider)
    .maybeSingle()
  if (error || !data) return { error: `${provider} is not connected for this recipient` }
  return data as IntegrationRow
}

async function ensureAccessToken(
  supabase: any,
  integ: IntegrationRow,
): Promise<string | null> {
  const expires = integ.token_expires_at ? new Date(integ.token_expires_at).getTime() : 0
  if (integ.access_token_enc && expires > Date.now() + 30_000) {
    return integ.access_token_enc
  }
  if (!integ.refresh_token_enc) return null
  try {
    const fresh = await refreshAccessToken(integ.refresh_token_enc)
    const newExpiry = new Date(Date.now() + fresh.expires_in * 1000).toISOString()
    await supabase
      .from('integrations')
      .update({
        access_token_enc: fresh.access_token,
        token_expires_at: newExpiry,
        updated_at: new Date().toISOString(),
      })
      .eq('recipient_id', integ.recipient_id)
      .eq('provider', integ.provider)
    return fresh.access_token
  } catch {
    return null
  }
}
