/**
 * Searchable catalogs backed by free public APIs (RxNav / NIH / NPI).
 * Identical logic to the mobile counterpart — see mobile/src/api/catalog.ts.
 */

const RXNAV_BASE = 'https://rxnav.nlm.nih.gov/REST'
const ICD10_BASE = 'https://clinicaltables.nlm.nih.gov/api/icd10cm/v3'
const NPI_BASE = 'https://npiregistry.cms.hhs.gov/api'

export interface MedSuggestion {
  name: string
  rxcui: string
  category: string
}

interface RxNavApproximateResponse {
  approximateGroup?: {
    candidate?: Array<{ rxcui?: string; name?: string }>
  }
}

interface RxNavRxcuiInfoResponse {
  idGroup?: { name?: string }
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
  const uniqueRxcuis = Array.from(
    new Set(candidates.map((c) => c.rxcui).filter((x): x is string => !!x)),
  ).slice(0, limit)
  const named: MedSuggestion[] = []
  await Promise.all(
    uniqueRxcuis.map(async (rxcui) => {
      try {
        const r = await fetch(`${RXNAV_BASE}/rxcui/${rxcui}.json`)
        if (!r.ok) return
        const nd = (await r.json()) as RxNavRxcuiInfoResponse
        const name = nd.idGroup?.name
        if (name) named.push({ rxcui, name, category: 'RxNorm' })
      } catch {
        // ignore
      }
    }),
  )
  named.sort((a, b) => uniqueRxcuis.indexOf(a.rxcui) - uniqueRxcuis.indexOf(b.rxcui))
  return named
}

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
  const data = (await res.json()) as [number, string[], unknown, [string, string][]]
  const pairs = data[3] ?? []
  return pairs.map(([code, name]) => ({ code, name }))
}

export interface ProviderSuggestion {
  npi: string
  name: string
  specialty: string | null
  organization: string | null
  city: string | null
  state: string | null
  phone: string | null
  kind: 'individual' | 'organization'
}

interface NpiRegistryResult {
  result_count: number
  results?: Array<{
    number: string | number
    enumeration_type?: string
    basic?: {
      first_name?: string
      last_name?: string
      organization_name?: string
    }
    addresses?: Array<{
      address_purpose?: string
      city?: string
      state?: string
      telephone_number?: string
    }>
    taxonomies?: Array<{ desc?: string; primary?: boolean }>
  }>
}

export async function searchProviders(
  term: string,
  opts: { limit?: number; state?: string } = {},
): Promise<ProviderSuggestion[]> {
  const cleaned = term.trim()
  if (!cleaned) return []
  const isLikelyOrg = /\b(hospital|clinic|center|medical|health|pharmacy|home|services|associates|llc|inc|corp)\b/i.test(
    cleaned,
  )
  const limit = opts.limit ?? 10
  const fetches: Promise<NpiRegistryResult>[] = []

  if (isLikelyOrg) {
    const p = new URLSearchParams({ version: '2.1', limit: String(limit) })
    if (opts.state) p.set('state', opts.state)
    p.set('organization_name', cleaned + '*')
    fetches.push(
      fetch(`${NPI_BASE}/?${p.toString()}`).then((r) =>
        r.ok ? (r.json() as Promise<NpiRegistryResult>) : { result_count: 0 },
      ),
    )
  }
  const p = new URLSearchParams({ version: '2.1', limit: String(limit) })
  if (opts.state) p.set('state', opts.state)
  const tokens = cleaned.split(/\s+/)
  if (tokens.length > 1) {
    p.set('first_name', tokens[0] + '*')
    p.set('last_name', tokens.slice(1).join(' ') + '*')
  } else {
    p.set('last_name', cleaned + '*')
  }
  fetches.push(
    fetch(`${NPI_BASE}/?${p.toString()}`).then((r) =>
      r.ok ? (r.json() as Promise<NpiRegistryResult>) : { result_count: 0 },
    ),
  )

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
        (r.addresses ?? []).find((a) => a.address_purpose === 'LOCATION') ?? r.addresses?.[0]
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
