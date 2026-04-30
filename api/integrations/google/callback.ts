/**
 * Google OAuth redirect target. Receives ?code=&state= from Google,
 * verifies the HMAC-signed state, exchanges the code for tokens, persists
 * to public.integrations(provider='google_calendar' OR 'gmail') for the
 * (profileId, recipientId) encoded in state, then 302s back to carehq://
 * so WebBrowser.openAuthSessionAsync resolves cleanly.
 */

import { createClient } from '@supabase/supabase-js'
import { verifyState, exchangeAuthCode } from '../google'

export const config = { runtime: 'edge' }

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

const RETURN_DEEP_LINK_OK = 'carehq://google/connected?ok=1'
const RETURN_DEEP_LINK_FAIL = 'carehq://google/connected?ok=0'

interface StatePayload {
  profileId: string
  recipientId: string
  nonce: string
  exp: number
}

function htmlRedirect(deepLink: string, message: string): Response {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>CareHQ</title><meta http-equiv="refresh" content="0;url=${deepLink}"></head><body style="font-family:system-ui;padding:24px;text-align:center"><p>${message}</p><p><a href="${deepLink}">Return to CareHQ</a></p></body></html>`,
    {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    },
  )
}

export default async function handler(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')

  if (oauthError) {
    return htmlRedirect(
      RETURN_DEEP_LINK_FAIL + `&error=${encodeURIComponent(oauthError)}`,
      `Google sign-in was cancelled or denied: ${oauthError}`,
    )
  }
  if (!code || !state) {
    return htmlRedirect(RETURN_DEEP_LINK_FAIL + '&error=missing_params', 'Missing code or state.')
  }

  const verified = await verifyState<StatePayload>(state)
  if (!verified) {
    return htmlRedirect(RETURN_DEEP_LINK_FAIL + '&error=bad_state', 'Bad state — try again.')
  }
  if (verified.exp < Math.floor(Date.now() / 1000)) {
    return htmlRedirect(RETURN_DEEP_LINK_FAIL + '&error=expired', 'OAuth handshake expired.')
  }

  // Exchange code → tokens
  let tokens
  try {
    tokens = await exchangeAuthCode(code)
  } catch (err) {
    return htmlRedirect(
      RETURN_DEEP_LINK_FAIL + '&error=token_exchange_failed',
      `Token exchange failed: ${(err as Error).message}`,
    )
  }

  // Decide which provider rows to create based on the granted scopes.
  const scopes = (tokens.scope || '').split(/\s+/)
  const rows: Array<{ provider: 'google_calendar' | 'gmail' }> = []
  if (
    scopes.includes('https://www.googleapis.com/auth/calendar.readonly') ||
    scopes.includes('https://www.googleapis.com/auth/calendar.events') ||
    scopes.includes('https://www.googleapis.com/auth/calendar')
  ) {
    rows.push({ provider: 'google_calendar' })
  }
  if (
    scopes.includes('https://www.googleapis.com/auth/gmail.readonly') ||
    scopes.includes('https://www.googleapis.com/auth/gmail.modify')
  ) {
    rows.push({ provider: 'gmail' })
  }

  if (rows.length === 0) {
    return htmlRedirect(
      RETURN_DEEP_LINK_FAIL + '&error=no_scopes_granted',
      'No usable Google scopes were granted.',
    )
  }

  // Get the user's email from id_token if present, for diagnostics.
  let externalAccount: string | null = null
  if (tokens.id_token) {
    try {
      const payload = tokens.id_token.split('.')[1]
      const decoded = JSON.parse(
        atob(payload.replace(/-/g, '+').replace(/_/g, '/')),
      )
      externalAccount = decoded.email || null
    } catch {
      // ignore
    }
  }

  // Use the service role key (or fall back to anon key) so we can write the
  // integrations row even though the callback has no Supabase JWT. We
  // explicitly scope the upsert to the verified profileId so RLS isn't a
  // concern; anything else is rejected.
  if (!SUPABASE_URL) {
    return htmlRedirect(RETURN_DEEP_LINK_FAIL + '&error=server', 'Server misconfigured.')
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  for (const r of rows) {
    const { error } = await supabase.from('integrations').upsert(
      {
        recipient_id: verified.recipientId,
        owner_profile_id: verified.profileId,
        provider: r.provider,
        external_account: externalAccount,
        access_token_enc: tokens.access_token,
        refresh_token_enc: tokens.refresh_token ?? null,
        token_expires_at: expiresAt,
        config: { scopes },
        status: 'active',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'recipient_id,provider,external_account' },
    )
    if (error) {
      return htmlRedirect(
        RETURN_DEEP_LINK_FAIL + '&error=' + encodeURIComponent(error.message),
        `Failed to persist integration: ${error.message}`,
      )
    }
  }

  return htmlRedirect(
    RETURN_DEEP_LINK_OK + `&providers=${rows.map((r) => r.provider).join(',')}`,
    'Connected — returning to CareHQ…',
  )
}
