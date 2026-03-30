import type { User } from '../types'

export const user: User = {
  id: 'user-001',
  name: 'Sarah Chen',
  firstName: 'Sarah',
  email: 'sarah.chen@gmail.com',
  avatarInitials: 'SC',
  avatarColor: '#0A7B6E',
  role: 'Primary coordinator',
  careRecipient: {
    id: 'recipient-001',
    name: 'Robert Chen',
    firstName: 'Robert',
    relationship: 'Father',
    age: 78,
    diagnoses: ["Parkinson's disease (Stage 3)", 'Hypertension', 'Mild cognitive impairment'],
    primaryResidence: 'Home \u2014 1847 Maple Street, Evanston IL',
    photo: null,
    startedCare: '2022-03-15',
  },
  householdContacts: [
    { name: 'Linda Chen', relationship: 'Mother (spouse of Robert)', phone: '(847) 555-0192' },
    { name: 'David Chen', relationship: 'Brother', phone: '(312) 555-0847', location: 'Phoenix, AZ' },
  ],
}
