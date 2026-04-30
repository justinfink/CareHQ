import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart, UserPlus } from 'lucide-react-native'
import { useAuth } from '../../src/contexts/AuthContext'
import {
  getMyPrimaryRecipient,
  createRecipient,
  type CareRecipient,
} from '../../src/api/recipient'
import { supabase } from '../../src/lib/supabase'
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme'

interface BrainRow {
  conditions: unknown[]
  medications: unknown[]
  allergies: unknown[]
  providers: unknown[]
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

function RecipientView({ recipient }: { recipient: CareRecipient }) {
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

  const counts = {
    conditions: brain?.conditions?.length ?? 0,
    medications: brain?.medications?.length ?? 0,
    allergies: brain?.allergies?.length ?? 0,
    providers: brain?.providers?.length ?? 0,
  }

  return (
    <View>
      <View style={styles.headerCard}>
        <Heart size={20} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.recipientName}>{recipient.name}</Text>
          <Text style={styles.recipientMeta}>
            Care recipient · added {new Date(recipient.created_at ?? '').toLocaleDateString()}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Brain</Text>
      <View style={styles.gridCard}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Conditions</Text>
          <Text style={styles.statValue}>{counts.conditions}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Medications</Text>
          <Text style={styles.statValue}>{counts.medications}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Allergies</Text>
          <Text style={styles.statValue}>{counts.allergies}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Providers</Text>
          <Text style={styles.statValue}>{counts.providers}</Text>
        </View>
      </View>
      <Text style={styles.helper}>
        Detailed editing of conditions, meds, and providers is coming next. For now
        the agent can record updates conversationally — say "add lisinopril 10mg
        morning" in the home composer.
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
  gridCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  statLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.md,
    color: colors.textSecondary,
  },
  statValue: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.md,
    color: colors.textPrimary,
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
})
