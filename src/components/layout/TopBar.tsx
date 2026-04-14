import { Bell } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

export default function TopBar() {
  const insights = useAppStore((s) => s.insights)
  const alertCount = insights.filter((i) => !i.resolved && (i.severity === 'alert' || i.severity === 'warning')).length

  return (
    <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-[var(--color-border-default)] sticky top-0 z-40">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-[6px] bg-[var(--color-brand-primary)] flex items-center justify-center">
          <svg width="14" height="14" viewBox="50 45 100 115" fill="none">
            <polygon points="100,50 150,95 50,95" fill="white"/>
            <rect x="60" y="95" width="80" height="60" fill="white"/>
            <rect x="88" y="115" width="24" height="40" rx="3" fill="#0A7B6E"/>
          </svg>
        </div>
        <span className="text-base font-semibold text-[var(--color-brand-primary)]">CareHQ</span>
      </div>
      <button className="relative p-2 rounded-[10px] hover:bg-[var(--color-surface-alt)] transition-colors cursor-pointer">
        <Bell size={20} className="text-[var(--color-text-secondary)]" />
        {alertCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[var(--color-status-alert)] text-white text-[10px] font-bold flex items-center justify-center">
            {alertCount}
          </span>
        )}
      </button>
    </header>
  )
}
