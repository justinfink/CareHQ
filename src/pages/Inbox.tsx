import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Inbox as InboxIcon, Check, X, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { getMyPrimaryRecipient } from '../api/recipient'
import { supabase } from '../lib/supabase'
import { authFetch } from '../api/client'

interface AgentApproval {
  id: string
  reason: string
  proposed_action: Record<string, unknown>
  status: string
  created_at: string
}

function formatProposedAction(action: Record<string, unknown>): string {
  if (!action || typeof action !== 'object') return ''
  return Object.entries(action)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join('\n')
}

export default function Inbox() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const recipientQuery = useQuery({
    queryKey: ['recipient', user?.id],
    queryFn: () => (user ? getMyPrimaryRecipient(user.id) : Promise.resolve(null)),
    enabled: !!user,
  })

  const approvalsQuery = useQuery({
    queryKey: ['agent_approvals', recipientQuery.data?.id],
    enabled: !!recipientQuery.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_approvals')
        .select('id, reason, proposed_action, status, created_at')
        .eq('recipient_id', recipientQuery.data!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as AgentApproval[]
    },
  })

  const decideMutation = useMutation({
    mutationFn: async (input: { id: string; status: 'approved' | 'denied' }) => {
      if (!user) throw new Error('Not signed in')
      const res = await authFetch('/api/approvals/decide', {
        method: 'POST',
        body: JSON.stringify({ approvalId: input.id, status: input.status }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || `Decide failed (${res.status})`)
      }
      return (await res.json()) as { ok: boolean; executed: boolean; detail?: string }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agent_approvals', recipientQuery.data?.id] })
      qc.invalidateQueries({ queryKey: ['events', recipientQuery.data?.id] })
    },
  })

  const approvals = approvalsQuery.data ?? []

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Inbox</h1>
      <p className="text-sm text-[var(--color-text-secondary)] mt-1 mb-6">
        Sensitive actions the agent wants you to approve before it acts.
      </p>

      {!recipientQuery.data ? (
        <div className="bg-white rounded-lg border border-[var(--color-border-subtle)] p-8 text-center">
          <InboxIcon size={28} className="inline-block text-[var(--color-text-tertiary)] mb-3" />
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            Once you set up a care recipient, the agent will queue any sensitive
            outbound action — messaging a clinician, scheduling something, or
            escalating — for your approval here.
          </p>
        </div>
      ) : approvalsQuery.isLoading ? (
        <div className="bg-white rounded-lg border border-[var(--color-border-subtle)] p-8 text-center">
          <Loader2 className="inline-block animate-spin text-[#0A7B6E]" size={20} />
        </div>
      ) : approvals.length === 0 ? (
        <div className="bg-white rounded-lg border border-[var(--color-border-subtle)] p-8 text-center">
          <InboxIcon size={28} className="inline-block text-[var(--color-text-tertiary)] mb-3" />
          <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
            You're caught up.
          </p>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            When the agent drafts a message to a clinician, schedules an appointment,
            or wants to escalate, it'll land here for one-tap approval.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((a) => {
            const isDeciding =
              decideMutation.isPending && decideMutation.variables?.id === a.id
            return (
              <div
                key={a.id}
                className="bg-white rounded-lg border border-[var(--color-border-subtle)] p-5"
              >
                <p className="font-semibold text-[var(--color-text-primary)]">
                  {a.reason}
                </p>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1 mb-3">
                  {format(new Date(a.created_at), "MMM d 'at' h:mm a")}
                </p>
                {Object.keys(a.proposed_action || {}).length > 0 ? (
                  <div className="bg-[var(--color-surface-alt)] border-l-2 border-[#0A7B6E] rounded-md p-3 mb-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[#0A7B6E] mb-1">
                      Proposed action
                    </div>
                    <pre className="text-xs text-[var(--color-text-primary)] whitespace-pre-wrap font-sans">
                      {formatProposedAction(a.proposed_action)}
                    </pre>
                  </div>
                ) : null}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => decideMutation.mutate({ id: a.id, status: 'denied' })}
                    disabled={isDeciding}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-alt)] transition disabled:opacity-40"
                  >
                    <X size={14} /> Deny
                  </button>
                  <button
                    type="button"
                    onClick={() => decideMutation.mutate({ id: a.id, status: 'approved' })}
                    disabled={isDeciding}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md bg-[#0A7B6E] hover:bg-[#0a6a5f] text-white transition disabled:opacity-40"
                  >
                    {isDeciding ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Approve
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
