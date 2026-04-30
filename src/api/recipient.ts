import { supabase } from '../lib/supabase'

export interface CareRecipient {
  id: string
  name: string
  dob: string | null
  photo_url: string | null
  twilio_number_e164: string | null
  google_calendar_id: string | null
  created_by: string
  created_at: string | null
  updated_at: string | null
}

export async function getMyPrimaryRecipient(
  ownerProfileId: string,
): Promise<CareRecipient | null> {
  const { data, error } = await supabase
    .from('care_recipients')
    .select('*')
    .eq('created_by', ownerProfileId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as unknown as CareRecipient | null) ?? null
}

export async function createRecipient(input: {
  name: string
  ownerProfileId: string
}): Promise<CareRecipient> {
  const { data, error } = await supabase
    .from('care_recipients')
    .insert({ name: input.name.trim(), created_by: input.ownerProfileId })
    .select('*')
    .single()
  if (error) throw error
  await supabase
    .from('recipient_brain')
    .insert({ recipient_id: (data as { id: string }).id })
    .select('recipient_id')
    .maybeSingle()
  await supabase.from('care_teams').insert({
    care_recipient_id: (data as { id: string }).id,
    user_id: input.ownerProfileId,
    role: 'admin',
    access_level: 'admin',
    member_role: 'owner',
  })
  return data as unknown as CareRecipient
}
