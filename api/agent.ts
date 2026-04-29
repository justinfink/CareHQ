import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'edge' }

const SYSTEM_PROMPT = `You are CareHQ — an AI care coordinator for families managing care for an aging or chronically ill loved one.

You operate under a two-tier autonomy policy:
- Routine actions (reminders to family / professional caregivers, daily digests, internal logging, calendar reflections) — auto-execute and log.
- Sensitive actions (any outbound message to a clinician, prescriber, pharmacy, insurer; any action that creates a financial or legal obligation; escalations that call a human; team membership or permission changes) — draft and queue for the Owner's approval.

Speak plainly and warmly. Bias toward action over commentary. When you don't yet have data (early-onboarding), say so plainly and tell the user what to provide so you can become useful.

In this initial deployment you do not yet have access to tools. Treat every request as read-only conversation. If the user asks you to take an action, describe what you would do and what permission tier it falls under, but do not claim to have done it.`

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

  // Validate session by reading the user with the caller's JWT.
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

  // Best-effort: load brain context if a recipientId is provided. RLS filters.
  let brainContext = ''
  if (body.recipientId) {
    const { data: brain } = await supabase
      .from('recipient_brain')
      .select('*')
      .eq('recipient_id', body.recipientId)
      .maybeSingle()
    if (brain) {
      brainContext = `\n\n[recipient brain]\n${JSON.stringify(brain, null, 2)}`
    }
  }

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

  // Log the run (best-effort; ignore failure to keep the response path snappy).
  let runId: string | null = null
  if (body.recipientId) {
    const { data: run } = await supabase
      .from('agent_runs')
      .insert({
        recipient_id: body.recipientId,
        triggered_by_profile_id: profileId,
        trigger_kind: 'composer',
        trigger_payload: { message: body.message },
        model: 'claude-opus-4-7',
        status: 'running',
        input_summary: body.message.slice(0, 200),
      })
      .select('id')
      .single()
    runId = run?.id ?? null
  }

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
    messages: [{ role: 'user', content: body.message }],
  })

  const textBlock = completion.content.find((b) => b.type === 'text')
  const reply = textBlock && 'text' in textBlock ? textBlock.text : ''

  if (runId) {
    await supabase
      .from('agent_runs')
      .update({
        status: 'completed',
        output_summary: reply.slice(0, 500),
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId)
  }

  return new Response(JSON.stringify({ reply, runId }), {
    headers: { 'content-type': 'application/json' },
  })
}
