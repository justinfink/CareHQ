import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CalendarDays } from 'lucide-react-native'
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme'

export default function CalendarScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Calendar</Text>
        <Text style={styles.subtitle}>
          Shifts, appointments, and reminders the agent is tracking.
        </Text>

        <View style={styles.empty}>
          <CalendarDays size={28} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>Calendar is being rebuilt</Text>
          <Text style={styles.emptyBody}>
            We're moving from the old localStorage Google Calendar prototype onto
            the new Supabase-backed integrations table — once that lands, every
            shift, appointment, and follow-up the agent schedules will appear
            here, with per-member visibility.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size['2xl'],
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.sm,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.md,
    color: colors.textPrimary,
  },
  emptyBody: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.size.sm * typography.lineHeight.relaxed,
  },
})
