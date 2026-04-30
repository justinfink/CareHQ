import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Redirect } from 'expo-router'
import Svg, { Rect, Polygon, Path } from 'react-native-svg'
import { useAuth } from '../../src/contexts/AuthContext'
import { colors, typography } from '../../src/theme'

function GoogleLogo() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18">
      <Path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <Path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <Path
        d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
        fill="#FBBC05"
      />
      <Path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </Svg>
  )
}

function CareHQMark() {
  return (
    <Svg width={32} height={32} viewBox="0 0 32 32">
      <Rect width={32} height={32} rx={8} fill={colors.primary} />
      <Polygon points="16,7 26,15.2 6,15.2" fill="white" />
      <Rect x={8.8} y={15.2} width={14.4} height={10.8} fill="white" />
      <Rect x={13.2} y={18.4} width={5.6} height={7.6} rx={0.5} fill={colors.primary} />
    </Svg>
  )
}

export default function AuthScreen() {
  const { session, loading, signInWithEmail, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googling, setGoogling] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) return null
  if (session) return <Redirect href="/(tabs)" />

  const handleEmail = async () => {
    setSubmitting(true)
    setError(null)
    const { error: err } = await signInWithEmail(email.trim())
    setSubmitting(false)
    if (err) {
      setError(err.message)
      return
    }
    setSent(true)
  }

  const handleGoogle = async () => {
    setGoogling(true)
    setError(null)
    const { error: err } = await signInWithGoogle()
    setGoogling(false)
    if (err && err.message !== 'Sign-in cancelled') {
      setError(err.message)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.brandRow}>
        <CareHQMark />
        <Text style={styles.brand}>CareHQ</Text>
      </View>

      {sent ? (
        <View style={styles.card}>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a sign-in link to <Text style={styles.bold}>{email}</Text>. Tap it to continue.
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.title}>Sign in to CareHQ</Text>
          <Text style={styles.subtitle}>
            Use your Google account, or get a one-time email link.
          </Text>

          <Pressable
            onPress={handleGoogle}
            disabled={googling || submitting}
            style={({ pressed }) => [
              styles.googleBtn,
              (googling || submitting) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <GoogleLogo />
            <Text style={styles.googleLabel}>
              {googling ? 'Opening Google…' : 'Continue with Google'}
            </Text>
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            style={styles.input}
            editable={!submitting && !googling}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={handleEmail}
            disabled={submitting || googling || !email}
            style={({ pressed }) => [
              styles.primaryBtn,
              (submitting || googling || !email) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.primaryLabel}>Send sign-in link</Text>
            )}
          </Pressable>
        </View>
      )}

      <Text style={styles.fineprint}>
        By signing in you agree to CareHQ's terms and privacy policy.
      </Text>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 32,
  },
  brand: {
    fontSize: 20,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  title: {
    fontSize: 18,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  bold: {
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'white',
  },
  googleLabel: {
    fontSize: 14,
    fontFamily: typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  dividerText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: typography.fontFamily.regular,
  },
  label: {
    fontSize: 12,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
    backgroundColor: 'white',
  },
  error: {
    fontSize: 13,
    color: colors.alert,
    marginTop: 8,
    fontFamily: typography.fontFamily.regular,
  },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    color: 'white',
    fontSize: 14,
    fontFamily: typography.fontFamily.semiBold,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  fineprint: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.textTertiary,
    fontFamily: typography.fontFamily.regular,
    marginTop: 24,
  },
})
