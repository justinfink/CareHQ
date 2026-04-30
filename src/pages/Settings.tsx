import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  LogOut,
  Mail,
  User as UserIcon,
  MessageSquare,
  X,
  Check,
  Plug,
  CalendarDays,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getMyPrimaryRecipient } from '../api/recipient'
import {
  connectTwilio,
  testTwilio,
  disconnectTwilio,
  getTwilioStatus,
  type TwilioStatus,
  getGoogleStatus,
  initGoogleOAuth,
  syncGoogleCalendar,
  syncGmail,
  disconnectGoogle,
  type GoogleConnections,
} from '../api/integrations'

function ModalShell({
  title,
  Icon,
  onClose,
  children,
}: {
  title: string
  Icon: typeof MessageSquare
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-2">
            <Icon size={18} className="text-[#0A7B6E]" />
            <h3 className="font-semibold text-[var(--color-text-primary)]">{title}</h3>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

function TwilioModal({
  recipientId,
  onClose,
}: {
  recipientId: string
  onClose: () => void
}) {
  const qc = useQueryClient()
  const statusQuery = useQuery<TwilioStatus>({
    queryKey: ['twilio_status', recipientId],
    queryFn: () => getTwilioStatus(recipientId),
  })
  const status = statusQuery.data ?? { connected: false }

  const [accountSid, setAccountSid] = useState('')
  const [authToken, setAuthToken] = useState('')
  const [from, setFrom] = useState('')
  const [testTo, setTestTo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (status.from) setFrom(status.from)
  }, [status.from])

  const connect = useMutation({
    mutationFn: () => connectTwilio({ recipientId, accountSid, authToken, from }),
    onSuccess: (r) => {
      setSuccess(`Connected to ${r.accountFriendlyName ?? 'Twilio'} (${r.from})`)
      setError(null)
      qc.invalidateQueries({ queryKey: ['twilio_status', recipientId] })
    },
    onError: (e: Error) => {
      setError(e.message)
      setSuccess(null)
    },
  })
  const send = useMutation({
    mutationFn: () => testTwilio({ recipientId, to: testTo }),
    onSuccess: (r) => {
      setSuccess(`Test SMS sent (Twilio status: ${r.status ?? 'queued'})`)
      setError(null)
    },
    onError: (e: Error) => setError(e.message),
  })
  const disconnect = useMutation({
    mutationFn: () => disconnectTwilio(recipientId),
    onSuccess: () => {
      setSuccess('Twilio disconnected')
      qc.invalidateQueries({ queryKey: ['twilio_status', recipientId] })
    },
    onError: (e: Error) => setError(e.message),
  })

  return (
    <ModalShell title="Twilio (SMS · Voice · WhatsApp)" Icon={MessageSquare} onClose={onClose}>
      <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-4">
        Connect your own Twilio account so the agent can text or call team members.
      </p>
      {status.connected ? (
        <div className="flex items-start gap-2 bg-[var(--color-status-ok-light,#f0fff4)] rounded-md p-3 mb-4">
          <Check size={14} className="text-[var(--color-status-ok,#16a34a)] mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-[var(--color-status-ok,#16a34a)]">
              Connected
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">
              {status.accountFriendlyName || 'Twilio account'} · From {status.from}
            </div>
          </div>
        </div>
      ) : null}

      <Field label="Account SID">
        <input
          value={accountSid}
          onChange={(e) => setAccountSid(e.target.value)}
          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          className="form-input"
        />
      </Field>
      <Field label="Auth Token">
        <input
          value={authToken}
          onChange={(e) => setAuthToken(e.target.value)}
          type="password"
          placeholder="32-char Twilio auth token"
          className="form-input"
        />
      </Field>
      <Field label="From number for SMS/voice (E.164)">
        <input
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          placeholder="+15551234567"
          className="form-input"
        />
      </Field>
      <button
        onClick={() => connect.mutate()}
        disabled={connect.isPending || !accountSid || !authToken || !from}
        className="w-full mt-3 py-2.5 rounded-md bg-[#0A7B6E] hover:bg-[#0a6a5f] text-white text-sm font-semibold disabled:opacity-40"
      >
        {connect.isPending ? 'Connecting…' : status.connected ? 'Update credentials' : 'Connect Twilio'}
      </button>

      {status.connected ? (
        <>
          <div className="my-4 border-t border-[var(--color-border-subtle)]" />
          <Field label="Send test SMS to">
            <input
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="+15551234567 (your phone)"
              className="form-input"
            />
          </Field>
          <button
            onClick={() => send.mutate()}
            disabled={send.isPending || !testTo}
            className="w-full mt-2 py-2.5 rounded-md border border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-alt)] text-[var(--color-text-primary)] text-sm font-medium disabled:opacity-40"
          >
            {send.isPending ? 'Sending…' : 'Send test SMS'}
          </button>
          <button
            onClick={() => disconnect.mutate()}
            disabled={disconnect.isPending}
            className="w-full mt-2 py-2.5 rounded-md bg-[var(--color-status-alert-light,#fef2f2)] text-[var(--color-status-alert)] text-sm font-medium disabled:opacity-40"
          >
            {disconnect.isPending ? 'Disconnecting…' : 'Disconnect'}
          </button>
        </>
      ) : null}

      {error ? (
        <p className="mt-3 text-xs text-[var(--color-status-alert)] bg-[var(--color-status-alert-light,#fef2f2)] p-2 rounded">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-3 text-xs text-[var(--color-status-ok,#16a34a)] bg-[var(--color-status-ok-light,#f0fff4)] p-2 rounded">
          {success}
        </p>
      ) : null}
    </ModalShell>
  )
}

function GoogleModal({
  recipientId,
  onClose,
}: {
  recipientId: string
  onClose: () => void
}) {
  const qc = useQueryClient()
  const statusQuery = useQuery<GoogleConnections>({
    queryKey: ['google_status', recipientId],
    queryFn: () => getGoogleStatus(recipientId),
  })
  const status = statusQuery.data
  const anyConnected = !!(status?.calendarConnected || status?.gmailConnected)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const connect = useMutation({
    mutationFn: async () => {
      const { url } = await initGoogleOAuth(recipientId)
      // On web we open in a new tab/window and listen for postMessage from the
      // callback page once it lands. Simplest implementation: redirect the same
      // window. Vercel callback HTML redirects to carehq:// which won't work on
      // web — instead, we flip to popup-based and poll status until updated.
      const popup = window.open(url, 'google-oauth', 'width=480,height=640')
      if (!popup) throw new Error('Popup blocked — allow popups and try again')
      // Poll until connection lands or popup closes
      await new Promise<void>((resolve, reject) => {
        const start = Date.now()
        const t = window.setInterval(async () => {
          if (popup.closed) {
            window.clearInterval(t)
            // Refresh status; if still not connected, treat as cancel
            const fresh = await getGoogleStatus(recipientId).catch(() => null)
            if (fresh && (fresh.calendarConnected || fresh.gmailConnected)) {
              resolve()
            } else {
              reject(new Error('Connection cancelled'))
            }
            return
          }
          if (Date.now() - start > 4 * 60 * 1000) {
            window.clearInterval(t)
            popup.close()
            reject(new Error('Connection timed out'))
            return
          }
        }, 1500)
      })
    },
    onSuccess: () => {
      setSuccess('Connected')
      setError(null)
      qc.invalidateQueries({ queryKey: ['google_status', recipientId] })
    },
    onError: (e: Error) => {
      setError(e.message)
      setSuccess(null)
    },
  })

  const syncCal = useMutation({
    mutationFn: () => syncGoogleCalendar(recipientId),
    onSuccess: (r) => setSuccess(`Calendar synced (${r.events.length} upcoming events)`),
    onError: (e: Error) => setError(e.message),
  })
  const syncMail = useMutation({
    mutationFn: () => syncGmail(recipientId),
    onSuccess: (r) => setSuccess(`Gmail synced (${r.messageCount} messages pulled)`),
    onError: (e: Error) => setError(e.message),
  })
  const disconnect = useMutation({
    mutationFn: () => disconnectGoogle(recipientId),
    onSuccess: () => {
      setSuccess('Disconnected')
      qc.invalidateQueries({ queryKey: ['google_status', recipientId] })
    },
    onError: (e: Error) => setError(e.message),
  })

  return (
    <ModalShell title="Google (Calendar · Gmail)" Icon={CalendarDays} onClose={onClose}>
      <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-4">
        Connect your Google account so CareHQ can read upcoming appointments and
        pull recent appointment / pharmacy / EOB emails. Read-only.
      </p>
      {anyConnected ? (
        <div className="flex items-start gap-2 bg-[var(--color-status-ok-light,#f0fff4)] rounded-md p-3 mb-4">
          <Check size={14} className="text-[var(--color-status-ok,#16a34a)] mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-[var(--color-status-ok,#16a34a)]">
              Connected {status?.account ? `as ${status.account}` : ''}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">
              {[status?.calendarConnected ? 'Calendar' : null, status?.gmailConnected ? 'Gmail' : null]
                .filter(Boolean)
                .join(' · ')}
              {status?.lastSyncAt
                ? ` · last sync ${new Date(status.lastSyncAt).toLocaleString()}`
                : ''}
            </div>
          </div>
        </div>
      ) : null}
      <button
        onClick={() => connect.mutate()}
        disabled={connect.isPending}
        className="w-full py-2.5 rounded-md bg-[#0A7B6E] hover:bg-[#0a6a5f] text-white text-sm font-semibold disabled:opacity-40"
      >
        {connect.isPending ? 'Waiting for Google…' : anyConnected ? 'Reconnect Google' : 'Connect Google'}
      </button>
      {anyConnected ? (
        <>
          <div className="my-4 border-t border-[var(--color-border-subtle)]" />
          <button
            onClick={() => syncCal.mutate()}
            disabled={syncCal.isPending}
            className="w-full mt-2 py-2.5 flex items-center justify-center gap-2 rounded-md border border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-alt)] text-[var(--color-text-primary)] text-sm font-medium disabled:opacity-40"
          >
            {syncCal.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Sync Calendar
          </button>
          <button
            onClick={() => syncMail.mutate()}
            disabled={syncMail.isPending}
            className="w-full mt-2 py-2.5 flex items-center justify-center gap-2 rounded-md border border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-alt)] text-[var(--color-text-primary)] text-sm font-medium disabled:opacity-40"
          >
            {syncMail.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Sync Gmail
          </button>
          <button
            onClick={() => disconnect.mutate()}
            disabled={disconnect.isPending}
            className="w-full mt-2 py-2.5 rounded-md bg-[var(--color-status-alert-light,#fef2f2)] text-[var(--color-status-alert)] text-sm font-medium disabled:opacity-40"
          >
            {disconnect.isPending ? 'Disconnecting…' : 'Disconnect'}
          </button>
        </>
      ) : null}
      {error ? (
        <p className="mt-3 text-xs text-[var(--color-status-alert)] bg-[var(--color-status-alert-light,#fef2f2)] p-2 rounded">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-3 text-xs text-[var(--color-status-ok,#16a34a)] bg-[var(--color-status-ok-light,#f0fff4)] p-2 rounded">
          {success}
        </p>
      ) : null}
    </ModalShell>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
        {label}
      </label>
      {children}
    </div>
  )
}

export default function Settings() {
  const { user, signOut } = useAuth()
  const fullName = (user?.user_metadata?.full_name as string | undefined) || null
  const email = user?.email || ''
  const [twilioOpen, setTwilioOpen] = useState(false)
  const [googleOpen, setGoogleOpen] = useState(false)

  const recipientQuery = useQuery({
    queryKey: ['recipient', user?.id],
    queryFn: () => (user ? getMyPrimaryRecipient(user.id) : Promise.resolve(null)),
    enabled: !!user,
  })

  const twilioStatus = useQuery<TwilioStatus>({
    queryKey: ['twilio_status', recipientQuery.data?.id],
    queryFn: () =>
      recipientQuery.data
        ? getTwilioStatus(recipientQuery.data.id)
        : Promise.resolve({ connected: false }),
    enabled: !!recipientQuery.data,
  })
  const googleStatus = useQuery<GoogleConnections>({
    queryKey: ['google_status', recipientQuery.data?.id],
    queryFn: () =>
      recipientQuery.data
        ? getGoogleStatus(recipientQuery.data.id)
        : Promise.resolve({ calendarConnected: false, gmailConnected: false, account: null, lastSyncAt: null, lastSyncCount: null }),
    enabled: !!recipientQuery.data,
  })
  const recipient = recipientQuery.data

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">Settings</h1>

      <div className="bg-white rounded-lg border border-[var(--color-border-subtle)] p-5 mb-4">
        <div className="flex items-center gap-3">
          <UserIcon size={18} className="text-[var(--color-text-tertiary)]" />
          <div>
            <div className="text-xs text-[var(--color-text-tertiary)]">Name</div>
            <div className="text-sm font-medium text-[var(--color-text-primary)]">{fullName || '—'}</div>
          </div>
        </div>
        <div className="my-3 border-t border-[var(--color-border-subtle)]" />
        <div className="flex items-center gap-3">
          <Mail size={18} className="text-[var(--color-text-tertiary)]" />
          <div>
            <div className="text-xs text-[var(--color-text-tertiary)]">Email</div>
            <div className="text-sm font-medium text-[var(--color-text-primary)]">{email}</div>
          </div>
        </div>
      </div>

      <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)] mb-2 mt-6">
        Channels
      </h2>
      <button
        type="button"
        onClick={() => recipient && setTwilioOpen(true)}
        disabled={!recipient}
        className="w-full text-left flex items-center gap-3 bg-white rounded-lg border border-[var(--color-border-subtle)] p-5 mb-2 hover:bg-[var(--color-surface-alt)] transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <MessageSquare size={18} className="text-[#0A7B6E]" />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-[var(--color-text-tertiary)]">Twilio · SMS, Voice, WhatsApp</div>
          <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
            {!recipient
              ? 'Add a care recipient first'
              : twilioStatus.data?.connected
                ? `Connected · ${twilioStatus.data.from}`
                : 'Not connected'}
          </div>
        </div>
        <Plug
          size={16}
          className={twilioStatus.data?.connected ? 'text-[var(--color-status-ok,#16a34a)]' : 'text-[var(--color-text-tertiary)]'}
        />
      </button>
      <button
        type="button"
        onClick={() => recipient && setGoogleOpen(true)}
        disabled={!recipient}
        className="w-full text-left flex items-center gap-3 bg-white rounded-lg border border-[var(--color-border-subtle)] p-5 hover:bg-[var(--color-surface-alt)] transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <CalendarDays size={18} className="text-[#0A7B6E]" />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-[var(--color-text-tertiary)]">Google · Calendar + Gmail</div>
          <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
            {!recipient
              ? 'Add a care recipient first'
              : googleStatus.data?.calendarConnected || googleStatus.data?.gmailConnected
                ? `Connected${googleStatus.data?.account ? ' · ' + googleStatus.data.account : ''}`
                : 'Not connected'}
          </div>
        </div>
        <Plug
          size={16}
          className={
            googleStatus.data?.calendarConnected || googleStatus.data?.gmailConnected
              ? 'text-[var(--color-status-ok,#16a34a)]'
              : 'text-[var(--color-text-tertiary)]'
          }
        />
      </button>
      <p className="text-xs text-[var(--color-text-tertiary)] leading-relaxed mt-2 mb-6">
        Connect your own accounts so the agent can text family / aides, place
        calls, read appointments, and pull pharmacy / clinic emails.
      </p>

      <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)] mb-2 mt-6">
        Account
      </h2>
      <button
        type="button"
        onClick={() => void signOut()}
        className="w-full flex items-center gap-3 bg-white rounded-lg border border-[var(--color-border-subtle)] p-5 hover:bg-[var(--color-status-alert-light,#fef2f2)] transition"
      >
        <LogOut size={18} className="text-[var(--color-status-alert)]" />
        <span className="text-sm font-semibold text-[var(--color-status-alert)]">Sign out</span>
      </button>
      <p className="text-xs text-center text-[var(--color-text-tertiary)] mt-12">
        CareHQ · v0.2 · early access
      </p>

      {recipient && twilioOpen ? (
        <TwilioModal recipientId={recipient.id} onClose={() => setTwilioOpen(false)} />
      ) : null}
      {recipient && googleOpen ? (
        <GoogleModal recipientId={recipient.id} onClose={() => setGoogleOpen(false)} />
      ) : null}

      <style>{`.form-input { width: 100%; border: 1px solid var(--color-border-subtle); border-radius: 6px; padding: 8px 12px; font-size: 14px; outline: none; }
        .form-input:focus { box-shadow: 0 0 0 2px #0A7B6E; }`}</style>
    </div>
  )
}
