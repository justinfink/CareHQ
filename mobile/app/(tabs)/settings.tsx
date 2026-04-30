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
import * as WebBrowser from 'expo-web-browser'
import {
  LogOut,
  Mail,
  User as UserIcon,
  MessageSquare,
  X,
  Check,
  Plug,
  CalendarDays,
  RefreshCw,
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
  getGoogleStatus,
  initGoogleOAuth,
  syncGoogleCalendar,
  syncGmail,
  disconnectGoogle,
  type GoogleConnections,
} from '../../src/api/integrations'
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme'

// ─── Twilio Sheet ──────────────────────────────────────────────────────

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
  const [whatsappFrom, setWhatsappFrom] = useState('')
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
      setWhatsappFrom('')
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
              <Text style={styles.modalTitle}>Twilio (SMS · Voice · WhatsApp)</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <X size={20} color={colors.textTertiary} />
            </Pressable>
          </View>

          <Text style={styles.modalIntro}>
            Connect your own Twilio account so the agent can text, call, or message
            team members on your behalf. You'll need an Active Twilio phone number
            for SMS/voice; WhatsApp From number is optional.
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
          <Text style={styles.formLabel}>From number for SMS/voice (E.164)</Text>
          <TextInput
            value={from}
            onChangeText={setFrom}
            placeholder="+15551234567"
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="phone-pad"
          />
          <Text style={styles.formLabel}>WhatsApp From (optional, E.164)</Text>
          <TextInput
            value={whatsappFrom}
            onChangeText={setWhatsappFrom}
            placeholder="+14155238886 (Twilio sandbox or your approved sender)"
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
            Get an Account SID + Auth Token from console.twilio.com. Buy or claim a
            phone number under Phone Numbers → Buy a Number; that number is your
            From for SMS and voice. For WhatsApp, the easiest way to start is the
            Twilio Sandbox (Messaging → Try it out → Send a WhatsApp message).
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Google Sheet ──────────────────────────────────────────────────────

function GoogleSheet({
  visible,
  recipientId,
  onClose,
}: {
  visible: boolean
  recipientId: string | null
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const statusQuery = useQuery<GoogleConnections>({
    queryKey: ['google_status', recipientId],
    queryFn: () =>
      recipientId
        ? getGoogleStatus(recipientId)
        : Promise.resolve({ calendarConnected: false, gmailConnected: false, account: null, lastSyncAt: null, lastSyncCount: null }),
    enabled: visible && !!recipientId,
  })
  const status = statusQuery.data

  React.useEffect(() => {
    if (visible) {
      setError(null)
      setSuccess(null)
    }
  }, [visible])

  const connect = useMutation({
    mutationFn: async () => {
      if (!recipientId) throw new Error('No recipient')
      const { url } = await initGoogleOAuth(recipientId)
      const result = await WebBrowser.openAuthSessionAsync(url, 'carehq://google/connected')
      if (result.type !== 'success' || !result.url) {
        throw new Error('Connection cancelled')
      }
      const u = new URL(result.url)
      const ok = u.searchParams.get('ok')
      if (ok !== '1') {
        throw new Error(u.searchParams.get('error') || 'Connection failed')
      }
      return u.searchParams.get('providers') ?? ''
    },
    onSuccess: (providers) => {
      setSuccess(`Connected: ${providers}`)
      setError(null)
      qc.invalidateQueries({ queryKey: ['google_status', recipientId] })
    },
    onError: (e: Error) => {
      setError(e.message)
      setSuccess(null)
    },
  })

  const syncCal = useMutation({
    mutationFn: async () => {
      if (!recipientId) throw new Error('No recipient')
      return syncGoogleCalendar(recipientId)
    },
    onSuccess: (r) => {
      setSuccess(`Calendar synced (${r.events.length} upcoming events)`)
      setError(null)
      qc.invalidateQueries({ queryKey: ['google_calendar', recipientId] })
    },
    onError: (e: Error) => setError(e.message),
  })

  const syncMail = useMutation({
    mutationFn: async () => {
      if (!recipientId) throw new Error('No recipient')
      return syncGmail(recipientId)
    },
    onSuccess: (r) => {
      setSuccess(`Gmail synced (${r.messageCount} messages pulled)`)
      setError(null)
      qc.invalidateQueries({ queryKey: ['google_status', recipientId] })
    },
    onError: (e: Error) => setError(e.message),
  })

  const disconnect = useMutation({
    mutationFn: async () => {
      if (!recipientId) throw new Error('No recipient')
      return disconnectGoogle(recipientId)
    },
    onSuccess: () => {
      setSuccess('Disconnected')
      setError(null)
      qc.invalidateQueries({ queryKey: ['google_status', recipientId] })
    },
    onError: (e: Error) => setError(e.message),
  })

  const anyConnected = !!(status?.calendarConnected || status?.gmailConnected)

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
              <CalendarDays size={20} color={colors.primary} />
              <Text style={styles.modalTitle}>Google (Calendar · Gmail)</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <X size={20} color={colors.textTertiary} />
            </Pressable>
          </View>

          <Text style={styles.modalIntro}>
            Connect your Google account so CareHQ can read upcoming appointments
            from your calendar and pull recent appointment / pharmacy / EOB emails
            for the agent to act on. Read-only — we never write to your inbox.
          </Text>

          {anyConnected ? (
            <View style={styles.connectedBanner}>
              <Check size={16} color={colors.ok} />
              <View style={{ flex: 1 }}>
                <Text style={styles.connectedTitle}>
                  Connected {status?.account ? `as ${status.account}` : ''}
                </Text>
                <Text style={styles.connectedMeta}>
                  {[
                    status?.calendarConnected ? 'Calendar' : null,
                    status?.gmailConnected ? 'Gmail' : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  {status?.lastSyncAt
                    ? ` · last sync ${new Date(status.lastSyncAt).toLocaleString()}`
                    : ''}
                </Text>
              </View>
            </View>
          ) : null}

          <Pressable
            onPress={() => connect.mutate()}
            disabled={connect.isPending}
            style={({ pressed }) => [
              styles.primaryBtn,
              connect.isPending && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            {connect.isPending ? (
              <ActivityIndicator color={colors.textOnPrimary} size="small" />
            ) : (
              <Text style={styles.primaryLabel}>
                {anyConnected ? 'Reconnect Google' : 'Connect Google'}
              </Text>
            )}
          </Pressable>

          {anyConnected ? (
            <>
              <View style={styles.divider} />
              <Pressable
                onPress={() => syncCal.mutate()}
                disabled={syncCal.isPending}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  syncCal.isPending && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                {syncCal.isPending ? (
                  <ActivityIndicator color={colors.textPrimary} size="small" />
                ) : (
                  <View style={styles.btnRow}>
                    <RefreshCw size={14} color={colors.textPrimary} />
                    <Text style={styles.secondaryLabel}>Sync Calendar</Text>
                  </View>
                )}
              </Pressable>
              <Pressable
                onPress={() => syncMail.mutate()}
                disabled={syncMail.isPending}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  syncMail.isPending && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                {syncMail.isPending ? (
                  <ActivityIndicator color={colors.textPrimary} size="small" />
                ) : (
                  <View style={styles.btnRow}>
                    <RefreshCw size={14} color={colors.textPrimary} />
                    <Text style={styles.secondaryLabel}>Sync Gmail</Text>
                  </View>
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
            Read-only scopes requested: calendar.readonly + calendar.events +
            gmail.readonly. Revoke anytime at myaccount.google.com → Security →
            Third-party access. While the OAuth project is in Testing mode, only
            test users on the carehq Google Cloud project can connect.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Settings Screen ──────────────────────────────────────────────────

export default function SettingsScreen() {
  const { user, signOut } = useAuth()
  const fullName = (user?.user_metadata?.full_name as string | undefined) || null
  const email = user?.email || ''
  const [twilioOpen, setTwilioOpen] = useState(false)
  const [googleOpen, setGoogleOpen] = useState(false)

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

  const googleStatus = useQuery<GoogleConnections>({
    queryKey: ['google_status', recipientQuery.data?.id],
    queryFn: () =>
      recipientQuery.data
        ? getGoogleStatus(recipientQuery.data.id)
        : Promise.resolve({ calendarConnected: false, gmailConnected: false, account: null, lastSyncAt: null, lastSyncCount: null }),
    enabled: !!recipientQuery.data,
  })

  const recipient = recipientQuery.data

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
          onPress={() => recipient && setTwilioOpen(true)}
          disabled={!recipient}
          style={({ pressed }) => [
            styles.card,
            styles.linkRow,
            pressed && { opacity: 0.7 },
            !recipient && styles.disabled,
          ]}
        >
          <MessageSquare size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>Twilio · SMS, Voice, WhatsApp</Text>
            <Text style={styles.rowValue}>
              {!recipient
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

        <View style={{ height: spacing.sm }} />

        <Pressable
          onPress={() => recipient && setGoogleOpen(true)}
          disabled={!recipient}
          style={({ pressed }) => [
            styles.card,
            styles.linkRow,
            pressed && { opacity: 0.7 },
            !recipient && styles.disabled,
          ]}
        >
          <CalendarDays size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>Google · Calendar + Gmail</Text>
            <Text style={styles.rowValue}>
              {!recipient
                ? 'Add a care recipient first'
                : googleStatus.data?.calendarConnected || googleStatus.data?.gmailConnected
                  ? `Connected${googleStatus.data?.account ? ' · ' + googleStatus.data.account : ''}`
                  : 'Not connected'}
            </Text>
          </View>
          <Plug
            size={16}
            color={
              googleStatus.data?.calendarConnected || googleStatus.data?.gmailConnected
                ? colors.ok
                : colors.textTertiary
            }
          />
        </Pressable>
        <Text style={styles.helper}>
          Connect your own accounts so the agent can text family/aides, place
          calls, read your appointments, and pull pharmacy / clinic emails. Apple
          Health Records (Epic + One Medical via HealthKit on iOS) is on the
          roadmap; right now we lean on Gmail-forward parsing on Android.
        </Text>

        <Text style={styles.sectionLabel}>Account</Text>
        <Pressable
          onPress={() => void signOut()}
          style={({ pressed }) => [styles.card, styles.signOutRow, pressed && { opacity: 0.7 }]}
        >
          <LogOut size={18} color={colors.alert} />
          <Text style={styles.signOutLabel}>Sign out</Text>
        </Pressable>

        <Text style={styles.versionText}>CareHQ · v0.2 · early access</Text>
      </ScrollView>

      <TwilioSheet
        visible={twilioOpen}
        recipientId={recipient?.id ?? null}
        onClose={() => setTwilioOpen(false)}
      />
      <GoogleSheet
        visible={googleOpen}
        recipientId={recipient?.id ?? null}
        onClose={() => setGoogleOpen(false)}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
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
  divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.md },
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
  signOutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
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
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalScroll: { maxHeight: '90%' },
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
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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
