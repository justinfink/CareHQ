import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { format, parseISO } from 'date-fns'
import { Flag } from 'lucide-react-native'
import type { CareEvent } from '../types'
import Badge from './Badge'
import { colors, typography, spacing, borderRadius, shadows } from '../theme'

interface EventCardProps {
  event: CareEvent
}

export default function EventCard({ event }: EventCardProps) {
  const date = parseISO(event.timestamp)

  return (
    <View style={[styles.card, event.flagged && styles.flagged]}>
      <View style={styles.header}>
        <Badge
          label={event.category}
          variant="category"
          category={event.category}
        />
        <Text style={styles.time}>{format(date, 'h:mm a')}</Text>
      </View>
      <Text style={styles.summary} numberOfLines={2}>
        {event.summary}
      </Text>
      <View style={styles.footer}>
        <Text style={styles.loggedBy}>{event.loggedBy}</Text>
        {event.flagged && (
          <View style={styles.flagContainer}>
            <Flag size={12} color={colors.alert} fill={colors.alert} />
            <Text style={styles.flagText}>Flagged</Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 0,
    ...shadows.sm,
  },
  flagged: {
    borderLeftWidth: 3,
    borderLeftColor: colors.alert,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  time: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
  },
  summary: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.md,
    color: colors.textPrimary,
    lineHeight: typography.size.md * typography.lineHeight.normal,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loggedBy: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textTertiary,
  },
  flagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  flagText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.alert,
  },
})
