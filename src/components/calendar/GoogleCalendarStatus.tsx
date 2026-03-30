import { RefreshCw, Link, Unlink, Loader2, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGoogleAuth } from '../../contexts/GoogleCalendarContext'
import Button from '../ui/Button'

interface GoogleCalendarStatusProps {
  isLoading?: boolean
  onRefresh?: () => void
}

export default function GoogleCalendarStatus({ isLoading, onRefresh }: GoogleCalendarStatusProps) {
  const { isConnected, isInitialized, userEmail, isConfigured, isProvisioning, signIn, signOut } = useGoogleAuth()

  if (!isInitialized) {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
        <Loader2 size={14} className="animate-spin" />
        <span>Connecting...</span>
      </div>
    )
  }

  if (!isConfigured) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-[var(--color-surface-alt)] text-xs text-[var(--color-text-secondary)]">
        <div className="w-4 h-4 rounded-full bg-[var(--color-text-tertiary)]/20 flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        </div>
        <span>Using demo data</span>
      </div>
    )
  }

  if (isProvisioning) {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--color-brand-primary)]">
        <Loader2 size={14} className="animate-spin" />
        <span>Setting up CareHQ calendar...</span>
      </div>
    )
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]"
            >
              <Loader2 size={13} className="animate-spin" />
              <span>Syncing...</span>
            </motion.div>
          ) : (
            <motion.div
              key="connected"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0A7B6E]/8 text-xs"
            >
              <CheckCircle2 size={13} className="text-[var(--color-brand-primary)]" />
              <span className="text-[var(--color-brand-primary)] font-medium">
                {userEmail ? userEmail.split('@')[0] : 'Connected'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={onRefresh}
          className="p-1.5 rounded-[8px] text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-alt)] transition-colors cursor-pointer"
          title="Refresh events"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>

        <button
          onClick={signOut}
          className="p-1.5 rounded-[8px] text-[var(--color-text-tertiary)] hover:text-[var(--color-status-alert)] hover:bg-[var(--color-status-alert-bg)] transition-colors cursor-pointer"
          title="Disconnect Google Calendar"
        >
          <Unlink size={14} />
        </button>
      </div>
    )
  }

  // Not connected — show connect button
  return (
    <Button size="sm" variant="secondary" onClick={signIn} className="gap-1.5">
      <Link size={14} />
      <span className="hidden sm:inline">Connect Google Calendar</span>
      <span className="sm:hidden">Connect</span>
    </Button>
  )
}
