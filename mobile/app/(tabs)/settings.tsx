import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  LogOut,
  Mail,
  User as UserIcon,
  MessageSquare,
  X,
  Check,
  Plug,
} from 'lucide-react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../src/contexts/AuthContext'
import { getMyPrimaryRecipient } from '../../src/api/recipient'
import {
  connectTwilio,
  testTwilio,
  disconnectTwilio,
  getTwilioStatus,
  type TwilioStatus,
} from '../../src/api/integrations'
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme'

function TwilioSheet({
  visible,
  recipientId,
  onClose,
}: {
  visible: boolean
  recipientId: string | null
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [accountSid, setAccountSid] = useState('')
  const [authToken, setAuthToken] = useState('')
  const [from, setFrom] = useState('')
  const [testTo, setTestTo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const statusQuery = useQuery<TwilioStatus>({
    queryKey: ['twilio_status', recipientId],
    queryFn: () => (recipientId ? getTwilioStatus(recipientId) : Promise.resolve({ connected: false })),
    enabled: visible && !!recipientId,
  })

  const status = statusQuery.data ?? { connected: false }

  React.useEffect(() => {
    if (visible) {
      setAccountSid('')
      setAuthToken('')
      setFrom(status.from || '')
      setTestTo('')
      setError(null)
      setSuccess(null)
    }
  }, [visible, status.from])

  const connect = useMutation({
    mutationFn: async () => {
      if (!recipientId) throw new Error('No recipient')
      return connectTwilio({ recipientId, accountSid, authToken, from })
    },
    onSuccess: (r) => {
      setSuccess(`Connected to ${r.accountFriendlyName ?? 'Twilio'} (${r.from})`)
      setError(null)
      qc.invalidateQueries({ queryKey: ['twilio_status', recipientId] })
    },
    onError: (e: Error) => {
      setError(e.message)
      setSuccess(null)
    },
  })

  const send = useMutation({
    mutationFn: async () => {
      if (!recipientId) throw new Error('No recipient')
      return testTwilio({ recipientId, to: testTo })
    },
    onSuccess: (r) => {
      setSuccess(`Test SMS sent (Twilio status: ${r.status ?? 'queued'})`)
      setError(null)
    },
    onError: (e: Error) => {
      setError(e.message)
      setSuccess(null)
    },
  })

  const disconnect = useMutation({
    mutationFn: async () => {
      if (!recipientId) throw new Error('No recipient')
      return disconnectTwilio(recipientId)
    },
    onSuccess: () => {
      setSuccess('Twilio disconnected')
      setError(null)
      qc.invalidateQueries({ queryKey: ['twilio_status', recipientId] })
    },
    onError: (e: Error) => {
      setError(e.message)
      setSuccess(null)
    },
  })

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.modalCard}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <MessageSquare size={20} color={colors.primary} />
              <Text style={styles.modalTitle}>Twilio (SMS)</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <X size={20} color={colors.textTertiary} />
            </Pressable>
          </View>

          <Text style={styles.modalIntro}>
            Connect your own Twilio account so the agent can text team members on your
            behalf. You'll need an Active Twilio phone number to use as the From.
          </Text>

          {status.connected ? (
            <View style={styles.connectedBanner}>
              <Check size={16} color={colors.ok} />
              <View style={{ flex: 1 }}>
                <Text style={styles.connectedTitle}>Connected</Text>
                <Text style={styles.connectedMeta}>
                  {status.accountFriendlyName || 'Twilio account'} · From {status.from}
                </Text>
              </View>
            </View>
          ) : null}

          <Text style={styles.formLabel}>Account SID</Text>
          <TextInput
            value={accountSid}
            onChangeText={setAccountSid}
            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.formLabel}>Auth Token</Text>
          <TextInput
            value={authToken}
            onChangeText={setAuthToken}
            placeholder="32-char Twilio auth token"
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          <Text style={styles.formLabel}>From number (E.164)</Text>
          <TextInput
            value={from}
            onChangeText={setFrom}
            placeholder="+15551234567"
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="phone-pad"
          />

          <Pressable
            onPress={() => connect.mutate()}
            disabled={connect.isPending || !accountSid || !authToken || !from}
            style={({ pressed }) => [
              styles.primaryBtn,
              (connect.isPending || !accountSid || !authToken || !from) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            {connect.isPending ? (
              <ActivityIndicator color={colors.textOnPrimary} size="small" />
            ) : (
              <Text style={styles.primaryLabel}>
                {status.connected ? 'Update credentials' : 'Connect Twilio'}
              </Text>
            )}
          </Pressable>

          {status.connected ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.formLabel}>Send test SMS to</Text>
              <TextInput
                value={testTo}
                onChangeText={setTestTo}
                placeholder="+15551234567 (your phone)"
                placeholderTextColor={colors.textTertiary}
                style={styles.input}
                autoCapitalize="none"
                keyboardType="phone-pad"
              />
              <Pressable
                onPress={() => send.mutate()}
                disabled={send.isPending || !testTo}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  (send.isPending || !testTo) && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                {send.isPending ? (
                  <ActivityIndicator color={colors.textPrimary} size="small" />
                ) : (
                  <Text style={styles.secondaryLabel}>Send test SMS</Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => disconnect.mutate()}
                disabled={disconnect.isPending}
                style={({ pressed }) => [
                  styles.dangerBtn,
                  disconnect.isPending && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                {disconnect.isPending ? (
                  <ActivityIndicator color={colors.alert} size="small" />
                ) : (
                  <Text style={styles.dangerLabel}>Disconnect</Text>
                )}
              </Pressable>
            </>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          {success ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{success}</Text>
            </View>
          ) : null}

          <Text style={styles.helpText}>
            Get an Account SID + Auth Token from console.twilio.com → Account Info.
            Buy a phone number under Phone Numbers → Buy a Number. Use that number as
            the From — it must belong to the same Twilio account.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth()
  const fullName = (user?.user_metadata?.full_name as string | undefined) || null
  const email = user?.email || ''
  const [twilioOpen, setTwilioOpen] = useState(false)

  const recipientQuery = useQuery({
    queryKey: ['recipient', user?.id],
    queryFn: () => (user ? getMyPrimaryRecipient(user.id) : Promise.resolve(null)),
    enabled: !!user,
  })

  const twilioStatus = useQuery<TwilioStatus>({
    queryKey: ['twilio_status', recipientQuery.data?.id],
    queryFn: () =>
      recipientQuery.data
        ? getTwilioStatus(recipientQuery.data.id)
        : Promise.resolve({ connected: false }),
    enabled: !!recipientQuery.data,
  })

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
        <Pressable
          onPress={() => recipientQuery.data && setTwilioOpen(true)}
          disabled={!recipientQuery.data}
          style={({ pressed }) => [
            styles.card,
            styles.linkRow,
            pressed && { opacity: 0.7 },
            !recipientQuery.data && styles.disabled,
          ]}
        >
          <MessageSquare size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>Twilio · SMS</Text>
            <Text style={styles.rowValue}>
              {!recipientQuery.data
                ? 'Add a care recipient first'
                : twilioStatus.data?.connected
                  ? `Connected · ${twilioStatus.data.from}`
                  : 'Not connected'}
            </Text>
          </View>
          <Plug
            size={16}
            color={twilioStatus.data?.connected ? colors.ok : colors.textTertiary}
          />
        </Pressable>
        <Text style={styles.helper}>
          Connect your own Twilio account so the agent can text family and aides on
          your behalf. Voice + WhatsApp + Gmail integrations come next.
        </Text>

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

      <TwilioSheet
        visible={twilioOpen}
        recipientId={recipientQuery.data?.id ?? null}
        onClose={() => setTwilioOpen(false)}
      />
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
  linkRow: {
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
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    marginTop: spacing.sm,
    lineHeight: typography.size.xs * typography.lineHeight.relaxed,
  },
  helpText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    marginTop: spacing.lg,
    lineHeight: typography.size.xs * typography.lineHeight.relaxed,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalScroll: {
    maxHeight: '90%',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    paddingBottom: spacing['3xl'],
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
  },
  modalIntro: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: typography.size.sm * typography.lineHeight.relaxed,
    marginBottom: spacing.lg,
  },
  connectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.okLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  connectedTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.sm,
    color: colors.ok,
  },
  connectedMeta: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  formLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.size.md,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
    backgroundColor: 'white',
    marginBottom: spacing.sm,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  primaryLabel: {
    color: colors.textOnPrimary,
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.md,
  },
  secondaryBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  secondaryLabel: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.md,
  },
  dangerBtn: {
    backgroundColor: colors.alertLight,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  dangerLabel: {
    color: colors.alert,
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.md,
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  errorBox: {
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
  successBox: {
    backgroundColor: colors.okLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  successText: {
    color: colors.ok,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
  },
})
