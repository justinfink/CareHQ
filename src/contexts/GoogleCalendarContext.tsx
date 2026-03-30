import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import { ensureCareHQCalendar, seedCalendarEvents, getCachedCalendarId } from '../services/googleCalendar'

interface GoogleCalendarContextValue {
  /** Whether we have a valid access token */
  isConnected: boolean
  /** Whether the GIS library has loaded and token validation is done */
  isInitialized: boolean
  /** Current access token (null when not connected) */
  token: string | null
  /** The dedicated CareHQ calendar ID on Google Calendar */
  calendarId: string | null
  /** Connected Google account email */
  userEmail: string | null
  /** Whether a client ID is configured */
  isConfigured: boolean
  /** Whether the calendar is being provisioned */
  isProvisioning: boolean
  /** Trigger Google sign-in popup */
  signIn: () => void
  /** Disconnect from Google Calendar */
  signOut: () => void
}

const GoogleCalendarContext = createContext<GoogleCalendarContextValue>({
  isConnected: false,
  isInitialized: false,
  token: null,
  calendarId: null,
  userEmail: null,
  isConfigured: false,
  isProvisioning: false,
  signIn: () => {},
  signOut: () => {},
})

export const useGoogleAuth = () => useContext(GoogleCalendarContext)

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const SCOPES = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email'

export function GoogleCalendarProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [calendarId, setCalendarId] = useState<string | null>(getCachedCalendarId())
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isProvisioning, setIsProvisioning] = useState(false)
  const tokenClientRef = useRef<GoogleTokenClient | null>(null)

  const isConfigured = !!CLIENT_ID && CLIENT_ID.length > 10

  useEffect(() => {
    if (!isConfigured) {
      setIsInitialized(true)
      return
    }

    let attempts = 0
    const maxAttempts = 50

    const checkGIS = () => {
      if (window.google?.accounts?.oauth2) {
        initTokenClient()
      } else if (attempts < maxAttempts) {
        attempts++
        setTimeout(checkGIS, 100)
      } else {
        setIsInitialized(true)
      }
    }

    checkGIS()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When we get a token, provision the CareHQ calendar
  useEffect(() => {
    if (!token) return

    let cancelled = false

    const provision = async () => {
      setIsProvisioning(true)
      try {
        const id = await ensureCareHQCalendar(token)
        if (!cancelled) {
          setCalendarId(id)
          // Seed initial events on the calendar
          await seedCalendarEvents(token, id)
        }
      } catch (err) {
        console.error('[CareHQ] Calendar provisioning failed:', err)
      } finally {
        if (!cancelled) setIsProvisioning(false)
      }
    }

    provision()
    return () => { cancelled = true }
  }, [token])

  const initTokenClient = () => {
    if (!CLIENT_ID) return

    tokenClientRef.current = window.google!.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (response: GoogleTokenResponse) => {
        if (response.access_token) {
          setToken(response.access_token)
          localStorage.setItem('carehq_gcal_token', response.access_token)
          fetchUserEmail(response.access_token)
        }
      },
      error_callback: (error) => {
        console.error('[CareHQ] Google OAuth error:', error)
      },
    })

    // Restore saved token if valid
    const storedToken = localStorage.getItem('carehq_gcal_token')
    if (storedToken) {
      validateToken(storedToken)
    } else {
      setIsInitialized(true)
    }
  }

  const validateToken = async (t: string) => {
    try {
      const res = await fetch(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${encodeURIComponent(t)}`
      )
      if (res.ok) {
        setToken(t)
        await fetchUserEmail(t)
      } else {
        localStorage.removeItem('carehq_gcal_token')
        setIsInitialized(true)
      }
    } catch {
      localStorage.removeItem('carehq_gcal_token')
      setIsInitialized(true)
    }
  }

  const fetchUserEmail = async (t: string) => {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${t}` },
      })
      if (res.ok) {
        const data = (await res.json()) as { email?: string }
        setUserEmail(data.email || null)
      }
    } catch {
      // Non-critical
    }
    setIsInitialized(true)
  }

  const signIn = useCallback(() => {
    if (tokenClientRef.current) {
      tokenClientRef.current.requestAccessToken({ prompt: 'consent' })
    }
  }, [])

  const signOut = useCallback(() => {
    if (token) {
      window.google?.accounts.oauth2.revoke(token, () => {})
    }
    setToken(null)
    setCalendarId(null)
    setUserEmail(null)
    localStorage.removeItem('carehq_gcal_token')
    localStorage.removeItem('carehq_calendar_id')
  }, [token])

  return (
    <GoogleCalendarContext.Provider
      value={{
        isConnected: !!token && !!calendarId,
        isInitialized,
        token,
        calendarId,
        userEmail,
        isConfigured,
        isProvisioning,
        signIn,
        signOut,
      }}
    >
      {children}
    </GoogleCalendarContext.Provider>
  )
}
