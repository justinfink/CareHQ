import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Avatar from './Avatar'
import { colors, typography, spacing, borderRadius, shadows } from '../theme'

interface ShiftCardProps {
  name: string
  role: string
  time: string
  isActive?: boolean
  color?: string
}

export default function ShiftCard({ name, role, time, isActive = false, color }: ShiftCardProps) {
  return (
    <View style={[styles.card, isActive && styles.activeCard]}>
      <View style={[styles.colorBar, { backgroundColor: color || colors.primary }]} />
      <View style={styles.content}>
        <View style={styles.row}>
          <Avatar name={name} size={36} color={color} />
          <View style={styles.info}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.role}>{role}</Text>
          </View>
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.time}>{time}</Text>
          {isActive && (
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>On shift</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    overflow: 'hidden',
    ...shadows.sm,
  },
  activeCard: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  colorBar: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
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
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  activeText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.primary,
  },
})
