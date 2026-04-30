import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart, UserPlus, Plus, X, Pill, Stethoscope, ShieldAlert } from 'lucide-react-native'
import { useAuth } from '../../src/contexts/AuthContext'
import {
  getMyPrimaryRecipient,
  createRecipient,
  type CareRecipient,
} from '../../src/api/recipient'
import { supabase } from '../../src/lib/supabase'
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme'

type BrainField = 'medications' | 'conditions' | 'allergies' | 'providers'

interface BrainRow {
  conditions: any[]
  medications: any[]
  allergies: any[]
  providers: any[]
}

function CreateRecipientForm({
  onCreated,
}: {
  onCreated: (r: CareRecipient) => void
}) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const create = useMutation({
    mutationFn: async (n: string) => {
      if (!user) throw new Error('Not signed in')
      return createRecipient({ name: n, ownerProfileId: user.id })
    },
    onSuccess: (r) => onCreated(r),
    onError: (err: Error) => setError(err.message),
  })

  return (
    <View style={styles.formCard}>
      <Heart size={24} color={colors.primary} style={{ marginBottom: spacing.md }} />
      <Text style={styles.formTitle}>Who are you caring for?</Text>
      <Text style={styles.formSubtitle}>
        This is the person CareHQ will help you coordinate care for. You'll add
        their conditions, medications, providers, and team after.
      </Text>
      <TextInput
        value={name}
        onChangeText={(v) => {
          setName(v)
          setError(null)
        }}
        placeholder="e.g. Mom, or Robert Chen"
        placeholderTextColor={colors.textTertiary}
        style={styles.input}
        autoCapitalize="words"
        autoCorrect={false}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        onPress={() => name.trim() && create.mutate(name.trim())}
        disabled={!name.trim() || create.isPending}
        style={({ pressed }) => [
          styles.primaryBtn,
          (!name.trim() || create.isPending) && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        {create.isPending ? (
          <ActivityIndicator color={colors.textOnPrimary} size="small" />
        ) : (
          <Text style={styles.primaryLabel}>Add care recipient</Text>
        )}
      </Pressable>
    </View>
  )
}

interface AddItemSheetProps {
  visible: boolean
  field: BrainField | null
  recipientId: string
  ownerId: string
  onClose: () => void
}

const FIELD_CONFIG: Record<
  BrainField,
  { title: string; placeholder: string; primaryKey: string; extraFields?: Array<{ key: string; placeholder: string }> }
> = {
  medications: {
    title: 'Add medication',
    placeholder: 'e.g. Lisinopril',
    primaryKey: 'name',
    extraFields: [
      { key: 'dose', placeholder: 'Dose (e.g. 10mg)' },
      { key: 'schedule', placeholder: 'Schedule (e.g. morning, with food)' },
    ],
  },
  conditions: {
    title: 'Add condition',
    placeholder: 'e.g. Hypertension',
    primaryKey: 'name',
    extraFields: [{ key: 'notes', placeholder: 'Notes (optional)' }],
  },
  allergies: {
    title: 'Add allergy',
    placeholder: 'e.g. Penicillin',
    primaryKey: 'name',
    extraFields: [{ key: 'severity', placeholder: 'Severity (e.g. anaphylactic)' }],
  },
  providers: {
    title: 'Add provider',
    placeholder: 'e.g. Dr. Kapoor',
    primaryKey: 'name',
    extraFields: [
      { key: 'specialty', placeholder: 'Specialty (e.g. Neurology)' },
      { key: 'phone', placeholder: 'Phone (optional)' },
      { key: 'organization', placeholder: 'Organization (optional)' },
    ],
  },
}

function AddItemSheet({ visible, field, recipientId, ownerId, onClose }: AddItemSheetProps) {
  const qc = useQueryClient()
  const [primary, setPrimary] = useState('')
  const [extras, setExtras] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const config = field ? FIELD_CONFIG[field] : null

  React.useEffect(() => {
    if (visible) {
      setPrimary('')
      setExtras({})
      setError(null)
    }
  }, [visible])

  const append = useMutation({
    mutationFn: async () => {
      if (!field || !primary.trim()) throw new Error('Name is required')
      // Read current
      const { data, error: readErr } = await supabase
        .from('recipient_brain')
        .select(field)
        .eq('recipient_id', recipientId)
        .maybeSingle()
      if (readErr) throw readErr
      const current = (data as any)?.[field]
      const arr = Array.isArray(current) ? current : []

      const item: Record<string, string> = { [config!.primaryKey]: primary.trim() }
      for (const f of config!.extraFields ?? []) {
        const v = extras[f.key]?.trim()
        if (v) item[f.key] = v
      }

      const { error: writeErr } = await supabase
        .from('recipient_brain')
        .upsert(
          {
            recipient_id: recipientId,
            [field]: [...arr, item],
            updated_by: ownerId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'recipient_id' },
        )
      if (writeErr) throw writeErr
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipient_brain', recipientId] })
      onClose()
    },
    onError: (err: Error) => setError(err.message),
  })

  if (!field || !config) return null

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{config.title}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <X size={20} color={colors.textTertiary} />
            </Pressable>
          </View>
          <TextInput
            value={primary}
            onChangeText={(v) => {
              setPrimary(v)
              setError(null)
            }}
            placeholder={config.placeholder}
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
            autoCapitalize="words"
          />
          {(config.extraFields ?? []).map((f) => (
            <TextInput
              key={f.key}
              value={extras[f.key] ?? ''}
              onChangeText={(v) => setExtras((e) => ({ ...e, [f.key]: v }))}
              placeholder={f.placeholder}
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
          ))}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            onPress={() => append.mutate()}
            disabled={!primary.trim() || append.isPending}
            style={({ pressed }) => [
              styles.primaryBtn,
              (!primary.trim() || append.isPending) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            {append.isPending ? (
              <ActivityIndicator color={colors.textOnPrimary} size="small" />
            ) : (
              <Text style={styles.primaryLabel}>Save</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function BrainSection({
  field,
  label,
  icon: Icon,
  items,
  onAdd,
}: {
  field: BrainField
  label: string
  icon: React.ComponentType<{ size: number; color: string }>
  items: any[]
  onAdd: (f: BrainField) => void
}) {
  return (
    <View style={styles.brainSection}>
      <View style={styles.brainSectionHeader}>
        <View style={styles.brainSectionTitleRow}>
          <Icon size={16} color={colors.primary} />
          <Text style={styles.brainSectionTitle}>{label}</Text>
          <Text style={styles.brainSectionCount}>{items?.length ?? 0}</Text>
        </View>
        <Pressable
          onPress={() => onAdd(field)}
          hitSlop={8}
          style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
        >
          <Plus size={14} color={colors.primary} />
          <Text style={styles.addBtnLabel}>Add</Text>
        </Pressable>
      </View>
      {(items ?? []).length === 0 ? (
        <Text style={styles.brainEmpty}>None added yet.</Text>
      ) : (
        items.map((item, i) => (
          <View key={i} style={styles.brainItem}>
            <Text style={styles.brainItemName}>
              {item.name || JSON.stringify(item)}
            </Text>
            {Object.entries(item)
              .filter(([k]) => k !== 'name')
              .map(([k, v]) => (
                <Text key={k} style={styles.brainItemDetail}>
                  {k}: {String(v)}
                </Text>
              ))}
          </View>
        ))
      )}
    </View>
  )
}

function RecipientView({ recipient }: { recipient: CareRecipient }) {
  const { user } = useAuth()
  const [sheet, setSheet] = useState<{ visible: boolean; field: BrainField | null }>({
    visible: false,
    field: null,
  })

  const brainQuery = useQuery({
    queryKey: ['recipient_brain', recipient.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipient_brain')
        .select('conditions, medications, allergies, providers')
        .eq('recipient_id', recipient.id)
        .maybeSingle()
      if (error) throw error
      return (data ?? null) as BrainRow | null
    },
  })

  const teamQuery = useQuery({
    queryKey: ['care_team', recipient.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('care_teams')
        .select('id, role, member_role, display_name, contact_email, organization')
        .eq('care_recipient_id', recipient.id)
      if (error) throw error
      return data ?? []
    },
  })

  const team = teamQuery.data ?? []
  const brain = brainQuery.data

  return (
    <View>
      <View style={styles.headerCard}>
        <Heart size={20} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.recipientName}>{recipient.name}</Text>
          <Text style={styles.recipientMeta}>
            Care recipient · added{' '}
            {new Date(recipient.created_at ?? '').toLocaleDateString()}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Brain</Text>
      <View style={styles.brainCard}>
        <BrainSection
          field="medications"
          label="Medications"
          icon={Pill}
          items={brain?.medications ?? []}
          onAdd={(f) => setSheet({ visible: true, field: f })}
        />
        <View style={styles.divider} />
        <BrainSection
          field="conditions"
          label="Conditions"
          icon={Heart}
          items={brain?.conditions ?? []}
          onAdd={(f) => setSheet({ visible: true, field: f })}
        />
        <View style={styles.divider} />
        <BrainSection
          field="allergies"
          label="Allergies"
          icon={ShieldAlert}
          items={brain?.allergies ?? []}
          onAdd={(f) => setSheet({ visible: true, field: f })}
        />
        <View style={styles.divider} />
        <BrainSection
          field="providers"
          label="Providers"
          icon={Stethoscope}
          items={brain?.providers ?? []}
          onAdd={(f) => setSheet({ visible: true, field: f })}
        />
      </View>
      <Text style={styles.helper}>
        You can also tell the agent on Home: "Add lisinopril 10mg morning" or
        "Mom is allergic to penicillin" — it'll update the brain for you.
      </Text>

      <Text style={styles.sectionTitle}>Care team</Text>
      {team.length === 0 ? (
        <View style={styles.empty}>
          <UserPlus size={24} color={colors.textTertiary} />
          <Text style={styles.emptyText}>
            Just you so far. Inviting family members and professional caregivers
            is coming next.
          </Text>
        </View>
      ) : (
        team.map((m) => (
          <View key={m.id} style={styles.row}>
            <Text style={styles.rowName}>
              {m.display_name || m.contact_email || 'Member'}
            </Text>
            <Text style={styles.rowMeta}>
              {(m.member_role || m.role)?.toString()}
              {m.organization ? ` · ${m.organization}` : ''}
            </Text>
          </View>
        ))
      )}

      {user ? (
        <AddItemSheet
          visible={sheet.visible}
          field={sheet.field}
          recipientId={recipient.id}
          ownerId={user.id}
          onClose={() => setSheet({ visible: false, field: null })}
        />
      ) : null}
    </View>
  )
}

export default function CareScreen() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const recipientQuery = useQuery({
    queryKey: ['recipient', user?.id],
    queryFn: () => (user ? getMyPrimaryRecipient(user.id) : Promise.resolve(null)),
    enabled: !!user,
  })

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Care</Text>
        {recipientQuery.isLoading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : recipientQuery.data ? (
          <RecipientView recipient={recipientQuery.data} />
        ) : (
          <CreateRecipientForm
            onCreated={() => qc.invalidateQueries({ queryKey: ['recipient', user?.id] })}
          />
        )}
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
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    ...shadows.sm,
  },
  formTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  formSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: typography.size.sm * typography.lineHeight.relaxed,
    marginBottom: spacing.lg,
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
    marginBottom: spacing.md,
  },
  error: {
    color: colors.alert,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    marginBottom: spacing.md,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  primaryLabel: {
    color: colors.textOnPrimary,
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.md,
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  recipientName: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
  },
  recipientMeta: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.md,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  brainCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  brainSection: {
    paddingVertical: spacing.sm,
  },
  brainSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brainSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brainSectionTitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.md,
    color: colors.textPrimary,
  },
  brainSectionCount: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    marginLeft: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
  },
  addBtnLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.primary,
  },
  brainEmpty: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  brainItem: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  brainItemName: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.textPrimary,
  },
  brainItemDetail: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.sm,
  },
  helper: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    lineHeight: typography.size.xs * typography.lineHeight.relaxed,
  },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.sm,
  },
  emptyText: {
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
  rowName: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.md,
    color: colors.textPrimary,
  },
  rowMeta: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    textTransform: 'capitalize',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
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
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
  },
})
