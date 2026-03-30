import { useState } from 'react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import { useAppStore } from '../../store/useAppStore'
import type { CareTeamMember, TeamMemberType } from '../../types'

interface AddMemberModalProps {
  open: boolean
  onClose: () => void
}

export default function AddMemberModal({ open, onClose }: AddMemberModalProps) {
  const addCareTeamMember = useAppStore((s) => s.addCareTeamMember)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [org, setOrg] = useState('')
  const [type, setType] = useState<TeamMemberType>('professional')
  const [schedule, setSchedule] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newMember: CareTeamMember = {
      id: `ct-${Date.now()}`,
      name,
      role,
      organization: org || null,
      type,
      schedule,
      phone,
      email: email || null,
      photo: null,
      notes,
      startDate: new Date().toISOString().split('T')[0],
      status: 'active',
      tags: [],
    }
    addCareTeamMember(newMember)
    setName('')
    setRole('')
    setOrg('')
    setType('professional')
    setSchedule('')
    setPhone('')
    setEmail('')
    setNotes('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add team member">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Dr. Jane Smith" required />
        <Input label="Role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g., Neurologist, Home Health Aide" required />
        <Input label="Organization" value={org} onChange={(e) => setOrg(e.target.value)} placeholder="e.g., Northwestern Medicine" />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full bg-white border border-[var(--color-border-default)] rounded-[10px] px-3.5 py-3 text-base text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] cursor-pointer"
          >
            <option value="professional">Professional</option>
            <option value="family">Family</option>
            <option value="medical">Medical</option>
          </select>
        </div>

        <Input label="Schedule" value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="e.g., Mon\u2013Fri, 8am\u201312pm" />
        <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(XXX) XXX-XXXX" />
        <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything you'd want another family member to know about this person."
            rows={3}
            className="w-full bg-white border border-[var(--color-border-default)] rounded-[10px] px-3.5 py-3 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" className="flex-1">Add to care team</Button>
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  )
}
