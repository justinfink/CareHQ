import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function AuthCallback() {
  const { session, loading } = useAuth()

  useEffect(() => {
    // Supabase auth client picks the access token off the URL hash automatically
    // because we configured detectSessionInUrl: true. Nothing to do here.
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-[var(--color-text-secondary)]">
        Signing you in…
      </div>
    )
  }
  return <Navigate to={session ? '/' : '/auth'} replace />
}
