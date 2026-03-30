import React, { useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Mic, MicOff, Keyboard } from 'lucide-react-native'
import { format, parseISO, isToday, isYesterday } from 'date-fns'
import { useAppStore } from '../../src/store/useAppStore'
import EventCard from '../../src/components/EventCard'
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme'

function groupEventsByDate(events: { timestamp: string }[]) {
  const groups: Record<string, typeof events> = {}
  for (const event of events) {
    const date = parseISO(event.timestamp)
    const key = format(date, 'yyyy-MM-dd')
    if (!groups[key]) groups[key] = []
    groups[key].push(event)
  }
  return Object.entries(groups).map(([dateKey, items]) => {
    const date = parseISO(dateKey)
    let label: string
    if (isToday(date)) label = 'Today'
    else if (isYesterday(date)) label = 'Yesterday'
    else label = format(date, 'EEEE, MMMM d')
    return { dateKey, label, items }
  })
}

export default function LogScreen() {
  const { events } = useAppStore()
  const [isRecording, setIsRecording] = useState(false)

  const groupedEvents = groupEventsByDate(events)

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.headerTitle}>Voice Log</Text>

        {/* Record Section */}
        <View style={styles.recordSection}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setIsRecording(!isRecording)}
            style={[
              styles.recordButton,
              isRecording && styles.recordButtonActive,
            ]}
          >
            {isRecording ? (
              <MicOff size={36} color={colors.textOnPrimary} />
            ) : (
              <Mic size={36} color={colors.textOnPrimary} />
            )}
          </TouchableOpacity>
          <Text style={styles.recordLabel}>
            {isRecording ? 'Tap to stop recording' : 'Tap to start logging'}
          </Text>

          {/* Pulse rings when recording */}
          {isRecording && (
            <View style={styles.pulseContainer}>
              <View style={[styles.pulseRing, styles.pulseRing1]} />
              <View style={[styles.pulseRing, styles.pulseRing2]} />
            </View>
          )}

          <TouchableOpacity activeOpacity={0.7} style={styles.typeLink}>
            <Keyboard size={16} color={colors.primary} />
            <Text style={styles.typeLinkText}>Type a note instead</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Entries */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Entries</Text>
          {groupedEvents.map((group) => (
            <View key={group.dateKey} style={styles.dateGroup}>
              <Text style={styles.dateLabel}>{group.label}</Text>
              {(group.items as any[]).map((event: any) => (
                <EventCard key={event.id} event={event} />
              ))}
            </View>
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size['2xl'],
    color: colors.textPrimary,
    marginBottom: spacing['2xl'],
  },
  recordSection: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    marginBottom: spacing['2xl'],
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.lg,
  },
  recordButtonActive: {
    backgroundColor: colors.alert,
  },
  pulseContainer: {
    position: 'absolute',
    top: spacing['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.alert,
    opacity: 0.2,
  },
  pulseRing1: {
    width: 100,
    height: 100,
  },
  pulseRing2: {
    width: 120,
    height: 120,
    opacity: 0.1,
  },
  recordLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.md,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  typeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typeLinkText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.md,
    color: colors.primary,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  dateGroup: {
    marginBottom: spacing.lg,
  },
  dateLabel: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.sm,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  bottomSpacer: {
    height: spacing['3xl'],
  },
})
