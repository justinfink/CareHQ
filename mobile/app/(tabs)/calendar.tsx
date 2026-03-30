import React, { useState, useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  addMonths,
  subWeeks,
  subMonths,
  isWithinInterval,
  isSameDay,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native'
import { useAppStore } from '../../src/store/useAppStore'
import type { CalendarEvent } from '../../src/types/calendar'
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme'

function getEventTypeLabel(type: string): string {
  switch (type) {
    case 'shift': return 'Shift'
    case 'appointment': return 'Appt'
    case 'task': return 'Task'
    case 'reminder': return 'Reminder'
    default: return type
  }
}

function groupEventsByDay(events: CalendarEvent[]) {
  const groups: Record<string, CalendarEvent[]> = {}
  for (const event of events) {
    const dateKey = format(parseISO(event.startTime), 'yyyy-MM-dd')
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(event)
  }
  // Sort each group by start time
  for (const key of Object.keys(groups)) {
    groups[key].sort(
      (a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime()
    )
  }
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, items]) => ({
      dateKey,
      label: format(parseISO(dateKey), 'EEEE, MMMM d'),
      isToday: isSameDay(parseISO(dateKey), new Date()),
      items,
    }))
}

export default function CalendarScreen() {
  const { calendarEvents } = useAppStore()
  const [viewType, setViewType] = useState<'week' | 'month'>('week')
  const [currentDate, setCurrentDate] = useState(new Date())

  const rangeStart = viewType === 'week'
    ? startOfWeek(currentDate, { weekStartsOn: 1 })
    : startOfMonth(currentDate)
  const rangeEnd = viewType === 'week'
    ? endOfWeek(currentDate, { weekStartsOn: 1 })
    : endOfMonth(currentDate)

  const filteredEvents = useMemo(() => {
    return calendarEvents.filter((event) => {
      const eventDate = parseISO(event.startTime)
      return isWithinInterval(eventDate, { start: rangeStart, end: rangeEnd })
    })
  }, [calendarEvents, rangeStart, rangeEnd])

  const groupedEvents = useMemo(() => groupEventsByDay(filteredEvents), [filteredEvents])

  const navigateBack = () => {
    setCurrentDate(viewType === 'week' ? subWeeks(currentDate, 1) : subMonths(currentDate, 1))
  }

  const navigateForward = () => {
    setCurrentDate(viewType === 'week' ? addWeeks(currentDate, 1) : addMonths(currentDate, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const headerLabel = viewType === 'week'
    ? `${format(rangeStart, 'MMM d')} \u2013 ${format(rangeEnd, 'MMM d, yyyy')}`
    : format(currentDate, 'MMMM yyyy')

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendar</Text>

        {/* View Toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setViewType('week')}
            style={[styles.toggleButton, viewType === 'week' && styles.toggleActive]}
          >
            <Text style={[styles.toggleText, viewType === 'week' && styles.toggleTextActive]}>
              Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setViewType('month')}
            style={[styles.toggleButton, viewType === 'month' && styles.toggleActive]}
          >
            <Text style={[styles.toggleText, viewType === 'month' && styles.toggleTextActive]}>
              Month
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity onPress={navigateBack} style={styles.navButton}>
          <ChevronLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={goToToday}>
          <Text style={styles.navLabel}>{headerLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={navigateForward} style={styles.navButton}>
          <ChevronRight size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Events */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {groupedEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No events this {viewType}</Text>
          </View>
        ) : (
          groupedEvents.map((group) => (
            <View key={group.dateKey} style={styles.dayGroup}>
              <View style={styles.dayHeader}>
                <Text style={[styles.dayLabel, group.isToday && styles.dayLabelToday]}>
                  {group.label}
                </Text>
                {group.isToday && (
                  <View style={styles.todayBadge}>
                    <Text style={styles.todayText}>Today</Text>
                  </View>
                )}
              </View>
              {group.items.map((event) => (
                <TouchableOpacity key={event.id} activeOpacity={0.7} style={styles.eventRow}>
                  <View style={[styles.eventColorBar, { backgroundColor: event.color }]} />
                  <View style={styles.eventContent}>
                    <View style={styles.eventTopRow}>
                      <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                      <View style={[styles.typeBadge, { backgroundColor: event.color + '20' }]}>
                        <Text style={[styles.typeLabel, { color: event.color }]}>
                          {getEventTypeLabel(event.type)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.eventTime}>
                      {format(parseISO(event.startTime), 'h:mm a')} {'\u2013'} {format(parseISO(event.endTime), 'h:mm a')}
                    </Text>
                    {event.location && (
                      <Text style={styles.eventLocation} numberOfLines={1}>{event.location}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity activeOpacity={0.8} style={styles.fab}>
        <Plus size={24} color={colors.textOnPrimary} />
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size['2xl'],
    color: colors.textPrimary,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  toggleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.textOnPrimary,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  navLabel: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.md,
    color: colors.textPrimary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  emptyState: {
    paddingVertical: spacing['5xl'],
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.md,
    color: colors.textTertiary,
  },
  dayGroup: {
    marginBottom: spacing.xl,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  dayLabel: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.sm,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayLabelToday: {
    color: colors.primary,
  },
  todayBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  todayText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.xs,
    color: colors.primary,
  },
  eventRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...shadows.sm,
  },
  eventColorBar: {
    width: 4,
  },
  eventContent: {
    flex: 1,
    padding: spacing.md,
  },
  eventTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  eventTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.md,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  typeLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
  },
  eventTime: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  eventLocation: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  bottomSpacer: {
    height: spacing['5xl'],
  },
})
