import React from 'react'
import { Tabs, Redirect } from 'expo-router'
import { Home, Inbox, CalendarDays, Heart, Settings } from 'lucide-react-native'
import { useQuery } from '@tanstack/react-query'
import { colors, typography } from '../../src/theme'
import { useAuth } from '../../src/contexts/AuthContext'
import { getMyPrimaryRecipient } from '../../src/api/recipient'
import { supabase } from '../../src/lib/supabase'

export default function TabLayout() {
  const { session, loading, user } = useAuth()

  const recipientQuery = useQuery({
    queryKey: ['recipient', user?.id],
    queryFn: () => (user ? getMyPrimaryRecipient(user.id) : Promise.resolve(null)),
    enabled: !!user,
  })

  const pendingQuery = useQuery({
    queryKey: ['agent_approvals_count', recipientQuery.data?.id],
    enabled: !!recipientQuery.data?.id,
    refetchInterval: 30000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('agent_approvals')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', recipientQuery.data!.id)
        .eq('status', 'pending')
      if (error) throw error
      return count ?? 0
    },
  })

  if (loading) return null
  if (!session) return <Redirect href="/auth" />

  const pending = pendingQuery.data ?? 0

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderLight,
          borderTopWidth: 1,
          height: 88,
          paddingTop: 8,
          paddingBottom: 28,
        },
        tabBarLabelStyle: {
          fontFamily: typography.fontFamily.medium,
          fontSize: 11,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ color, size }) => <Inbox size={size} color={color} />,
          tabBarBadge: pending > 0 ? pending : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.alert,
            color: colors.textOnPrimary,
            fontSize: 10,
            fontFamily: typography.fontFamily.semiBold,
          },
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => <CalendarDays size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="care"
        options={{
          title: 'Care',
          tabBarIcon: ({ color, size }) => <Heart size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
