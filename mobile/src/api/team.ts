import { supabase } from '../lib/supabase'

export type MemberRole =
  | 'owner'
  | 'coordinator'
  | 'family'
  | 'professional'
  | 'clinician'
  | 'observer'

export interface PendingInvite {
  id: string
  recipient_id: string
  email: string
  member_role: MemberRole
  display_name: string | null
  organization: string | null
  contact_phone_e164: string | null
  status: string
  created_at: string
}

export async function listPendingInvites(recipientId: string): Promise<PendingInvite[]> {
  const { data, error } = await supabase
    .from('care_team_invites')
    .select('id, recipient_id, email, member_role, display_name, organization, contact_phone_e164, status, created_at')
    .eq('recipient_id', recipientId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as PendingInvite[]
}

export async function inviteMember(input: {
  recipientId: string
  email: string
  memberRole: MemberRole
  displayName?: string
  organization?: string
  contactPhoneE164?: string
  invitedByProfileId: string
}): Promise<PendingInvite> {
  const { data, error } = await supabase
    .from('care_team_invites')
    .upsert(
      {
        recipient_id: input.recipientId,
        email: input.email.toLowerCase().trim(),
        member_role: input.memberRole,
        display_name: input.displayName ?? null,
        organization: input.organization ?? null,
        contact_phone_e164: input.contactPhoneE164 ?? null,
        invited_by_profile_id: input.invitedByProfileId,
        status: 'pending',
      },
      { onConflict: 'recipient_id,email' },
    )
    .select('*')
    .single()
  if (error) throw error
  return data as PendingInvite
}

export async function revokeInvite(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from('care_team_invites')
    .update({ status: 'revoked' })
    .eq('id', inviteId)
  if (error) throw error
}
