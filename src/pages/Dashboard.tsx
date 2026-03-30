import GreetingHeader from '../components/dashboard/GreetingHeader'
import AlertBanner from '../components/dashboard/AlertBanner'
import CareStatusCard from '../components/dashboard/CareStatusCard'
import TodaySchedule from '../components/dashboard/TodaySchedule'
import QuickCapture from '../components/dashboard/QuickCapture'
import ActivityFeed from '../components/dashboard/ActivityFeed'
import Card from '../components/ui/Card'

export default function Dashboard() {
  return (
    <div>
      <GreetingHeader />
      <AlertBanner />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column */}
        <div className="lg:col-span-3 space-y-6">
          <CareStatusCard />
          <Card>
            <ActivityFeed />
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          <TodaySchedule />
          <QuickCapture />
          <Card>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Upcoming</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium text-[var(--color-text-primary)]">PT with Kevin Thomas</div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">Tuesday, 10:00 AM</div>
                </div>
                <span className="text-xs text-[var(--color-text-tertiary)] bg-[var(--color-surface-alt)] px-2.5 py-1 rounded-full">In 2 days</span>
              </div>
              <div className="border-t border-[var(--color-border-subtle)]" />
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium text-[var(--color-text-primary)]">Dr. Kapoor &mdash; Neurology</div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">May 14, 2:30 PM</div>
                </div>
                <span className="text-xs text-[var(--color-text-tertiary)] bg-[var(--color-surface-alt)] px-2.5 py-1 rounded-full">6 weeks</span>
              </div>
              <div className="border-t border-[var(--color-border-subtle)]" />
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium text-[var(--color-text-primary)]">Dr. Webb &mdash; Cardiology</div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">August 2026</div>
                </div>
                <span className="text-xs text-[var(--color-text-tertiary)] bg-[var(--color-surface-alt)] px-2.5 py-1 rounded-full">5 months</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
