// Hand-typed minimum until we run `supabase gen types typescript --project-id qmxxbbzrcilqrtxwaaub`.
// Replace by generated types in a follow-up commit.

export type MemberRole =
  | 'owner'
  | 'coordinator'
  | 'family'
  | 'professional'
  | 'clinician'
  | 'observer'

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

export type MessageChannel = 'sms' | 'voice' | 'email' | 'app' | 'whatsapp'
export type MessageDirection = 'inbound' | 'outbound'
export type IntegrationProvider =
  | 'google_calendar'
  | 'gmail'
  | 'twilio'
  | 'apple_health'
  | 'pharmacy_browser'
export type AgentRunStatus =
  | 'pending'
  | 'running'
  | 'awaiting_approval'
  | 'completed'
  | 'failed'
  | 'cancelled'
export type ApprovalStatus = 'pending' | 'approved' | 'denied' | 'expired'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          phone_e164: string | null
          preferred_channel: MessageChannel | null
          google_access_token: string | null
          google_refresh_token: string | null
          token_expires_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & {
          id: string
          email: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }
      care_recipients: {
        Row: {
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
        Insert: Partial<Database['public']['Tables']['care_recipients']['Row']> & {
          name: string
          created_by: string
        }
        Update: Partial<Database['public']['Tables']['care_recipients']['Row']>
      }
      care_teams: {
        Row: {
          id: string
          care_recipient_id: string
          user_id: string
          role: string
          access_level: string
          member_role: MemberRole | null
          preferred_channel: MessageChannel | null
          contact_phone_e164: string | null
          contact_email: string | null
          organization: string | null
          display_name: string | null
          notes: string | null
          joined_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['care_teams']['Row']> & {
          care_recipient_id: string
          user_id: string
          role: string
          access_level: string
        }
        Update: Partial<Database['public']['Tables']['care_teams']['Row']>
      }
      events: {
        Row: {
          id: string
          recipient_id: string
          occurred_at: string
          kind: EventKind
          scope_key: string
          payload: Record<string, unknown>
          summary: string | null
          source_channel: MessageChannel | null
          source_member_id: string | null
          logged_by_profile_id: string | null
          flagged: boolean
          flag_reason: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['events']['Row']> & {
          recipient_id: string
          kind: EventKind
          scope_key: string
        }
        Update: Partial<Database['public']['Tables']['events']['Row']>
      }
      recipient_brain: {
        Row: {
          recipient_id: string
          conditions: unknown[]
          medications: unknown[]
          allergies: unknown[]
          providers: unknown[]
          insurance: unknown[]
          advance_directives: Record<string, unknown>
          baselines: Record<string, unknown>
          preferences: Record<string, unknown>
          recent_summary: string | null
          long_term_summary: string | null
          version: number
          updated_at: string
          updated_by: string | null
        }
        Insert: Partial<Database['public']['Tables']['recipient_brain']['Row']> & {
          recipient_id: string
        }
        Update: Partial<Database['public']['Tables']['recipient_brain']['Row']>
      }
      share_scopes: {
        Row: {
          id: string
          recipient_id: string
          member_id: string
          scope_key: string
          can_read: boolean
          can_write: boolean
          granted_by: string | null
          granted_at: string
        }
        Insert: Partial<Database['public']['Tables']['share_scopes']['Row']> & {
          recipient_id: string
          member_id: string
          scope_key: string
        }
        Update: Partial<Database['public']['Tables']['share_scopes']['Row']>
      }
      messages: {
        Row: {
          id: string
          recipient_id: string
          member_id: string | null
          external_address: string | null
          channel: MessageChannel
          direction: MessageDirection
          body: string | null
          attachments: unknown[]
          related_event_id: string | null
          agent_run_id: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['messages']['Row']> & {
          recipient_id: string
          channel: MessageChannel
          direction: MessageDirection
        }
        Update: Partial<Database['public']['Tables']['messages']['Row']>
      }
      integrations: {
        Row: {
          id: string
          recipient_id: string
          owner_profile_id: string
          provider: IntegrationProvider
          external_account: string | null
          access_token_enc: string | null
          refresh_token_enc: string | null
          token_expires_at: string | null
          config: Record<string, unknown>
          status: string
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['integrations']['Row']> & {
          recipient_id: string
          owner_profile_id: string
          provider: IntegrationProvider
        }
        Update: Partial<Database['public']['Tables']['integrations']['Row']>
      }
      agent_runs: {
        Row: {
          id: string
          recipient_id: string
          triggered_by_profile_id: string | null
          trigger_kind: string
          trigger_payload: Record<string, unknown> | null
          model: string
          status: AgentRunStatus
          input_summary: string | null
          output_summary: string | null
          tools_called: unknown[]
          cost_usd: number | null
          parent_run_id: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['agent_runs']['Row']> & {
          recipient_id: string
          trigger_kind: string
        }
        Update: Partial<Database['public']['Tables']['agent_runs']['Row']>
      }
      agent_approvals: {
        Row: {
          id: string
          recipient_id: string
          agent_run_id: string
          reason: string
          proposed_action: Record<string, unknown>
          status: ApprovalStatus
          decided_by_profile_id: string | null
          decided_at: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['agent_approvals']['Row']> & {
          recipient_id: string
          agent_run_id: string
          reason: string
          proposed_action: Record<string, unknown>
        }
        Update: Partial<Database['public']['Tables']['agent_approvals']['Row']>
      }
      audit_log: {
        Row: {
          id: number
          recipient_id: string | null
          actor_profile_id: string | null
          actor_kind: string
          action: string
          scope_key: string | null
          resource_table: string | null
          resource_id: string | null
          metadata: Record<string, unknown> | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['audit_log']['Row']> & {
          actor_kind: string
          action: string
        }
        Update: Partial<Database['public']['Tables']['audit_log']['Row']>
      }
    }
    Enums: {
      member_role: MemberRole
      event_kind: EventKind
      message_channel: MessageChannel
      message_direction: MessageDirection
      integration_provider: IntegrationProvider
      agent_run_status: AgentRunStatus
      approval_status: ApprovalStatus
    }
  }
}
