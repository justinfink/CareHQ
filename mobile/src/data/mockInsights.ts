import type { Insight, TrendDataPoint } from '../types'

export const insights: Insight[] = [
  {
    id: 'ins-001',
    severity: 'alert',
    category: 'cognitive',
    title: 'Orientation episodes increasing',
    summary: 'Robert has had 3 documented episodes of temporal disorientation this week \u2014 up from 0 in the prior two weeks.',
    detail: "This pattern warrants a call to Dr. Kapoor before your May appointment. Sudden increases in cognitive symptoms can sometimes indicate medication timing issues, UTI, sleep disruption, or disease progression.",
    suggestedAction: "Call Dr. Kapoor's office and describe frequency, time of day, and duration. Log at least 2 more episodes with exact times before calling.",
    createdAt: '2026-03-29T06:00:00',
    relatedEvents: ['evt-003'],
  },
  {
    id: 'ins-002',
    severity: 'warning',
    category: 'safety',
    title: 'Two fall-risk events in 4 days',
    summary: 'A near-fall on March 26 and reduced activity on March 29 suggest increased fall risk this week.',
    detail: "Robert's PT noted balance improvements last session, but fatigue-related incidents often cluster. The morning walk cut short today combined with the near-fall Thursday is a pattern worth watching.",
    suggestedAction: 'Confirm grip bars in bathroom are secure. Remind evening caregiver to stay closer during transitions. Mention to Kevin Thomas at Tuesday PT.',
    createdAt: '2026-03-29T06:00:00',
    relatedEvents: ['evt-002', 'evt-007'],
  },
  {
    id: 'ins-003',
    severity: 'warning',
    category: 'medical',
    title: 'Medication review likely overdue',
    summary: "You called Dr. Kapoor's office about tremor increase 4 days ago. No response yet documented.",
    detail: "Parkinson's medication timing and dosage adjustments often require prompt attention when new symptoms appear. A callback within 3\u20135 business days is standard.",
    suggestedAction: "If you haven't heard back by tomorrow, call again and ask for the nurse line specifically.",
    createdAt: '2026-03-29T06:00:00',
    relatedEvents: ['evt-008'],
  },
  {
    id: 'ins-004',
    severity: 'ok',
    category: 'coordination',
    title: 'Great week for PT progress',
    summary: 'Kevin Thomas documented balance improvement for the third consecutive session.',
    detail: 'Balance on tandem stance is now at 8 seconds \u2014 up 60% from 5 weeks ago. This is meaningful progress for fall prevention.',
    suggestedAction: null,
    createdAt: '2026-03-27T16:00:00',
    relatedEvents: ['evt-005'],
  },
]

export const trendData: TrendDataPoint[] = [
  { week: 'Feb 3', medication: 10, mobility: 5, cognitive: 0, incidents: 0 },
  { week: 'Feb 10', medication: 10, mobility: 6, cognitive: 1, incidents: 0 },
  { week: 'Feb 17', medication: 9, mobility: 4, cognitive: 0, incidents: 1 },
  { week: 'Feb 24', medication: 10, mobility: 5, cognitive: 0, incidents: 0 },
  { week: 'Mar 3', medication: 10, mobility: 6, cognitive: 1, incidents: 0 },
  { week: 'Mar 10', medication: 10, mobility: 5, cognitive: 0, incidents: 0 },
  { week: 'Mar 17', medication: 9, mobility: 4, cognitive: 0, incidents: 1 },
  { week: 'Mar 24', medication: 10, mobility: 3, cognitive: 3, incidents: 1 },
]
