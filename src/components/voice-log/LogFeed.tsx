import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Flag, Search } from 'lucide-react'
import Badge from '../ui/Badge'
import { useAppStore } from '../../store/useAppStore'
import { categoryIcons, categoryColors } from '../dashboard/ActivityFeed'
import { format, parseISO, isToday, isYesterday } from 'date-fns'
import type { CareEvent, EventCategory } from '../../types'
import { Calendar } from 'lucide-react'

type FilterCategory = 'all' | EventCategory

const filterOptions: { key: FilterCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'medication', label: 'Medication' },
  { key: 'mobility', label: 'Mobility' },
  { key: 'behavior', label: 'Cognitive' },
  { key: 'incident', label: 'Incidents' },
  { key: 'coordination', label: 'Coordination' },
]

function groupByDate(events: CareEvent[]): { label: string; date: Date; events: CareEvent[] }[] {
  const groups: Map<string, CareEvent[]> = new Map()

  events.forEach((event) => {
    const date = parseISO(event.timestamp)
    const key = format(date, 'yyyy-MM-dd')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(event)
  })

  return Array.from(groups.entries()).map(([key, evts]) => {
    const date = parseISO(key)
    let label: string
    if (isToday(date)) label = `Today \u2014 ${format(date, 'MMMM d')}`
    else if (isYesterday(date)) label = `Yesterday \u2014 ${format(date, 'MMMM d')}`
    else label = format(date, 'EEEE, MMMM d')

    return { label, date, events: evts }
  })
}

function EventCard({ event }: { event: CareEvent }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = categoryIcons[event.category] || Calendar
  const colorClass = categoryColors[event.category] || 'text-[var(--color-text-secondary)]'

  return (
    <div
      className={`bg-white rounded-[10px] shadow-[var(--shadow-sm)] overflow-hidden ${
        event.flagged ? 'border-l-[3px] border-[var(--color-status-warning)]' : ''
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 text-left cursor-pointer hover:bg-[var(--color-surface-alt)]/50 transition-colors"
      >
        <div className={`mt-0.5 flex-shrink-0 ${colorClass}`}>
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-[var(--color-text-primary)]">{event.summary}</span>
            <span className="text-xs text-[var(--color-text-tertiary)] flex-shrink-0">
              {format(parseISO(event.timestamp), 'h:mm a')}
            </span>
          </div>
          <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">{event.loggedBy}</div>
          <div className="flex items-center gap-1.5 mt-2">
            {event.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="default">{tag}</Badge>
            ))}
            {event.flagged && <Flag size={12} className="text-[var(--color-status-warning)] ml-1" />}
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-[var(--color-text-tertiary)] transition-transform flex-shrink-0 mt-1 ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 ml-[28px]">
              <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">{event.detail}</p>
              {event.flagged && event.flagReason && (
                <div className="mt-3 flex items-center gap-2 text-xs text-[var(--color-status-warning)] bg-[var(--color-status-warning-bg)] rounded-md px-3 py-2">
                  <Flag size={12} />
                  {event.flagReason}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function LogFeed() {
  const events = useAppStore((s) => s.events)
  const [filter, setFilter] = useState<FilterCategory>('all')
  const [searchText, setSearchText] = useState('')

  const filtered = events.filter((e) => {
    const matchesCategory = filter === 'all' || e.category === filter
    if (!matchesCategory) return false
    if (!searchText.trim()) return true
    const q = searchText.toLowerCase()
    return (
      e.summary.toLowerCase().includes(q) ||
      e.detail.toLowerCase().includes(q) ||
      e.loggedBy.toLowerCase().includes(q)
    )
  })
  const grouped = groupByDate(filtered)

  return (
    <div>
      {/* Filter bar */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-6 items-center">
        {filterOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              filter === opt.key
                ? 'bg-[var(--color-brand-primary)] text-white'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] bg-white border border-[var(--color-border-default)]'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <div className="relative ml-auto flex-shrink-0">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search logs..."
            className="pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[var(--color-border-default)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] w-40"
          />
        </div>
      </div>

      {/* Grouped events */}
      <div className="space-y-6">
        {grouped.map((group) => (
          <div key={group.label}>
            <h4 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
              {group.label}
            </h4>
            <div className="space-y-2">
              {group.events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
