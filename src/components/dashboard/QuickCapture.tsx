import { Mic } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function QuickCapture() {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate('/log')}
      className="w-full bg-[var(--color-brand-primary)] rounded-[14px] shadow-[var(--shadow-brand)] p-6 flex flex-col items-center gap-2 hover:bg-[var(--color-brand-primary-dark)] transition-colors cursor-pointer"
    >
      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
        <Mic size={24} className="text-white" />
      </div>
      <span className="text-base font-semibold text-white">Log something</span>
      <span className="text-xs text-white/70">Voice or type</span>
    </button>
  )
}
