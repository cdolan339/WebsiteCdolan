import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Plus, Sparkles, FileText, Users, Target, ListTree, GitBranch, Image as ImageIcon,
  Network, AlertTriangle, CalendarPlus, CalendarClock, Trash2, ArrowRight,
} from 'lucide-react'
import {
  useStories,
  createStory,
  addStory,
  deleteStory,
  type Story,
  type StoryStatus,
} from '@/lib/stories'
import { LoadingCurtain } from '@/components/LoadingCurtain'

export const Route = createFileRoute('/stories/')({
  component: StoriesPage,
})

const STATUS_META: Record<StoryStatus, { label: string; style: React.CSSProperties }> = {
  discovery:   { label: 'Discovery',   style: { background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' } },
  analysis:    { label: 'Analysis',    style: { background: 'rgba(168,85,247,0.15)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)' } },
  development: { label: 'Development', style: { background: 'rgba(234,88,12,0.15)',  color: '#ea580c', border: '1px solid rgba(234,88,12,0.3)'  } },
  uat:         { label: 'UAT',         style: { background: 'rgba(202,138,4,0.15)',  color: '#ca8a04', border: '1px solid rgba(202,138,4,0.3)'  } },
  done:        { label: 'Done',        style: { background: 'rgba(22,163,74,0.15)',  color: '#16a34a', border: '1px solid rgba(22,163,74,0.3)'  } },
}

function DeleteConfirm({ onConfirm }: { onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false)
  if (!confirming) {
    return (
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirming(true) }}
        className="inline-flex items-center p-1.5 rounded-md transition-all hover:scale-110"
        style={{ color: '#dc2626', opacity: 0.6 }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(220,38,38,0.1)' }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.background = 'transparent' }}
        title="Delete story"
      >
        <Trash2 size={14} />
      </button>
    )
  }
  return (
    <div className="flex items-center gap-2" onClick={(e) => { e.preventDefault(); e.stopPropagation() }}>
      <span className="text-xs" style={{ color: 'var(--app-text-secondary)' }}>Delete?</span>
      <button
        onClick={(e) => { e.preventDefault(); onConfirm(); setConfirming(false) }}
        className="text-xs px-3 py-1 rounded-md font-semibold transition-all hover:scale-105"
        style={{ background: '#dc2626', color: '#fff' }}
      >Yes</button>
      <button
        onClick={(e) => { e.preventDefault(); setConfirming(false) }}
        className="text-xs px-3 py-1 rounded-md font-medium transition-colors"
        style={{ background: 'var(--app-glass)', color: 'var(--app-text-secondary)', border: '1px solid var(--app-glass-border)' }}
      >No</button>
    </div>
  )
}

function StoryCard({ story, onDelete }: { story: Story; onDelete: (id: string) => void }) {
  const meta = STATUS_META[story.status]
  const counts = [
    { icon: <Users size={11} />, label: story.stakeholders.length, title: 'Stakeholders' },
    { icon: <FileText size={11} />, label: story.userStories.length, title: 'User stories' },
    { icon: <ListTree size={11} />, label: story.requirements.length, title: 'Requirements' },
    { icon: <GitBranch size={11} />, label: story.processFlows.length, title: 'Process flows' },
    { icon: <ImageIcon size={11} />, label: story.wireframes.length, title: 'Wireframes' },
    { icon: <Network size={11} />, label: story.rtm.length, title: 'RTM entries' },
    { icon: <AlertTriangle size={11} />, label: story.raid.length, title: 'RAID entries' },
  ]

  return (
    <Link
      to="/stories/$id"
      params={{ id: story.id }}
      className="block px-5 py-4 rounded-xl homepage-card transition-all hover:scale-[1.005]"
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={meta.style}>{meta.label}</span>
        <div className="ml-auto hidden sm:flex items-center gap-3 flex-shrink-0">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="Created">
            <CalendarPlus size={11} />
            {new Date(story.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="Updated">
            <CalendarClock size={11} />
            {new Date(story.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>

      <h3 className="text-base font-semibold text-foreground mb-1 leading-snug" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
        {story.title || 'Untitled Story'}
      </h3>
      {story.summary && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
          {story.summary}
        </p>
      )}

      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {counts.map((c, i) => (
            <span
              key={i}
              title={c.title}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--app-glass)', color: 'var(--app-text-secondary)', border: '1px solid var(--app-glass-border)' }}
            >
              {c.icon}
              {c.label}
            </span>
          ))}
        </div>
        <div className="flex-shrink-0">
          <DeleteConfirm onConfirm={() => onDelete(story.id)} />
        </div>
      </div>
    </Link>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-xl p-10 text-center" style={{ background: 'var(--app-glass)', border: '1px dashed var(--app-glass-border)' }}>
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4" style={{ background: 'var(--app-accent-bg)', color: 'var(--app-accent-color)' }}>
        <Sparkles size={24} />
      </div>
      <h3 className="text-lg font-semibold mb-1">No stories yet</h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
        Capture business cases, user stories, requirements, process flows, wireframes, RTM, and RAID logs in one place.
      </p>
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
        style={{ background: 'var(--app-btn-primary)', color: 'var(--app-btn-text)' }}
      >
        <Plus size={16} />
        Create your first story
      </button>
    </div>
  )
}

function StoriesPage() {
  const { stories, loading } = useStories()
  const navigate = useNavigate()

  const handleCreate = () => {
    const s = createStory()
    s.title = 'New Story'
    // Optimistic: cache updates synchronously; navigate immediately
    addStory(s)
    navigate({ to: '/stories/$id', params: { id: s.id } })
  }

  const handleDelete = (id: string) => {
    deleteStory(id)
  }

  if (loading) {
    return <LoadingCurtain visible={true} message="Loading Stories" />
  }

  const features: Array<{ icon: React.ReactNode; title: string; body: string }> = [
    { icon: <Target size={16} />, title: 'Business Case & Scope', body: 'Problem, objectives, in/out of scope, stakeholders with RACI.' },
    { icon: <FileText size={16} />, title: 'User Stories', body: 'As a / I want / so that — with Given/When/Then acceptance criteria.' },
    { icon: <ListTree size={16} />, title: 'Requirements (SRS)', body: 'Functional & non-functional, prioritised via MoSCoW.' },
    { icon: <GitBranch size={16} />, title: 'Process Flows', body: 'Actor + action swim-lane steps; ready for BPMN export.' },
    { icon: <ImageIcon size={16} />, title: 'Wireframes', body: 'Embed image URLs from Figma, Miro or screenshots.' },
    { icon: <Network size={16} />, title: 'Traceability (RTM)', body: 'Link requirements to user stories and test cases.' },
    { icon: <AlertTriangle size={16} />, title: 'RAID Log', body: 'Risks, Assumptions, Issues, Dependencies with owners & impact.' },
  ]

  return (
    <div className="min-h-screen text-foreground overflow-hidden relative" style={{ background: 'var(--app-bg)', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <style>{`
        @keyframes movehp {
          from { transform: translate(-10%, -10%); }
          to   { transform: translate(20%, 20%); }
        }
        .blob-hp {
          position: absolute;
          border-radius: 50%;
          background: var(--app-accent-gradient);
          filter: blur(80px);
          opacity: 0.18;
          animation: movehp 20s infinite alternate;
          pointer-events: none;
        }
        .dark .homepage-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
        }
        :root:not(.dark) .homepage-card {
          background: rgba(0,0,0,0.02);
          border: 1px solid rgba(0,0,0,0.1);
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
      `}</style>
      <div className="blob-hp" style={{ width: 400, height: 400, top: -100, left: -100 }} />
      <div className="blob-hp" style={{ width: 300, height: 300, bottom: -50, right: -50, animationDelay: '-5s' }} />

      <div className="max-w-4xl mx-auto px-4 py-12 relative z-10">
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 mb-2 text-sm font-semibold px-3 py-1 rounded-full" style={{ background: 'var(--app-accent-bg)', color: 'var(--app-accent-color)', border: '1px solid var(--app-glass-border)' }}>
              <Sparkles size={13} />
              Business Analyst Workspace
            </div>
            <h1 className="text-4xl font-bold mb-2">Stories</h1>
            <p className="text-muted-foreground text-lg">
              Turn ideas into structured requirements, flows, and traceability.
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium flex-shrink-0 mt-1 transition-opacity hover:opacity-90"
            style={{ background: 'var(--app-btn-primary)', color: 'var(--app-btn-text)', boxShadow: `0 2px 12px var(--app-btn-primary-shadow)` }}
          >
            <Plus size={16} />
            New Story
          </button>
        </div>

        {stories.length === 0 ? (
          <>
            <EmptyState onCreate={handleCreate} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
              {features.map((f) => (
                <div key={f.title} className="rounded-xl p-4 homepage-card">
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ color: 'var(--app-accent-color)' }}>{f.icon}</span>
                    <h4 className="text-sm font-semibold">{f.title}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">{f.body}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="rounded-lg overflow-hidden" style={{ background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)', backdropFilter: 'blur(10px)' }}>
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--app-glass-border)', background: 'var(--app-section-header-bg)', backdropFilter: 'blur(12px)' }}>
                <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  All Stories ({stories.length})
                </h2>
                <Link to="/homepage" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Back to Home <ArrowRight size={11} />
                </Link>
              </div>
              <ul className="flex flex-col gap-3 p-3">
                {stories.map((story) => (
                  <li key={story.id}>
                    <StoryCard story={story} onDelete={handleDelete} />
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
