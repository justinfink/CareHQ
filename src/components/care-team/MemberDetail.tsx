import { motion } from 'framer-motion'
import { ArrowLeft, Phone, Mail, Calendar, Copy, X } from 'lucide-react'
import Avatar from '../ui/Avatar'
import Badge from '../ui/Badge'
import { useAppStore } from '../../store/useAppStore'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import type { CareTeamMember } from '../../types'
import { categoryIcons, categoryColors } from '../dashboard/ActivityFeed'

interface MemberDetailProps {
  member: CareTeamMember
  onClose: () => void
}

export default function MemberDetail({ member, onClose }: MemberDetailProps) {
  const events = useAppStore((s) => s.events)
  const memberEvents = events.filter((e) => e.loggedBy === member.name).slice(0, 3)

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <>
      {/* Mobile overlay */}
      <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={onClose} />

      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 h-full w-full sm:w-[400px] bg-white shadow-[var(--shadow-lg)] z-50 overflow-y-auto"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={onClose} className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer">
              <ArrowLeft size={16} />
              Back
            </button>
            <button onClick={onClose} className="p-2 rounded-[10px] hover:bg-[var(--color-surface-alt)] transition-colors cursor-pointer">
              <X size={18} className="text-[var(--color-text-secondary)]" />
            </button>
          </div>

          {/* Profile */}
          <div className="flex flex-col items-center text-center mb-6">
            <Avatar src={member.photo} name={member.name} size="xl" />
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mt-4">{member.name}</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              {member.role}{member.organization ? ` at ${member.organization}` : ''}
            </p>
            <div className="flex gap-2 mt-3">
              <Badge variant={member.type}>
                {member.type === 'professional' ? 'Professional' : member.type === 'family' ? 'Family' : 'Medical'}
              </Badge>
              <Badge variant="ok">Active</Badge>
            </div>
          </div>

          <div className="border-t border-[var(--color-border-subtle)] my-5" />

          {/* Details */}
          <div className="space-y-5">
            <div>
              <div className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">Schedule</div>
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
                <Calendar size={14} className="text-[var(--color-text-tertiary)]" />
                {member.schedule}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">Contact</div>
              <div className="space-y-2">
                <a href={`tel:${member.phone}`} className="flex items-center gap-2 text-sm text-[var(--color-text-primary)] hover:text-[var(--color-text-brand)]">
                  <Phone size={14} className="text-[var(--color-text-tertiary)]" />
                  {member.phone}
                </a>
                {member.email && (
                  <div className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
                    <Mail size={14} className="text-[var(--color-text-tertiary)]" />
                    <span className="truncate">{member.email}</span>
                    <button
                      onClick={() => handleCopy(member.email!)}
                      className="p-1 rounded hover:bg-[var(--color-surface-alt)] cursor-pointer"
                    >
                      <Copy size={12} className="text-[var(--color-text-tertiary)]" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {member.startDate && (
              <div>
                <div className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">Start date</div>
                <div className="text-sm text-[var(--color-text-primary)]">
                  {format(parseISO(member.startDate), 'MMMM d, yyyy')} &mdash;{' '}
                  {formatDistanceToNow(parseISO(member.startDate))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-[var(--color-border-subtle)] my-5" />

          {/* Notes */}
          <div>
            <div className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">Notes</div>
            <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">{member.notes}</p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-4">
            {member.tags.map((tag) => (
              <Badge key={tag} variant="default">{tag}</Badge>
            ))}
          </div>

          {/* Recent events */}
          {memberEvents.length > 0 && (
            <>
              <div className="border-t border-[var(--color-border-subtle)] my-5" />
              <div>
                <div className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
                  Recent events by {member.name.split(' ')[0]}
                </div>
                <div className="space-y-2">
                  {memberEvents.map((event) => {
                    const Icon = categoryIcons[event.category] || Calendar
                    return (
                      <div key={event.id} className="flex items-start gap-2.5 p-2.5 rounded-[8px] bg-[var(--color-surface-alt)]">
                        <Icon size={14} className={`mt-0.5 ${categoryColors[event.category] || ''}`} />
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-[var(--color-text-primary)] truncate">{event.summary}</div>
                          <div className="text-[11px] text-[var(--color-text-tertiary)]">
                            {formatDistanceToNow(parseISO(event.timestamp), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </>
  )
}
