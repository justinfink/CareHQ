import React, { useState, useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronDown, ChevronUp, CheckCircle } from 'lucide-react-native'
import { useAppStore } from '../../src/store/useAppStore'
import InsightCard from '../../src/components/InsightCard'
import { colors, typography, spacing, borderRadius } from '../../src/theme'

export default function InsightsScreen() {
  const { insights } = useAppStore()
  const [showGoodNews, setShowGoodNews] = useState(false)

  const actionableInsights = useMemo(
    () =>
      insights
        .filter((i) => (i.severity === 'alert' || i.severity === 'warning') && !i.resolved)
        .sort((a, b) => {
          const order = { alert: 0, warning: 1, info: 2, ok: 3 }
          return order[a.severity] - order[b.severity]
        }),
    [insights]
  )

  const goodNews = useMemo(
    () => insights.filter((i) => i.severity === 'ok' || i.severity === 'info'),
    [insights]
  )

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.headerTitle}>Insights</Text>
        <Text style={styles.headerSubtitle}>
          {actionableInsights.length} thing{actionableInsights.length !== 1 ? 's' : ''} need{actionableInsights.length === 1 ? 's' : ''} your attention
        </Text>

        {/* Actionable Insights */}
        <View style={styles.section}>
          {actionableInsights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </View>

        {/* Good News Section */}
        {goodNews.length > 0 && (
          <View style={styles.goodNewsSection}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowGoodNews(!showGoodNews)}
              style={styles.goodNewsHeader}
            >
              <View style={styles.goodNewsHeaderLeft}>
                <CheckCircle size={18} color={colors.ok} />
                <Text style={styles.goodNewsTitle}>
                  What's going well ({goodNews.length})
                </Text>
              </View>
              {showGoodNews ? (
                <ChevronUp size={18} color={colors.textTertiary} />
              ) : (
                <ChevronDown size={18} color={colors.textTertiary} />
              )}
            </TouchableOpacity>

            {showGoodNews && (
              <View style={styles.goodNewsList}>
                {goodNews.map((insight) => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </View>
            )}
          </View>
        )}

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
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.md,
    color: colors.textSecondary,
    marginBottom: spacing['2xl'],
  },
  section: {
    marginBottom: spacing.xl,
  },
  goodNewsSection: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.lg,
  },
  goodNewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  goodNewsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  goodNewsTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
  },
  goodNewsList: {
    marginTop: spacing.sm,
  },
  bottomSpacer: {
    height: spacing['3xl'],
  },
})
