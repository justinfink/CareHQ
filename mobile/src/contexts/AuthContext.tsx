import React, { createContext, useContext, useEffect, useState } from 'react'
import { AppState } from 'react-native'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

WebBrowser.maybeCompleteAuthSession()

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  signInWithEmail: (email: string) => Promise<{ error: Error | null }>
  signInWithGoogle: () => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  signInWithEmail: async () => ({ error: new Error('AuthContext not ready') }),
  signInWithGoogle: async () => ({ error: new Error('AuthContext not ready') }),
  signOut: async () => {},
})

export const useAuth = () => useContext(AuthContext)

// Keep refresh tokens fresh while the app is foregrounded
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  const signInWithEmail = async (email: string) => {
    const redirectTo = Linking.createURL('/auth/callback')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })
    return { error: error as Error | null }
  }

  const signInWithGoogle = async () => {
    const redirectTo = Linking.createURL('/auth/callback')
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    })
    if (error || !data?.url) {
      return { error: (error as Error | null) ?? new Error('Could not start Google sign-in') }
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
    if (result.type !== 'success' || !result.url) {
      return { error: new Error('Sign-in cancelled') }
    }

    // Supabase returns tokens in the URL fragment after a redirect
    const fragment = result.url.split('#')[1] ?? ''
    const params = new URLSearchParams(fragment)
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')

    if (!access_token || !refresh_token) {
      // PKCE flow returns ?code= instead — let supabase exchange it
      const code = new URL(result.url).searchParams.get('code')
      if (code) {
        const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code)
        return { error: (exchangeErr as Error | null) ?? null }
      }
      return { error: new Error('No tokens returned from Google') }
    }

    const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token })
    return { error: (setErr as Error | null) ?? null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signInWithEmail,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
