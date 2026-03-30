import { motion } from 'framer-motion'

interface TranscriptDisplayProps {
  transcript: string
  interimTranscript: string
}

export default function TranscriptDisplay({ transcript, interimTranscript }: TranscriptDisplayProps) {
  if (!transcript && !interimTranscript) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-lg mx-auto mt-6 bg-[var(--color-surface-alt)] rounded-[14px] p-5"
    >
      <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
        {transcript}
        {interimTranscript && (
          <span className="text-[var(--color-text-tertiary)]">{interimTranscript}</span>
        )}
      </p>
    </motion.div>
  )
}
