import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Type } from 'lucide-react'
import CaptureButton from '../components/voice-log/CaptureButton'
import Waveform from '../components/voice-log/Waveform'
import TranscriptDisplay from '../components/voice-log/TranscriptDisplay'
import LogFeed from '../components/voice-log/LogFeed'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { useVoiceCapture } from '../hooks/useVoiceCapture'
import { useAppStore } from '../store/useAppStore'
import { autoTagTranscript } from '../utils/autoTag'
import { careTeam } from '../data/mockCareTeam'
import { user } from '../data/mockUser'
import type { CareEvent } from '../types'

type CaptureMode = 'idle' | 'recording' | 'review' | 'text'

export default function VoiceLog() {
  const { isRecording, isSupported, transcript, interimTranscript, startRecording, stopRecording, reset } = useVoiceCapture()
  const addEvent = useAppStore((s) => s.addEvent)

  const [mode, setMode] = useState<CaptureMode>('idle')
  const [textInput, setTextInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [loggedBy, setLoggedBy] = useState(user.name)

  const currentTranscript = mode === 'text' ? textInput : transcript

  const handleMicClick = useCallback(() => {
    if (mode === 'idle') {
      if (isSupported) {
        startRecording()
        setMode('recording')
      } else {
        setMode('text')
      }
    } else if (mode === 'recording') {
      stopRecording()
      const text = transcript + interimTranscript
      setTags(autoTagTranscript(text))
      setMode('review')
    }
  }, [mode, isSupported, startRecording, stopRecording, transcript, interimTranscript])

  const handleSave = () => {
    const text = currentTranscript.trim()
    if (!text) return

    const newEvent: CareEvent = {
      id: `evt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      loggedBy,
      category: tags.includes('Medication') ? 'medication' : tags.includes('Mobility') ? 'mobility' : tags.includes('Cognitive') ? 'behavior' : 'coordination',
      summary: text.length > 60 ? text.slice(0, 60) + '...' : text,
      detail: text,
      tags: tags.map(t => t.toLowerCase()),
      flagged: false,
    }

    addEvent(newEvent)
    handleDiscard()
  }

  const handleDiscard = () => {
    reset()
    setTextInput('')
    setTags([])
    setLoggedBy(user.name)
    setMode('idle')
  }

  const handleTextSubmit = () => {
    if (!textInput.trim()) return
    setTags(autoTagTranscript(textInput))
    setMode('review')
  }

  const removeTag = (tag: string) => setTags((t) => t.filter((x) => x !== tag))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Care Log</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">Everything that&apos;s happened, all in one place.</p>
      </div>

      {/* Capture area */}
      <div className="bg-white rounded-[14px] shadow-[var(--shadow-sm)] p-8 mb-8">
        <AnimatePresence mode="wait">
          {(mode === 'idle' || mode === 'recording') && (
            <motion.div
              key="capture"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <CaptureButton isRecording={isRecording || mode === 'recording'} onClick={handleMicClick} />

              {mode === 'recording' ? (
                <>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-4 font-medium">Listening...</p>
                  <Waveform />
                  <TranscriptDisplay transcript={transcript} interimTranscript={interimTranscript} />
                </>
              ) : (
                <>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-4">
                    {isSupported ? 'Tap to start logging' : 'Voice not available — type below'}
                  </p>
                  {isSupported && (
                    <p className="text-xs text-[var(--color-text-tertiary)] mt-1">or type below</p>
                  )}
                </>
              )}

              {/* Text fallback always visible in idle */}
              {mode === 'idle' && (
                <div className="w-full max-w-lg mt-6">
                  <button
                    onClick={() => setMode('text')}
                    className="flex items-center gap-2 text-sm text-[var(--color-text-brand)] font-medium hover:underline cursor-pointer mx-auto"
                  >
                    <Type size={14} />
                    Type a note instead
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {mode === 'text' && (
            <motion.div
              key="text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-lg mx-auto"
            >
              <textarea
                autoFocus
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={`What happened? Describe it naturally \u2014 e.g., "Robert seemed confused when I arrived, asked what day it was twice..."`}
                rows={4}
                className="w-full bg-white border border-[var(--color-border-default)] rounded-[14px] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] resize-none"
              />
              <div className="flex gap-3 mt-4 justify-center">
                <Button onClick={handleTextSubmit} disabled={!textInput.trim()}>
                  <Check size={16} />
                  Review entry
                </Button>
                <Button variant="ghost" onClick={handleDiscard}>Cancel</Button>
              </div>
            </motion.div>
          )}

          {mode === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-lg mx-auto"
            >
              <div className="flex gap-3 justify-center mb-6">
                <Button onClick={handleSave}>
                  <Check size={16} />
                  Save
                </Button>
                <Button variant="ghost" onClick={handleDiscard}>
                  <X size={16} />
                  Discard
                </Button>
              </div>

              <div>
                <div className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Transcript</div>
                <div className="bg-[var(--color-surface-alt)] rounded-[10px] p-4">
                  <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">{currentTranscript}</p>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Auto-tagged</div>
                  <span className="text-xs text-[var(--color-text-tertiary)]">You can edit these</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="professional" removable onRemove={() => removeTag(tag)}>
                      {tag}
                    </Badge>
                  ))}
                  {tags.length === 0 && (
                    <span className="text-xs text-[var(--color-text-tertiary)]">No tags detected</span>
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-center gap-4">
                <div>
                  <div className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">Logged by</div>
                  <select
                    value={loggedBy}
                    onChange={(e) => setLoggedBy(e.target.value)}
                    className="bg-white border border-[var(--color-border-default)] rounded-[10px] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] cursor-pointer"
                  >
                    <option value={user.name}>{user.name}</option>
                    {careTeam.map((m) => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">Time</div>
                  <div className="text-sm text-[var(--color-text-primary)]">Just now</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Log feed */}
      <LogFeed />
    </div>
  )
}
