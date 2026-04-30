import React from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Inbox as InboxIcon, Check, X } from 'lucide-react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useAuth } from '../../src/contexts/AuthContext'
import { getMyPrimaryRecipient } from '../../src/api/recipient'
import { supabase } from '../../src/lib/supabase'
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme'

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE || 'https://carehq-app.vercel.app'

async function decideOnServer(approvalId: string, status: 'approved' | 'denied') {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not signed in')
  const res = await fetch(`${API_BASE}/api/approvals/decide`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ approvalId, status }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || `Decide failed (${res.status})`)
  }
  return (await res.json()) as { ok: boolean; executed: boolean; detail?: string }
}

interface AgentApproval {
  id: string
  reason: string
  proposed_action: Record<string, unknown>
  status: string
  created_at: string
}

function formatProposedAction(action: Record<string, unknown>): string {
  if (!action || typeof action !== 'object') return ''
  const lines: string[] = []
  for (const [k, v] of Object.entries(action)) {
    if (v === null || v === undefined) continue
    const value =
      typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)
    lines.push(`${k}: ${value}`)
  }
  return lines.join('\n')
}

export default function InboxScreen() {
  const { user } = useAuth()
  const qc = useQueryClient()

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

  const decideMutation = useMutation({
    mutationFn: async (input: { id: string; status: 'approved' | 'denied' }) => {
      if (!user) throw new Error('Not signed in')
      return decideOnServer(input.id, input.status)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agent_approvals', recipientQuery.data?.id] })
      qc.invalidateQueries({ queryKey: ['events', recipientQuery.data?.id] })
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
          approvals.map((a) => {
            const isDecidingThis =
              decideMutation.isPending && decideMutation.variables?.id === a.id
            return (
              <View key={a.id} style={styles.row}>
                <Text style={styles.rowReason}>{a.reason}</Text>
                <Text style={styles.rowMeta}>
                  {format(new Date(a.created_at), "MMM d 'at' h:mm a")}
                </Text>
                {Object.keys(a.proposed_action || {}).length > 0 ? (
                  <View style={styles.proposedBox}>
                    <Text style={styles.proposedLabel}>Proposed action</Text>
                    <Text style={styles.proposedText}>
                      {formatProposedAction(a.proposed_action)}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.actions}>
                  <Pressable
                    onPress={() =>
                      decideMutation.mutate({ id: a.id, status: 'denied' })
                    }
                    disabled={isDecidingThis}
                    style={({ pressed }) => [
                      styles.btnSecondary,
                      isDecidingThis && styles.disabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    <X size={14} color={colors.textPrimary} />
                    <Text style={styles.btnSecondaryLabel}>Deny</Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      decideMutation.mutate({ id: a.id, status: 'approved' })
                    }
                    disabled={isDecidingThis}
                    style={({ pressed }) => [
                      styles.btnPrimary,
                      isDecidingThis && styles.disabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    {isDecidingThis ? (
                      <ActivityIndicator color={colors.textOnPrimary} size="small" />
                    ) : (
                      <>
                        <Check size={14} color={colors.textOnPrimary} />
                        <Text style={styles.btnPrimaryLabel}>Approve</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            )
          })
        )}

        {decideMutation.isError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>
              Couldn't update: {(decideMutation.error as Error).message}
            </Text>
          </View>
        ) : null}
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
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  rowReason: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.md,
    color: colors.textPrimary,
  },
  rowMeta: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  proposedBox: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
  },
  proposedLabel: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.xs,
    color: colors.primary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  proposedText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textPrimary,
    lineHeight: typography.size.sm * typography.lineHeight.relaxed,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  btnPrimaryLabel: {
    color: colors.textOnPrimary,
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.sm,
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  btnSecondaryLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.textPrimary,
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  errorBanner: {
    backgroundColor: colors.alertLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  errorText: {
    color: colors.alert,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
  },
})
