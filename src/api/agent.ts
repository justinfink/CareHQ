import { authFetch } from './client'

export interface AgentResponse {
  reply: string
  runId: string | null
  toolsCalled?: string[]
  stopReason?: string | null
}

export async function askAgent(input: {
  message: string
  recipientId?: string
}): Promise<AgentResponse> {
  const res = await authFetch('/api/agent', {
    method: 'POST',
    body: JSON.stringify({
      message: input.message,
      recipientId: input.recipientId,
    }),
  })
  if (!res.ok) {
    let detail = ''
    try {
      const j = (await res.json()) as { error?: string }
      detail = j?.error || ''
    } catch {
      // ignore
    }
    throw new Error(detail || `Agent request failed (${res.status})`)
  }
  return (await res.json()) as AgentResponse
}
