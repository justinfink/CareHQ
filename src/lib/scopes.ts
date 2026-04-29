import type { MemberRole } from './database.types'

export const SCOPE_KEYS = [
  'brain.identity',
  'brain.conditions',
  'brain.medications',
  'brain.allergies',
  'brain.providers',
  'brain.insurance',
  'brain.advance_directives',
  'brain.baselines',
  'brain.preferences',
  'brain.finance',
  'event.medication',
  'event.vitals',
  'event.mobility',
  'event.behavior',
  'event.incident',
  'event.fall',
  'event.mood',
  'event.sleep',
  'event.meal',
  'event.hydration',
  'event.note',
  'event.message',
  'messages',
  'calendar',
  'team',
  'integrations',
] as const

export type ScopeKey = (typeof SCOPE_KEYS)[number]

interface ScopeGrant {
  read: boolean
  write: boolean
}

const ALL_READ_WRITE: Record<ScopeKey, ScopeGrant> = SCOPE_KEYS.reduce(
  (acc, k) => ({ ...acc, [k]: { read: true, write: true } }),
  {} as Record<ScopeKey, ScopeGrant>,
)

const READ_ONLY = (keys: ScopeKey[]): Record<ScopeKey, ScopeGrant> =>
  keys.reduce((acc, k) => ({ ...acc, [k]: { read: true, write: false } }), {} as Record<ScopeKey, ScopeGrant>)

const READ_WRITE = (keys: ScopeKey[]): Record<ScopeKey, ScopeGrant> =>
  keys.reduce((acc, k) => ({ ...acc, [k]: { read: true, write: true } }), {} as Record<ScopeKey, ScopeGrant>)

export const ROLE_DEFAULT_SCOPES: Record<MemberRole, Partial<Record<ScopeKey, ScopeGrant>>> = {
  owner: ALL_READ_WRITE,

  coordinator: {
    ...READ_WRITE([
      'brain.identity',
      'brain.conditions',
      'brain.medications',
      'brain.allergies',
      'brain.providers',
      'brain.insurance',
      'brain.baselines',
      'brain.preferences',
      'event.medication',
      'event.vitals',
      'event.mobility',
      'event.behavior',
      'event.incident',
      'event.fall',
      'event.mood',
      'event.sleep',
      'event.meal',
      'event.hydration',
      'event.note',
      'event.message',
      'messages',
      'calendar',
      'team',
    ]),
  },

  family: {
    ...READ_ONLY([
      'brain.identity',
      'brain.conditions',
      'brain.providers',
      'brain.baselines',
      'brain.preferences',
      'event.medication',
      'event.mobility',
      'event.behavior',
      'event.incident',
      'event.fall',
      'event.mood',
      'event.note',
      'calendar',
      'team',
    ]),
    ...READ_WRITE(['event.note', 'event.message', 'messages']),
  },

  professional: {
    ...READ_WRITE([
      'brain.identity',
      'brain.conditions',
      'brain.medications',
      'brain.allergies',
      'brain.preferences',
      'event.medication',
      'event.vitals',
      'event.mobility',
      'event.behavior',
      'event.incident',
      'event.fall',
      'event.mood',
      'event.sleep',
      'event.meal',
      'event.hydration',
      'event.note',
      'event.message',
      'messages',
      'calendar',
    ]),
    ...READ_ONLY(['brain.providers', 'brain.advance_directives', 'team']),
  },

  clinician: {
    ...READ_ONLY([
      'brain.identity',
      'brain.conditions',
      'brain.medications',
      'brain.allergies',
      'brain.providers',
      'brain.advance_directives',
      'brain.baselines',
      'event.medication',
      'event.vitals',
      'event.mobility',
      'event.incident',
      'event.fall',
      'event.behavior',
      'event.note',
      'calendar',
    ]),
    ...READ_WRITE(['event.note', 'event.message', 'messages']),
  },

  observer: {
    ...READ_ONLY(['brain.identity', 'event.note']),
  },
}

export function defaultScopesForRole(role: MemberRole): Array<{
  scope_key: ScopeKey
  can_read: boolean
  can_write: boolean
}> {
  const defaults = ROLE_DEFAULT_SCOPES[role]
  return SCOPE_KEYS.flatMap((key) => {
    const grant = defaults[key]
    if (!grant) return []
    return [{ scope_key: key, can_read: grant.read, can_write: grant.write }]
  })
}
