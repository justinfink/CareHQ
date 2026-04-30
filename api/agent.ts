import Anthropic from '@anthropic-ai/sdk'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const config = { runtime: 'edge' }

const SYSTEM_PROMPT = `You are CareHQ — an AI care coordinator for families managing care for an aging or chronically ill loved one.

You operate under a two-tier autonomy policy:

ROUTINE (auto, no approval) — use the appropriate tool:
- Logging events that already happened (med taken/missed, mood, vitals, behavior, falls, notes)
- Updating the recipient's persistent context: conditions, medications, allergies, providers, baselines, preferences
- Asking clarifying questions
- Reporting on what you know

ROUTINE outbound — use send_sms directly:
- Reminders to a team member (family member or professional caregiver) the user has already added
- Acknowledgements / confirmations to a team member (e.g. "got it — logged 8am meds taken")
- Daily / weekly digests to family members on their preferred channel

SENSITIVE (drafted, queued for Owner approval via request_human_approval):
- Any outbound message to a clinician, prescriber, pharmacy, insurer, or external party
- Anything that creates a financial or legal obligation (booking an appointment that incurs a copay, signing a form, submitting a claim)
- Escalations that call a human (on-call nurse, emergency contact). Never claim 911 has been called — that path is human-only
- Adding/removing team members, changing roles or share scopes
- Edits to advance directives, POA records, or insurance details
- The first outbound message to any new external contact (subsequent messages in that thread can become routine if Owner approves the contact)

When the user tells you something happened, log it. When they tell you something stable about the recipient (a new med, a condition, a provider), update the brain. When they ask you to do something sensitive, draft it and queue it. When they ask a question, answer plainly and concisely from the brain + recent events you can see.

Speak warmly, plainly, and briefly. Avoid clinical hedging unless the user is asking for it.

If there is no care recipient yet, you can still answer general questions about how CareHQ works, but tell the user the agent's tools become available once they add a recipient on the Care tab.`

const MAX_TOOL_ROUNDS = 5

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

interface AgentRequest {
  recipientId?: string
  message: string
}

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const EVENT_KINDS = [
  'medication_taken',
  'medication_missed',
  'medication_logged',
  'vitals',
  'mobility',
  'behavior',
  'incident',
  'fall',
  'mood',
  'sleep',
  'meal',
  'hydration',
  'note',
  'message_sent',
  'message_received',
  'agent_action',
  'other',
]

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'log_event',
    description:
      'Record something that just happened or that the user is telling you about. Use this for medication taken/missed, mood changes, falls, behavior shifts, vitals, sleep, meals, and any free-form note about the recipient. Always log conservatively — when in doubt, log it. Do NOT use this for an event the user merely speculates about.',
    input_schema: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: EVENT_KINDS,
          description:
            'The category. medication_taken / medication_missed for adherence, fall for falls, behavior for behavioral changes, mood for mood, note for general observations.',
        },
        summary: {
          type: 'string',
          description: 'One-line human-readable summary, e.g. "Took morning lisinopril" or "Skipped 8am meds — was sleeping".',
        },
        occurred_at: {
          type: 'string',
          description: 'ISO 8601 timestamp. Omit for now.',
        },
        flagged: {
          type: 'boolean',
          description: 'Set true if this event needs human attention (e.g. a fall, a missed dose, a behavioral red flag).',
        },
        flag_reason: {
          type: 'string',
          description: 'Required if flagged is true. Short reason for the flag.',
        },
        details: {
          type: 'object',
          description: 'Structured payload — e.g. { medication: "lisinopril", dose: "10mg" } or { vitals: { systolic: 142, diastolic: 88 } }',
        },
      },
      required: ['kind', 'summary'],
    },
  },
  {
    name: 'update_recipient_brain',
    description:
      'Update the persistent context the agent loads on every conversation. Use when the user tells you a stable fact about the recipient: a new medication, a condition, a provider, an allergy, a baseline, a preference. Append a new item or replace the whole list.',
    input_schema: {
      type: 'object',
      properties: {
        field: {
          type: 'string',
          enum: ['conditions', 'medications', 'allergies', 'providers', 'baselines', 'preferences'],
        },
        operation: {
          type: 'string',
          enum: ['append', 'replace'],
          description: 'append adds value to the existing array. replace overwrites the entire field.',
        },
        value: {
          description:
            'For append on a list field, value is a single object — e.g. { name: "lisinopril", dose: "10mg", schedule: "morning" } for medications. For replace, value is the full new list or object.',
        },
      },
      required: ['field', 'operation', 'value'],
    },
  },
  {
    name: 'send_sms',
    description:
      'Send an SMS via the recipient\'s connected Twilio number. Use this ONLY for routine messages to team members (family or professional caregivers) the user has already added. For anyone external (clinician, pharmacy, insurer, unknown number) use request_human_approval instead.',
    input_schema: {
      type: 'object',
      properties: {
        to_member_id: {
          type: 'string',
          description:
            'The care_teams.id of the team member to text. Pull from the [Team] context block. Preferred over to_phone.',
        },
        to_phone: {
          type: 'string',
          description:
            'E.164 phone number (e.g. +14155551234). Only use if there is no team member id and you are confident the number belongs to a team member.',
        },
        body: {
          type: 'string',
          description:
            'The SMS text. Keep it under 320 chars; identify yourself as CareHQ on first message; include opt-out hint when introducing the agent.',
        },
      },
      required: ['body'],
    },
  },
  {
    name: 'request_human_approval',
    description:
      'Use for sensitive actions that the Owner must approve before they go out: outbound messages to clinicians/pharmacies/insurers, scheduling appointments that incur a cost, escalating to a human, changes to team membership, edits to advance directives. The action is queued in the Owner\'s Inbox; you do not execute it.',
    input_schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'One-line summary of what needs approval and why.',
        },
        proposed_action: {
          type: 'object',
          description:
            'Structured description of the action: { kind: "send_message", to: "Dr. Kapoor", channel: "email", body: "..." } or { kind: "schedule", with: "Dr. Kapoor", when: "next Tuesday afternoon" }. Be specific.',
        },
      },
      required: ['reason', 'proposed_action'],
    },
  },
]

interface ToolContext {
  supabase: SupabaseClient
  recipientId: string | null
  profileId: string
  agentRunId: string | null
}

async function executeTool(
  name: string,
  rawInput: unknown,
  ctx: ToolContext,
): Promise<Record<string, unknown>> {
  const input = (rawInput as Record<string, any>) || {}

  if (name === 'log_event') {
    if (!ctx.recipientId) {
      return {
        error:
          'No care recipient set up yet. Tell the user to add one in the Care tab.',
      }
    }
    const kind: string = input.kind
    const scopeKey =
      kind.startsWith('medication') ? 'event.medication' :
      kind === 'vitals' ? 'event.vitals' :
      kind === 'mobility' ? 'event.mobility' :
      kind === 'behavior' ? 'event.behavior' :
      kind === 'incident' ? 'event.incident' :
      kind === 'fall' ? 'event.fall' :
      kind === 'mood' ? 'event.mood' :
      kind === 'sleep' ? 'event.sleep' :
      kind === 'meal' ? 'event.meal' :
      kind === 'hydration' ? 'event.hydration' :
      kind.startsWith('message') ? 'event.message' :
      'event.note'

    const { data, error } = await ctx.supabase
      .from('events')
      .insert({
        recipient_id: ctx.recipientId,
        kind,
        scope_key: scopeKey,
        summary: input.summary?.toString().slice(0, 240) || null,
        occurred_at: input.occurred_at || new Date().toISOString(),
        flagged: !!input.flagged,
        flag_reason: input.flag_reason || null,
        payload: input.details || {},
        logged_by_profile_id: ctx.profileId,
        source_channel: 'app',
      })
      .select('id, occurred_at')
      .single()
    if (error) return { error: error.message }
    return { ok: true, eventId: (data as any).id, occurredAt: (data as any).occurred_at }
  }

  if (name === 'update_recipient_brain') {
    if (!ctx.recipientId) {
      return {
        error:
          'No care recipient set up yet. Tell the user to add one in the Care tab.',
      }
    }
    const field: string = input.field
    const operation: string = input.operation

    let nextValue: any = input.value
    if (operation === 'append') {
      const { data: row } = await ctx.supabase
        .from('recipient_brain')
        .select(field)
        .eq('recipient_id', ctx.recipientId)
        .maybeSingle()
      const current = (row as any)?.[field]
      const arr = Array.isArray(current) ? current : []
      nextValue = [...arr, input.value]
    }

    const { error } = await ctx.supabase
      .from('recipient_brain')
      .upsert(
        {
          recipient_id: ctx.recipientId,
          [field]: nextValue,
          updated_by: ctx.profileId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'recipient_id' },
      )
    if (error) return { error: error.message }
    return { ok: true, field, operation }
  }

  if (name === 'send_sms') {
    if (!ctx.recipientId) {
      return { error: 'No care recipient set up yet.' }
    }
    if (!input.body) return { error: 'body is required' }

    // Resolve destination
    let toPhone: string | null = null
    let memberId: string | null = null
    if (input.to_member_id) {
      const { data: m } = await ctx.supabase
        .from('care_teams')
        .select('id, contact_phone_e164, display_name')
        .eq('id', input.to_member_id)
        .eq('care_recipient_id', ctx.recipientId)
        .maybeSingle()
      if (!m) {
        return {
          error:
            'That team member does not exist or is not on this care team. Use request_human_approval instead.',
        }
      }
      toPhone = (m as any).contact_phone_e164
      memberId = (m as any).id
      if (!toPhone) {
        return {
          error: `Team member ${(m as any).display_name ?? memberId} has no phone number on file. Update the care team or use request_human_approval.`,
        }
      }
    } else if (input.to_phone) {
      toPhone = input.to_phone
      // Confirm it belongs to a team member; if not, refuse and require approval
      const { data: m } = await ctx.supabase
        .from('care_teams')
        .select('id')
        .eq('care_recipient_id', ctx.recipientId)
        .eq('contact_phone_e164', toPhone)
        .maybeSingle()
      if (!m) {
        return {
          error:
            'That phone number is not on this care team. Use request_human_approval for any external contact.',
        }
      }
      memberId = (m as any).id
    } else {
      return { error: 'to_member_id or to_phone required' }
    }

    // Look up Twilio integration
    const { data: integ, error: integErr } = await ctx.supabase
      .from('integrations')
      .select('external_account, access_token_enc, config')
      .eq('recipient_id', ctx.recipientId)
      .eq('provider', 'twilio')
      .maybeSingle()
    if (integErr) return { error: integErr.message }
    if (!integ) {
      return {
        error:
          'Twilio is not connected for this recipient. Tell the user to connect Twilio in Settings → Channels.',
      }
    }
    const sid = (integ as any).external_account
    const tok = (integ as any).access_token_enc
    const from = ((integ as any).config?.from as string) || ''
    if (!sid || !tok || !from) {
      return { error: 'Twilio integration is incomplete. Tell the user to reconnect.' }
    }

    // Send via Twilio REST API
    const auth = btoa(`${sid}:${tok}`)
    const params = new URLSearchParams({
      To: toPhone!,
      From: from,
      Body: input.body.toString().slice(0, 1200),
    })
    const sendRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          authorization: `Basic ${auth}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      },
    )
    if (!sendRes.ok) {
      const detail = await sendRes.text().catch(() => '')
      return { error: `Twilio rejected the send: ${sendRes.status} ${detail.slice(0, 200)}` }
    }
    const msg = (await sendRes.json()) as { sid?: string; status?: string }

    // Log to messages + an event row
    await ctx.supabase.from('messages').insert({
      recipient_id: ctx.recipientId,
      member_id: memberId,
      external_address: toPhone,
      channel: 'sms',
      direction: 'outbound',
      body: input.body.toString().slice(0, 1200),
      agent_run_id: ctx.agentRunId,
    })
    await ctx.supabase.from('events').insert({
      recipient_id: ctx.recipientId,
      kind: 'message_sent',
      scope_key: 'event.message',
      summary: `SMS to ${toPhone}: ${input.body.toString().slice(0, 120)}`,
      payload: { to: toPhone, body: input.body, twilioSid: msg.sid },
      source_channel: 'app',
      logged_by_profile_id: ctx.profileId,
    })

    return { ok: true, twilioSid: msg.sid, status: msg.status }
  }

  if (name === 'request_human_approval') {
    if (!ctx.recipientId) {
      return {
        error:
          'No care recipient set up yet. Tell the user to add one in the Care tab.',
      }
    }
    if (!ctx.agentRunId) {
      return {
        error:
          'No agent run id available. This is a CareHQ bug — log the action plainly in your reply instead.',
      }
    }
    const { data, error } = await ctx.supabase
      .from('agent_approvals')
      .insert({
        recipient_id: ctx.recipientId,
        agent_run_id: ctx.agentRunId,
        reason: input.reason?.toString().slice(0, 500) || 'Sensitive action',
        proposed_action: input.proposed_action || {},
      })
      .select('id')
      .single()
    if (error) return { error: error.message }
    return {
      ok: true,
      approvalId: (data as any).id,
      status: 'queued for owner approval in /inbox',
    }
  }

  return { error: `Unknown tool: ${name}` }
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') return jsonError(405, 'Method not allowed')

  if (!ANTHROPIC_API_KEY) {
    return jsonError(503, 'Agent not configured. Set ANTHROPIC_API_KEY in environment.')
  }
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

  let body: AgentRequest
  try {
    body = (await req.json()) as AgentRequest
  } catch {
    return jsonError(400, 'Invalid JSON body')
  }
  if (!body.message?.trim()) return jsonError(400, 'message is required')

  const recipientId = body.recipientId?.trim() || null

  // Load brain context (RLS-filtered)
  let brainContext = ''
  if (recipientId) {
    const { data: brain } = await supabase
      .from('recipient_brain')
      .select('*')
      .eq('recipient_id', recipientId)
      .maybeSingle()
    if (brain) {
      brainContext = `\n\n[Recipient brain — current state]\n${JSON.stringify(brain, null, 2)}`
    }
    // Also include the recipient name so the agent can address them
    const { data: rec } = await supabase
      .from('care_recipients')
      .select('name')
      .eq('id', recipientId)
      .maybeSingle()
    if (rec) {
      brainContext = `\n\n[Recipient name]\n${(rec as any).name}` + brainContext
    }
    // Care team — needed so the agent can pick the right to_member_id when sending SMS
    const { data: team } = await supabase
      .from('care_teams')
      .select('id, member_role, role, display_name, contact_phone_e164, contact_email, organization')
      .eq('care_recipient_id', recipientId)
    if (team && team.length > 0) {
      brainContext += `\n\n[Team — care_teams.id you can pass to send_sms.to_member_id]\n${JSON.stringify(team, null, 2)}`
    }
    // Channel integrations available
    const { data: integs } = await supabase
      .from('integrations')
      .select('provider, status, config')
      .eq('recipient_id', recipientId)
      .eq('status', 'active')
    if (integs && integs.length > 0) {
      brainContext += `\n\n[Active integrations]\n${JSON.stringify(
        integs.map((i: any) => ({ provider: i.provider, config: i.config })),
        null,
        2,
      )}`
    } else {
      brainContext += `\n\n[Active integrations]\nnone — send_sms will error until the user connects Twilio in Settings → Channels.`
    }
    // Recent events
    const { data: recent } = await supabase
      .from('events')
      .select('occurred_at, kind, summary, flagged')
      .eq('recipient_id', recipientId)
      .order('occurred_at', { ascending: false })
      .limit(20)
    if (recent && recent.length > 0) {
      brainContext += `\n\n[Recent events — last 20]\n${JSON.stringify(recent, null, 2)}`
    }
  } else {
    brainContext = '\n\n[No care recipient is configured yet. Tools that require one will return an error — tell the user to add a recipient on the Care tab.]'
  }

  // Open the agent run row
  let agentRunId: string | null = null
  {
    const { data: run } = await supabase
      .from('agent_runs')
      .insert({
        recipient_id: recipientId,
        triggered_by_profile_id: profileId,
        trigger_kind: 'composer',
        trigger_payload: { message: body.message },
        model: 'claude-opus-4-7',
        status: 'running',
        input_summary: body.message.slice(0, 200),
      })
      .select('id')
      .single()
    agentRunId = (run as any)?.id ?? null
  }

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: body.message },
  ]
  const toolsCalled: Array<{ name: string; input: unknown; result: unknown }> = []
  let finalText = ''
  let stopReason: Anthropic.Message['stop_reason'] = null
  let totalCostUsd = 0

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const completion = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT + brainContext,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: TOOLS,
      messages,
    })

    stopReason = completion.stop_reason
    // Best-effort cost tracking (USD per 1M tokens — Opus 4.x ballpark)
    const inputTok = completion.usage?.input_tokens ?? 0
    const outputTok = completion.usage?.output_tokens ?? 0
    totalCostUsd += (inputTok * 15 + outputTok * 75) / 1_000_000

    messages.push({ role: 'assistant', content: completion.content })

    const toolUses = completion.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    )

    if (toolUses.length === 0) {
      const textBlock = completion.content.find(
        (b): b is Anthropic.TextBlock => b.type === 'text',
      )
      finalText = textBlock?.text ?? ''
      break
    }

    const toolResultsBlocks: Anthropic.ToolResultBlockParam[] = []
    for (const tu of toolUses) {
      const result = await executeTool(tu.name, tu.input, {
        supabase,
        recipientId,
        profileId,
        agentRunId,
      })
      toolsCalled.push({ name: tu.name, input: tu.input, result })
      toolResultsBlocks.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: JSON.stringify(result),
      })
    }

    messages.push({ role: 'user', content: toolResultsBlocks })
  }

  // Close the run
  if (agentRunId) {
    await supabase
      .from('agent_runs')
      .update({
        status: 'completed',
        output_summary: finalText.slice(0, 500),
        tools_called: toolsCalled,
        cost_usd: Number(totalCostUsd.toFixed(4)),
        completed_at: new Date().toISOString(),
      })
      .eq('id', agentRunId)
  }

  return new Response(
    JSON.stringify({
      reply: finalText,
      runId: agentRunId,
      toolsCalled: toolsCalled.map((t) => t.name),
      stopReason,
    }),
    {
      headers: { 'content-type': 'application/json' },
    },
  )
}
