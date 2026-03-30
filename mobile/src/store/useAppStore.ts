import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { User, CareTeamMember, CareEvent, Insight } from '../types'
import type { CalendarEvent } from '../types/calendar'
import { user as mockUser } from '../data/mockUser'
import { careTeam as mockCareTeam } from '../data/mockCareTeam'
import { recentEvents as mockEvents } from '../data/mockEvents'
import { insights as mockInsights } from '../data/mockInsights'
import { calendarEvents as mockCalendarEvents } from '../data/mockCalendar'

interface AppState {
  // Data
  user: User
  careTeam: CareTeamMember[]
  events: CareEvent[]
  insights: Insight[]
  calendarEvents: CalendarEvent[]

  // UI state
  activeTab: string
  teamFilter: string

  // Actions
  setActiveTab: (tab: string) => void
  setTeamFilter: (filter: string) => void
  addEvent: (event: CareEvent) => void
  toggleEventFlag: (eventId: string) => void
  resolveInsight: (insightId: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Data (initialized from mock)
      user: mockUser,
      careTeam: mockCareTeam,
      events: mockEvents,
      insights: mockInsights,
      calendarEvents: mockCalendarEvents,

      // UI state
      activeTab: 'dashboard',
      teamFilter: 'all',

      // Actions
      setActiveTab: (tab) => set({ activeTab: tab }),
      setTeamFilter: (filter) => set({ teamFilter: filter }),
      addEvent: (event) =>
        set((state) => ({ events: [event, ...state.events] })),
      toggleEventFlag: (eventId) =>
        set((state) => ({
          events: state.events.map((e) =>
            e.id === eventId ? { ...e, flagged: !e.flagged } : e
          ),
        })),
      resolveInsight: (insightId) =>
        set((state) => ({
          insights: state.insights.map((i) =>
            i.id === insightId ? { ...i, resolved: true } : i
          ),
        })),
    }),
    {
      name: 'carehq-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist UI preferences, not the full mock data
      partialize: (state) => ({
        activeTab: state.activeTab,
        teamFilter: state.teamFilter,
      }),
    }
  )
)
