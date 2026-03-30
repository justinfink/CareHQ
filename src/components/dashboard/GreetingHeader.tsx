import { format, differenceInDays, parseISO } from 'date-fns'
import { user } from '../../data/mockUser'

export default function GreetingHeader() {
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dayCount = differenceInDays(now, parseISO(user.careRecipient.startedCare))

  return (
    <div className="mb-6">
      <h1 className="text-[30px] font-bold text-[var(--color-text-primary)] leading-tight">
        {greeting}, {user.firstName}.
      </h1>
      <p className="text-sm text-[var(--color-text-secondary)] mt-1">
        {user.careRecipient.firstName}&apos;s care &mdash; Day {dayCount.toLocaleString()}
        <span className="mx-2">&middot;</span>
        {format(now, 'EEEE, MMMM d')}
      </p>
    </div>
  )
}
