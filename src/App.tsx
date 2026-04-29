import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import RequireAuth from './components/auth/RequireAuth'
import Dashboard from './pages/Dashboard'
import CareTeam from './pages/CareTeam'
import VoiceLog from './pages/VoiceLog'
import Insights from './pages/Insights'
import Calendar from './pages/Calendar'
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
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="care-team" element={<CareTeam />} />
        <Route path="care-team/:memberId" element={<CareTeam />} />
        <Route path="log" element={<VoiceLog />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="insights" element={<Insights />} />
      </Route>
    </Routes>
  )
}
