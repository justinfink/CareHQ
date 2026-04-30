import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Sparkles, Send, MessageSquarePlus, ChevronRight, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { askAgent } from '../api/agent'
import { getMyPrimaryRecipient } from '../api/recipient'
import { listRecentEvents, logNoteEvent } from '../api/events'

const greetingForHour = (h: number) =>
  h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'

const toolLabel = (name: string): string => {
  switch (name) {
    case 'log_event':
      return 'Logged an event'
    case 'update_recipient_brain':
      return 'Updated the brain'
    case 'request_human_approval':
      return 'Queued for your approval'
    case 'send_message':
      return 'Sent a message'
    case 'make_voice_call':
      return 'Placed a call'
    case 'check_drug_interactions':
      return 'Checked drug interactions'
    default:
      return name
  }
}

export default function Stream() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const today = new Date()
  const greeting = greetingForHour(today.getHours())
  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'there'

  const recipientQuery = useQuery({
    queryKey: ['recipient', user?.id],
    queryFn: () => (user ? getMyPrimaryRecipient(user.id) : Promise.resolve(null)),
    enabled: !!user,
  })
  const recipient = recipientQuery.data ?? null

  const eventsQuery = useQuery({
    queryKey: ['events', recipient?.id],
    queryFn: () => (recipient ? listRecentEvents(recipient.id) : Promise.resolve([])),
    enabled: !!recipient,
  })
  const events = eventsQuery.data ?? []

  const [composer, setComposer] = useState('')
  const [agentReply, setAgentReply] = useState<string | null>(null)
  const [agentTools, setAgentTools] = useState<string[]>([])
  const [agentError, setAgentError] = useState<string | null>(null)

  const askMutation = useMutation({
    mutationFn: (message: string) => askAgent({ message, recipientId: recipient?.id }),
    onSuccess: (res) => {
      setAgentReply(res.reply)
      setAgentTools(res.toolsCalled ?? [])
      setAgentError(null)
      qc.invalidateQueries({ queryKey: ['events', recipient?.id] })
      qc.invalidateQueries({ queryKey: ['recipient_brain', recipient?.id] })
      qc.invalidateQueries({ queryKey: ['agent_approvals', recipient?.id] })
    },
    onError: (err: Error) => {
      setAgentError(err.message)
      setAgentReply(null)
      setAgentTools([])
    },
  })

  const noteMutation = useMutation({
    mutationFn: async (body: string) => {
      if (!recipient) throw new Error('No care recipient yet')
      if (!user) throw new Error('Not signed in')
      return logNoteEvent({
        recipientId: recipient.id,
        body,
        loggedByProfileId: user.id,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events', recipient?.id] })
    },
  })

  const handleAsk = useCallback(() => {
    const msg = composer.trim()
    if (!msg) return
    askMutation.mutate(msg)
    setComposer('')
  }, [composer, askMutation])

  const handleLog = useCallback(() => {
    const msg = composer.trim()
    if (!msg) return
    noteMutation.mutate(msg)
    setComposer('')
  }, [composer, noteMutation])

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
        {greeting}, {firstName}.
      </h1>
      <p className="text-sm text-[var(--color-text-secondary)] mt-1 mb-6">
        {recipient
          ? `${recipient.name}'s care · ${format(today, 'EEEE, MMMM d')}`
          : format(today, 'EEEE, MMMM d')}
      </p>

      {/* Composer */}
      <div className="bg-white rounded-lg border border-[var(--color-border-subtle)] p-5 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-[#0A7B6E]" />
          <span className="text-xs font-medium text-[var(--color-text-secondary)]">
            Ask the agent or log something
          </span>
        </div>
        <textarea
          value={composer}
          onChange={(e) => setComposer(e.target.value)}
          placeholder={
            recipient
              ? `e.g. "How is ${recipient.name} doing this week?" or "Mom skipped her morning meds"`
              : `e.g. "How does CareHQ work?" — set up a care recipient under Care to log events`
          }
          rows={3}
          disabled={askMutation.isPending || noteMutation.isPending}
          className="w-full text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none resize-none disabled:opacity-50"
        />
        <div className="flex justify-end gap-2 mt-3">
          <button
            type="button"
            onClick={handleLog}
            disabled={!composer.trim() || !recipient || noteMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)] transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <MessageSquarePlus size={14} />
            {noteMutation.isPending ? 'Saving…' : 'Log as note'}
          </button>
          <button
            type="button"
            onClick={handleAsk}
            disabled={!composer.trim() || askMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md bg-[#0A7B6E] hover:bg-[#0a6a5f] text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {askMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {askMutation.isPending ? 'Thinking…' : 'Ask'}
          </button>
        </div>
        {agentReply ? (
          <div className="mt-4 bg-[var(--color-brand-primary-light)] rounded-md p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#0A7B6E] mb-1">
              Agent
            </div>
            <p className="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">
              {agentReply}
            </p>
            {agentTools.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {agentTools.map((t, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-medium text-[#0A7B6E] border border-[#0A7B6E] bg-white px-2 py-0.5 rounded-full"
                  >
                    {toolLabel(t)}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        {agentError ? (
          <div className="mt-4 bg-[var(--color-status-alert-light,#fef2f2)] rounded-md p-3">
            <p className="text-sm text-[var(--color-status-alert)]">{agentError}</p>
          </div>
        ) : null}
      </div>

      {!recipient && !recipientQuery.isLoading ? (
        <Link
          to="/care"
          className="flex items-center gap-3 bg-white rounded-lg border-l-4 border-[#0A7B6E] border-y border-r border-[var(--color-border-subtle)] p-4 mb-6 hover:bg-[var(--color-surface-alt)] transition"
        >
          <div className="flex-1">
            <div className="font-semibold text-sm text-[var(--color-text-primary)] mb-0.5">
              Set up your care recipient
            </div>
            <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              Add the person you're caring for so the agent can keep track of meds,
              providers, and what's been happening.
            </div>
          </div>
          <ChevronRight size={20} className="text-[var(--color-text-tertiary)]" />
        </Link>
      ) : null}

      <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
        Recent activity
      </h2>
      {!recipient ? (
        <div className="bg-white rounded-lg border border-[var(--color-border-subtle)] p-6 text-center text-sm text-[var(--color-text-secondary)] leading-relaxed">
          Once you set up a care recipient and start logging, what's been happening
          will appear here.
        </div>
      ) : eventsQuery.isLoading ? (
        <div className="bg-white rounded-lg border border-[var(--color-border-subtle)] p-6 text-center">
          <Loader2 className="inline-block animate-spin text-[#0A7B6E]" size={20} />
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-lg border border-[var(--color-border-subtle)] p-6 text-center text-sm text-[var(--color-text-secondary)] leading-relaxed">
          Nothing has been logged yet. Use the composer above to log a note or ask
          the agent something.
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <div
              key={e.id}
              className="flex items-start gap-3 bg-white rounded-lg border border-[var(--color-border-subtle)] p-4"
            >
              <div className="w-2 h-2 rounded-full bg-[#0A7B6E] mt-2" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--color-text-primary)]">
                  {e.summary || e.kind}
                </div>
                <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5 capitalize">
                  {format(new Date(e.occurred_at), "MMM d 'at' h:mm a")} · {e.kind.replace(/_/g, ' ')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
