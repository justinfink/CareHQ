import { Sparkles } from 'lucide-react'

export default function Insights() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Insights</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          What the agent has noticed for you.
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-[var(--color-border-default)] bg-white p-10 text-center">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-[var(--color-brand-primary-light)] flex items-center justify-center">
          <Sparkles size={20} className="text-[var(--color-brand-primary)]" />
        </div>
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
          Nothing flagged yet
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] max-w-md mx-auto leading-relaxed">
          The agent surfaces medication gaps, behavior shifts, and other patterns once it has logged
          events to learn from. Once there's enough signal, real findings will appear here.
        </p>
      </div>
    </div>
  )
}
