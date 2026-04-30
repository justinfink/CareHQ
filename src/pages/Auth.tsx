import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Auth() {
  const { signInWithEmail, signInWithGoogle, session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googling, setGoogling] = useState(false)
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

  async function handleGoogle() {
    setGoogling(true)
    setError(null)
    const { error: err } = await signInWithGoogle()
    if (err) {
      setError(err.message)
      setGoogling(false)
    }
    // On success, supabase redirects away — no need to clear googling.
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
          <div className="bg-white rounded-lg shadow-sm border border-[var(--color-border-subtle)] p-6">
            <h1 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
              Sign in to CareHQ
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] mb-5">
              Use your Google account, or get a one-time email link.
            </p>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={googling || submitting}
              className="w-full flex items-center justify-center gap-2 rounded-md border border-[var(--color-border-default)] bg-white hover:bg-[var(--color-surface-alt)] text-[var(--color-text-primary)] text-sm font-medium py-2 px-4 transition disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              {googling ? 'Redirecting…' : 'Continue with Google'}
            </button>

            <div className="my-4 flex items-center gap-3 text-xs text-[var(--color-text-tertiary)]">
              <div className="flex-1 border-t border-[var(--color-border-subtle)]" />
              <span>or</span>
              <div className="flex-1 border-t border-[var(--color-border-subtle)]" />
            </div>

            <form onSubmit={handleSubmit}>
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
                disabled={submitting || googling}
                className="mt-4 w-full rounded-md bg-[#0A7B6E] hover:bg-[#0a6a5f] text-white text-sm font-medium py-2 px-4 transition disabled:opacity-50"
              >
                {submitting ? 'Sending…' : 'Send sign-in link'}
              </button>
            </form>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-[var(--color-text-tertiary)]">
          By signing in you agree to CareHQ's terms and privacy policy.
        </p>
      </div>
    </div>
  )
}
