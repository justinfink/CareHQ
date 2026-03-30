import React, { useState, useMemo } from 'react'
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Plus } from 'lucide-react-native'
import { useAppStore } from '../../src/store/useAppStore'
import MemberCard from '../../src/components/MemberCard'
import type { TeamMemberType } from '../../src/types'
import { colors, typography, spacing, borderRadius } from '../../src/theme'

type FilterOption = 'all' | TeamMemberType

interface FilterTab {
  key: FilterOption
  label: string
  count: number
}

export default function TeamScreen() {
  const { careTeam } = useAppStore()
  const [filter, setFilter] = useState<FilterOption>('all')

  const filterTabs: FilterTab[] = useMemo(() => {
    const counts = {
      all: careTeam.length,
      professional: careTeam.filter((m) => m.type === 'professional').length,
      family: careTeam.filter((m) => m.type === 'family').length,
      medical: careTeam.filter((m) => m.type === 'medical').length,
    }
    return [
      { key: 'all', label: 'All', count: counts.all },
      { key: 'professional', label: 'Professional', count: counts.professional },
      { key: 'family', label: 'Family', count: counts.family },
      { key: 'medical', label: 'Medical', count: counts.medical },
    ]
  }, [careTeam])

  const filteredTeam = useMemo(() => {
    if (filter === 'all') return careTeam
    return careTeam.filter((m) => m.type === filter)
  }, [careTeam, filter])

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Care Team</Text>
        <TouchableOpacity activeOpacity={0.7} style={styles.addButton}>
          <Plus size={20} color={colors.textOnPrimary} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {filterTabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={0.7}
            onPress={() => setFilter(tab.key)}
            style={[
              styles.filterTab,
              filter === tab.key && styles.filterTabActive,
            ]}
          >
            <Text
              style={[
                styles.filterLabel,
                filter === tab.key && styles.filterLabelActive,
              ]}
            >
              {tab.label} ({tab.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Team List */}
      <FlatList
        data={filteredTeam}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MemberCard member={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size['2xl'],
    color: colors.textPrimary,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  filterLabelActive: {
    color: colors.textOnPrimary,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
})
