import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { format } from 'date-fns'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles, Send, MessageSquarePlus, ChevronRight } from 'lucide-react-native'
import Card from '../../src/components/Card'
import { useAuth } from '../../src/contexts/AuthContext'
import { askAgent } from '../../src/api/agent'
import { getMyPrimaryRecipient } from '../../src/api/recipient'
import { listRecentEvents, logNoteEvent } from '../../src/api/events'
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme'

const greetingForHour = (h: number) =>
  h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'

const toolLabel = (name: string): string => {
  switch (name) {
    case 'log_event':
      return 'Logged an event'
    case 'update_recipient_brain':
      return 'Updated the brain'
    case 'request_human_approval':
      return 'Queued for your approval'
    default:
      return name
  }
}

export default function StreamScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const qc = useQueryClient()
  const today = new Date()
  const greeting = greetingForHour(today.getHours())
  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'there'

  const recipientQuery = useQuery({
    queryKey: ['recipient', user?.id],
    queryFn: () => (user ? getMyPrimaryRecipient(user.id) : Promise.resolve(null)),
    enabled: !!user,
  })
  const recipient = recipientQuery.data ?? null

  const eventsQuery = useQuery({
    queryKey: ['events', recipient?.id],
    queryFn: () => (recipient ? listRecentEvents(recipient.id) : Promise.resolve([])),
    enabled: !!recipient,
  })
  const events = eventsQuery.data ?? []

  const [composer, setComposer] = useState('')
  const [agentReply, setAgentReply] = useState<string | null>(null)
  const [agentTools, setAgentTools] = useState<string[]>([])
  const [agentError, setAgentError] = useState<string | null>(null)

  const askMutation = useMutation({
    mutationFn: async (message: string) => {
      return askAgent({ message, recipientId: recipient?.id })
    },
    onSuccess: (res) => {
      setAgentReply(res.reply)
      setAgentTools(res.toolsCalled ?? [])
      setAgentError(null)
      // The agent may have written events / brain updates / approvals — refetch.
      qc.invalidateQueries({ queryKey: ['events', recipient?.id] })
      qc.invalidateQueries({ queryKey: ['recipient_brain', recipient?.id] })
      qc.invalidateQueries({ queryKey: ['agent_approvals', recipient?.id] })
    },
    onError: (err: Error) => {
      setAgentError(err.message)
      setAgentReply(null)
      setAgentTools([])
    },
  })

  const noteMutation = useMutation({
    mutationFn: async (body: string) => {
      if (!recipient) throw new Error('No care recipient yet')
      if (!user) throw new Error('Not signed in')
      return logNoteEvent({
        recipientId: recipient.id,
        body,
        loggedByProfileId: user.id,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events', recipient?.id] })
    },
  })

  const handleAsk = useCallback(() => {
    const msg = composer.trim()
    if (!msg) return
    askMutation.mutate(msg)
    setComposer('')
  }, [composer, askMutation])

  const handleLog = useCallback(() => {
    const msg = composer.trim()
    if (!msg) return
    noteMutation.mutate(msg)
    setComposer('')
  }, [composer, noteMutation])

  const refreshing = eventsQuery.isFetching || recipientQuery.isFetching

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              recipientQuery.refetch()
              eventsQuery.refetch()
            }}
            tintColor={colors.primary}
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.greeting}>
          {greeting}, {firstName}.
        </Text>
        <Text style={styles.subtitle}>
          {recipient
            ? `${recipient.name}'s care · ${format(today, 'EEEE, MMMM d')}`
            : format(today, 'EEEE, MMMM d')}
        </Text>

        {/* Composer */}
        <Card style={styles.composer} padded>
          <View style={styles.composerHeader}>
            <Sparkles size={16} color={colors.primary} />
            <Text style={styles.composerLabel}>Ask the agent or log something</Text>
          </View>
          <TextInput
            value={composer}
            onChangeText={setComposer}
            placeholder={
              recipient
                ? `e.g. "How is ${recipient.name} doing this week?" or "Mom skipped her morning meds"`
                : `e.g. "How does CareHQ work?" — set up a care recipient under Care to log events`
            }
            placeholderTextColor={colors.textTertiary}
            multiline
            style={styles.composerInput}
            editable={!askMutation.isPending && !noteMutation.isPending}
          />
          <View style={styles.composerActions}>
            <Pressable
              style={({ pressed }) => [
                styles.secondaryBtn,
                (!composer.trim() || !recipient) && styles.disabled,
                pressed && styles.pressed,
              ]}
              onPress={handleLog}
              disabled={
                !composer.trim() || !recipient || noteMutation.isPending
              }
            >
              <MessageSquarePlus size={16} color={colors.textPrimary} />
              <Text style={styles.secondaryLabel}>
                {noteMutation.isPending ? 'Saving…' : 'Log as note'}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                !composer.trim() && styles.disabled,
                pressed && styles.pressed,
              ]}
              onPress={handleAsk}
              disabled={!composer.trim() || askMutation.isPending}
            >
              {askMutation.isPending ? (
                <ActivityIndicator color={colors.textOnPrimary} size="small" />
              ) : (
                <>
                  <Send size={16} color={colors.textOnPrimary} />
                  <Text style={styles.primaryLabel}>Ask</Text>
                </>
              )}
            </Pressable>
          </View>
          {agentReply ? (
            <View style={styles.agentReply}>
              <Text style={styles.agentReplyLabel}>Agent</Text>
              <Text style={styles.agentReplyText}>{agentReply}</Text>
              {agentTools.length > 0 ? (
                <View style={styles.toolBadgeRow}>
                  {agentTools.map((t, i) => (
                    <View key={i} style={styles.toolBadge}>
                      <Text style={styles.toolBadgeText}>{toolLabel(t)}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
          {agentError ? (
            <View style={styles.agentError}>
              <Text style={styles.agentErrorText}>{agentError}</Text>
            </View>
          ) : null}
          {noteMutation.isError ? (
            <View style={styles.agentError}>
              <Text style={styles.agentErrorText}>
                Couldn't log: {(noteMutation.error as Error).message}
              </Text>
            </View>
          ) : null}
        </Card>

        {/* Onboarding nudge if no recipient yet */}
        {!recipient && !recipientQuery.isLoading ? (
          <Pressable
            onPress={() => router.push('/care')}
            style={({ pressed }) => [styles.nudgeCard, pressed && styles.pressed]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.nudgeTitle}>Set up your care recipient</Text>
              <Text style={styles.nudgeBody}>
                Add the person you're caring for so the agent can keep track of meds,
                providers, and what's been happening.
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textTertiary} />
          </Pressable>
        ) : null}

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          {!recipient ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                Once you set up a care recipient and start logging, what's been
                happening will appear here.
              </Text>
            </View>
          ) : eventsQuery.isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : events.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                Nothing has been logged yet. Use the composer above to log a note
                or ask the agent something.
              </Text>
            </View>
          ) : (
            events.map((e) => (
              <View key={e.id} style={styles.eventRow}>
                <View style={styles.eventDot} />
                <View style={styles.eventBody}>
                  <Text style={styles.eventSummary}>{e.summary || e.kind}</Text>
                  <Text style={styles.eventMeta}>
                    {format(new Date(e.occurred_at), "MMM d 'at' h:mm a")}
                    {' · '}
                    {e.kind.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  greeting: {
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
  composer: {
    marginBottom: spacing.lg,
  },
  composerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  composerLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  composerInput: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.md,
    color: colors.textPrimary,
    minHeight: 64,
    paddingTop: 0,
    paddingBottom: spacing.sm,
    textAlignVertical: 'top',
  },
  composerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  primaryLabel: {
    color: colors.textOnPrimary,
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.sm,
  },
  secondaryBtn: {
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
  secondaryLabel: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  agentReply: {
    marginTop: spacing.md,
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  agentReplyLabel: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.xs,
    color: colors.primary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  agentReplyText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.md,
    color: colors.textPrimary,
    lineHeight: typography.size.md * typography.lineHeight.relaxed,
  },
  toolBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  toolBadge: {
    backgroundColor: colors.surface,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  toolBadgeText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.primary,
  },
  agentError: {
    marginTop: spacing.md,
    backgroundColor: colors.alertLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  agentErrorText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.alert,
  },
  nudgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    ...shadows.sm,
  },
  nudgeTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.md,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  nudgeBody: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: typography.size.sm * typography.lineHeight.relaxed,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.md,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.size.sm * typography.lineHeight.relaxed,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  eventBody: { flex: 1 },
  eventSummary: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.md,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  eventMeta: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    textTransform: 'capitalize',
  },
  bottomSpacer: { height: spacing['3xl'] },
})
