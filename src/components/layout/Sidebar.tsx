import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Inbox, CalendarDays, Heart, Settings, LogOut } from 'lucide-react'
import Avatar from '../ui/Avatar'
import { useAuth } from '../../contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { getMyPrimaryRecipient } from '../../api/recipient'
import { supabase } from '../../lib/supabase'

const navItems = [
  { path: '/', label: 'Home', icon: Home, end: true },
  { path: '/inbox', label: 'Inbox', icon: Inbox, end: false, badge: true },
  { path: '/calendar', label: 'Calendar', icon: CalendarDays, end: false },
  { path: '/care', label: 'Care', icon: Heart, end: false },
  { path: '/settings', label: 'Settings', icon: Settings, end: false },
]

export default function Sidebar() {
  const { user: authUser, signOut } = useAuth()
  const displayName =
    (authUser?.user_metadata?.full_name as string | undefined) ||
    authUser?.email ||
    'You'
  const displayEmail = authUser?.email

  const [pendingCount, setPendingCount] = useState(0)
  const recipientQuery = useQuery({
    queryKey: ['recipient', authUser?.id],
    queryFn: () => (authUser ? getMyPrimaryRecipient(authUser.id) : Promise.resolve(null)),
    enabled: !!authUser,
  })

  // Lightweight pending-approvals count
  useEffect(() => {
    let cancelled = false
    async function load() {
      const recipientId = recipientQuery.data?.id
      if (!recipientId) {
        setPendingCount(0)
        return
      }
      const { count } = await supabase
        .from('agent_approvals')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', recipientId)
        .eq('status', 'pending')
      if (!cancelled) setPendingCount(count ?? 0)
    }
    void load()
    const t = setInterval(load, 30000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [recipientQuery.data?.id])

  return (
    <aside className="hidden lg:flex flex-col w-60 h-screen bg-white border-r border-[var(--color-border-default)] fixed left-0 top-0 z-40">
      <div className="px-5 py-6 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-[8px] bg-[var(--color-brand-primary)] flex items-center justify-center">
          <svg width="18" height="18" viewBox="50 45 100 115" fill="none">
            <polygon points="100,50 150,95 50,95" fill="white" />
            <rect x="60" y="95" width="80" height="60" fill="white" />
            <rect x="88" y="115" width="24" height="40" rx="3" fill="#0A7B6E" />
          </svg>
        </div>
        <span className="text-lg font-semibold text-[var(--color-brand-primary)]">CareHQ</span>
      </div>

      <nav className="flex-1 px-3 mt-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
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
            {item.badge && pendingCount > 0 && (
              <span className="absolute right-3 min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--color-status-alert)] text-white text-[11px] font-bold flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-[var(--color-border-default)]">
        <div className="flex items-center gap-3">
          <Avatar name={displayName} size="sm" color="#0A7B6E" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">{displayName}</div>
            <div className="text-xs text-[var(--color-text-tertiary)] truncate">
              {displayEmail || ''}
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
