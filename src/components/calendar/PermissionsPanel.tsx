import { useState } from 'react'
import { Shield, ChevronDown, Eye, Edit3, Crown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Avatar from '../ui/Avatar'
import Badge from '../ui/Badge'
import Card from '../ui/Card'
import type { CalendarPermission, AccessLevel } from '../../types/calendar'
import { calendarPermissions } from '../../data/mockCalendar'
import { useAppStore } from '../../store/useAppStore'

const accessLevelConfig: Record<AccessLevel, { label: string; icon: any; color: string; description: string }> = {
  admin: { label: 'Admin', icon: Crown, color: 'var(--color-brand-primary)', description: 'Full access. Can manage events, permissions, and all settings.' },
  edit: { label: 'Can edit', icon: Edit3, color: 'var(--color-status-info)', description: 'Can view and edit their own shifts and events.' },
  view: { label: 'View only', icon: Eye, color: 'var(--color-text-secondary)', description: 'Can see the calendar but cannot make changes.' },
}

export default function PermissionsPanel() {
  const [expanded, setExpanded] = useState(false)
  const [permissions, setPermissions] = useState<CalendarPermission[]>(calendarPermissions)
  const careTeam = useAppStore((s) => s.careTeam)

  const handleAccessChange = (memberId: string, level: AccessLevel) => {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.memberId !== memberId) return p
        return {
          ...p,
          accessLevel: level,
          canViewAllEvents: level === 'admin',
          canEditOwnEvents: level !== 'view',
          canEditAllEvents: level === 'admin',
          canManagePermissions: level === 'admin',
        }
      })
    )
  }

  return (
    <Card className="mt-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <Shield size={18} className="text-[var(--color-brand-primary)]" />
          <div className="text-left">
            <div className="text-sm font-semibold text-[var(--color-text-primary)]">Calendar permissions</div>
            <div className="text-xs text-[var(--color-text-secondary)]">Control who can see and edit events</div>
          </div>
        </div>
        <ChevronDown
          size={18}
          className={`text-[var(--color-text-tertiary)] transition-transform ${expanded ? 'rotate-180' : ''}`}
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
            <div className="mt-5 pt-5 border-t border-[var(--color-border-subtle)]">
              {/* Legend */}
              <div className="flex flex-wrap gap-4 mb-5">
                {Object.entries(accessLevelConfig).map(([key, config]) => {
                  const Icon = config.icon
                  return (
                    <div key={key} className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                      <Icon size={12} style={{ color: config.color }} />
                      <span className="font-medium">{config.label}</span>
                      <span className="hidden sm:inline">— {config.description.split('.')[0]}</span>
                    </div>
                  )
                })}
              </div>

              {/* Member list */}
              <div className="space-y-3">
                {permissions.map((perm) => {
                  const member = careTeam.find((m) => m.id === perm.memberId)
                  const config = accessLevelConfig[perm.accessLevel]
                  const Icon = config.icon

                  return (
                    <div key={perm.memberId} className="flex items-center justify-between p-3 rounded-[10px] bg-[var(--color-surface-alt)]/60">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          src={member?.photo || null}
                          name={perm.memberName}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">{perm.memberName}</div>
                          <div className="text-xs text-[var(--color-text-tertiary)]">{perm.memberRole}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {perm.memberId === 'user-001' ? (
                          <Badge variant="professional">
                            <Crown size={10} className="mr-1" />
                            Admin
                          </Badge>
                        ) : (
                          <select
                            value={perm.accessLevel}
                            onChange={(e) => handleAccessChange(perm.memberId, e.target.value as AccessLevel)}
                            className="bg-white border border-[var(--color-border-default)] rounded-[8px] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] cursor-pointer"
                          >
                            <option value="view">View only</option>
                            <option value="edit">Can edit</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <p className="text-xs text-[var(--color-text-tertiary)] mt-4">
                &ldquo;Can edit&rdquo; members see only their own shifts and can update them. &ldquo;View only&rdquo; members can see the full schedule but can&apos;t change anything. Admins have full control.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
