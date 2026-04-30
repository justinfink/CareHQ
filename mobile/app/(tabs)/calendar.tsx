import React from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { format, isSameDay, parseISO } from 'date-fns'
import { CalendarDays, ExternalLink } from 'lucide-react-native'
import { useAuth } from '../../src/contexts/AuthContext'
import { getMyPrimaryRecipient } from '../../src/api/recipient'
import {
  getGoogleStatus,
  syncGoogleCalendar,
  type GoogleCalendarEvent,
} from '../../src/api/integrations'
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme'

function eventStartLabel(e: GoogleCalendarEvent): { date: Date; allDay: boolean } | null {
  if (e.start?.dateTime) return { date: parseISO(e.start.dateTime), allDay: false }
  if (e.start?.date) return { date: parseISO(e.start.date), allDay: true }
  return null
}

export default function CalendarScreen() {
  const router = useRouter()
  const { user } = useAuth()

  const recipientQuery = useQuery({
    queryKey: ['recipient', user?.id],
    queryFn: () => (user ? getMyPrimaryRecipient(user.id) : Promise.resolve(null)),
    enabled: !!user,
  })

  const statusQuery = useQuery({
    queryKey: ['google_status', recipientQuery.data?.id],
    queryFn: () =>
      recipientQuery.data
        ? getGoogleStatus(recipientQuery.data.id)
        : Promise.resolve({
            calendarConnected: false,
            gmailConnected: false,
            account: null,
            lastSyncAt: null,
            lastSyncCount: null,
          }),
    enabled: !!recipientQuery.data,
  })

  const eventsQuery = useQuery({
    queryKey: ['google_calendar', recipientQuery.data?.id],
    queryFn: async () => {
      if (!recipientQuery.data) return { events: [] as GoogleCalendarEvent[] }
      return syncGoogleCalendar(recipientQuery.data.id)
    },
    enabled: !!recipientQuery.data && !!statusQuery.data?.calendarConnected,
  })

  const events = eventsQuery.data?.events ?? []

  // Group events by day
  const grouped: Array<{ day: Date; items: GoogleCalendarEvent[] }> = []
  for (const e of events) {
    const start = eventStartLabel(e)
    if (!start) continue
    const last = grouped[grouped.length - 1]
    if (last && isSameDay(last.day, start.date)) {
      last.items.push(e)
    } else {
      grouped.push({ day: start.date, items: [e] })
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={eventsQuery.isFetching}
            onRefresh={() => {
              statusQuery.refetch()
              eventsQuery.refetch()
            }}
            tintColor={colors.primary}
          />
        }
      >
        <Text style={styles.title}>Calendar</Text>
        <Text style={styles.subtitle}>
          Upcoming appointments, shifts, and reminders the agent is tracking.
        </Text>

        {!recipientQuery.data ? (
          <View style={styles.empty}>
            <CalendarDays size={28} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>Add a care recipient first</Text>
            <Text style={styles.emptyBody}>
              Once you set up the person you're caring for in the Care tab, your
              connected calendars will appear here.
            </Text>
          </View>
        ) : !statusQuery.data?.calendarConnected ? (
          <Pressable
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [styles.empty, pressed && { opacity: 0.7 }]}
          >
            <CalendarDays size={28} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>Connect Google Calendar</Text>
            <Text style={styles.emptyBody}>
              Tap to head to Settings → Channels → Google. We pull the next 60 days
              of events from your primary calendar (read-only). Two-way sync is
              coming next.
            </Text>
            <View style={styles.cta}>
              <Text style={styles.ctaLabel}>Open Settings</Text>
            </View>
          </Pressable>
        ) : eventsQuery.isLoading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : events.length === 0 ? (
          <View style={styles.empty}>
            <CalendarDays size={28} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>Nothing on the calendar</Text>
            <Text style={styles.emptyBody}>
              No upcoming events from your primary Google Calendar in the next 60
              days. Pull to refresh.
            </Text>
          </View>
        ) : (
          grouped.map((group) => (
            <View key={group.day.toISOString()} style={styles.dayBlock}>
              <Text style={styles.dayHeader}>
                {format(group.day, 'EEEE, MMMM d')}
              </Text>
              {group.items.map((e) => {
                const start = eventStartLabel(e)
                const end = e.end?.dateTime ? parseISO(e.end.dateTime) : null
                return (
                  <View key={e.id} style={styles.eventCard}>
                    <View style={styles.eventTime}>
                      <Text style={styles.eventTimeText}>
                        {start?.allDay
                          ? 'All day'
                          : start
                            ? format(start.date, 'h:mm a')
                            : ''}
                      </Text>
                      {end && !start?.allDay ? (
                        <Text style={styles.eventTimeText}>{format(end, 'h:mm a')}</Text>
                      ) : null}
                    </View>
                    <View style={styles.eventBody}>
                      <Text style={styles.eventTitle}>
                        {e.summary || '(no title)'}
                      </Text>
                      {e.description ? (
                        <Text style={styles.eventDesc} numberOfLines={2}>
                          {e.description}
                        </Text>
                      ) : null}
                      {(e.attendees ?? []).length > 0 ? (
                        <Text style={styles.eventAttendees}>
                          {(e.attendees ?? [])
                            .map((a) => a.displayName || a.email)
                            .filter(Boolean)
                            .slice(0, 3)
                            .join(', ')}
                          {(e.attendees ?? []).length > 3
                            ? ` +${(e.attendees ?? []).length - 3}`
                            : ''}
                        </Text>
                      ) : null}
                      {e.hangoutLink ? (
                        <View style={styles.linkRow}>
                          <ExternalLink size={12} color={colors.primary} />
                          <Text style={styles.linkLabel}>Google Meet</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                )
              })}
            </View>
          ))
        )}

        {eventsQuery.isError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {(eventsQuery.error as Error).message}
            </Text>
          </View>
        ) : null}
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
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.sm,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.md,
    color: colors.textPrimary,
  },
  emptyBody: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.size.sm * typography.lineHeight.relaxed,
  },
  cta: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  ctaLabel: {
    color: colors.textOnPrimary,
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.sm,
  },
  dayBlock: { marginBottom: spacing.lg },
  dayHeader: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.sm,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.md,
    ...shadows.sm,
  },
  eventTime: {
    width: 64,
    alignItems: 'flex-start',
  },
  eventTimeText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
  },
  eventBody: { flex: 1 },
  eventTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.md,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  eventDesc: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  eventAttendees: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  linkLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.primary,
  },
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
})
