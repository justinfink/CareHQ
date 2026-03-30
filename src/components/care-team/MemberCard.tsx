import Card from '../ui/Card'
import Avatar from '../ui/Avatar'
import Badge from '../ui/Badge'
import { Calendar } from 'lucide-react'
import type { CareTeamMember } from '../../types'

interface MemberCardProps {
  member: CareTeamMember
  onClick: () => void
}

export default function MemberCard({ member, onClick }: MemberCardProps) {
  return (
    <Card hover onClick={onClick} padding="md">
      <div className="flex items-start gap-3 mb-3">
        <Avatar src={member.photo} name={member.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold text-[var(--color-text-primary)] truncate">{member.name}</div>
          <div className="text-sm text-[var(--color-text-secondary)]">{member.role}</div>
          {member.organization && (
            <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{member.organization}</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Badge variant={member.type}>
          {member.type === 'professional' ? 'Professional' : member.type === 'family' ? 'Family' : 'Medical'}
        </Badge>
        <Badge variant="ok">Active</Badge>
      </div>

      <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] mb-3">
        <Calendar size={13} />
        <span>{member.schedule}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {member.tags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="default">{tag}</Badge>
        ))}
      </div>
    </Card>
  )
}
