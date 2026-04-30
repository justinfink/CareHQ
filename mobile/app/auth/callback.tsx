import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, StyleSheet, Pressable } from 'react-native'
import { Redirect, useRouter } from 'expo-router'
import * as Linking from 'expo-linking'
import { supabase } from '../../src/lib/supabase'
import { useAuth } from '../../src/contexts/AuthContext'
import { colors, typography, spacing, borderRadius } from '../../src/theme'

export default function AuthCallback() {
  const url = Linking.useURL()
  const { session, loading } = useAuth()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function handle() {
      // Either WebBrowser already set the session, or we'll set it from the URL.
      if (session) {
        if (!cancelled) setDone(true)
        return
      }
      if (!url) return // wait for Linking.useURL to populate

      // Implicit flow — tokens in URL fragment
      const hashIdx = url.indexOf('#')
      if (hashIdx >= 0) {
        const fragment = url.slice(hashIdx + 1)
        const params = new URLSearchParams(fragment)
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        if (access_token && refresh_token) {
          const { error: setErr } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          })
          if (!cancelled) {
            if (setErr) setError(setErr.message)
            else setDone(true)
          }
          return
        }
        // Supabase sometimes puts an error in the fragment instead
        const errMsg = params.get('error_description') || params.get('error')
        if (errMsg) {
          if (!cancelled) setError(decodeURIComponent(errMsg))
          return
        }
      }

      // PKCE flow — code in query string
      try {
        const u = new URL(url)
        const code = u.searchParams.get('code')
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code)
          if (!cancelled) {
            if (exErr) setError(exErr.message)
            else setDone(true)
          }
          return
        }
        const errMsg = u.searchParams.get('error_description') || u.searchParams.get('error')
        if (errMsg) {
          if (!cancelled) setError(decodeURIComponent(errMsg))
          return
        }
      } catch {
        // ignore — URL parse failed
      }

      // Nothing actionable — bounce to /auth
      if (!cancelled) setDone(true)
    }

    handle()
    return () => {
      cancelled = true
    }
  }, [url, session])

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>We couldn't sign you in</Text>
        <Text style={styles.errorBody}>{error}</Text>
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}
          onPress={() => router.replace('/auth')}
        >
          <Text style={styles.btnLabel}>Try again</Text>
        </Pressable>
      </View>
    )
  }

  if (done) {
    return <Redirect href={session ? '/(tabs)' : '/auth'} />
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.signingIn}>Signing you in…</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    gap: spacing.lg,
  },
  signingIn: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  errorTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  errorBody: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.alert,
    textAlign: 'center',
  },
  btn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  btnLabel: {
    color: colors.textOnPrimary,
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.md,
  },
})
