import type { InsightSeverity, TeamMemberType } from '../../types'

type BadgeVariant = InsightSeverity | TeamMemberType | 'default'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
  removable?: boolean
  onRemove?: () => void
}

const variantStyles: Record<string, string> = {
  alert: 'bg-[var(--color-status-alert-bg)] text-[var(--color-status-alert)]',
  warning: 'bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning)]',
  ok: 'bg-[var(--color-status-ok-bg)] text-[var(--color-status-ok)]',
  info: 'bg-[var(--color-status-info-bg)] text-[var(--color-status-info)]',
  professional: 'bg-[var(--color-brand-primary-light)] text-[var(--color-brand-primary)]',
  family: 'bg-[var(--color-brand-accent-light)] text-[var(--color-brand-accent)]',
  medical: 'bg-[var(--color-status-info-bg)] text-[var(--color-status-info)]',
  agency: 'bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)]',
  default: 'bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)]',
}

export default function Badge({ variant = 'default', children, className = '', removable, onRemove }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${variantStyles[variant] || variantStyles.default} ${className}`}
    >
      {children}
      {removable && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove?.() }}
          className="ml-0.5 hover:opacity-70 transition-opacity"
        >
          &times;
        </button>
      )}
    </span>
  )
}
