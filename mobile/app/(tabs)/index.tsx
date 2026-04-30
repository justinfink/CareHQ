import React from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { format, differenceInDays, parseISO } from 'date-fns'
import { AlertTriangle, Clock, Flag, Mic, LogOut } from 'lucide-react-native'
import { useAppStore } from '../../src/store/useAppStore'
import { useAuth } from '../../src/contexts/AuthContext'
import Card from '../../src/components/Card'
import ShiftCard from '../../src/components/ShiftCard'
import EventCard from '../../src/components/EventCard'
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme'

export default function DashboardScreen() {
  const { user, events, insights } = useAppStore()
  const { signOut, user: authUser } = useAuth()
  const today = new Date()
  const daysSinceCareStart = differenceInDays(today, parseISO(user.careRecipient.startedCare))
  const dayName = format(today, 'EEEE, MMMM d')

  const hour = today.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const alertInsights = insights.filter((i) => i.severity === 'alert' && !i.resolved)
  const flaggedCount = events.filter((e) => e.flagged).length
  const recentFive = events.slice(0, 5)

  // Determine current shift status
  const isMariaShift = hour >= 8 && hour < 12
  const isJamesShift = hour >= 12 && hour < 16

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.greetingSection}>
          <View style={styles.greetingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>
                {greeting}, {authUser?.user_metadata?.full_name?.split(' ')[0] || user.firstName}.
              </Text>
              <Text style={styles.subtitle}>
                {user.careRecipient.firstName}'s care {'—'} Day {daysSinceCareStart.toLocaleString()} {'·'} {dayName}
              </Text>
            </View>
            {authUser ? (
              <Pressable
                onPress={() => void signOut()}
                hitSlop={12}
                style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.6 }]}
                accessibilityLabel="Sign out"
              >
                <LogOut size={18} color={colors.textTertiary} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Alert Banner */}
        {alertInsights.length > 0 && (
          <TouchableOpacity activeOpacity={0.8} style={styles.alertBanner}>
            <AlertTriangle size={18} color={colors.textOnPrimary} />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>{alertInsights[0].title}</Text>
              <Text style={styles.alertSummary} numberOfLines={2}>
                {alertInsights[0].summary}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Care Status */}
        <Card style={styles.statusCard}>
          <Text style={styles.sectionTitle}>Care Status</Text>
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <View style={[styles.statusIcon, { backgroundColor: colors.primaryLight }]}>
                <Clock size={16} color={colors.primary} />
              </View>
              <Text style={styles.statusLabel}>Current shift</Text>
              <Text style={styles.statusValue}>
                {isMariaShift
                  ? 'Maria (8am\u201312pm)'
                  : isJamesShift
                  ? 'James (12pm\u20134pm)'
                  : 'No active shift'}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusIcon, { backgroundColor: colors.primaryLight }]}>
                <Clock size={16} color={colors.primary} />
              </View>
              <Text style={styles.statusLabel}>Last event</Text>
              <Text style={styles.statusValue} numberOfLines={1}>
                {events[0]?.summary.substring(0, 30) || 'None'}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusIcon, { backgroundColor: colors.alertLight }]}>
                <Flag size={16} color={colors.alert} />
              </View>
              <Text style={styles.statusLabel}>Flags</Text>
              <Text style={[styles.statusValue, flaggedCount > 0 && { color: colors.alert }]}>
                {flaggedCount} flagged
              </Text>
            </View>
          </View>
        </Card>

        {/* Today's Shifts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Shifts</Text>
          <ShiftCard
            name="Maria Reyes"
            role="Home Health Aide"
            time="8:00 AM \u2013 12:00 PM"
            isActive={isMariaShift}
            color={colors.primary}
          />
          <ShiftCard
            name="James Okonkwo"
            role="Home Health Aide"
            time="12:00 PM \u2013 4:00 PM"
            isActive={isJamesShift}
            color={colors.accent}
          />
        </View>

        {/* Quick Log CTA */}
        <TouchableOpacity activeOpacity={0.8} style={styles.quickLogButton}>
          <Mic size={20} color={colors.textOnPrimary} />
          <Text style={styles.quickLogText}>Quick Log</Text>
        </TouchableOpacity>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {recentFive.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  greetingSection: {
    marginBottom: spacing['2xl'],
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  signOutBtn: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  greeting: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size['2xl'],
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.md,
    color: colors.textSecondary,
    lineHeight: typography.size.md * typography.lineHeight.relaxed,
  },
  alertBanner: {
    backgroundColor: colors.alert,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.md,
    color: colors.textOnPrimary,
    marginBottom: spacing.xs,
  },
  alertSummary: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: typography.size.sm * typography.lineHeight.relaxed,
  },
  statusCard: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statusLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  statusValue: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.xl,
  },
  quickLogButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
    ...shadows.md,
  },
  quickLogText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.lg,
    color: colors.textOnPrimary,
  },
  bottomSpacer: {
    height: spacing['3xl'],
  },
})
