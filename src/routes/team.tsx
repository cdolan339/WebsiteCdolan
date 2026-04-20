import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import {
  listJoinRequests,
  approveJoinRequest,
  denyJoinRequest,
  listTeamMembers,
  updateMemberRole,
  type JoinRequest,
  type TeamMember,
} from '@/lib/teams'
import { api } from '@/lib/api'
import { Check, X, Users, UserCheck } from 'lucide-react'

export const Route = createFileRoute('/team')({
  component: TeamPage,
})

type Me = {
  id: number
  username: string
  email: string | null
  role: 'owner' | 'manager' | 'associate'
  team_id: number | null
  team_name: string | null
  email_verified: boolean
}

function TeamPage() {
  const [me, setMe]               = useState<Me | null>(null)
  const [requests, setRequests]   = useState<JoinRequest[]>([])
  const [members, setMembers]     = useState<TeamMember[]>([])
  const [loading, setLoading]     = useState(true)
  const [busyId, setBusyId]       = useState<number | null>(null)
  const [error, setError]         = useState('')

  const loadAll = useCallback(async () => {
    setError('')
    try {
      const meRes = await api<Me>('/auth/me')
      setMe(meRes)

      const [mem, reqs] = await Promise.all([
        listTeamMembers().catch(() => []),
        meRes.role === 'owner' ? listJoinRequests().catch(() => []) : Promise.resolve([]),
      ])
      setMembers(mem)
      setRequests(reqs)
    } catch (err) {
      setError((err as { message?: string }).message || 'Failed to load team')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  async function handleApprove(id: number) {
    setBusyId(id); setError('')
    try {
      await approveJoinRequest(id)
      setRequests((prev) => prev.filter((r) => r.id !== id))
      const mem = await listTeamMembers()
      setMembers(mem)
    } catch (err) {
      setError((err as { message?: string }).message || 'Failed to approve')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDeny(id: number) {
    setBusyId(id); setError('')
    try {
      await denyJoinRequest(id)
      setRequests((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      setError((err as { message?: string }).message || 'Failed to deny')
    } finally {
      setBusyId(null)
    }
  }

  async function handleRoleChange(userId: number, role: TeamMember['role']) {
    setError('')
    const prev = members
    setMembers((ms) => ms.map((m) => (m.id === userId ? { ...m, role } : m)))
    try {
      await updateMemberRole(userId, role)
    } catch (err) {
      setMembers(prev)
      setError((err as { message?: string }).message || 'Failed to update role')
    }
  }

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-8 text-sm" style={{ color: 'var(--app-text-secondary)' }}>Loading team…</div>
  }

  if (!me?.team_id) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--app-text)' }}>Team</h1>
        <p style={{ color: 'var(--app-text-secondary)' }}>
          You{'\u2019'}re not part of a team yet.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>
          {me.team_name || 'Your team'}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--app-text-secondary)' }}>
          Your role: <span className="capitalize font-semibold" style={{ color: 'var(--app-text)' }}>{me.role}</span>
        </p>
      </header>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.3)', color: '#dc2626' }}>
          {error}
        </div>
      )}

      {me.role === 'owner' && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--app-text)' }}>
            <UserCheck size={18} />
            Join requests
            {requests.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#2563eb', color: '#fff' }}>
                {requests.length}
              </span>
            )}
          </h2>

          {requests.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>No pending requests.</p>
          ) : (
            <ul className="space-y-2">
              {requests.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between px-4 py-3 rounded-lg"
                  style={{ background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)' }}
                >
                  <div>
                    <p className="font-medium" style={{ color: 'var(--app-text)' }}>
                      {r.username}
                      {!r.email_verified && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#d97706' }}>
                          unverified email
                        </span>
                      )}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--app-text-secondary)' }}>{r.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(r.id)}
                      disabled={busyId === r.id || !r.email_verified}
                      title={r.email_verified ? 'Approve' : 'User must verify email first'}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: '#16a34a', color: '#fff' }}
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button
                      onClick={() => handleDeny(r.id)}
                      disabled={busyId === r.id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                      style={{ background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)', color: 'var(--app-text)' }}
                    >
                      <X size={14} /> Deny
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--app-text)' }}>
          <Users size={18} />
          Members ({members.length})
        </h2>
        <ul className="space-y-2">
          {members.map((m) => {
            const isSelf   = me.id === m.id
            const canEdit  = me.role === 'owner' && !isSelf
            const roleBg   = m.role === 'owner' ? '#2563eb' : m.role === 'manager' ? '#7c3aed' : 'var(--app-glass)'
            const roleFg   = m.role === 'owner' || m.role === 'manager' ? '#fff' : 'var(--app-text-secondary)'
            return (
              <li
                key={m.id}
                className="flex items-center justify-between px-4 py-3 rounded-lg"
                style={{ background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)' }}
              >
                <div>
                  <p className="font-medium" style={{ color: 'var(--app-text)' }}>
                    {m.username}{isSelf && <span className="ml-2 text-xs" style={{ color: 'var(--app-text-secondary)' }}>(you)</span>}
                  </p>
                  {m.email && (
                    <p className="text-xs" style={{ color: 'var(--app-text-secondary)' }}>{m.email}</p>
                  )}
                </div>

                {canEdit ? (
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.id, e.target.value as TeamMember['role'])}
                    className="text-xs px-2 py-1 rounded-md capitalize cursor-pointer outline-none"
                    style={{
                      background: roleBg,
                      color: roleFg,
                      border: m.role === 'associate' ? '1px solid var(--app-glass-border)' : 'none',
                      fontWeight: 600,
                    }}
                  >
                    <option value="owner">Owner</option>
                    <option value="manager">Manager</option>
                    <option value="associate">Associate</option>
                  </select>
                ) : (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full capitalize"
                    style={{
                      background: roleBg,
                      color: roleFg,
                      border: m.role === 'associate' ? '1px solid var(--app-glass-border)' : 'none',
                    }}
                  >
                    {m.role}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
