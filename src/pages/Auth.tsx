import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Auth() {
  const { signInWithEmail, session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) return null
  if (session) return <Navigate to="/" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error: err } = await signInWithEmail(email.trim())
    setSubmitting(false)
    if (err) {
      setError(err.message)
      return
    }
    setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-base)] px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#0A7B6E" />
            <polygon points="16,7 26,15.2 6,15.2" fill="white" />
            <rect x="8.8" y="15.2" width="14.4" height="10.8" fill="white" />
            <rect x="13.2" y="18.4" width="5.6" height="7.6" rx="0.5" fill="#0A7B6E" />
          </svg>
          <span className="text-xl font-semibold text-[var(--color-text-primary)]">CareHQ</span>
        </div>

        {sent ? (
          <div className="bg-white rounded-lg shadow-sm border border-[var(--color-border-subtle)] p-6">
            <h1 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
              Check your email
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              We sent a sign-in link to <strong>{email}</strong>. Click the link to continue.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-lg shadow-sm border border-[var(--color-border-subtle)] p-6"
          >
            <h1 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
              Sign in to CareHQ
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] mb-5">
              We'll email you a one-time sign-in link.
            </p>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border border-[var(--color-border-subtle)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A7B6E]"
            />
            {error && (
              <p className="mt-3 text-sm text-[var(--color-status-alert)]">{error}</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="mt-4 w-full rounded-md bg-[#0A7B6E] hover:bg-[#0a6a5f] text-white text-sm font-medium py-2 px-4 transition disabled:opacity-50"
            >
              {submitting ? 'Sending…' : 'Send sign-in link'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-[var(--color-text-tertiary)]">
          By signing in you agree to CareHQ's terms and privacy policy.
        </p>
      </div>
    </div>
  )
}
