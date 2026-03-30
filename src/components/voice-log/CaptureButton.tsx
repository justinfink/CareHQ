import { Mic, Square } from 'lucide-react'
import { motion } from 'framer-motion'

interface CaptureButtonProps {
  isRecording: boolean
  onClick: () => void
}

export default function CaptureButton({ isRecording, onClick }: CaptureButtonProps) {
  return (
    <div className="flex flex-col items-center">
      {/* Outer ring */}
      <div
        className={`rounded-full p-2 transition-colors duration-300 ${
          isRecording ? 'bg-red-100' : 'bg-[var(--color-brand-primary-light)]'
        }`}
      >
        <motion.button
          onClick={onClick}
          animate={isRecording ? { scale: [1, 1.05, 1] } : {}}
          transition={isRecording ? { duration: 1.2, repeat: Infinity } : {}}
          className={`w-20 h-20 rounded-full flex items-center justify-center shadow-[var(--shadow-brand)] transition-colors duration-300 cursor-pointer ${
            isRecording
              ? 'bg-[var(--color-status-alert)]'
              : 'bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-dark)]'
          }`}
        >
          {isRecording ? (
            <Square size={28} className="text-white" fill="white" />
          ) : (
            <Mic size={32} className="text-white" />
          )}
        </motion.button>
      </div>
    </div>
  )
}
