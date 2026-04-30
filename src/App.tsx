import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import RequireAuth from './components/auth/RequireAuth'
import Stream from './pages/Stream'
import Inbox from './pages/Inbox'
import Care from './pages/Care'
import Settings from './pages/Settings'
import WebCalendar from './pages/WebCalendar'
import Auth from './pages/Auth'
import AuthCallback from './pages/AuthCallback'

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Stream />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="calendar" element={<WebCalendar />} />
        <Route path="care" element={<Care />} />
        <Route path="settings" element={<Settings />} />
        {/* Legacy paths redirect to home */}
        <Route path="dashboard" element={<Navigate to="/" replace />} />
        <Route path="care-team" element={<Navigate to="/care" replace />} />
        <Route path="care-team/:memberId" element={<Navigate to="/care" replace />} />
        <Route path="log" element={<Navigate to="/" replace />} />
        <Route path="insights" element={<Navigate to="/inbox" replace />} />
      </Route>
    </Routes>
  )
}
