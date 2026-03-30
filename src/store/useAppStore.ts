import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CareEvent, CareTeamMember, Insight } from '../types'
import { recentEvents } from '../data/mockEvents'
import { insights as mockInsights } from '../data/mockInsights'
import { careTeam as mockCareTeam } from '../data/mockCareTeam'

interface AppState {
  events: CareEvent[]
  insights: Insight[]
  careTeam: CareTeamMember[]
  alertDismissed: boolean
  selectedMemberId: string | null

  addEvent: (event: CareEvent) => void
  dismissAlert: () => void
  setSelectedMember: (id: string | null) => void
  resolveInsight: (id: string) => void
  addCareTeamMember: (member: CareTeamMember) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      events: recentEvents,
      insights: mockInsights,
      careTeam: mockCareTeam,
      alertDismissed: false,
      selectedMemberId: null,

      addEvent: (event) =>
        set((state) => ({
          events: [event, ...state.events],
        })),

      dismissAlert: () => set({ alertDismissed: true }),

      setSelectedMember: (id) => set({ selectedMemberId: id }),

      resolveInsight: (id) =>
        set((state) => ({
          insights: state.insights.map((i) =>
            i.id === id ? { ...i, resolved: true } : i
          ),
        })),

      addCareTeamMember: (member) =>
        set((state) => ({
          careTeam: [...state.careTeam, member],
        })),
    }),
    {
      name: 'carehq-store',
    }
  )
)
