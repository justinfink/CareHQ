import { supabase } from '../lib/supabase'

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE || 'https://carehq-app.vercel.app'

export interface AgentResponse {
  reply: string
  runId: string | null
}

/**
 * Send a message to the CareHQ agent. The mobile bundle never carries the
 * Anthropic key — this hits /api/agent on Vercel, which validates the
 * caller's Supabase JWT and proxies to Claude.
 */
export async function askAgent(input: {
  message: string
  recipientId?: string
}): Promise<AgentResponse> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not signed in')

  const res = await fetch(`${API_BASE}/api/agent`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message: input.message,
      recipientId: input.recipientId,
    }),
  })

  if (!res.ok) {
    let detail = ''
    try {
      const j = await res.json()
      detail = j?.error || ''
    } catch {
      // ignore
    }
    throw new Error(detail || `Agent request failed (${res.status})`)
  }

  return (await res.json()) as AgentResponse
}
