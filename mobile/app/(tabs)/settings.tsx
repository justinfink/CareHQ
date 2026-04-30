import React from 'react'
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LogOut, Mail, User as UserIcon } from 'lucide-react-native'
import { useAuth } from '../../src/contexts/AuthContext'
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme'

export default function SettingsScreen() {
  const { user, signOut } = useAuth()
  const fullName = (user?.user_metadata?.full_name as string | undefined) || null
  const email = user?.email || ''

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <UserIcon size={18} color={colors.textTertiary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Name</Text>
              <Text style={styles.rowValue}>{fullName || '—'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Mail size={18} color={colors.textTertiary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Email</Text>
              <Text style={styles.rowValue}>{email}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Channels</Text>
        <View style={styles.card}>
          <Text style={styles.helper}>
            CareHQ is voice-first by design — phone, SMS, email, and the app are
            all first-class channels for the agent. Channel preferences and a
            dedicated CareHQ phone number are coming next.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Account</Text>
        <Pressable
          onPress={() => void signOut()}
          style={({ pressed }) => [styles.card, styles.signOutRow, pressed && { opacity: 0.7 }]}
        >
          <LogOut size={18} color={colors.alert} />
          <Text style={styles.signOutLabel}>Sign out</Text>
        </Pressable>

        <Text style={styles.versionText}>CareHQ · v0.1 · early access</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing['3xl'] },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size['2xl'],
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
  },
  rowValue: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.md,
    color: colors.textPrimary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.md,
  },
  helper: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: typography.size.sm * typography.lineHeight.relaxed,
  },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  signOutLabel: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.md,
    color: colors.alert,
  },
  versionText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing['3xl'],
  },
})
