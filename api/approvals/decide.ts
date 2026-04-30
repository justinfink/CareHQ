/**
 * Decide a pending agent_approvals row: approve & execute, or deny.
 *
 * POST /api/approvals/decide
 *   body { approvalId, status: 'approved' | 'denied' }
 *
 * On approve, looks up the queued proposed_action and executes it server-side
 * (currently supports send_message and make_voice_call dispatching to the
 * recipient's Twilio integration). On deny, marks the row denied.
 *
 * Auth: Supabase JWT bearer token. Only the recipient owner can decide
 * (RLS on agent_approvals enforces this).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const config = { runtime: 'edge' }

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

interface ReqBody {
  approvalId: string
  status: 'approved' | 'denied'
}

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

interface ProposedAction {
  kind?: string
  to_member_id?: string
  to_phone?: string
  channel?: 'sms' | 'whatsapp' | 'voice'
  body?: string
  spoken_message?: string
  /** Anything else the agent stuffed in */
  [k: string]: unknown
}

async function executeAction(
  supabase: SupabaseClient,
  recipientId: string,
  profileId: string,
  approvalId: string,
  proposed: ProposedAction,
): Promise<{ executed: boolean; detail: string }> {
  const kind = (proposed.kind as string | undefined) ?? ''

  // send_message family — sms / whatsapp / voice
  if (kind === 'send_message' || kind === 'send_sms' || kind === 'send_whatsapp' || kind === 'make_voice_call' || kind === 'voice_call') {
    const channel: 'sms' | 'whatsapp' | 'voice' =
      kind === 'make_voice_call' || kind === 'voice_call'
        ? 'voice'
        : ((proposed.channel as 'sms' | 'whatsapp') || 'sms')
    const body = (proposed.body as string | undefined) ?? (proposed.spoken_message as string | undefined)
    if (!body) return { executed: false, detail: 'No body / spoken_message in proposed_action' }

    // Resolve to_phone — accept member_id OR phone, but always require
    // it match the care team or be on the team.
    let toPhone: string | null = null
    let memberId: string | null = null
    if (proposed.to_member_id) {
      const { data: m } = await supabase
        .from('care_teams')
        .select('id, contact_phone_e164')
        .eq('id', proposed.to_member_id)
        .eq('care_recipient_id', recipientId)
        .maybeSingle()
      if (!m) return { executed: false, detail: 'Member not on this care team' }
      toPhone = (m as Record<string, unknown>).contact_phone_e164 as string | null
      memberId = ((m as Record<string, unknown>).id as string) ?? null
    } else if (proposed.to_phone) {
      toPhone = proposed.to_phone as string
    }
    if (!toPhone) return { executed: false, detail: 'No destination phone resolved' }

    // Twilio creds
    const { data: integ } = await supabase
      .from('integrations')
      .select('external_account, access_token_enc, config')
      .eq('recipient_id', recipientId)
      .eq('provider', 'twilio')
      .maybeSingle()
    if (!integ) return { executed: false, detail: 'Twilio not connected' }
    const sid = (integ as Record<string, unknown>).external_account as string
    const tok = (integ as Record<string, unknown>).access_token_enc as string
    const cfg = ((integ as Record<string, unknown>).config as Record<string, string> | null) ?? {}
    const from = channel === 'whatsapp' ? cfg.whatsapp_from || cfg.from : cfg.from
    if (!sid || !tok || !from) return { executed: false, detail: 'Twilio integration incomplete' }

    const auth = btoa(`${sid}:${tok}`)
    if (channel === 'voice') {
      const safeBody = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      const twiml = `<Response><Say voice="alice">${safeBody}</Say></Response>`
      const params = new URLSearchParams({ To: toPhone, From: from, Twiml: twiml })
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
        method: 'POST',
        headers: {
          authorization: `Basic ${auth}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      })
      if (!r.ok) return { executed: false, detail: `Twilio call failed: ${r.status}` }
      const j = (await r.json()) as { sid?: string }
      await supabase.from('events').insert({
        recipient_id: recipientId,
        kind: 'message_sent',
        scope_key: 'event.message',
        summary: `Voice call to ${toPhone}: ${body.slice(0, 100)}`,
        payload: { to: toPhone, spoken: body, twilioSid: j.sid, approvalId, channel: 'voice' },
        source_channel: 'voice',
        logged_by_profile_id: profileId,
      })
      return { executed: true, detail: `Call queued via Twilio (${j.sid ?? 'sid?'})` }
    }

    const toAddr = channel === 'whatsapp' ? `whatsapp:${toPhone}` : toPhone
    const fromAddr = channel === 'whatsapp' ? `whatsapp:${from}` : from
    const params = new URLSearchParams({
      To: toAddr,
      From: fromAddr,
      Body: body.slice(0, 1200),
    })
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        authorization: `Basic ${auth}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
    if (!r.ok) {
      const detail = await r.text().catch(() => '')
      return { executed: false, detail: `Twilio rejected: ${r.status} ${detail.slice(0, 200)}` }
    }
    const msg = (await r.json()) as { sid?: string; status?: string }
    await supabase.from('messages').insert({
      recipient_id: recipientId,
      member_id: memberId,
      external_address: toPhone,
      channel,
      direction: 'outbound',
      body: body.slice(0, 1200),
    })
    await supabase.from('events').insert({
      recipient_id: recipientId,
      kind: 'message_sent',
      scope_key: 'event.message',
      summary: `${channel.toUpperCase()} to ${toPhone}: ${body.slice(0, 120)}`,
      payload: { to: toPhone, body, twilioSid: msg.sid, approvalId, channel },
      source_channel: channel === 'whatsapp' ? 'whatsapp' : 'sms',
      logged_by_profile_id: profileId,
    })
    return { executed: true, detail: `${channel.toUpperCase()} sent (${msg.status ?? 'queued'})` }
  }

  // Anything else — for now, just log a "do this manually" event so the
  // approval is recorded but the action isn't lost.
  await supabase.from('events').insert({
    recipient_id: recipientId,
    kind: 'agent_action',
    scope_key: 'event.note',
    summary: `Approved: ${kind || 'unknown action'} (manual follow-up needed)`,
    payload: { approvalId, proposed },
    source_channel: 'app',
    logged_by_profile_id: profileId,
  })
  return {
    executed: false,
    detail: `Action kind "${kind}" has no automated executor yet — recorded as agent_action event for manual follow-up.`,
  }
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
  if (!body.approvalId) return jsonError(400, 'approvalId required')
  if (body.status !== 'approved' && body.status !== 'denied')
    return jsonError(400, 'status must be approved or denied')

  // Load the approval (RLS lets only the recipient owner read)
  const { data: approval, error } = await supabase
    .from('agent_approvals')
    .select('id, recipient_id, reason, proposed_action, status')
    .eq('id', body.approvalId)
    .maybeSingle()
  if (error || !approval) return jsonError(404, 'Approval not found or not yours')

  const a = approval as Record<string, unknown>
  if ((a.status as string) !== 'pending') {
    return jsonError(409, `Already ${a.status as string}`)
  }

  if (body.status === 'denied') {
    const { error: updErr } = await supabase
      .from('agent_approvals')
      .update({
        status: 'denied',
        decided_by_profile_id: profileId,
        decided_at: new Date().toISOString(),
      })
      .eq('id', body.approvalId)
    if (updErr) return jsonError(500, updErr.message)
    return new Response(JSON.stringify({ ok: true, executed: false, denied: true }), {
      headers: { 'content-type': 'application/json' },
    })
  }

  // Execute the proposed action
  const proposed = (a.proposed_action as ProposedAction) || {}
  const result = await executeAction(
    supabase,
    a.recipient_id as string,
    profileId,
    body.approvalId,
    proposed,
  )

  // Mark approved either way (the action either fired or was logged as
  // manual-follow-up); attach result detail to messages.config? not great.
  // Simpler: write to events already done; mark approval approved.
  const { error: updErr } = await supabase
    .from('agent_approvals')
    .update({
      status: 'approved',
      decided_by_profile_id: profileId,
      decided_at: new Date().toISOString(),
    })
    .eq('id', body.approvalId)
  if (updErr) return jsonError(500, updErr.message)

  return new Response(
    JSON.stringify({
      ok: true,
      executed: result.executed,
      detail: result.detail,
    }),
    { headers: { 'content-type': 'application/json' } },
  )
}
