/**
 * Searchable catalogs backed by free public APIs:
 *  - Medications: RxNav (NIH National Library of Medicine)
 *  - Conditions:  NIH Clinical Tables ICD-10-CM
 *  - Providers / Hospitals: NPI Registry (CMS)
 *
 * These are called directly from the mobile bundle (no server proxy)
 * because none of them require auth and React Native doesn't enforce CORS.
 */

const RXNAV_BASE = 'https://rxnav.nlm.nih.gov/REST'
const ICD10_BASE = 'https://clinicaltables.nlm.nih.gov/api/icd10cm/v3'
const NPI_BASE = 'https://npiregistry.cms.hhs.gov/api'

// ─── Medications (RxNav) ──────────────────────────────────────────────

export interface MedSuggestion {
  name: string
  rxcui: string
  /** Tradename, generic name, or branded form */
  category: string
}

interface RxNavApproximateResponse {
  approximateGroup?: {
    candidate?: Array<{
      rxcui?: string
      score?: string
      rank?: string
      name?: string
    }>
  }
}

interface RxNavRxcuiInfoResponse {
  idGroup?: {
    name?: string
  }
}

export async function searchMedications(
  term: string,
  limit = 8,
): Promise<MedSuggestion[]> {
  if (!term.trim()) return []
  const url = `${RXNAV_BASE}/approximateTerm.json?term=${encodeURIComponent(
    term,
  )}&maxEntries=${limit}`
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`RxNav approximateTerm failed: ${res.status}`)
  const data = (await res.json()) as RxNavApproximateResponse
  const candidates = data.approximateGroup?.candidate ?? []

  // The approximateTerm endpoint returns rxcui + score but not always a name;
  // fetch names for unique rxcuis.
  const uniqueRxcuis = Array.from(
    new Set(candidates.map((c) => c.rxcui).filter((x): x is string => !!x)),
  ).slice(0, limit)

  const named: MedSuggestion[] = []
  await Promise.all(
    uniqueRxcuis.map(async (rxcui) => {
      try {
        const nameRes = await fetch(`${RXNAV_BASE}/rxcui/${rxcui}.json`, {
          headers: { accept: 'application/json' },
        })
        if (!nameRes.ok) return
        const nd = (await nameRes.json()) as RxNavRxcuiInfoResponse
        const name = nd.idGroup?.name
        if (name) named.push({ rxcui, name, category: 'RxNorm' })
      } catch {
        // ignore individual lookup failures
      }
    }),
  )
  // Preserve approximate-term ordering as best we can
  named.sort((a, b) => {
    const ai = uniqueRxcuis.indexOf(a.rxcui)
    const bi = uniqueRxcuis.indexOf(b.rxcui)
    return ai - bi
  })
  return named
}

// ─── Conditions (ICD-10-CM) ───────────────────────────────────────────

export interface ConditionSuggestion {
  code: string
  name: string
}

export async function searchConditions(
  term: string,
  limit = 10,
): Promise<ConditionSuggestion[]> {
  if (!term.trim()) return []
  const url = `${ICD10_BASE}/search?sf=code,name&terms=${encodeURIComponent(
    term,
  )}&maxList=${limit}`
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`ICD-10 search failed: ${res.status}`)
  // Returns: [count, [codes], extras, [[code, name], ...]]
  const data = (await res.json()) as [number, string[], unknown, [string, string][]]
  const pairs = data[3] ?? []
  return pairs.map(([code, name]) => ({ code, name }))
}

// ─── Providers + Hospitals (NPI Registry) ─────────────────────────────

export interface ProviderSuggestion {
  npi: string
  name: string
  /** Specialty (taxonomy description) for individuals; primary type for orgs */
  specialty: string | null
  organization: string | null
  city: string | null
  state: string | null
  phone: string | null
  /** "individual" or "organization" */
  kind: 'individual' | 'organization'
}

interface NpiRegistryResult {
  result_count: number
  results?: Array<{
    number: string | number
    enumeration_type?: string // NPI-1 = individual, NPI-2 = org
    basic?: {
      first_name?: string
      last_name?: string
      organization_name?: string
      organizational_subpart?: string
    }
    addresses?: Array<{
      address_purpose?: string
      city?: string
      state?: string
      telephone_number?: string
    }>
    taxonomies?: Array<{
      desc?: string
      primary?: boolean
    }>
  }>
}

export async function searchProviders(
  term: string,
  opts: { limit?: number; state?: string; orgsOnly?: boolean; individualsOnly?: boolean } = {},
): Promise<ProviderSuggestion[]> {
  const cleaned = term.trim()
  if (!cleaned) return []
  const params = new URLSearchParams({
    version: '2.1',
    limit: String(opts.limit ?? 10),
  })
  // NPI search supports name-based queries. Use last_name for individuals,
  // organization_name for orgs. We try both unless restricted.
  if (opts.state) params.set('state', opts.state.toUpperCase())

  // Heuristic: if the query has multiple words, treat as full name
  // otherwise try last_name for individuals AND organization_name for orgs.
  const isLikelyOrg = /\b(hospital|clinic|center|medical|health|pharmacy|home|services|associates|llc|inc|corp)\b/i.test(
    cleaned,
  )

  const fetches: Promise<NpiRegistryResult>[] = []

  if (!opts.individualsOnly && (isLikelyOrg || opts.orgsOnly)) {
    const p = new URLSearchParams(params)
    p.set('organization_name', cleaned + '*')
    fetches.push(
      fetch(`${NPI_BASE}/?${p.toString()}`, { headers: { accept: 'application/json' } }).then(
        (r) => (r.ok ? (r.json() as Promise<NpiRegistryResult>) : { result_count: 0 }),
      ),
    )
  }
  if (!opts.orgsOnly) {
    const p = new URLSearchParams(params)
    const tokens = cleaned.split(/\s+/)
    if (tokens.length > 1) {
      p.set('first_name', tokens[0] + '*')
      p.set('last_name', tokens.slice(1).join(' ') + '*')
    } else {
      p.set('last_name', cleaned + '*')
    }
    fetches.push(
      fetch(`${NPI_BASE}/?${p.toString()}`, { headers: { accept: 'application/json' } }).then(
        (r) => (r.ok ? (r.json() as Promise<NpiRegistryResult>) : { result_count: 0 }),
      ),
    )
  }

  const responses = await Promise.all(fetches)

  const merged: ProviderSuggestion[] = []
  for (const data of responses) {
    for (const r of data.results ?? []) {
      const isOrg = r.enumeration_type === 'NPI-2'
      const fullName = isOrg
        ? r.basic?.organization_name ?? 'Organization'
        : `${r.basic?.first_name ?? ''} ${r.basic?.last_name ?? ''}`.trim() || 'Provider'
      const taxonomy = (r.taxonomies ?? []).find((t) => t.primary) ?? r.taxonomies?.[0]
      const addr =
        (r.addresses ?? []).find((a) => a.address_purpose === 'LOCATION') ??
        r.addresses?.[0]
      merged.push({
        npi: String(r.number),
        name: fullName,
        organization: isOrg ? r.basic?.organization_name ?? null : null,
        specialty: taxonomy?.desc ?? null,
        city: addr?.city ?? null,
        state: addr?.state ?? null,
        phone: addr?.telephone_number ?? null,
        kind: isOrg ? 'organization' : 'individual',
      })
    }
  }
  return merged
}
