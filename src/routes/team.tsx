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
import { Check, X, Users, UserCheck, AlertTriangle } from 'lucide-react'
import { PageShell, EyebrowChip, Pill, Button } from '@/components/design/primitives'

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

const ROLE_TONE: Record<TeamMember['role'], 'blue' | 'purple' | 'neutral'> = {
  owner: 'blue',
  manager: 'purple',
  associate: 'neutral',
}

function TeamPage() {
  const [me, setMe]             = useState<Me | null>(null)
  const [requests, setRequests] = useState<JoinRequest[]>([])
  const [members, setMembers]   = useState<TeamMember[]>([])
  const [loading, setLoading]   = useState(true)
  const [busyId, setBusyId]     = useState<number | null>(null)
  const [error, setError]       = useState('')

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
    return (
      <PageShell>
        <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', color: 'var(--mute)' }}>
          Loading team…
        </div>
      </PageShell>
    )
  }

  if (!me?.team_id) {
    return (
      <PageShell>
        <div style={{ paddingTop: 20 }}>
          <EyebrowChip icon="users" tone="purple">Team</EyebrowChip>
          <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)', margin: '14px 0 8px' }}>
            Team
          </h1>
          <p style={{ fontSize: 16, color: 'var(--mute)' }}>
            You{'\u2019'}re not part of a team yet.
          </p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      {/* Header strip */}
      <div style={{ paddingTop: 20, marginBottom: 22 }}>
        <EyebrowChip icon="users" tone="purple">Team</EyebrowChip>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'end', marginTop: 14 }}>
          <div>
            <h1 style={{
              fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em',
              lineHeight: 1.1, color: 'var(--ink)', margin: 0,
            }}>
              {me.team_name || 'Your team'}
            </h1>
            <p style={{ fontSize: 15, color: 'var(--mute)', marginTop: 6 }}>
              Your role: <span style={{ color: 'var(--ink)', fontWeight: 600, textTransform: 'capitalize' }}>{me.role}</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Pill tone="neutral" icon="users">{members.length} member{members.length === 1 ? '' : 's'}</Pill>
            {me.role === 'owner' && requests.length > 0 && (
              <Pill tone="amber" icon="clock">{requests.length} pending</Pill>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 18,
            padding: '12px 16px',
            borderRadius: 12,
            background: 'color-mix(in oklab, var(--red) 10%, var(--panel))',
            border: '1px solid color-mix(in oklab, var(--red) 35%, var(--border))',
            color: 'var(--red)',
            fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Join requests — owners only */}
      {me.role === 'owner' && (
        <section className="panel" style={{ padding: 22, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span
              className="section-icon grad-blue"
              style={{ width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center', color: 'white' }}
            >
              <UserCheck size={16} />
            </span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>Join requests</div>
              <div style={{ fontSize: 12, color: 'var(--mute)' }}>
                {requests.length === 0 ? 'No pending requests' : `${requests.length} waiting for review`}
              </div>
            </div>
          </div>

          {requests.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--mute)', margin: 0 }}>
              Join requests will show up here when someone applies to your team.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {requests.map((r) => (
                <div
                  key={r.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: 'var(--panel-2)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{r.username}</span>
                      {!r.email_verified && (
                        <Pill tone="amber" icon="alert">Unverified email</Pill>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--mute)', marginTop: 2 }}>{r.email}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      variant="gradient"
                      onClick={() => handleApprove(r.id)}
                      disabled={busyId === r.id || !r.email_verified}
                      title={r.email_verified ? 'Approve' : 'User must verify email first'}
                    >
                      <Check size={13} /> Approve
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => handleDeny(r.id)}
                      disabled={busyId === r.id}
                    >
                      <X size={13} /> Deny
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Members */}
      <section className="panel" style={{ padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span
            className="section-icon grad-purple"
            style={{ width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center', color: 'white' }}
          >
            <Users size={16} />
          </span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>Members</div>
            <div style={{ fontSize: 12, color: 'var(--mute)' }}>{members.length} {members.length === 1 ? 'person' : 'people'} on this team</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {members.map((m) => {
            const isSelf  = me.id === m.id
            const canEdit = me.role === 'owner' && !isSelf
            return (
              <div
                key={m.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: 'var(--panel-2)',
                  border: '1px solid var(--border)',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 34, height: 34, borderRadius: 999,
                    display: 'grid', placeItems: 'center',
                    background: 'color-mix(in oklab, var(--purple) 12%, transparent)',
                    color: 'var(--purple)',
                    fontWeight: 700,
                    fontSize: 13,
                    letterSpacing: '0.02em',
                  }}
                >
                  {m.username.slice(0, 2).toUpperCase()}
                </span>

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{m.username}</span>
                    {isSelf && (
                      <span style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 500 }}>(you)</span>
                    )}
                  </div>
                  {m.email && (
                    <div style={{ fontSize: 12, color: 'var(--mute)', marginTop: 2 }}>{m.email}</div>
                  )}
                </div>

                {canEdit ? (
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.id, e.target.value as TeamMember['role'])}
                    style={{
                      fontFamily: 'inherit',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--ink)',
                      background: 'var(--panel)',
                      border: '1px solid var(--border)',
                      borderRadius: 999,
                      padding: '6px 12px',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      boxShadow: 'var(--shadow-xs)',
                    }}
                  >
                    <option value="owner">Owner</option>
                    <option value="manager">Manager</option>
                    <option value="associate">Associate</option>
                  </select>
                ) : (
                  <Pill tone={ROLE_TONE[m.role]}>{m.role}</Pill>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </PageShell>
  )
}
