import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Heart,
  UserPlus,
  Plus,
  X,
  Pill,
  Stethoscope,
  ShieldAlert,
  Search,
  Loader2,
  Mail,
  Trash2,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  getMyPrimaryRecipient,
  createRecipient,
  type CareRecipient,
} from '../api/recipient'
import {
  searchMedications,
  searchConditions,
  searchProviders,
  type MedSuggestion,
  type ConditionSuggestion,
  type ProviderSuggestion,
} from '../api/catalog'
import {
  listPendingInvites,
  inviteMember,
  revokeInvite,
  type MemberRole,
  type PendingInvite,
} from '../api/team'
import { supabase } from '../lib/supabase'

type BrainField = 'medications' | 'conditions' | 'allergies' | 'providers'

interface BrainRow {
  conditions: any[]
  medications: any[]
  allergies: any[]
  providers: any[]
}

const FIELD_CONFIG: Record<
  BrainField,
  { title: string; placeholder: string; primaryKey: string; extraFields?: Array<{ key: string; placeholder: string }> }
> = {
  medications: {
    title: 'Add medication',
    placeholder: 'e.g. Lisinopril',
    primaryKey: 'name',
    extraFields: [
      { key: 'dose', placeholder: 'Dose (e.g. 10mg)' },
      { key: 'schedule', placeholder: 'Schedule (e.g. morning, with food)' },
    ],
  },
  conditions: {
    title: 'Add condition',
    placeholder: 'e.g. Hypertension',
    primaryKey: 'name',
    extraFields: [{ key: 'notes', placeholder: 'Notes (optional)' }],
  },
  allergies: {
    title: 'Add allergy',
    placeholder: 'e.g. Penicillin',
    primaryKey: 'name',
    extraFields: [{ key: 'severity', placeholder: 'Severity (e.g. anaphylactic)' }],
  },
  providers: {
    title: 'Add provider',
    placeholder: 'e.g. Dr. Kapoor',
    primaryKey: 'name',
    extraFields: [
      { key: 'specialty', placeholder: 'Specialty (e.g. Neurology)' },
      { key: 'phone', placeholder: 'Phone (optional)' },
      { key: 'organization', placeholder: 'Organization (optional)' },
    ],
  },
}

interface CatalogSuggestion {
  primaryLabel: string
  secondaryLabel?: string
  fill: Record<string, string>
}

function useCatalog(field: BrainField | null, query: string) {
  const [suggestions, setSuggestions] = useState<CatalogSuggestion[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!field || !query.trim() || query.trim().length < 2) {
      setSuggestions([])
      return
    }
    let cancelled = false
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        if (field === 'medications') {
          const meds: MedSuggestion[] = await searchMedications(query)
          if (cancelled) return
          setSuggestions(
            meds.map((m) => ({
              primaryLabel: m.name,
              secondaryLabel: `RxCUI ${m.rxcui}`,
              fill: { name: m.name, rxcui: m.rxcui },
            })),
          )
        } else if (field === 'conditions') {
          const conds: ConditionSuggestion[] = await searchConditions(query)
          if (cancelled) return
          setSuggestions(
            conds.map((c) => ({
              primaryLabel: c.name,
              secondaryLabel: `ICD-10 ${c.code}`,
              fill: { name: c.name, icd10: c.code },
            })),
          )
        } else if (field === 'providers') {
          const provs: ProviderSuggestion[] = await searchProviders(query)
          if (cancelled) return
          setSuggestions(
            provs.map((p) => {
              const where = [p.city, p.state].filter(Boolean).join(', ')
              return {
                primaryLabel: p.name,
                secondaryLabel: [p.specialty, where].filter(Boolean).join(' · '),
                fill: {
                  name: p.name,
                  npi: p.npi,
                  ...(p.specialty ? { specialty: p.specialty } : {}),
                  ...(p.organization ? { organization: p.organization } : {}),
                  ...(p.phone ? { phone: p.phone } : {}),
                },
              }
            }),
          )
        } else {
          setSuggestions([])
        }
      } catch {
        if (!cancelled) setSuggestions([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [field, query])

  return { suggestions, loading }
}

function AddItemModal({
  field,
  recipientId,
  ownerId,
  onClose,
}: {
  field: BrainField
  recipientId: string
  ownerId: string
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [primary, setPrimary] = useState('')
  const [extras, setExtras] = useState<Record<string, string>>({})
  const [catalogFill, setCatalogFill] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const config = FIELD_CONFIG[field]
  const { suggestions, loading: searching } = useCatalog(field, primary)
  const showSuggestions = field !== 'allergies' && suggestions.length > 0

  const pickSuggestion = (s: CatalogSuggestion) => {
    setPrimary(s.fill.name ?? s.primaryLabel)
    const fillExtras: Record<string, string> = {}
    for (const ef of config.extraFields ?? []) {
      if (s.fill[ef.key]) fillExtras[ef.key] = s.fill[ef.key]
    }
    setExtras((prev) => ({ ...prev, ...fillExtras }))
    const codes: Record<string, string> = {}
    for (const k of ['rxcui', 'icd10', 'npi']) {
      if (s.fill[k] && !fillExtras[k]) codes[k] = s.fill[k]
    }
    setCatalogFill(codes)
  }

  const append = useMutation({
    mutationFn: async () => {
      if (!primary.trim()) throw new Error('Name is required')
      const { data, error: readErr } = await supabase
        .from('recipient_brain')
        .select(field)
        .eq('recipient_id', recipientId)
        .maybeSingle()
      if (readErr) throw readErr
      const current = (data as Record<string, unknown> | null)?.[field]
      const arr = Array.isArray(current) ? current : []
      const item: Record<string, string> = { [config.primaryKey]: primary.trim() }
      for (const f of config.extraFields ?? []) {
        const v = extras[f.key]?.trim()
        if (v) item[f.key] = v
      }
      for (const [k, v] of Object.entries(catalogFill)) {
        if (v) item[k] = v
      }
      const { error: writeErr } = await supabase
        .from('recipient_brain')
        .upsert(
          {
            recipient_id: recipientId,
            [field]: [...arr, item],
            updated_by: ownerId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'recipient_id' },
        )
      if (writeErr) throw writeErr
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipient_brain', recipientId] })
      onClose()
    },
    onError: (err: Error) => setError(err.message),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border-subtle)]">
          <h3 className="font-semibold text-[var(--color-text-primary)]">{config.title}</h3>
          <button onClick={onClose} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">
          <div className="flex items-center gap-2 border border-[var(--color-border-subtle)] rounded-md px-3 mb-3">
            <Search size={14} className="text-[var(--color-text-tertiary)]" />
            <input
              autoFocus
              value={primary}
              onChange={(e) => {
                setPrimary(e.target.value)
                setCatalogFill({})
                setError(null)
              }}
              placeholder={config.placeholder}
              className="flex-1 py-2 text-sm focus:outline-none"
            />
            {searching ? <Loader2 size={14} className="text-[var(--color-text-tertiary)] animate-spin" /> : null}
          </div>
          {showSuggestions ? (
            <div className="border border-[var(--color-border-subtle)] rounded-md max-h-52 overflow-y-auto mb-3">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => pickSuggestion(s)}
                  className="w-full text-left px-3 py-2 hover:bg-[var(--color-brand-primary-light)] border-b border-[var(--color-border-subtle)] last:border-b-0 transition"
                >
                  <div className="text-sm font-medium text-[var(--color-text-primary)]">
                    {s.primaryLabel}
                  </div>
                  {s.secondaryLabel ? (
                    <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                      {s.secondaryLabel}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
          {(config.extraFields ?? []).map((f) => (
            <input
              key={f.key}
              value={extras[f.key] ?? ''}
              onChange={(e) => setExtras((s) => ({ ...s, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className="w-full border border-[var(--color-border-subtle)] rounded-md px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-[#0A7B6E]"
            />
          ))}
          {Object.keys(catalogFill).length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {Object.entries(catalogFill).map(([k, v]) => (
                <span
                  key={k}
                  className="text-[10px] uppercase tracking-wide font-medium text-[#0A7B6E] bg-[var(--color-brand-primary-light)] px-2 py-0.5 rounded-full"
                >
                  {k}: {v}
                </span>
              ))}
            </div>
          ) : null}
          {error ? <p className="text-xs text-[var(--color-status-alert)] mb-2">{error}</p> : null}
          <button
            type="button"
            onClick={() => append.mutate()}
            disabled={!primary.trim() || append.isPending}
            className="w-full mt-2 py-2.5 rounded-md bg-[#0A7B6E] hover:bg-[#0a6a5f] text-white text-sm font-semibold disabled:opacity-40"
          >
            {append.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function BrainSection({
  field,
  label,
  Icon,
  items,
  onAdd,
}: {
  field: BrainField
  label: string
  Icon: typeof Heart
  items: any[]
  onAdd: (f: BrainField) => void
}) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-[#0A7B6E]" />
          <span className="text-sm font-medium text-[var(--color-text-primary)]">{label}</span>
          <span className="text-xs text-[var(--color-text-tertiary)]">{items?.length ?? 0}</span>
        </div>
        <button
          type="button"
          onClick={() => onAdd(field)}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-[#0A7B6E] bg-[var(--color-brand-primary-light)] hover:opacity-80 transition"
        >
          <Plus size={12} /> Add
        </button>
      </div>
      {(items ?? []).length === 0 ? (
        <p className="text-xs text-[var(--color-text-tertiary)] mt-2">None added yet.</p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {items.map((item, i) => (
            <div
              key={i}
              className="bg-[var(--color-surface-alt)] rounded-md px-3 py-2"
            >
              <div className="text-sm font-medium text-[var(--color-text-primary)]">
                {item.name || JSON.stringify(item)}
              </div>
              {Object.entries(item)
                .filter(([k]) => k !== 'name')
                .slice(0, 5)
                .map(([k, v]) => (
                  <div key={k} className="text-xs text-[var(--color-text-secondary)] mt-0.5 capitalize">
                    {k}: {String(v)}
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CreateRecipientForm({
  onCreated,
}: {
  onCreated: (r: CareRecipient) => void
}) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const create = useMutation({
    mutationFn: async (n: string) => {
      if (!user) throw new Error('Not signed in')
      return createRecipient({ name: n, ownerProfileId: user.id })
    },
    onSuccess: (r) => onCreated(r),
    onError: (err: Error) => setError(err.message),
  })

  return (
    <div className="bg-white rounded-lg border border-[var(--color-border-subtle)] p-6">
      <Heart size={24} className="text-[#0A7B6E] mb-3" />
      <h3 className="font-semibold text-lg text-[var(--color-text-primary)] mb-2">
        Who are you caring for?
      </h3>
      <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-4">
        This is the person CareHQ will help you coordinate care for. You'll add
        their conditions, medications, providers, and team after.
      </p>
      <input
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          setError(null)
        }}
        placeholder="e.g. Mom, or Robert Chen"
        className="w-full border border-[var(--color-border-subtle)] rounded-md px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[#0A7B6E]"
      />
      {error ? <p className="text-xs text-[var(--color-status-alert)] mb-2">{error}</p> : null}
      <button
        type="button"
        onClick={() => name.trim() && create.mutate(name.trim())}
        disabled={!name.trim() || create.isPending}
        className="w-full py-2.5 rounded-md bg-[#0A7B6E] hover:bg-[#0a6a5f] text-white text-sm font-semibold disabled:opacity-40"
      >
        {create.isPending ? 'Adding…' : 'Add care recipient'}
      </button>
    </div>
  )
}

function InviteModal({
  recipientId,
  onClose,
}: {
  recipientId: string
  onClose: () => void
}) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<MemberRole>('family')
  const [error, setError] = useState<string | null>(null)

  const send = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not signed in')
      if (!email.trim()) throw new Error('Email is required')
      return inviteMember({
        recipientId,
        email,
        memberRole: role,
        displayName: name.trim() || undefined,
        invitedByProfileId: user.id,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team_invites', recipientId] })
      onClose()
    },
    onError: (e: Error) => setError(e.message),
  })

  const ROLES: { key: MemberRole; label: string }[] = [
    { key: 'family', label: 'Family' },
    { key: 'professional', label: 'Professional caregiver' },
    { key: 'clinician', label: 'Clinician' },
    { key: 'coordinator', label: 'Coordinator' },
    { key: 'observer', label: 'Observer (read-only)' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-[#0A7B6E]" />
            <h3 className="font-semibold text-[var(--color-text-primary)]">Invite a team member</h3>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-4">
            They'll join automatically when they sign in to CareHQ with this email.
            Roles map to permission scopes.
          </p>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
            Email
          </label>
          <input
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(null)
            }}
            type="email"
            autoComplete="email"
            placeholder="sister@example.com"
            className="w-full border border-[var(--color-border-subtle)] rounded-md px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[#0A7B6E]"
          />
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
            Display name (optional)
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Diana Elliott"
            className="w-full border border-[var(--color-border-subtle)] rounded-md px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[#0A7B6E]"
          />
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
            Role
          </label>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {ROLES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRole(r.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                  role === r.key
                    ? 'bg-[var(--color-brand-primary-light)] text-[#0A7B6E] border-[#0A7B6E]'
                    : 'bg-white text-[var(--color-text-primary)] border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-alt)]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          {error ? <p className="text-xs text-[var(--color-status-alert)] mb-2">{error}</p> : null}
          <button
            type="button"
            onClick={() => send.mutate()}
            disabled={!email.trim() || send.isPending}
            className="w-full py-2.5 rounded-md bg-[#0A7B6E] hover:bg-[#0a6a5f] text-white text-sm font-semibold disabled:opacity-40"
          >
            {send.isPending ? 'Sending…' : 'Send invite'}
          </button>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-3 leading-relaxed">
            Email/SMS delivery of invite notifications is on the roadmap; for now
            the invite waits in care_team_invites and is auto-accepted on the
            invitee's first sign-in.
          </p>
        </div>
      </div>
    </div>
  )
}

function RecipientView({ recipient }: { recipient: CareRecipient }) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [sheet, setSheet] = useState<BrainField | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)

  const brainQuery = useQuery({
    queryKey: ['recipient_brain', recipient.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipient_brain')
        .select('conditions, medications, allergies, providers')
        .eq('recipient_id', recipient.id)
        .maybeSingle()
      if (error) throw error
      return (data ?? null) as unknown as BrainRow | null
    },
  })

  interface CareTeamRow {
    id: string
    role: string
    member_role: string | null
    display_name: string | null
    contact_email: string | null
    organization: string | null
  }
  const teamQuery = useQuery({
    queryKey: ['care_team', recipient.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('care_teams')
        .select('id, role, member_role, display_name, contact_email, organization')
        .eq('care_recipient_id', recipient.id)
      if (error) throw error
      return (data ?? []) as unknown as CareTeamRow[]
    },
  })

  const invitesQuery = useQuery({
    queryKey: ['team_invites', recipient.id],
    queryFn: () => listPendingInvites(recipient.id),
  })

  const revoke = useMutation({
    mutationFn: revokeInvite,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team_invites', recipient.id] })
    },
  })

  const team = teamQuery.data ?? []
  const invites = invitesQuery.data ?? []
  const brain = brainQuery.data

  return (
    <div>
      <div className="flex items-center gap-3 bg-white rounded-lg border border-[var(--color-border-subtle)] p-5 mb-6">
        <Heart size={20} className="text-[#0A7B6E]" />
        <div className="flex-1">
          <div className="font-semibold text-lg text-[var(--color-text-primary)]">{recipient.name}</div>
          <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
            Care recipient · added {new Date(recipient.created_at ?? '').toLocaleDateString()}
          </div>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Brain</h2>
      <div className="bg-white rounded-lg border border-[var(--color-border-subtle)] p-5 mb-3 divide-y divide-[var(--color-border-subtle)]">
        <BrainSection field="medications" label="Medications" Icon={Pill} items={brain?.medications ?? []} onAdd={setSheet} />
        <BrainSection field="conditions" label="Conditions" Icon={Heart} items={brain?.conditions ?? []} onAdd={setSheet} />
        <BrainSection field="allergies" label="Allergies" Icon={ShieldAlert} items={brain?.allergies ?? []} onAdd={setSheet} />
        <BrainSection field="providers" label="Providers" Icon={Stethoscope} items={brain?.providers ?? []} onAdd={setSheet} />
      </div>
      <p className="text-xs text-[var(--color-text-tertiary)] leading-relaxed mb-6">
        You can also tell the agent on Home: "Add lisinopril 10mg morning" or
        "Mom is allergic to penicillin" — it'll update the brain for you.
      </p>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Care team</h2>
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-[#0A7B6E] bg-[var(--color-brand-primary-light)] hover:opacity-80 transition"
        >
          <UserPlus size={12} /> Invite
        </button>
      </div>
      {team.length === 0 ? (
        <div className="bg-white rounded-lg border border-[var(--color-border-subtle)] p-6 text-center text-sm text-[var(--color-text-secondary)] leading-relaxed mb-3">
          Just you so far. Tap Invite to add family or professional caregivers —
          they'll join the team automatically when they sign up with the email
          you invited.
        </div>
      ) : (
        <div className="space-y-2 mb-3">
          {team.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-lg border border-[var(--color-border-subtle)] p-4"
            >
              <div className="text-sm font-medium text-[var(--color-text-primary)]">
                {m.display_name || m.contact_email || 'Member'}
              </div>
              <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5 capitalize">
                {(m.member_role || m.role)?.toString()}
                {m.organization ? ` · ${m.organization}` : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      {invites.length > 0 ? (
        <>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)] mb-2">
            Pending invites
          </h3>
          <div className="space-y-2">
            {invites.map((inv: PendingInvite) => (
              <div
                key={inv.id}
                className="flex items-start gap-3 bg-white rounded-lg border border-[var(--color-border-subtle)] p-4"
              >
                <Mail size={14} className="text-[var(--color-text-tertiary)] mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--color-text-primary)]">
                    {inv.display_name || inv.email}
                  </div>
                  <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                    {inv.email} · {inv.member_role}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => revoke.mutate(inv.id)}
                  className="text-[var(--color-status-alert)] p-1 hover:bg-[var(--color-status-alert-light,#fef2f2)] rounded"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {sheet && user ? (
        <AddItemModal
          field={sheet}
          recipientId={recipient.id}
          ownerId={user.id}
          onClose={() => setSheet(null)}
        />
      ) : null}
      {inviteOpen ? (
        <InviteModal
          recipientId={recipient.id}
          onClose={() => setInviteOpen(false)}
        />
      ) : null}
    </div>
  )
}

export default function Care() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const recipientQuery = useQuery({
    queryKey: ['recipient', user?.id],
    queryFn: () => (user ? getMyPrimaryRecipient(user.id) : Promise.resolve(null)),
    enabled: !!user,
  })

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">Care</h1>
      {recipientQuery.isLoading ? (
        <div className="bg-white rounded-lg border border-[var(--color-border-subtle)] p-6 text-center">
          <Loader2 className="inline-block animate-spin text-[#0A7B6E]" size={20} />
        </div>
      ) : recipientQuery.data ? (
        <RecipientView recipient={recipientQuery.data} />
      ) : (
        <CreateRecipientForm
          onCreated={() => qc.invalidateQueries({ queryKey: ['recipient', user?.id] })}
        />
      )}
    </div>
  )
}
