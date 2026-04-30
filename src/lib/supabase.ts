import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
  )
}

// NOTE: client is intentionally untyped right now — the hand-typed
// database.types.ts hasn't been regenerated to match supabase-js v2.101's
// stricter PostgrestVersion shape. Run `supabase gen types typescript
// --project-id qmxxbbzrcilqrtxwaaub` to restore typed access. The runtime
// behaviour is unchanged.
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
