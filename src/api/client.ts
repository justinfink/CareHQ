import { supabase } from '../lib/supabase'

const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ||
  'https://carehq-app.vercel.app'

export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not signed in')
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  })
}

export { API_BASE }
