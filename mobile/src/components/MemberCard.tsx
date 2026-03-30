import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Phone } from 'lucide-react-native'
import type { CareTeamMember } from '../types'
import Avatar from './Avatar'
import Badge from './Badge'
import { colors, typography, spacing, borderRadius, shadows } from '../theme'

interface MemberCardProps {
  member: CareTeamMember
}

function formatType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

export default function MemberCard({ member }: MemberCardProps) {
  return (
    <TouchableOpacity activeOpacity={0.7} style={styles.card}>
      <View style={styles.topRow}>
        <Avatar name={member.name} size={44} />
        <View style={styles.info}>
          <Text style={styles.name}>{member.name}</Text>
          <Text style={styles.role}>{member.role}</Text>
          {member.organization && (
            <Text style={styles.org}>{member.organization}</Text>
          )}
        </View>
      </View>
      <View style={styles.bottomRow}>
        <View style={styles.badges}>
          <Badge
            label={formatType(member.type)}
            variant="memberType"
            memberType={member.type}
          />
          <Badge
            label={member.status}
            variant="status"
            status={member.status}
          />
        </View>
        <View style={styles.schedule}>
          <Text style={styles.scheduleText} numberOfLines={1}>
            {member.schedule}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  info: {
    marginLeft: spacing.md,
    flex: 1,
  },
  name: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.md,
    color: colors.textPrimary,
  },
  role: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  org: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  schedule: {
    flex: 1,
    alignItems: 'flex-end',
  },
  scheduleText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
  },
})
