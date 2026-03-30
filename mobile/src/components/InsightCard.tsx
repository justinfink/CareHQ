import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { AlertTriangle, AlertCircle, Info, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react-native'
import type { Insight } from '../types'
import Badge from './Badge'
import { colors, typography, spacing, borderRadius, shadows } from '../theme'

interface InsightCardProps {
  insight: Insight
}

function getSeverityIcon(severity: string) {
  switch (severity) {
    case 'alert':
      return <AlertTriangle size={18} color={colors.alert} />
    case 'warning':
      return <AlertCircle size={18} color={colors.warning} />
    case 'info':
      return <Info size={18} color={colors.info} />
    case 'ok':
      return <CheckCircle size={18} color={colors.ok} />
    default:
      return <Info size={18} color={colors.textTertiary} />
  }
}

function getSeverityBorderColor(severity: string): string {
  switch (severity) {
    case 'alert': return colors.alert
    case 'warning': return colors.warning
    case 'info': return colors.info
    case 'ok': return colors.ok
    default: return colors.border
  }
}

export default function InsightCard({ insight }: InsightCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => setExpanded(!expanded)}
      style={[
        styles.card,
        { borderLeftColor: getSeverityBorderColor(insight.severity) },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {getSeverityIcon(insight.severity)}
          <Badge
            label={insight.severity}
            variant="severity"
            severity={insight.severity}
          />
        </View>
        {expanded ? (
          <ChevronUp size={18} color={colors.textTertiary} />
        ) : (
          <ChevronDown size={18} color={colors.textTertiary} />
        )}
      </View>

      <Text style={styles.title}>{insight.title}</Text>
      <Text style={styles.summary}>{insight.summary}</Text>

      {expanded && (
        <View style={styles.expandedContent}>
          <Text style={styles.detail}>{insight.detail}</Text>
          {insight.suggestedAction && (
            <View style={styles.actionContainer}>
              <Text style={styles.actionLabel}>What to do</Text>
              <Text style={styles.actionText}>{insight.suggestedAction}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  summary: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.md,
    color: colors.textSecondary,
    lineHeight: typography.size.md * typography.lineHeight.relaxed,
  },
  expandedContent: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  detail: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.md,
    color: colors.textSecondary,
    lineHeight: typography.size.md * typography.lineHeight.relaxed,
    marginBottom: spacing.lg,
  },
  actionContainer: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
  },
  actionLabel: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.sm,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  actionText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.primaryDark,
    lineHeight: typography.size.sm * typography.lineHeight.relaxed,
  },
})
