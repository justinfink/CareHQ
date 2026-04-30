import React from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Inbox as InboxIcon } from 'lucide-react-native'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../src/contexts/AuthContext'
import { getMyPrimaryRecipient } from '../../src/api/recipient'
import { supabase } from '../../src/lib/supabase'
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme'

interface AgentApproval {
  id: string
  reason: string
  proposed_action: Record<string, unknown>
  status: string
  created_at: string
}

export default function InboxScreen() {
  const { user } = useAuth()

  const recipientQuery = useQuery({
    queryKey: ['recipient', user?.id],
    queryFn: () => (user ? getMyPrimaryRecipient(user.id) : Promise.resolve(null)),
    enabled: !!user,
  })

  const approvalsQuery = useQuery({
    queryKey: ['agent_approvals', recipientQuery.data?.id],
    enabled: !!recipientQuery.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_approvals')
        .select('id, reason, proposed_action, status, created_at')
        .eq('recipient_id', recipientQuery.data!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as AgentApproval[]
    },
  })

  const approvals = approvalsQuery.data ?? []

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Inbox</Text>
        <Text style={styles.subtitle}>
          Sensitive actions the agent wants you to approve before it acts.
        </Text>

        {!recipientQuery.data ? (
          <View style={styles.empty}>
            <InboxIcon size={28} color={colors.textTertiary} />
            <Text style={styles.emptyText}>
              Once you set up a care recipient, the agent will queue any sensitive
              outbound action — messaging a clinician, scheduling something, or
              escalating — for your approval here.
            </Text>
          </View>
        ) : approvalsQuery.isLoading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : approvals.length === 0 ? (
          <View style={styles.empty}>
            <InboxIcon size={28} color={colors.textTertiary} />
            <Text style={styles.emptyText}>You're caught up. Nothing waiting.</Text>
            <Text style={styles.emptyHint}>
              When the agent drafts a message to a clinician, schedules an
              appointment, or wants to escalate, it'll land here for one-tap
              approval.
            </Text>
          </View>
        ) : (
          approvals.map((a) => (
            <View key={a.id} style={styles.row}>
              <Text style={styles.rowReason}>{a.reason}</Text>
              <Text style={styles.rowMeta}>
                {new Date(a.created_at).toLocaleString()}
              </Text>
            </View>
          ))
        )}
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
  emptyText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.md,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.size.sm * typography.lineHeight.relaxed,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  rowReason: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.md,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  rowMeta: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
  },
})
