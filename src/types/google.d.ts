// Google Identity Services type declarations
interface GoogleTokenResponse {
  access_token: string
  expires_in: number
  scope: string
  token_type: string
  error?: string
  error_description?: string
}

interface GoogleTokenClient {
  requestAccessToken: (config?: { prompt?: string }) => void
}

interface GoogleOAuth2 {
  initTokenClient: (config: {
    client_id: string
    scope: string
    callback: (response: GoogleTokenResponse) => void
    error_callback?: (error: { type: string; message: string }) => void
  }) => GoogleTokenClient
  revoke: (token: string, callback?: () => void) => void
}

interface GoogleAccounts {
  oauth2: GoogleOAuth2
}

interface Google {
  accounts: GoogleAccounts
}

interface Window {
  google?: Google
}
