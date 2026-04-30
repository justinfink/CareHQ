/**
 * Twilio integration management endpoints.
 *
 * /api/integrations/twilio (POST)        — body { recipientId, action: 'connect'|'test'|'disconnect', accountSid?, authToken?, from?, to? }
 *
 * Auth: Supabase JWT bearer token in Authorization header.
 *
 * Stores creds on a row in public.integrations(provider='twilio') keyed by recipient_id.
 * NOTE: in V1 we store the auth_token as plain text in access_token_enc; this
 * needs to move to Supabase Vault / pgcrypto before going to production. RLS
 * already restricts the row to the recipient's owner.
 */

import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'edge' }

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

interface ReqBody {
  recipientId: string
  action: 'connect' | 'test' | 'disconnect'
  accountSid?: string
  authToken?: string
  from?: string
  to?: string
}

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

async function callTwilio(
  accountSid: string,
  authToken: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const auth = btoa(`${accountSid}:${authToken}`)
  return fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}${path}`, {
    ...init,
    headers: {
      authorization: `Basic ${auth}`,
      'content-type': 'application/x-www-form-urlencoded',
      ...(init.headers || {}),
    },
  })
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') return jsonError(405, 'Method not allowed')
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return jsonError(503, 'Supabase not configured on server.')
  }

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
  if (!body.recipientId) return jsonError(400, 'recipientId is required')

  if (body.action === 'connect') {
    if (!body.accountSid || !body.authToken || !body.from) {
      return jsonError(400, 'accountSid, authToken, and from are required')
    }
    // Validate creds by fetching account info
    const accRes = await callTwilio(body.accountSid, body.authToken, '.json')
    if (!accRes.ok) {
      const detail = await accRes.text().catch(() => '')
      return jsonError(400, `Twilio rejected those credentials: ${accRes.status} ${detail.slice(0, 200)}`)
    }
    const acc = (await accRes.json()) as { friendly_name?: string; status?: string }

    // Validate the From number actually belongs to that account
    const numRes = await callTwilio(
      body.accountSid,
      body.authToken,
      `/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(body.from)}`,
    )
    let numberOk = false
    if (numRes.ok) {
      const nd = (await numRes.json()) as { incoming_phone_numbers?: unknown[] }
      numberOk = (nd.incoming_phone_numbers ?? []).length > 0
    }
    if (!numberOk) {
      return jsonError(
        400,
        `From number ${body.from} is not on this Twilio account. Use a number you own (Active Numbers in console).`,
      )
    }

    const { error: upErr } = await supabase
      .from('integrations')
      .upsert(
        {
          recipient_id: body.recipientId,
          owner_profile_id: profileId,
          provider: 'twilio',
          external_account: body.accountSid,
          access_token_enc: body.authToken,
          token_expires_at: null,
          config: {
            from: body.from,
            account_friendly_name: acc.friendly_name ?? null,
          },
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'recipient_id,provider,external_account' },
      )
    if (upErr) return jsonError(500, upErr.message)

    return new Response(
      JSON.stringify({
        ok: true,
        accountFriendlyName: acc.friendly_name ?? null,
        from: body.from,
      }),
      { headers: { 'content-type': 'application/json' } },
    )
  }

  if (body.action === 'test') {
    if (!body.to) return jsonError(400, 'to is required')
    // Pull stored creds (RLS ensures owner-only)
    const { data: integ, error } = await supabase
      .from('integrations')
      .select('external_account, access_token_enc, config')
      .eq('recipient_id', body.recipientId)
      .eq('provider', 'twilio')
      .maybeSingle()
    if (error || !integ) return jsonError(404, 'Twilio not connected for this recipient')
    const sid = (integ as any).external_account
    const tok = (integ as any).access_token_enc
    const from = ((integ as any).config?.from as string) || ''
    if (!sid || !tok || !from) {
      return jsonError(400, 'Twilio integration is missing fields. Reconnect.')
    }
    const params = new URLSearchParams({
      To: body.to,
      From: from,
      Body: 'CareHQ test message — your Twilio integration is wired correctly. Reply STOP to opt out.',
    })
    const sendRes = await callTwilio(sid, tok, '/Messages.json', {
      method: 'POST',
      body: params.toString(),
    })
    if (!sendRes.ok) {
      const detail = await sendRes.text().catch(() => '')
      return jsonError(400, `Twilio send failed: ${sendRes.status} ${detail.slice(0, 200)}`)
    }
    const msg = (await sendRes.json()) as { sid?: string; status?: string }
    // Log into our messages table
    await supabase.from('messages').insert({
      recipient_id: body.recipientId,
      external_address: body.to,
      channel: 'sms',
      direction: 'outbound',
      body: 'CareHQ test message',
    })
    return new Response(
      JSON.stringify({ ok: true, twilioSid: msg.sid, status: msg.status }),
      { headers: { 'content-type': 'application/json' } },
    )
  }

  if (body.action === 'disconnect') {
    const { error } = await supabase
      .from('integrations')
      .delete()
      .eq('recipient_id', body.recipientId)
      .eq('provider', 'twilio')
    if (error) return jsonError(500, error.message)
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    })
  }

  return jsonError(400, `Unknown action: ${body.action}`)
}
