import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Mic, CalendarDays, Sparkles, LogOut } from 'lucide-react'
import Avatar from '../ui/Avatar'
import { user } from '../../data/mockUser'
import { useAppStore } from '../../store/useAppStore'
import { useAuth } from '../../contexts/AuthContext'

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
  const { user: authUser, signOut } = useAuth()
  const displayName = authUser?.user_metadata?.full_name || authUser?.email || user.name
  const displayEmail = authUser?.email

  return (
    <aside className="hidden lg:flex flex-col w-60 h-screen bg-white border-r border-[var(--color-border-default)] fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="px-5 py-6 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-[8px] bg-[var(--color-brand-primary)] flex items-center justify-center">
          <svg width="18" height="18" viewBox="50 45 100 115" fill="none">
            <polygon points="100,50 150,95 50,95" fill="white"/>
            <rect x="60" y="95" width="80" height="60" fill="white"/>
            <rect x="88" y="115" width="24" height="40" rx="3" fill="#0A7B6E"/>
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
          <Avatar name={displayName} size="sm" color={user.avatarColor} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">{displayName}</div>
            <div className="text-xs text-[var(--color-text-tertiary)] truncate">
              {displayEmail || `${user.careRecipient.firstName}'s care`}
            </div>
          </div>
          {authUser && (
            <button
              onClick={() => void signOut()}
              aria-label="Sign out"
              className="p-1.5 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)] transition-colors"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
