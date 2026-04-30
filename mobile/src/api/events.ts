import { supabase } from '../lib/supabase'

export type EventKind =
  | 'medication_taken'
  | 'medication_missed'
  | 'medication_logged'
  | 'vitals'
  | 'mobility'
  | 'behavior'
  | 'incident'
  | 'fall'
  | 'mood'
  | 'sleep'
  | 'meal'
  | 'hydration'
  | 'note'
  | 'message_sent'
  | 'message_received'
  | 'agent_action'
  | 'other'

export interface CareEvent {
  id: string
  recipient_id: string
  occurred_at: string
  kind: EventKind
  scope_key: string
  payload: Record<string, unknown>
  summary: string | null
  source_channel: string | null
  source_member_id: string | null
  logged_by_profile_id: string | null
  flagged: boolean
  flag_reason: string | null
  created_at: string
}

export async function listRecentEvents(
  recipientId: string,
  limit = 20,
): Promise<CareEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('recipient_id', recipientId)
    .order('occurred_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as CareEvent[]
}

export async function logNoteEvent(input: {
  recipientId: string
  body: string
  loggedByProfileId: string
}): Promise<CareEvent> {
  const { data, error } = await supabase
    .from('events')
    .insert({
      recipient_id: input.recipientId,
      kind: 'note',
      scope_key: 'event.note',
      summary: input.body.slice(0, 200),
      payload: { body: input.body },
      source_channel: 'app',
      logged_by_profile_id: input.loggedByProfileId,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as CareEvent
}
