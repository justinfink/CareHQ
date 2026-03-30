import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Mic, CalendarDays, Sparkles } from 'lucide-react'
import Avatar from '../ui/Avatar'
import { user } from '../../data/mockUser'
import { useAppStore } from '../../store/useAppStore'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/care-team', label: 'Care Team', icon: Users },
  { path: '/log', label: 'Log', icon: Mic },
  { path: '/calendar', label: 'Calendar', icon: CalendarDays },
  { path: '/insights', label: 'Insights', icon: Sparkles },
]

export default function Sidebar() {
  const insights = useAppStore((s) => s.insights)
  const alertCount = insights.filter((i) => !i.resolved && (i.severity === 'alert' || i.severity === 'warning')).length

  return (
    <aside className="hidden lg:flex flex-col w-60 h-screen bg-white border-r border-[var(--color-border-default)] fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="px-5 py-6 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-[8px] bg-[var(--color-brand-primary)] flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 1.5C4.86 1.5 1.5 4.86 1.5 9s3.36 7.5 7.5 7.5 7.5-3.36 7.5-7.5S13.14 1.5 9 1.5zm0 13.5c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" fill="white" fillOpacity="0.4"/>
            <path d="M9 4.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9zm0 7.5a3 3 0 110-6 3 3 0 010 6z" fill="white"/>
            <path d="M9 6.75a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" fill="white"/>
          </svg>
        </div>
        <span className="text-lg font-semibold text-[var(--color-brand-primary)]">CareHQ</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 mt-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 h-10 rounded-[10px] text-sm font-medium transition-colors duration-150 mb-1 relative ${
                isActive
                  ? 'bg-[var(--color-brand-primary-light)] text-[var(--color-brand-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)]'
              }`
            }
          >
            <item.icon size={18} />
            <span>{item.label}</span>
            {item.label === 'Insights' && alertCount > 0 && (
              <span className="absolute right-3 w-5 h-5 rounded-full bg-[var(--color-status-alert)] text-white text-[11px] font-bold flex items-center justify-center">
                {alertCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="px-5 py-4 border-t border-[var(--color-border-default)]">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} size="sm" color={user.avatarColor} />
          <div className="min-w-0">
            <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">{user.name}</div>
            <div className="text-xs text-[var(--color-text-tertiary)]">{user.careRecipient.firstName}&apos;s care</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
