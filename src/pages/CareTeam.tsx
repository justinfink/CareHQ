import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import Button from '../components/ui/Button'
import MemberCard from '../components/care-team/MemberCard'
import MemberDetail from '../components/care-team/MemberDetail'
import AddMemberModal from '../components/care-team/AddMemberModal'
import { useAppStore } from '../store/useAppStore'
import { user } from '../data/mockUser'
import type { TeamMemberType } from '../types'

type FilterTab = 'all' | TeamMemberType

export default function CareTeam() {
  const { memberId } = useParams()
  const careTeam = useAppStore((s) => s.careTeam)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [selectedId, setSelectedId] = useState<string | null>(memberId || null)
  const [addModalOpen, setAddModalOpen] = useState(false)

  const filteredTeam = filter === 'all' ? careTeam : careTeam.filter((m) => m.type === filter)
  const selectedMember = careTeam.find((m) => m.id === selectedId)

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: careTeam.length },
    { key: 'professional', label: 'Professional', count: careTeam.filter((m) => m.type === 'professional').length },
    { key: 'family', label: 'Family', count: careTeam.filter((m) => m.type === 'family').length },
    { key: 'medical', label: 'Medical', count: careTeam.filter((m) => m.type === 'medical').length },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Care Team</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {careTeam.length} people supporting {user.careRecipient.firstName}
          </p>
        </div>
        <Button size="sm" onClick={() => setAddModalOpen(true)}>
          <Plus size={16} />
          Add member
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mt-4 mb-6 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-150 cursor-pointer ${
              filter === tab.key
                ? 'bg-[var(--color-brand-primary)] text-white shadow-[var(--shadow-sm)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)]'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredTeam.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            onClick={() => setSelectedId(member.id)}
          />
        ))}
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {selectedMember && (
          <MemberDetail
            member={selectedMember}
            onClose={() => setSelectedId(null)}
          />
        )}
      </AnimatePresence>

      {/* Add modal */}
      <AddMemberModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </div>
  )
}
