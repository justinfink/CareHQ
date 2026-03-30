import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Mic, CalendarDays, Sparkles } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

const navItems = [
  { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { path: '/care-team', label: 'Team', icon: Users },
  { path: '/log', label: 'Log', icon: Mic },
  { path: '/calendar', label: 'Cal', icon: CalendarDays },
  { path: '/insights', label: 'Alerts', icon: Sparkles },
]

export default function BottomNav() {
  const insights = useAppStore((s) => s.insights)
  const alertCount = insights.filter((i) => !i.resolved && (i.severity === 'alert' || i.severity === 'warning')).length

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--color-border-default)] z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1.5 rounded-[10px] transition-colors relative ${
                isActive
                  ? 'text-[var(--color-brand-primary)]'
                  : 'text-[var(--color-text-tertiary)]'
              }`
            }
          >
            <item.icon size={22} />
            <span className="text-[11px] font-medium">{item.label}</span>
            {item.label === 'Alerts' && alertCount > 0 && (
              <span className="absolute -top-0.5 right-0.5 w-4 h-4 rounded-full bg-[var(--color-status-alert)] text-white text-[10px] font-bold flex items-center justify-center">
                {alertCount}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
