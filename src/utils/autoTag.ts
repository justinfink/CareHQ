const TAG_RULES: Array<{ keywords: string[]; tag: string }> = [
  { keywords: ['medication', 'med', 'pill', 'dose', 'administered', 'prescribed', 'levodopa', 'lisinopril'], tag: 'Medication' },
  { keywords: ['walk', 'walking', 'fell', 'fall', 'stumble', 'mobility', 'gait', 'balance', 'physical therapy', 'PT'], tag: 'Mobility' },
  { keywords: ['confused', 'confusion', 'disoriented', 'memory', 'forgot', 'cognitive', 'dementia', 'agitated'], tag: 'Cognitive' },
  { keywords: ['doctor', 'appointment', 'nurse', 'hospital', 'emergency', 'called', 'cardiologist', 'neurologist'], tag: 'Medical' },
  { keywords: ['insurance', 'claim', 'billing', 'payment', 'agency', 'schedule', 'coverage'], tag: 'Coordination' },
  { keywords: ['routine', 'normal', 'usual', 'standard', 'regular'], tag: 'Routine' },
  { keywords: ['incident', 'injury', 'unsafe', 'danger'], tag: 'Incident' },
]

export function autoTagTranscript(text: string): string[] {
  const lower = text.toLowerCase()
  const tags: string[] = []

  for (const rule of TAG_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      tags.push(rule.tag)
    }
  }

  return [...new Set(tags)]
}
