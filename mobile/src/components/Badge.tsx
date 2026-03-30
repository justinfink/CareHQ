import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, typography, borderRadius, spacing } from '../theme'
import type { EventCategory, InsightSeverity, TeamMemberType, MemberStatus } from '../types'

type BadgeVariant = 'category' | 'severity' | 'memberType' | 'status'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
  category?: EventCategory
  severity?: InsightSeverity
  memberType?: TeamMemberType
  status?: MemberStatus
}

interface BadgeColors {
  bg: string
  text: string
}

function getCategoryColors(category: EventCategory): BadgeColors {
  const map: Record<EventCategory, BadgeColors> = {
    medication: { bg: '#F3F0FF', text: colors.medication as string },
    mobility: { bg: colors.infoLight as string, text: colors.mobility as string },
    behavior: { bg: colors.warningLight as string, text: '#92631A' },
    therapy: { bg: colors.okLight as string, text: colors.therapy as string },
    coordination: { bg: '#F3F4F6', text: colors.coordination as string },
    incident: { bg: colors.alertLight as string, text: colors.incident as string },
    medical: { bg: colors.primaryLight as string, text: colors.medical as string },
  }
  return map[category] || { bg: '#F3F4F6', text: colors.textSecondary as string }
}

function getSeverityColors(severity: InsightSeverity): BadgeColors {
  const map: Record<InsightSeverity, BadgeColors> = {
    alert: { bg: colors.alertLight as string, text: colors.alert as string },
    warning: { bg: colors.warningLight as string, text: '#92631A' },
    info: { bg: colors.infoLight as string, text: colors.info as string },
    ok: { bg: colors.okLight as string, text: colors.ok as string },
  }
  return map[severity] || { bg: '#F3F4F6', text: colors.textSecondary as string }
}

function getMemberTypeColors(type: TeamMemberType): BadgeColors {
  const map: Record<TeamMemberType, BadgeColors> = {
    professional: { bg: colors.primaryLight as string, text: colors.professional as string },
    family: { bg: '#F3F0FF', text: colors.family as string },
    medical: { bg: colors.infoLight as string, text: colors.medicalType as string },
    agency: { bg: colors.accentLight as string, text: '#92631A' },
  }
  return map[type] || { bg: '#F3F4F6', text: colors.textSecondary as string }
}

function getStatusColors(status: MemberStatus): BadgeColors {
  const map: Record<MemberStatus, BadgeColors> = {
    active: { bg: colors.okLight as string, text: colors.ok as string },
    inactive: { bg: '#F3F4F6', text: colors.textTertiary as string },
    'on-leave': { bg: colors.warningLight as string, text: '#92631A' },
  }
  return map[status] || { bg: '#F3F4F6', text: colors.textSecondary as string }
}

export default function Badge({ label, variant, category, severity, memberType, status }: BadgeProps) {
  let badgeColors: BadgeColors = { bg: '#F3F4F6', text: colors.textSecondary as string }

  if (variant === 'category' && category) {
    badgeColors = getCategoryColors(category)
  } else if (variant === 'severity' && severity) {
    badgeColors = getSeverityColors(severity)
  } else if (variant === 'memberType' && memberType) {
    badgeColors = getMemberTypeColors(memberType)
  } else if (variant === 'status' && status) {
    badgeColors = getStatusColors(status)
  }

  return (
    <View style={[styles.badge, { backgroundColor: badgeColors.bg }]}>
      <Text style={[styles.label, { color: badgeColors.text }]}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    textTransform: 'capitalize',
  },
})
