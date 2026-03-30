import { AlertCircle, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'

export default function AlertBanner() {
  const insights = useAppStore((s) => s.insights)
  const dismissed = useAppStore((s) => s.alertDismissed)
  const dismiss = useAppStore((s) => s.dismissAlert)
  const navigate = useNavigate()

  const alertInsight = insights.find((i) => i.severity === 'alert' && !i.resolved)
  if (!alertInsight || dismissed) return null

  return (
    <div className="bg-[var(--color-status-alert-bg)] border-l-4 border-[var(--color-status-alert)] rounded-[10px] p-4 mb-6 flex items-start gap-3">
      <AlertCircle size={18} className="text-[var(--color-status-alert)] flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--color-text-primary)]">
          <span className="font-semibold">{alertInsight.title}.</span>{' '}
          {alertInsight.summary.split('\u2014')[0]}&mdash;{' '}
          <button
            onClick={() => navigate('/insights')}
            className="text-[var(--color-text-brand)] font-medium hover:underline cursor-pointer"
          >
            View insight &rarr;
          </button>
        </p>
      </div>
      <button
        onClick={dismiss}
        className="p-1 rounded-md hover:bg-red-100 transition-colors flex-shrink-0 cursor-pointer"
      >
        <X size={16} className="text-[var(--color-status-alert)]" />
      </button>
    </div>
  )
}
