export interface User {
  id: string
  name: string
  firstName: string
  email: string
  avatarInitials: string
  avatarColor: string
  role: string
  careRecipient: CareRecipient
  householdContacts: HouseholdContact[]
}

export interface CareRecipient {
  id: string
  name: string
  firstName: string
  relationship: string
  age: number
  diagnoses: string[]
  primaryResidence: string
  photo: string | null
  startedCare: string
}

export interface HouseholdContact {
  name: string
  relationship: string
  phone: string
  location?: string
}

export type TeamMemberType = 'professional' | 'family' | 'medical' | 'agency'
export type MemberStatus = 'active' | 'inactive' | 'on-leave'

export interface CareTeamMember {
  id: string
  name: string
  role: string
  organization: string | null
  type: TeamMemberType
  schedule: string
  phone: string
  email: string | null
  photo: string | null
  notes: string
  startDate: string | null
  status: MemberStatus
  tags: string[]
}

export type EventCategory = 'medication' | 'mobility' | 'behavior' | 'therapy' | 'coordination' | 'incident' | 'medical'

export interface CareEvent {
  id: string
  timestamp: string
  loggedBy: string
  category: EventCategory
  summary: string
  detail: string
  tags: string[]
  flagged: boolean
  flagReason?: string
}

export type InsightSeverity = 'alert' | 'warning' | 'info' | 'ok'

export interface Insight {
  id: string
  severity: InsightSeverity
  category: string
  title: string
  summary: string
  detail: string
  suggestedAction: string | null
  createdAt: string
  relatedEvents: string[]
  resolved?: boolean
}

export interface TrendDataPoint {
  week: string
  medication: number
  mobility: number
  cognitive: number
  incidents: number
}
