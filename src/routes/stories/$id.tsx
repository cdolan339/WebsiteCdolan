import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ArrowLeft, Save, Plus, X, Trash2, Sparkles, Target, FileText, ListTree,
  GitBranch, Image as ImageIcon, Network, AlertTriangle, StickyNote, ChevronRight,
  FolderOpen, ChevronDown, Users, HelpCircle, CheckCircle2, Clock, Paperclip, Upload, Download,
  Eye, Edit3, Settings as SettingsIcon,
} from 'lucide-react'
import {
  useStory, updateStory,
  createUserStory, createAcceptanceCriterion, createRequirement,
  createProcessFlow, createProcessStep, createWireframe, createRtmEntry, createRaidEntry,
  type Story, type StoryStatus, type UserStory, type AcceptanceCriterion,
  type Requirement, type ProcessFlow, type ProcessFlowStep, type Wireframe,
  type RtmEntry, type RaidEntry, type RaidType, type UserStoryPriority,
  type UserStoryStatus, type RequirementType, type MoscowPriority,
  type RtmStatus, type RaidImpact, type RaidStatus, type Attachment,
} from '@/lib/stories'
import { useProjects } from '@/lib/projects'
import { AIFillStoryPanel, type AIStoryFillResult } from '@/components/AIFillStoryPanel'
import { type AIFillResult } from '@/components/AIFillPanel'
import { LoadingCurtain } from '@/components/LoadingCurtain'
import { AutoGrowTextarea } from '@/components/AutoGrowTextarea'
import { apiUpload, ApiError } from '@/lib/api'
import {
  createCustomTestCase, createCustomTC, addCustomTestCase,
  type CustomTestCase,
} from '@/lib/customTestCases'
import {
  PageShell, EyebrowChip, Pill, Button, Ring,
  type IconName,
} from '@/components/design/primitives'

export const Route = createFileRoute('/stories/$id')({
  component: StoryDetail,
})

// ── Phases (Canvas wizard layout) ──────────────────────────────────

type PhaseId = 'discover' | 'define' | 'design' | 'validate' | 'deliver'

const PHASES: Array<{ id: PhaseId; num: number; label: string; desc: string }> = [
  { id: 'discover', num: 1, label: 'Discover', desc: 'Business case, goals, scope' },
  { id: 'define',   num: 2, label: 'Define',   desc: 'Stories & requirements' },
  { id: 'design',   num: 3, label: 'Design',   desc: 'Process flows, wireframes' },
  { id: 'validate', num: 4, label: 'Validate', desc: 'Traceability & RAID' },
  { id: 'deliver',  num: 5, label: 'Deliver',  desc: 'Sign-off, handoff, notes' },
]

function computePhasePercents(s: Story): Record<PhaseId, number> {
  // Discover: 33% bus case, 33% objectives, 34% scope (in OR out)
  const discover =
    (s.businessCase.trim() ? 33 : 0) +
    (s.objectives.length > 0 ? 33 : 0) +
    ((s.scopeIn.length > 0 || s.scopeOut.length > 0) ? 34 : 0)

  // Define: 50% have stories with AC, 50% have any requirements
  const stories = s.userStories.length
  const storiesWithAC = s.userStories.filter((u) => u.criteria.some((c) => c.given.trim() || c.when.trim() || c.then.trim())).length
  const define =
    (stories === 0 ? 0 : Math.round((storiesWithAC / stories) * 50)) +
    (s.requirements.length > 0 ? 50 : 0)

  // Design: 50% any flow, 50% any wireframe
  const design =
    (s.processFlows.length > 0 ? 50 : 0) +
    (s.wireframes.length > 0 ? 50 : 0)

  // Validate: 50% have RTM, 50% have RAID
  const validate =
    (s.rtm.length > 0 ? 50 : 0) +
    (s.raid.length > 0 ? 50 : 0)

  // Deliver: 100% on completed flag, else 25% if any notes
  const deliver = s.completed ? 100 : (s.notes && s.notes.trim() ? 25 : 0)

  const clamp = (n: number) => Math.max(0, Math.min(100, n))
  return {
    discover: clamp(discover),
    define:   clamp(define),
    design:   clamp(design),
    validate: clamp(validate),
    deliver:  clamp(deliver),
  }
}

const STATUS_OPTIONS: Array<{ value: StoryStatus; label: string }> = [
  { value: 'discovery',   label: 'Discovery' },
  { value: 'analysis',    label: 'Analysis' },
  { value: 'development', label: 'Development' },
  { value: 'uat',         label: 'UAT' },
  { value: 'done',        label: 'Done' },
]

// ── Shared input styles ────────────────────────────────────────────

const inputClass =
  'w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring'

// ── Project picker pill (dark-mode aware custom dropdown) ─────────

function StoryProjectPicker({
  projects,
  projectId,
  onSelect,
}: {
  projects: Array<{ id: number; name: string }>
  projectId: number | null
  onSelect: (id: number | null) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const current = projects.find((p) => p.id === projectId)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 text-sm font-semibold pl-3 pr-2 py-1 rounded-full transition-colors hover:opacity-90"
        style={{
          background: projectId ? 'var(--app-accent-bg)' : 'var(--app-glass)',
          color: projectId ? 'var(--app-accent-color)' : 'var(--app-text-secondary)',
          border: '1px solid var(--app-glass-border)',
        }}
        title="Assign to a project"
      >
        <FolderOpen size={13} />
        <span className="truncate max-w-[260px]">{current?.name ?? 'No project'}</span>
        <ChevronDown size={12} className={`opacity-70 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-2 z-50 w-72 rounded-xl overflow-hidden"
          style={{
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            background: 'var(--app-overlay)',
            border: '1px solid var(--app-overlay-border)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <button
            type="button"
            onMouseDown={() => { onSelect(null); setOpen(false) }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors"
            style={{
              background: projectId === null ? 'var(--app-accent-bg)' : 'transparent',
              color: projectId === null ? 'var(--app-accent-color)' : 'var(--app-text-secondary)',
              borderBottom: '1px solid var(--app-glass-border)',
              fontWeight: projectId === null ? 600 : 400,
            }}
            onMouseEnter={(e) => { if (projectId !== null) e.currentTarget.style.background = 'var(--app-glass)' }}
            onMouseLeave={(e) => { if (projectId !== null) e.currentTarget.style.background = 'transparent' }}
          >
            <FolderOpen size={15} style={{ opacity: 0.7 }} />
            No project
          </button>
          <div className="max-h-60 overflow-y-auto">
            {projects.map((p) => (
              <button
                type="button"
                key={p.id}
                onMouseDown={() => { onSelect(p.id); setOpen(false) }}
                className="w-full flex items-center px-4 py-2.5 text-sm transition-colors text-left"
                style={{
                  background: projectId === p.id ? 'var(--app-accent-bg)' : 'transparent',
                  color: 'var(--app-accent-color)',
                  borderBottom: '1px solid var(--app-glass-border)',
                  fontWeight: projectId === p.id ? 600 : 400,
                }}
                onMouseEnter={(e) => { if (projectId !== p.id) e.currentTarget.style.background = 'var(--app-glass)' }}
                onMouseLeave={(e) => { if (projectId !== p.id) e.currentTarget.style.background = projectId === p.id ? 'var(--app-accent-bg)' : 'transparent' }}
              >
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Reusable list editor (strings) ─────────────────────────────────

function StringListEditor({
  label, placeholder, items, onChange,
}: {
  label: string
  placeholder: string
  items: string[]
  onChange: (next: string[]) => void
}) {
  const [input, setInput] = useState('')

  const add = () => {
    const t = input.trim()
    if (!t) return
    onChange([...items, t])
    setInput('')
  }

  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <div className="mt-2 flex gap-2">
        <input
          className={inputClass}
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
        />
        <button
          onClick={add}
          className="px-3 py-2 rounded-md text-sm font-medium inline-flex items-center gap-1 transition-opacity hover:opacity-90 flex-shrink-0"
          style={{ background: 'var(--app-btn-primary)', color: 'var(--app-btn-text)' }}
        >
          <Plus size={14} /> Add
        </button>
      </div>
      {items.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2 px-3 py-2 rounded-md text-sm"
              style={{ background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)', color: 'var(--app-text)' }}
            >
              <span className="flex-1 break-words">{item}</span>
              <button
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                aria-label="Remove"
              >
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Section card wrapper ───────────────────────────────────────────

function SectionCard({ title, subtitle, action, children }: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl p-5 mb-4" style={{ background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)' }}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// ── Attachments helpers ────────────────────────────────────────────

const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024 // 25 MB per file

function bytesToSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function AttachmentsSection({
  attachments,
  onChange,
}: {
  attachments: Attachment[]
  onChange: (next: Attachment[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFiles = async (files: FileList | File[]) => {
    setError(null)
    setUploading(true)
    const added: Attachment[] = []
    const rejected: string[] = []
    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        rejected.push(file.name)
        continue
      }
      try {
        const dataUrl = await fileToDataUrl(file)
        added.push({
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl,
          uploadedAt: new Date().toISOString(),
        })
      } catch {
        rejected.push(file.name)
      }
    }
    if (added.length > 0) onChange([...attachments, ...added])
    if (rejected.length > 0) {
      setError(`Skipped: ${rejected.join(', ')} (over 25MB or unreadable)`)
    }
    setUploading(false)
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files)
  }

  const removeAttachment = (id: string) => onChange(attachments.filter((a) => a.id !== id))

  const downloadAttachment = (att: Attachment) => {
    const a = document.createElement('a')
    a.href = att.dataUrl
    a.download = att.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <SectionCard
      title="Attachments"
      subtitle="Upload documents (Word, PDF, etc.) or images. Max 25MB per file."
      action={
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-opacity hover:opacity-90"
          style={{ background: 'var(--app-btn-primary)', color: 'var(--app-btn-text)' }}
        >
          <Upload size={13} /> Upload
        </button>
      }
    >
      <input ref={inputRef} type="file" multiple className="hidden" onChange={onFileChange} />

      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        className="rounded-xl p-6 text-center cursor-pointer transition-colors"
        style={{
          background: dragOver ? 'var(--app-accent-bg)' : 'var(--app-bg)',
          border: `1px dashed ${dragOver ? 'var(--app-accent-color)' : 'var(--app-glass-border)'}`,
        }}
      >
        <Paperclip size={22} className="mx-auto mb-2 opacity-60" />
        <p className="text-sm text-muted-foreground">
          {uploading ? 'Processing files…' : 'Drop files here or click to browse'}
        </p>
      </div>

      {error && (
        <p className="text-xs mt-2" style={{ color: 'var(--destructive, #dc2626)' }}>{error}</p>
      )}

      {attachments.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {attachments.map((att) => {
            const isImage = att.mimeType.startsWith('image/')
            return (
              <li
                key={att.id}
                className="flex items-center gap-3 p-3 rounded-md"
                style={{ background: 'var(--app-bg)', border: '1px solid var(--app-glass-border)' }}
              >
                {isImage ? (
                  <img src={att.dataUrl} alt={att.name} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                ) : (
                  <span
                    className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--app-glass)', color: 'var(--app-text-secondary)' }}
                  >
                    <FileText size={18} />
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--app-text)' }}>{att.name}</p>
                  <p className="text-xs text-muted-foreground">{bytesToSize(att.size)}</p>
                </div>
                <button
                  onClick={() => downloadAttachment(att)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md"
                  title="Download"
                  style={{ background: 'var(--app-glass)' }}
                >
                  <Download size={14} />
                </button>
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-md"
                  title="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </SectionCard>
  )
}

// ── Overview tab ───────────────────────────────────────────────────

function OverviewTab({ story, set }: { story: Story; set: (patch: Partial<Story>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <DiscoverSection
        title="Business Case"
        icon={<SettingsIcon size={16} />}
        gradient="grad-purple"
        editView={(
          <AutoGrowTextarea
            placeholder="Describe the business problem, opportunity, and expected value…"
            value={story.businessCase}
            onChange={(e) => set({ businessCase: e.target.value })}
            className="tz-input tz-textarea"
            style={{ fontSize: 14 }}
          />
        )}
      >
        {story.businessCase.trim() ? (
          <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--ink-2)', margin: 0 }}>
            {story.businessCase}
          </p>
        ) : (
          <p style={{ fontSize: 14, color: 'var(--mute)', margin: 0, fontStyle: 'italic' }}>
            No business case yet — click Edit to describe the problem and expected value.
          </p>
        )}
      </DiscoverSection>

      <DiscoverSection
        title="Objectives & KPIs"
        icon={<Target size={16} />}
        gradient="grad-orange"
        editView={(
          <StringListEditor
            label="SMART objective"
            placeholder="e.g. Reduce customer support tickets by 20% within 3 months"
            items={story.objectives}
            onChange={(objectives) => set({ objectives })}
          />
        )}
      >
        {story.objectives.length > 0 ? (
          <ul style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--ink-2)', margin: 0, paddingLeft: 22 }}>
            {story.objectives.map((o, i) => <li key={i}>{o}</li>)}
          </ul>
        ) : (
          <p style={{ fontSize: 14, color: 'var(--mute)', margin: 0, fontStyle: 'italic' }}>
            No objectives yet.
          </p>
        )}
      </DiscoverSection>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <ScopePanel
          title="In scope"
          tone="purple"
          items={story.scopeIn}
          icon={<CheckCircle2 size={14} />}
          editLabel="In-scope item"
          editPlaceholder="e.g. Password reset via email"
          onChange={(scopeIn) => set({ scopeIn })}
        />
        <ScopePanel
          title="Out of scope"
          tone="orange"
          items={story.scopeOut}
          icon={<X size={14} />}
          editLabel="Out-of-scope item"
          editPlaceholder="e.g. SSO with third-party IdPs"
          onChange={(scopeOut) => set({ scopeOut })}
        />
      </div>

      <AttachmentsSection
        attachments={story.attachments ?? []}
        onChange={(attachments) => set({ attachments })}
      />
    </div>
  )
}

function DiscoverSection({
  title, icon, gradient, editView, children,
}: {
  title: string
  icon: React.ReactNode
  gradient: 'grad-purple' | 'grad-orange' | 'grad-pink' | 'grad-blue' | 'grad-green'
  editView: React.ReactNode
  children: React.ReactNode
}) {
  const [editing, setEditing] = useState(false)
  return (
    <section
      className="panel"
      style={{ padding: 22 }}
      onBlur={(e) => {
        if (!editing) return
        if (e.currentTarget.contains(e.relatedTarget as Node)) return
        setEditing(false)
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <span
          className={`section-icon ${gradient}`}
          style={{ width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center', color: 'white', flexShrink: 0 }}
        >
          {icon}
        </span>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, letterSpacing: '-0.005em', color: 'var(--ink)', flex: 1 }}>
          {title}
        </h3>
        <button
          onClick={() => setEditing((e) => !e)}
          className="tz-btn tz-btn-ghost"
          style={{ padding: '4px 8px', fontSize: 11, color: 'var(--mute)' }}
        >
          {editing ? <><Eye size={12} /> View</> : <><Edit3 size={12} /> Edit</>}
        </button>
      </div>
      {editing ? editView : children}
    </section>
  )
}

function ScopePanel({
  title, tone, items, icon, editLabel, editPlaceholder, onChange,
}: {
  title: string
  tone: 'purple' | 'orange'
  items: string[]
  icon: React.ReactNode
  editLabel: string
  editPlaceholder: string
  onChange: (items: string[]) => void
}) {
  const [editing, setEditing] = useState(false)
  const color = tone === 'purple' ? 'var(--purple)' : 'var(--orange)'
  return (
    <section
      className="panel"
      style={{
        padding: 18,
        borderLeft: `3px solid ${color}`,
      }}
      onBlur={(e) => {
        if (!editing) return
        if (e.currentTarget.contains(e.relatedTarget as Node)) return
        setEditing(false)
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ color, display: 'inline-flex' }}>{icon}</span>
        <h4 style={{ fontSize: 15, fontWeight: 600, margin: 0, letterSpacing: '-0.005em', color: 'var(--ink)', flex: 1 }}>
          {title}
        </h4>
        <span className="tz-mono" style={{ fontSize: 11, color: 'var(--mute)' }}>{items.length}</span>
        <button
          onClick={() => setEditing((e) => !e)}
          className="tz-btn tz-btn-ghost"
          style={{ padding: '4px 8px', fontSize: 11, color: 'var(--mute)' }}
        >
          {editing ? <><Eye size={12} /> View</> : <><Edit3 size={12} /> Edit</>}
        </button>
      </div>
      {editing ? (
        <StringListEditor label={editLabel} placeholder={editPlaceholder} items={items} onChange={onChange} />
      ) : items.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((s, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              <span style={{ color, marginTop: 7, width: 4, height: 4, borderRadius: 999, background: color, flexShrink: 0 }} />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--mute)', margin: 0, fontStyle: 'italic' }}>None yet.</p>
      )}
    </section>
  )
}

// ── User Stories tab ───────────────────────────────────────────────

const US_PRIORITY_TONE: Record<UserStoryPriority, { bg: string; fg: string; border: string }> = {
  low:      { bg: 'color-mix(in oklab, var(--green)  12%, transparent)', fg: 'var(--green)',  border: 'color-mix(in oklab, var(--green)  25%, transparent)' },
  medium:   { bg: 'color-mix(in oklab, var(--amber)  14%, transparent)', fg: 'var(--amber)',  border: 'color-mix(in oklab, var(--amber)  30%, transparent)' },
  high:     { bg: 'color-mix(in oklab, var(--orange) 14%, transparent)', fg: 'var(--orange)', border: 'color-mix(in oklab, var(--orange) 30%, transparent)' },
  critical: { bg: 'color-mix(in oklab, var(--red)    14%, transparent)', fg: 'var(--red)',    border: 'color-mix(in oklab, var(--red)    30%, transparent)' },
}

const US_PRIORITY: Array<{ value: UserStoryPriority; label: string }> = [
  { value: 'low',      label: 'Low'      },
  { value: 'medium',   label: 'Medium'   },
  { value: 'high',     label: 'High'     },
  { value: 'critical', label: 'Critical' },
]

const US_STATUS: Array<{ value: UserStoryStatus; label: string }> = [
  { value: 'draft',       label: 'Draft' },
  { value: 'ready',       label: 'Ready' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done',        label: 'Done' },
]

// Ghost delete button — red only on hover, per reference
function DeleteIconBtn({ onClick, label }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="tz-btn tz-btn-ghost"
      title={label ?? 'Delete'}
      aria-label={label ?? 'Delete'}
      style={{ padding: 6, color: 'var(--mute)', flexShrink: 0, transition: 'all .15s' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--red)'
        e.currentTarget.style.background = 'color-mix(in oklab, var(--red) 10%, transparent)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--mute)'
        e.currentTarget.style.background = 'transparent'
      }}
    >
      <Trash2 size={13} />
    </button>
  )
}

// Soft user-story status select (no harsh box)
const US_STATUS_TONE: Record<UserStoryStatus, { bg: string; fg: string; border: string }> = {
  draft:         { bg: 'var(--chip)',                                          fg: 'var(--mute)',   border: 'var(--border)' },
  ready:         { bg: 'color-mix(in oklab, var(--blue) 12%, transparent)',    fg: 'var(--blue)',   border: 'color-mix(in oklab, var(--blue) 25%, transparent)' },
  'in-progress': { bg: 'color-mix(in oklab, var(--purple) 12%, transparent)', fg: 'var(--purple)', border: 'color-mix(in oklab, var(--purple) 25%, transparent)' },
  done:          { bg: 'var(--green-soft)',                                    fg: '#0B6F49',       border: 'color-mix(in oklab, var(--green) 30%, transparent)' },
}

function USStatusSelect({ value, onChange }: { value: UserStoryStatus; onChange: (v: UserStoryStatus) => void }) {
  const tone = US_STATUS_TONE[value]
  const chevron = encodeURIComponent(tone.fg.startsWith('var(') ? '#6E6E82' : tone.fg)
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as UserStoryStatus)}
      style={{
        background: tone.bg,
        color: tone.fg,
        border: `1px solid ${tone.border}`,
        borderRadius: 999, padding: '4px 22px 4px 10px',
        fontSize: 11.5, fontWeight: 600, letterSpacing: '0.02em',
        cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
        fontFamily: 'inherit',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='${chevron}' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
      }}
    >
      {US_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
    </select>
  )
}

function UserStoriesTab({
  story,
  set,
  onGenerateSuite,
  suiteGenerating,
}: {
  story: Story
  set: (patch: Partial<Story>) => void
  onGenerateSuite: () => void
  suiteGenerating: boolean
}) {
  const updateUS = (id: string, patch: Partial<UserStory>) => {
    set({ userStories: story.userStories.map((u) => u.id === id ? { ...u, ...patch } : u) })
  }
  const removeUS = (id: string) => {
    set({ userStories: story.userStories.filter((u) => u.id !== id) })
  }
  const addUS = () => set({ userStories: [...story.userStories, createUserStory()] })

  const updateAC = (usId: string, acId: string, patch: Partial<AcceptanceCriterion>) => {
    const us = story.userStories.find((u) => u.id === usId)
    if (!us) return
    const criteria = us.criteria.map((c) => c.id === acId ? { ...c, ...patch } : c)
    updateUS(usId, { criteria })
  }
  const removeAC = (usId: string, acId: string) => {
    const us = story.userStories.find((u) => u.id === usId)
    if (!us) return
    updateUS(usId, { criteria: us.criteria.filter((c) => c.id !== acId) })
  }
  const addAC = (usId: string) => {
    const us = story.userStories.find((u) => u.id === usId)
    if (!us) return
    updateUS(usId, { criteria: [...us.criteria, createAcceptanceCriterion()] })
  }

  return (
    <SectionCard
      title="User Stories"
      subtitle="As a [role], I want [goal], so that [benefit]. Include Given/When/Then acceptance criteria."
      action={
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Button
            variant="gradient"
            onClick={onGenerateSuite}
            disabled={suiteGenerating || story.userStories.length === 0}
            title={story.userStories.length === 0
              ? 'Add at least one user story to generate a test suite'
              : 'Generate a single test suite that covers every user story on this page'}
            style={story.userStories.length === 0 ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
          >
            <Sparkles size={14} /> Generate Test Suite
          </Button>
          <button
            onClick={addUS}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-opacity hover:opacity-90"
            style={{ background: 'var(--app-btn-primary)', color: 'var(--app-btn-text)' }}
          >
            <Plus size={13} /> Add Story
          </button>
        </div>
      }
    >
      {story.userStories.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--mute)' }}>No user stories yet. Click "Add Story" to create one.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {story.userStories.map((us, idx) => (
            <UserStoryCard
              key={us.id}
              us={us}
              index={idx}
              onPatch={(patch) => updateUS(us.id, patch)}
              onRemove={() => removeUS(us.id)}
              onACPatch={(acId, patch) => updateAC(us.id, acId, patch)}
              onACRemove={(acId) => removeAC(us.id, acId)}
              onACAdd={() => addAC(us.id)}
            />
          ))}
        </div>
      )}
    </SectionCard>
  )
}

function UserStoryCard({
  us, index, onPatch, onRemove, onACPatch, onACRemove, onACAdd,
}: {
  us: UserStory
  index: number
  onPatch: (patch: Partial<UserStory>) => void
  onRemove: () => void
  onACPatch: (acId: string, patch: Partial<AcceptanceCriterion>) => void
  onACRemove: (acId: string) => void
  onACAdd: () => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [editing, setEditing] = useState(false)
  const tone = US_PRIORITY_TONE[us.priority]

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 14,
        background: 'var(--panel-2)',
      }}
      onBlur={(e) => {
        if (!editing) return
        if (e.currentTarget.contains(e.relatedTarget as Node)) return
        setEditing(false)
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <span
          className="tz-mono"
          style={{
            fontSize: 11, fontWeight: 600,
            color: 'var(--purple)',
            background: 'color-mix(in oklab, var(--purple) 10%, var(--panel-2))',
            padding: '3px 8px', borderRadius: 6,
            letterSpacing: '0.05em', flexShrink: 0,
          }}
        >
          US-{String(index + 1).padStart(2, '0')}
        </span>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'var(--chip)',
            border: '1px solid var(--border)',
            borderRadius: 999, padding: '3px 9px',
            fontSize: 12, color: 'var(--ink-2)', flex: 1, minWidth: 0,
            maxWidth: '100%',
          }}
        >
          <Users size={11} style={{ flexShrink: 0, color: 'var(--mute)' }} />
          {editing ? (
            <input
              type="text"
              value={us.asA}
              onChange={(e) => onPatch({ asA: e.target.value })}
              placeholder="role"
              style={{
                flex: 1, minWidth: 0,
                background: 'transparent', border: 'none', outline: 'none',
                fontSize: 12, color: 'var(--ink-2)', fontFamily: 'inherit',
              }}
            />
          ) : (
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {us.asA || <em style={{ color: 'var(--mute)', fontStyle: 'normal' }}>role</em>}
            </span>
          )}
        </span>

        {/* Priority pill (soft tint) */}
        <span
          style={{
            background: tone.bg, color: tone.fg,
            border: `1px solid ${tone.border}`,
            borderRadius: 999, padding: '3px 9px',
            fontSize: 11.5, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: 999, background: tone.fg }} />
          <select
            value={us.priority}
            onChange={(e) => onPatch({ priority: e.target.value as UserStoryPriority })}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: tone.fg, fontWeight: 600, fontSize: 11.5,
              fontFamily: 'inherit', cursor: 'pointer',
              appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
            }}
          >
            {US_PRIORITY.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </span>

        <USStatusSelect value={us.status} onChange={(v) => onPatch({ status: v })} />

        <button
          onClick={() => setEditing((e) => !e)}
          className="tz-btn tz-btn-ghost"
          style={{ padding: '4px 8px', fontSize: 11, color: 'var(--mute)' }}
        >
          {editing ? <><Eye size={12} /> View</> : <><Edit3 size={12} /> Edit</>}
        </button>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="tz-btn tz-btn-ghost"
          style={{ padding: 4 }}
          aria-label="Toggle expand"
        >
          <ChevronDown
            size={14}
            style={{ transform: expanded ? 'none' : 'rotate(-90deg)', transition: 'transform .15s', color: 'var(--mute)' }}
          />
        </button>
        <DeleteIconBtn onClick={onRemove} label="Remove user story" />
      </div>

      {/* WANT / BENEFIT split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 10, minWidth: 0,
        }}>
          <div className="tz-mono" style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 4 }}>
            WANT
          </div>
          {editing ? (
            <AutoGrowTextarea
              value={us.iWant}
              onChange={(e) => onPatch({ iWant: e.target.value })}
              placeholder="to do something"
              minHeight={36}
              focusMinHeight={100}
              style={{
                width: '100%', background: 'transparent', border: 'none', outline: 'none',
                fontSize: 13, color: 'var(--ink)', fontFamily: 'inherit', resize: 'none', lineHeight: 1.45,
              }}
            />
          ) : (
            <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, margin: 0, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              {us.iWant || <em style={{ color: 'var(--mute)', fontStyle: 'italic' }}>to do something…</em>}
            </p>
          )}
        </div>
        <div style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 10, minWidth: 0,
        }}>
          <div className="tz-mono" style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 4 }}>
            BENEFIT
          </div>
          {editing ? (
            <AutoGrowTextarea
              value={us.soThat}
              onChange={(e) => onPatch({ soThat: e.target.value })}
              placeholder="so that…"
              minHeight={36}
              focusMinHeight={100}
              style={{
                width: '100%', background: 'transparent', border: 'none', outline: 'none',
                fontSize: 13, color: 'var(--ink)', fontFamily: 'inherit', resize: 'none', lineHeight: 1.45,
              }}
            />
          ) : (
            <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, margin: 0, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              {us.soThat || <em style={{ color: 'var(--mute)', fontStyle: 'italic' }}>so that…</em>}
            </p>
          )}
        </div>
      </div>

      {/* Acceptance criteria */}
      {expanded && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span
              className="tz-mono"
              style={{ fontSize: 10.5, color: 'var(--mute)', letterSpacing: '0.08em', fontWeight: 600 }}
            >
              ACCEPTANCE CRITERIA
            </span>
            <span style={{ flex: 1 }} />
            {editing && (
              <button
                onClick={onACAdd}
                className="tz-btn tz-btn-ghost"
                style={{ padding: '4px 8px', fontSize: 11 }}
              >
                <Plus size={10} /> Add criterion
              </button>
            )}
          </div>
          {us.criteria.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--mute)', margin: 0 }}>No criteria yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {us.criteria.map((ac, i) => (
                <ACRow
                  key={ac.id}
                  index={i}
                  ac={ac}
                  editing={editing}
                  onPatch={(patch) => onACPatch(ac.id, patch)}
                  onRemove={() => onACRemove(ac.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ACRow({
  ac, index, editing, onPatch, onRemove,
}: {
  ac: AcceptanceCriterion
  index: number
  editing: boolean
  onPatch: (patch: Partial<AcceptanceCriterion>) => void
  onRemove: () => void
}) {
  const inputStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: 13,
    color: 'var(--ink-2)',
    fontFamily: 'inherit',
    flex: 1,
    minWidth: 60,
    lineHeight: 1.5,
  }
  const labelStyle = (color: string): React.CSSProperties => ({
    fontWeight: 600,
    color,
    flexShrink: 0,
    marginRight: 4,
  })

  // Cell renderer: read-only text in view mode (wraps), input in edit mode
  const cell = (
    label: string,
    color: string,
    value: string,
    setter: (v: string) => void,
  ) => (
    <span style={{ display: 'flex', alignItems: 'flex-start', minWidth: 0, gap: 0, flexWrap: 'nowrap' }}>
      <span style={labelStyle(color)}>{label}</span>
      {editing ? (
        <input
          type="text"
          value={value}
          onChange={(e) => setter(e.target.value)}
          placeholder="…"
          style={inputStyle}
        />
      ) : (
        <span
          style={{
            flex: 1, minWidth: 0,
            fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5,
            wordBreak: 'break-word', overflowWrap: 'anywhere',
          }}
        >
          {value || <em style={{ color: 'var(--mute)', fontStyle: 'italic' }}>…</em>}
        </span>
      )}
    </span>
  )

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: editing ? '52px 1fr 1fr 1fr 28px' : '52px 1fr 1fr 1fr',
        gap: 12,
        alignItems: 'flex-start',
        padding: '6px 0',
        fontSize: 13,
      }}
    >
      <span className="tz-mono" style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 500, marginTop: 2 }}>
        AC-{index + 1}
      </span>
      {cell('Given', 'var(--purple)', ac.given, (v) => onPatch({ given: v }))}
      {cell('When',  'var(--blue)',   ac.when,  (v) => onPatch({ when: v }))}
      {cell('Then',  'var(--green)',  ac.then,  (v) => onPatch({ then: v }))}
      {editing && (
        <button
          onClick={onRemove}
          className="tz-btn tz-btn-ghost"
          style={{ padding: 4, color: 'var(--mute)' }}
          aria-label="Remove criterion"
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}

// ── Requirements tab ───────────────────────────────────────────────

const MOSCOW_TONE: Record<MoscowPriority, { bg: string; fg: string; border: string }> = {
  must:   { bg: 'color-mix(in oklab, var(--red)    12%, transparent)', fg: '#9A261F',     border: 'color-mix(in oklab, var(--red)    25%, transparent)' },
  should: { bg: 'color-mix(in oklab, var(--amber)  14%, transparent)', fg: '#7A5409',     border: 'color-mix(in oklab, var(--amber)  30%, transparent)' },
  could:  { bg: 'color-mix(in oklab, var(--blue)   12%, transparent)', fg: '#1C44B5',     border: 'color-mix(in oklab, var(--blue)   25%, transparent)' },
  wont:   { bg: 'var(--chip)',                                          fg: 'var(--mute)', border: 'var(--border)' },
}

const MOSCOW: Array<{ value: MoscowPriority; label: string }> = [
  { value: 'must',   label: 'Must'   },
  { value: 'should', label: 'Should' },
  { value: 'could',  label: 'Could'  },
  { value: 'wont',   label: "Won't"  },
]

function MoscowSelect({ value, onChange }: { value: MoscowPriority; onChange: (v: MoscowPriority) => void }) {
  const tone = MOSCOW_TONE[value]
  const chevron = encodeURIComponent(tone.fg.startsWith('var(') ? '#6E6E82' : tone.fg)
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as MoscowPriority)}
      style={{
        background: tone.bg, color: tone.fg, border: `1px solid ${tone.border}`,
        borderRadius: 8, padding: '6px 22px 6px 10px',
        fontSize: 12, fontWeight: 600,
        cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
        fontFamily: 'inherit',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='${chevron}' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
      }}
    >
      {MOSCOW.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
    </select>
  )
}

function ReqRow({
  req, onPatch, onRemove,
}: {
  req: Requirement
  onPatch: (patch: Partial<Requirement>) => void
  onRemove: () => void
}) {
  const [editing, setEditing] = useState(false)
  const codeColor = req.type === 'functional' ? 'var(--purple)' : 'var(--blue)'

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: editing ? '100px 1fr 130px 36px 36px' : '100px 1fr 130px 36px',
        gap: 10, alignItems: 'center',
        padding: 10,
        background: 'var(--panel-2)',
        border: '1px solid var(--border)',
        borderRadius: 10,
      }}
      onBlur={(e) => {
        if (!editing) return
        if (e.currentTarget.contains(e.relatedTarget as Node)) return
        setEditing(false)
      }}
    >
      {editing ? (
        <input
          className="tz-mono"
          value={req.code}
          onChange={(e) => onPatch({ code: e.target.value })}
          style={{
            fontSize: 12, fontWeight: 600, color: codeColor,
            background: `color-mix(in oklab, ${codeColor} 8%, var(--panel))`,
            border: `1px solid color-mix(in oklab, ${codeColor} 20%, var(--border))`,
            borderRadius: 8, padding: '6px 10px', textAlign: 'center',
            outline: 'none', fontFamily: "'JetBrains Mono', monospace",
          }}
        />
      ) : (
        <span
          className="tz-mono"
          style={{
            fontSize: 12, fontWeight: 600, color: codeColor,
            background: `color-mix(in oklab, ${codeColor} 8%, var(--panel))`,
            border: `1px solid color-mix(in oklab, ${codeColor} 20%, var(--border))`,
            borderRadius: 8, padding: '6px 10px', textAlign: 'center',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {req.code || '—'}
        </span>
      )}

      {editing ? (
        <AutoGrowTextarea
          minHeight={36}
          focusMinHeight={120}
          placeholder="Description"
          value={req.description}
          onChange={(e) => onPatch({ description: e.target.value })}
          style={{
            width: '100%',
            fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5,
            background: 'transparent', border: 'none', outline: 'none',
            fontFamily: 'inherit', resize: 'none',
          }}
        />
      ) : (
        <span
          style={{
            fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5,
            wordBreak: 'break-word', overflowWrap: 'anywhere',
          }}
        >
          {req.description || <em style={{ color: 'var(--mute)', fontStyle: 'italic' }}>No description.</em>}
        </span>
      )}

      <MoscowSelect
        value={req.priority}
        onChange={(v) => onPatch({ priority: v })}
      />

      <button
        onClick={() => setEditing((e) => !e)}
        className="tz-btn tz-btn-ghost"
        style={{ padding: 6, color: 'var(--mute)' }}
        title={editing ? 'View' : 'Edit'}
      >
        {editing ? <Eye size={13} /> : <Edit3 size={13} />}
      </button>

      {editing && <DeleteIconBtn onClick={onRemove} label="Remove requirement" />}
    </div>
  )
}

function RequirementsTab({ story, set }: { story: Story; set: (patch: Partial<Story>) => void }) {
  const updateReq = (id: string, patch: Partial<Requirement>) => {
    set({ requirements: story.requirements.map((r) => r.id === id ? { ...r, ...patch } : r) })
  }
  const removeReq = (id: string) => {
    set({ requirements: story.requirements.filter((r) => r.id !== id) })
  }
  const addReq = (type: RequirementType) => {
    const existing = story.requirements.filter((r) => r.type === type)
    const prefix = type === 'functional' ? 'FR' : 'NFR'
    const nextCode = `${prefix}-${existing.length + 1}`
    set({ requirements: [...story.requirements, { ...createRequirement(type), code: nextCode }] })
  }

  const renderList = (type: RequirementType) => {
    const reqs = story.requirements.filter((r) => r.type === type)
    if (reqs.length === 0) {
      return <p style={{ fontSize: 13, color: 'var(--mute)' }}>None yet.</p>
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {reqs.map((r) => (
          <ReqRow
            key={r.id}
            req={r}
            onPatch={(patch) => updateReq(r.id, patch)}
            onRemove={() => removeReq(r.id)}
          />
        ))}
      </div>
    )
  }

  return (
    <>
      <SectionCard
        title="Functional Requirements"
        subtitle="What the system must do. Prioritised with MoSCoW."
        action={
          <Button variant="gradient" onClick={() => addReq('functional')}>
            <Plus size={13} /> Add FR
          </Button>
        }
      >
        {renderList('functional')}
      </SectionCard>
      <div style={{ marginTop: 14 }} />
      <SectionCard
        title="Non-Functional Requirements"
        subtitle="Performance, security, usability, reliability constraints."
        action={
          <Button variant="gradient" onClick={() => addReq('non-functional')}>
            <Plus size={13} /> Add NFR
          </Button>
        }
      >
        {renderList('non-functional')}
      </SectionCard>
    </>
  )
}

// ── Process Flows tab ──────────────────────────────────────────────

const LANE_COLORS = ['var(--purple)', 'var(--blue)', 'var(--green)', 'var(--orange)', 'var(--pink)', 'var(--amber)']

function actorColor(actor: string, lanes: string[]): string {
  const idx = lanes.indexOf(actor)
  return LANE_COLORS[(idx >= 0 ? idx : 0) % LANE_COLORS.length]
}

function ProcessFlowsTab({ story, set }: { story: Story; set: (patch: Partial<Story>) => void }) {
  const updatePF = (id: string, patch: Partial<ProcessFlow>) => {
    set({ processFlows: story.processFlows.map((p) => p.id === id ? { ...p, ...patch } : p) })
  }
  const removePF = (id: string) => set({ processFlows: story.processFlows.filter((p) => p.id !== id) })
  const addPF = () => set({ processFlows: [...story.processFlows, createProcessFlow()] })

  const updateStep = (pfId: string, stepId: string, patch: Partial<ProcessFlowStep>) => {
    const pf = story.processFlows.find((p) => p.id === pfId)
    if (!pf) return
    updatePF(pfId, { steps: pf.steps.map((s) => s.id === stepId ? { ...s, ...patch } : s) })
  }
  const removeStep = (pfId: string, stepId: string) => {
    const pf = story.processFlows.find((p) => p.id === pfId)
    if (!pf) return
    updatePF(pfId, { steps: pf.steps.filter((s) => s.id !== stepId) })
  }
  const addStep = (pfId: string) => {
    const pf = story.processFlows.find((p) => p.id === pfId)
    if (!pf) return
    updatePF(pfId, { steps: [...pf.steps, createProcessStep()] })
  }

  return (
    <SectionCard
      title="Process Flows"
      subtitle="Swim-lane style: each step has an actor and an action. Export to BPMN later."
      action={
        <Button variant="gradient" onClick={addPF}>
          <Plus size={13} /> Add Flow
        </Button>
      }
    >
      {story.processFlows.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--mute)' }}>No process flows yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {story.processFlows.map((pf) => (
            <FlowCard
              key={pf.id}
              flow={pf}
              onPatch={(patch) => updatePF(pf.id, patch)}
              onRemove={() => removePF(pf.id)}
              onAddStep={() => addStep(pf.id)}
              onUpdateStep={(stepId, patch) => updateStep(pf.id, stepId, patch)}
              onRemoveStep={(stepId) => removeStep(pf.id, stepId)}
            />
          ))}
        </div>
      )}
    </SectionCard>
  )
}

function FlowCard({
  flow, onPatch, onRemove, onAddStep, onUpdateStep, onRemoveStep,
}: {
  flow: ProcessFlow
  onPatch: (patch: Partial<ProcessFlow>) => void
  onRemove: () => void
  onAddStep: () => void
  onUpdateStep: (stepId: string, patch: Partial<ProcessFlowStep>) => void
  onRemoveStep: (stepId: string) => void
}) {
  const [editing, setEditing] = useState(false)

  // Unique actor lanes preserving order of first appearance
  const lanes: string[] = []
  flow.steps.forEach((s) => { const a = (s.actor || '').trim() || 'Unassigned'; if (!lanes.includes(a)) lanes.push(a) })

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 12,
        background: 'var(--panel-2)',
        overflow: 'hidden',
      }}
      onBlur={(e) => {
        if (!editing) return
        if (e.currentTarget.contains(e.relatedTarget as Node)) return
        setEditing(false)
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px', borderBottom: '1px solid var(--border)',
        }}
      >
        <GitBranch size={14} style={{ color: 'var(--green)', flexShrink: 0 }} />
        {editing ? (
          <input
            type="text"
            value={flow.name}
            onChange={(e) => onPatch({ name: e.target.value })}
            placeholder="Flow name (e.g. New user onboarding)"
            style={{
              flex: 1, minWidth: 0,
              fontSize: 13.5, fontWeight: 600, color: 'var(--ink)',
              background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit',
            }}
          />
        ) : (
          <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>
            {flow.name || 'Untitled flow'}
          </span>
        )}
        <button
          onClick={() => setEditing((e) => !e)}
          className="tz-btn tz-btn-ghost"
          style={{ padding: '4px 8px', fontSize: 11, color: 'var(--mute)' }}
        >
          {editing ? <><Eye size={12} /> Swimlane view</> : <><Edit3 size={12} /> Edit</>}
        </button>
        <DeleteIconBtn onClick={onRemove} label="Remove flow" />
      </div>

      {/* Description (only in edit mode) */}
      {editing && (
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
          <AutoGrowTextarea
            placeholder="Describe the flow — trigger, happy path, alternate paths…"
            value={flow.description}
            onChange={(e) => onPatch({ description: e.target.value })}
            className="tz-input tz-textarea"
            style={{ fontSize: 13 }}
          />
        </div>
      )}
      {!editing && flow.description && (
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>
          {flow.description}
        </div>
      )}

      {/* Body */}
      {editing ? (
        <div style={{ padding: '10px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <span className="tz-mono" style={{ fontSize: 10.5, color: 'var(--mute)', letterSpacing: '0.08em', fontWeight: 600 }}>STEPS</span>
            <span style={{ flex: 1 }} />
            <button onClick={onAddStep} className="tz-btn tz-btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }}>
              <Plus size={10} /> Add step
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {flow.steps.map((step, i) => (
              <div
                key={step.id}
                style={{
                  display: 'grid', gridTemplateColumns: '32px 110px 1fr 32px',
                  gap: 10, alignItems: 'center',
                  padding: '8px 10px', background: 'var(--panel)',
                  border: '1px solid var(--border)', borderRadius: 9,
                }}
              >
                <span className="tz-mono" style={{ fontSize: 11, color: 'var(--mute)', textAlign: 'center' }}>{i + 1}.</span>
                <input
                  type="text"
                  value={step.actor}
                  onChange={(e) => onUpdateStep(step.id, { actor: e.target.value })}
                  placeholder="Actor"
                  style={{
                    fontSize: 12, fontWeight: 600, color: 'var(--ink)',
                    background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit',
                  }}
                />
                <input
                  type="text"
                  value={step.action}
                  onChange={(e) => onUpdateStep(step.id, { action: e.target.value })}
                  placeholder="Action"
                  style={{
                    fontSize: 13, color: 'var(--ink-2)',
                    background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={() => onRemoveStep(step.id)}
                  className="tz-btn tz-btn-ghost"
                  style={{ padding: 4, color: 'var(--mute)' }}
                  aria-label="Remove step"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ padding: '14px' }}>
          {lanes.length === 0 || flow.steps.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--mute)', margin: 0 }}>No steps yet — click Edit to add some.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lanes.map((lane) => {
                const color = actorColor(lane, lanes)
                const stepsInLane = flow.steps
                  .map((s, idx) => ({ s, idx }))
                  .filter(({ s }) => ((s.actor || '').trim() || 'Unassigned') === lane)
                return (
                  <div key={lane} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>{lane}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {stepsInLane.map(({ s, idx }, i) => (
                        <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <span
                            title={s.action || `Step ${idx + 1}`}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '4px 10px', borderRadius: 999,
                              fontSize: 11.5, fontWeight: 600,
                              color, background: `color-mix(in oklab, ${color} 12%, transparent)`,
                              border: `1px solid color-mix(in oklab, ${color} 25%, transparent)`,
                            }}
                          >
                            Step {idx + 1}
                          </span>
                          {i < stepsInLane.length - 1 && (
                            <span aria-hidden style={{ width: 14, height: 1, background: 'var(--border-strong)' }} />
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Wireframes tab ─────────────────────────────────────────────────

function WireframesTab({ story, set }: { story: Story; set: (patch: Partial<Story>) => void }) {
  const updateWF = (id: string, patch: Partial<Wireframe>) => {
    set({ wireframes: story.wireframes.map((w) => w.id === id ? { ...w, ...patch } : w) })
  }
  const removeWF = (id: string) => set({ wireframes: story.wireframes.filter((w) => w.id !== id) })
  const addWF = () => set({ wireframes: [...story.wireframes, createWireframe()] })

  return (
    <SectionCard
      title="Wireframes & Mockups"
      subtitle="Paste image URLs from Figma, Miro, or any hosted image."
      action={
        <Button variant="gradient" onClick={addWF}>
          <Plus size={13} /> Add Wireframe
        </Button>
      }
    >
      {story.wireframes.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--mute)' }}>No wireframes yet.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {story.wireframes.map((wf) => (
            <WireframeCard
              key={wf.id}
              wf={wf}
              onPatch={(patch) => updateWF(wf.id, patch)}
              onRemove={() => removeWF(wf.id)}
            />
          ))}
        </div>
      )}
    </SectionCard>
  )
}

function WireframeCard({
  wf, onPatch, onRemove,
}: {
  wf: Wireframe
  onPatch: (patch: Partial<Wireframe>) => void
  onRemove: () => void
}) {
  const [editing, setEditing] = useState(false)

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 12,
        background: 'var(--panel-2)',
        padding: 12,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
      onBlur={(e) => {
        if (!editing) return
        if (e.currentTarget.contains(e.relatedTarget as Node)) return
        setEditing(false)
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ImageIcon size={13} style={{ color: 'var(--purple)', flexShrink: 0 }} />
        {editing ? (
          <input
            type="text"
            value={wf.name}
            onChange={(e) => onPatch({ name: e.target.value })}
            placeholder="Wireframe name"
            style={{
              flex: 1, minWidth: 0,
              fontSize: 13, fontWeight: 600, color: 'var(--ink)',
              background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit',
            }}
          />
        ) : (
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
            {wf.name || 'Untitled wireframe'}
          </span>
        )}
        <button
          onClick={() => setEditing((e) => !e)}
          className="tz-btn tz-btn-ghost"
          style={{ padding: '4px 8px', fontSize: 11, color: 'var(--mute)' }}
        >
          {editing ? <><Eye size={12} /> View</> : <><Edit3 size={12} /> Edit</>}
        </button>
        <DeleteIconBtn onClick={onRemove} label="Remove wireframe" />
      </div>

      {/* Preview / placeholder area */}
      {wf.imageUrl ? (
        <div
          style={{
            borderRadius: 9, overflow: 'hidden',
            background: 'var(--panel)',
            border: '1px solid var(--border)',
          }}
        >
          <img
            src={wf.imageUrl}
            alt={wf.name || 'Wireframe'}
            style={{ width: '100%', height: 'auto', maxHeight: 220, objectFit: 'contain', display: 'block' }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        </div>
      ) : (
        <div
          style={{
            aspectRatio: '16 / 9',
            borderRadius: 9,
            border: '1px dashed var(--border-strong)',
            background:
              'repeating-linear-gradient(45deg, var(--panel) 0px, var(--panel) 8px, var(--panel-2) 8px, var(--panel-2) 16px)',
            display: 'grid', placeItems: 'center', textAlign: 'center', padding: 14,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <ImageIcon size={20} style={{ color: 'var(--mute-2)' }} />
            <div style={{ fontSize: 12, color: 'var(--mute)' }}>Drop image or paste URL</div>
          </div>
        </div>
      )}

      {/* Edit fields */}
      {editing && (
        <>
          <input
            type="text"
            placeholder="Image URL (https://…)"
            value={wf.imageUrl}
            onChange={(e) => onPatch({ imageUrl: e.target.value })}
            className="tz-input"
            style={{ fontSize: 12 }}
          />
          <AutoGrowTextarea
            placeholder="Notes about this wireframe…"
            minHeight={40}
            focusMinHeight={120}
            value={wf.notes}
            onChange={(e) => onPatch({ notes: e.target.value })}
            className="tz-input tz-textarea"
            style={{ fontSize: 12 }}
          />
        </>
      )}

      {/* Notes (read-only mode) */}
      {!editing && wf.notes && wf.notes.trim() && (
        <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.55 }}>
          {wf.notes}
        </div>
      )}
    </div>
  )
}

// ── RTM tab ────────────────────────────────────────────────────────

const RTM_STATUS: Array<{ value: RtmStatus; label: string; style: React.CSSProperties }> = [
  { value: 'not-covered', label: 'Not Covered', style: { background: 'rgba(107,114,128,0.15)', color: '#6b7280', border: '1px solid rgba(107,114,128,0.3)' } },
  { value: 'covered',     label: 'Covered',     style: { background: 'rgba(202,138,4,0.15)',   color: '#ca8a04', border: '1px solid rgba(202,138,4,0.3)' } },
  { value: 'verified',    label: 'Verified',    style: { background: 'rgba(22,163,74,0.15)',   color: '#16a34a', border: '1px solid rgba(22,163,74,0.3)' } },
]

function RtmTab({ story, set }: { story: Story; set: (patch: Partial<Story>) => void }) {
  const updateRtm = (id: string, patch: Partial<RtmEntry>) => {
    set({ rtm: story.rtm.map((r) => r.id === id ? { ...r, ...patch } : r) })
  }
  const removeRtm = (id: string) => set({ rtm: story.rtm.filter((r) => r.id !== id) })
  const addRtm = () => set({ rtm: [...story.rtm, createRtmEntry()] })

  return (
    <SectionCard
      title="Requirements Traceability Matrix"
      subtitle="Link each requirement to the user story it enables and the test case that verifies it."
      action={
        <button
          onClick={addRtm}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-opacity hover:opacity-90"
          style={{ background: 'var(--app-btn-primary)', color: 'var(--app-btn-text)' }}
        >
          <Plus size={13} /> Add Link
        </button>
      }
    >
      {story.rtm.length === 0 ? (
        <p className="text-sm text-muted-foreground">No RTM entries yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--app-glass-border)' }}>
                <th className="text-left px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Requirement</th>
                <th className="text-left px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">User Story</th>
                <th className="text-left px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Test Case</th>
                <th className="text-left px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {story.rtm.map((r) => {
                const st = RTM_STATUS.find((s) => s.value === r.status)!
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--app-glass-border)' }}>
                    <td className="px-2 py-2">
                      <select
                        className={inputClass + ' text-xs font-mono'}
                        value={r.requirementCode}
                        onChange={(e) => updateRtm(r.id, { requirementCode: e.target.value })}
                      >
                        <option value="">—</option>
                        {story.requirements.map((req) => (
                          <option key={req.id} value={req.code}>{req.code}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <select
                        className={inputClass + ' text-xs'}
                        value={r.userStoryId}
                        onChange={(e) => updateRtm(r.id, { userStoryId: e.target.value })}
                      >
                        <option value="">—</option>
                        {story.userStories.map((us, i) => (
                          <option key={us.id} value={us.id}>US-{i + 1} {us.iWant && `— ${us.iWant.slice(0, 40)}`}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={inputClass + ' text-xs'}
                        placeholder="TC-XXX or title"
                        value={r.testCaseRef}
                        onChange={(e) => updateRtm(r.id, { testCaseRef: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        className={inputClass + ' text-xs'}
                        value={r.status}
                        onChange={(e) => updateRtm(r.id, { status: e.target.value as RtmStatus })}
                        style={st.style}
                      >
                        {RTM_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        onClick={() => removeRtm(r.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Remove"
                      >
                        <X size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}

// ── RAID tab ───────────────────────────────────────────────────────

const RAID_TYPE_META: Record<RaidType, { label: string; color: string }> = {
  risk:       { label: 'Risk',       color: 'var(--red)'    },
  assumption: { label: 'Assumption', color: 'var(--blue)'   },
  issue:      { label: 'Issue',      color: 'var(--orange)' },
  dependency: { label: 'Dependency', color: 'var(--purple)' },
}

const RAID_IMPACT: Array<{ value: RaidImpact; label: string }> = [
  { value: 'low',    label: 'Low'    },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High'   },
]

const RAID_STATUS: Array<{ value: RaidStatus; label: string }> = [
  { value: 'open',      label: 'Open'      },
  { value: 'mitigated', label: 'Mitigated' },
  { value: 'closed',    label: 'Closed'    },
]

function RaidTab({ story, set }: { story: Story; set: (patch: Partial<Story>) => void }) {
  const updateRaid = (id: string, patch: Partial<RaidEntry>) => {
    set({ raid: story.raid.map((r) => r.id === id ? { ...r, ...patch } : r) })
  }
  const removeRaid = (id: string) => set({ raid: story.raid.filter((r) => r.id !== id) })
  const addRaid = (type: RaidType) => set({ raid: [...story.raid, createRaidEntry(type)] })

  const grouped: Record<RaidType, RaidEntry[]> = {
    risk: [], assumption: [], issue: [], dependency: [],
  }
  story.raid.forEach((r) => grouped[r.type].push(r))

  const types: RaidType[] = ['risk', 'assumption', 'issue', 'dependency']

  return (
    <SectionCard
      title="RAID Log"
      subtitle="Risks, Assumptions, Issues, Dependencies."
      action={
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {types.map((t) => {
            const meta = RAID_TYPE_META[t]
            return (
              <button
                key={t}
                onClick={() => addRaid(t)}
                className="tz-btn"
                style={{
                  padding: '6px 10px',
                  fontSize: 12,
                  color: meta.color,
                  borderColor: `color-mix(in oklab, ${meta.color} 30%, var(--border))`,
                  background: `color-mix(in oklab, ${meta.color} 8%, var(--panel))`,
                }}
              >
                <Plus size={11} /> {meta.label}
              </button>
            )
          })}
        </div>
      }
    >
      {story.raid.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--mute)' }}>No entries yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {types.map((type) => {
            const items = grouped[type]
            if (items.length === 0) return null
            const meta = RAID_TYPE_META[type]
            return (
              <div key={type}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: `color-mix(in oklab, ${meta.color} 14%, transparent)`,
                      color: meta.color,
                      border: `1px solid color-mix(in oklab, ${meta.color} 25%, transparent)`,
                      borderRadius: 999,
                      padding: '3px 9px',
                      fontSize: 11.5, fontWeight: 600,
                    }}
                  >
                    <span style={{ width: 5, height: 5, borderRadius: 999, background: meta.color }} />
                    {meta.label}
                  </span>
                  <span className="tz-mono" style={{ fontSize: 11, color: 'var(--mute)' }}>({items.length})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {items.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 180px 110px 110px 36px',
                        gap: 10,
                        alignItems: 'center',
                        padding: 10,
                        background: 'var(--panel-2)',
                        border: `1px solid color-mix(in oklab, ${meta.color} 12%, var(--border))`,
                        borderLeft: `3px solid ${meta.color}`,
                        borderRadius: 10,
                      }}
                    >
                      <AutoGrowTextarea
                        minHeight={32}
                        focusMinHeight={120}
                        placeholder="Description"
                        value={r.description}
                        onChange={(e) => updateRaid(r.id, { description: e.target.value })}
                        style={{
                          width: '100%',
                          background: 'transparent',
                          border: 'none', outline: 'none',
                          fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5,
                          fontFamily: 'inherit', resize: 'none',
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Owner"
                        value={r.owner}
                        onChange={(e) => updateRaid(r.id, { owner: e.target.value })}
                        style={{
                          background: 'var(--panel)',
                          border: '1px solid var(--border)',
                          borderRadius: 8, padding: '6px 10px',
                          fontSize: 12, color: 'var(--ink)', fontFamily: 'inherit', outline: 'none',
                        }}
                      />
                      <select
                        value={r.impact}
                        onChange={(e) => updateRaid(r.id, { impact: e.target.value as RaidImpact })}
                        style={{
                          background: 'var(--panel)',
                          border: '1px solid var(--border)',
                          borderRadius: 8, padding: '6px 10px',
                          fontSize: 12, color: 'var(--ink)', fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
                        }}
                      >
                        {RAID_IMPACT.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
                      </select>
                      <select
                        value={r.status}
                        onChange={(e) => updateRaid(r.id, { status: e.target.value as RaidStatus })}
                        style={{
                          background: 'var(--panel)',
                          border: '1px solid var(--border)',
                          borderRadius: 8, padding: '6px 10px',
                          fontSize: 12, color: 'var(--ink)', fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
                        }}
                      >
                        {RAID_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                      <DeleteIconBtn onClick={() => removeRaid(r.id)} label="Remove" />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}

// ── Notes tab ──────────────────────────────────────────────────────

type NoteCategory = 'meeting' | 'question' | 'decision' | 'followup' | 'general'

type NoteEntry = {
  id: string
  category: NoteCategory
  title: string
  content: string
  createdAt: string
}

const NOTE_CATEGORIES: NoteCategory[] = ['meeting', 'question', 'decision', 'followup', 'general']

const NOTE_CATEGORY_META: Record<
  NoteCategory,
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  meeting:  { label: 'Meeting',   icon: <Users size={13} />,        color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.14)' },
  question: { label: 'Question',  icon: <HelpCircle size={13} />,   color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.14)' },
  decision: { label: 'Decision',  icon: <CheckCircle2 size={13} />, color: '#10b981', bg: 'rgba(16, 185, 129, 0.14)' },
  followup: { label: 'Follow-up', icon: <Clock size={13} />,        color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.14)' },
  general:  { label: 'General',   icon: <StickyNote size={13} />,   color: '#6b7280', bg: 'rgba(107, 114, 128, 0.14)' },
}

// Break up inline "(1) foo (2) bar" or "1. foo 2. bar" into line-separated form.
function prettifyNoteBody(text: string): string {
  return text
    .replace(/([^\n\s])\s*\(\s*(\d+)\s*\)\s+/g, '$1\n$2. ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function inferNoteCategoryFromHeader(header: string): NoteCategory {
  const h = header.toUpperCase()
  if (h.includes('QUESTION'))                                                                  return 'question'
  if (h.includes('DECISION'))                                                                  return 'decision'
  if (h.includes('MEETING') || h.includes('STAND-UP') || h.includes('STANDUP') || h.includes('SYNC')) return 'meeting'
  if (h.includes('FOLLOW') || h.includes('ACTION')   || h.includes('NEXT STEP') ||
      h.includes('REVIEW') || h.includes('SPRINT')   || h.includes('TODO')      || h.includes('RETRO'))
    return 'followup'
  return 'general'
}

function titleCaseHeader(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

// Split "OPEN QUESTIONS: (1) foo. (2) bar. POST-SPRINT-1 REVIEW: After…"
// into separate entries by detecting UPPERCASE section headers ending in ':'.
function splitLegacyNotes(raw: string): NoteEntry[] {
  const trimmed = raw.trim()
  if (!trimmed) return []

  const headerRe = /(?:^|[\s.?!])([A-Z][A-Z0-9 &/-]{2,}):/g
  const hits: Array<{ headerStart: number; header: string; afterHeader: number }> = []
  let m: RegExpExecArray | null
  while ((m = headerRe.exec(trimmed)) !== null) {
    const header = m[1]
    const headerStart = m.index + m[0].length - header.length - 1
    hits.push({ headerStart, header, afterHeader: headerStart + header.length + 1 })
  }

  if (hits.length === 0) {
    return [{
      id: 'note-legacy-0',
      category: 'general',
      title: 'Notes',
      content: prettifyNoteBody(trimmed),
      createdAt: new Date().toISOString(),
    }]
  }

  const sections: Array<{ header: string; body: string }> = []
  const intro = trimmed.slice(0, hits[0].headerStart).trim()
  if (intro) sections.push({ header: '', body: intro })

  for (let i = 0; i < hits.length; i++) {
    const { header, afterHeader } = hits[i]
    const bodyEnd = i + 1 < hits.length ? hits[i + 1].headerStart : trimmed.length
    const body = trimmed.slice(afterHeader, bodyEnd).trim()
    sections.push({ header, body })
  }

  return sections
    .filter((s) => s.header || s.body)
    .map((s, i) => ({
      id: `note-legacy-${i}`,
      category: s.header ? inferNoteCategoryFromHeader(s.header) : 'general',
      title: s.header ? titleCaseHeader(s.header) : 'Notes',
      content: prettifyNoteBody(s.body),
      createdAt: new Date().toISOString(),
    }))
}

function parseNoteEntries(raw: string): NoteEntry[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (
      Array.isArray(parsed) &&
      parsed.every((x) => x && typeof x === 'object' && 'id' in x && 'category' in x)
    ) {
      return parsed as NoteEntry[]
    }
  } catch { /* legacy plain-text */ }
  return splitLegacyNotes(raw)
}

// ── Formatted display of an entry's body ──────────────────────────
// Renders numbered-list runs as an <ol>, paragraphs otherwise.
function NoteBodyDisplay({ text }: { text: string }) {
  if (!text.trim()) return null

  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)

  return (
    <div className="text-sm leading-relaxed" style={{ color: 'var(--app-text)' }}>
      {blocks.map((block, bi) => {
        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
        const allNumbered = lines.length > 1 && lines.every((l) => /^\(?\d+[\).]/.test(l))

        if (allNumbered) {
          return (
            <ol key={bi} className="pl-0 mt-0 mb-3 last:mb-0 flex flex-col gap-1.5">
              {lines.map((line, li) => {
                const mark = line.match(/^\(?(\d+)[\).]\s*(.*)$/)
                const num = mark ? mark[1] : String(li + 1)
                const body = mark ? mark[2] : line
                return (
                  <li key={li} className="flex gap-2.5">
                    <span
                      className="flex-shrink-0 text-xs font-semibold inline-flex items-center justify-center rounded-full"
                      style={{
                        background: 'var(--app-glass)',
                        border: '1px solid var(--app-glass-border)',
                        color: 'var(--app-text-secondary)',
                        width: 22, height: 22,
                      }}
                    >
                      {num}
                    </span>
                    <span className="flex-1 whitespace-pre-wrap break-words pt-0.5">{body}</span>
                  </li>
                )
              })}
            </ol>
          )
        }

        return (
          <p key={bi} className="whitespace-pre-wrap break-words mb-3 last:mb-0">{block}</p>
        )
      })}
    </div>
  )
}

function createNoteEntry(category: NoteCategory = 'general'): NoteEntry {
  return {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    category,
    title: '',
    content: '',
    createdAt: new Date().toISOString(),
  }
}

function noteRelTime(iso: string): string {
  try {
    const then = new Date(iso).getTime()
    if (!Number.isFinite(then)) return ''
    const diff = Math.round((Date.now() - then) / 1000)
    if (diff < 60)         return 'just now'
    if (diff < 3600)       return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400)      return `${Math.floor(diff / 3600)}h ago`
    if (diff < 86400 * 7)  return `${Math.floor(diff / 86400)}d ago`
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

function NotesTab({ story, set }: { story: Story; set: (patch: Partial<Story>) => void }) {
  const entries = parseNoteEntries(story.notes)
  const [filter, setFilter] = useState<NoteCategory | 'all'>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const addWrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!addOpen) return
    const handler = (e: MouseEvent) => {
      if (addWrapperRef.current && !addWrapperRef.current.contains(e.target as Node)) setAddOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [addOpen])

  const commit = (next: NoteEntry[]) => set({ notes: JSON.stringify(next) })
  const addEntry = (category: NoteCategory) => {
    const fresh = createNoteEntry(category)
    commit([fresh, ...entries])
    setAddOpen(false)
    setEditingId(fresh.id)
  }
  const updateEntry = (id: string, patch: Partial<NoteEntry>) => {
    commit(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }
  const removeEntry = (id: string) => commit(entries.filter((e) => e.id !== id))

  const counts: Record<NoteCategory | 'all', number> = {
    all: entries.length,
    meeting: 0, question: 0, decision: 0, followup: 0, general: 0,
  }
  for (const e of entries) counts[e.category]++

  const visible = filter === 'all' ? entries : entries.filter((e) => e.category === filter)

  const chips: Array<{ key: NoteCategory | 'all'; label: string; icon: React.ReactNode | null; color: string }> = [
    { key: 'all', label: 'All', icon: null, color: '#64748b' },
    ...NOTE_CATEGORIES.map((c) => ({
      key: c,
      label: NOTE_CATEGORY_META[c].label,
      icon: NOTE_CATEGORY_META[c].icon,
      color: NOTE_CATEGORY_META[c].color,
    })),
  ]

  return (
    <SectionCard
      title="Notes"
      subtitle="Capture meetings, questions, decisions, and follow-ups as separate entries."
      action={
        <div ref={addWrapperRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setAddOpen((o) => !o)}
            className="tz-btn tz-btn-gradient"
          >
            <Plus size={13} /> Add note
            <ChevronDown size={12} style={{ opacity: 0.7, transform: addOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
          </button>
          {addOpen && (
            <div
              className="panel"
              style={{
                position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 50,
                width: 200, padding: 4,
                boxShadow: '0 20px 50px rgba(20,20,40,0.18)',
              }}
            >
              {NOTE_CATEGORIES.map((cat) => {
                const meta = NOTE_CATEGORY_META[cat]
                return (
                  <button
                    key={cat}
                    type="button"
                    onMouseDown={() => addEntry(cat)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 8,
                      background: 'transparent', border: 0, cursor: 'pointer',
                      textAlign: 'left', fontFamily: 'inherit',
                      fontSize: 13, color: 'var(--ink)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--panel-2)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <span
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        background: `color-mix(in oklab, ${meta.color} 14%, transparent)`,
                        color: meta.color, width: 22, height: 22, borderRadius: 6,
                        flexShrink: 0,
                      }}
                    >
                      {meta.icon}
                    </span>
                    {meta.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      }
    >
      {entries.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {chips.map((chip) => {
            const active = filter === chip.key
            const count = counts[chip.key] ?? 0
            return (
              <button
                key={chip.key}
                onClick={() => setFilter(chip.key)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 11px', borderRadius: 999,
                  fontSize: 12, fontWeight: active ? 600 : 500,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  background: active
                    ? 'linear-gradient(105deg, var(--purple), var(--pink))'
                    : `color-mix(in oklab, ${chip.color} 8%, var(--panel))`,
                  color: active ? 'white' : chip.color,
                  border: active ? '1px solid transparent' : `1px solid color-mix(in oklab, ${chip.color} 20%, var(--border))`,
                  transition: 'all .15s',
                }}
              >
                {chip.icon}
                {chip.label}
                <span
                  className="tz-mono"
                  style={{
                    fontSize: 10, fontWeight: 600, opacity: active ? 0.85 : 0.7,
                    marginLeft: 2,
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {visible.length === 0 ? (
        <div
          style={{
            borderRadius: 12, padding: 28, textAlign: 'center',
            background: 'var(--panel-2)',
            border: '1.5px dashed var(--border-strong)',
            color: 'var(--mute)',
          }}
        >
          <StickyNote size={24} style={{ opacity: 0.5, margin: '0 auto 6px' }} />
          <p style={{ fontSize: 13, color: 'var(--mute)', margin: 0 }}>
            {entries.length === 0
              ? 'No notes yet. Click "Add note" to capture a meeting, question, decision, or follow-up.'
              : `No ${NOTE_CATEGORY_META[filter as NoteCategory].label.toLowerCase()} notes yet.`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visible.map((entry) => {
            const meta = NOTE_CATEGORY_META[entry.category]
            return (
              <div
                key={entry.id}
                style={{
                  background: `color-mix(in oklab, ${meta.color} 4%, var(--panel-2))`,
                  border: `1px solid color-mix(in oklab, ${meta.color} 20%, var(--border))`,
                  borderLeft: `3px solid ${meta.color}`,
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <select
                    value={entry.category}
                    onChange={(e) => updateEntry(entry.id, { category: e.target.value as NoteCategory })}
                    title="Change category"
                    style={{
                      fontSize: 11.5, fontWeight: 600,
                      background: `color-mix(in oklab, ${meta.color} 14%, transparent)`,
                      color: meta.color,
                      border: `1px solid color-mix(in oklab, ${meta.color} 25%, transparent)`,
                      borderRadius: 8, padding: '4px 22px 4px 10px',
                      cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
                      fontFamily: 'inherit',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(meta.color)}' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
                    }}
                  >
                    {NOTE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{NOTE_CATEGORY_META[c].label}</option>
                    ))}
                  </select>

                  <input
                    placeholder="Title…"
                    value={entry.title}
                    onChange={(e) => updateEntry(entry.id, { title: e.target.value })}
                    style={{
                      flex: 1, minWidth: 0,
                      background: 'transparent', border: 'none', outline: 'none',
                      fontSize: 13.5, fontWeight: 600, color: 'var(--ink)',
                      fontFamily: 'inherit',
                    }}
                  />

                  <span className="tz-mono" style={{ fontSize: 11, color: 'var(--mute)', flexShrink: 0 }}>
                    {noteRelTime(entry.createdAt)}
                  </span>

                  <DeleteIconBtn onClick={() => removeEntry(entry.id)} label="Delete note" />
                </div>

                {editingId === entry.id ? (
                  <AutoGrowTextarea
                    minHeight={90}
                    focusMinHeight={180}
                    placeholder="Write the details… Start lines with 1., 2.… to format as a numbered list."
                    value={entry.content}
                    autoFocus
                    onFocus={(e) => {
                      const el = e.currentTarget
                      const len = el.value.length
                      el.setSelectionRange(len, len)
                    }}
                    onChange={(e) => updateEntry(entry.id, { content: e.target.value })}
                    onBlur={() => setEditingId(null)}
                    className="tz-input tz-textarea"
                    style={{ fontSize: 13 }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingId(entry.id)}
                    style={{
                      width: '100%', textAlign: 'left',
                      borderRadius: 10, padding: '10px 12px',
                      background: 'var(--panel)',
                      border: '1px solid var(--border)',
                      color: 'var(--ink-2)',
                      fontFamily: 'inherit',
                      cursor: 'text',
                      fontSize: 13,
                      transition: 'background .15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--panel-2)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--panel)' }}
                    title="Click to edit"
                  >
                    {entry.content.trim() ? (
                      <NoteBodyDisplay text={entry.content} />
                    ) : (
                      <span style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--mute)' }}>
                        Click to add details…
                      </span>
                    )}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}

// ── Main component ─────────────────────────────────────────────────

function StoryDetail() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { story, ready } = useStory(id)
  const { projects } = useProjects()
  const [draft, setDraft] = useState<Story | null>(null)
  const [phase, setPhase] = useState<PhaseId>('discover')
  const [saved, setSaved] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [suiteConfirmOpen, setSuiteConfirmOpen] = useState(false)
  const [suiteGenerating, setSuiteGenerating] = useState(false)
  const [suiteError, setSuiteError] = useState<string | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const titleError   = !!draft && !draft.title.trim()
  const summaryError = !!draft && !draft.summary.trim()

  useEffect(() => {
    if (story && !draft) setDraft(story)
  }, [story, draft])

  const stripVolatile = (s: Story) => {
    const { updatedAt: _u, ...rest } = s
    return rest
  }
  const dirty = !!draft && !!story && JSON.stringify(stripVolatile(draft)) !== JSON.stringify(stripVolatile(story))

  const set = useCallback((patch: Partial<Story>) => {
    setDraft((d) => d ? { ...d, ...patch } : d)
  }, [])

  const save = useCallback(() => {
    if (!draft) return
    if (!draft.title.trim() || !draft.summary.trim()) {
      setShowErrors(true)
      return
    }
    setShowErrors(false)
    updateStory(draft)
    setSaved(true)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    savedTimerRef.current = setTimeout(() => setSaved(false), 1500)
  }, [draft])

  // AI fill merge: scalars fill-if-empty; lists append. RTM userStoryIndex is
  // resolved to the id of the user story we're about to append at that position.
  const handleAiFill = useCallback((r: AIStoryFillResult) => {
    setDraft((d) => {
      if (!d) return d

      const newUserStories: UserStory[] = (r.userStories ?? []).map((u) => ({
        ...createUserStory(),
        asA: u.asA ?? '',
        iWant: u.iWant ?? '',
        soThat: u.soThat ?? '',
        priority: u.priority ?? 'medium',
        status: u.status ?? 'draft',
        criteria: (u.criteria ?? []).map((c) => ({
          ...createAcceptanceCriterion(),
          given: c.given ?? '',
          when: c.when ?? '',
          then: c.then ?? '',
        })),
      }))

      // Map AI's 1-based userStoryIndex → real id from the just-created userStories
      const resolveUsId = (idx: number): string => {
        if (!Number.isFinite(idx) || idx < 1 || idx > newUserStories.length) return ''
        return newUserStories[idx - 1].id
      }

      const newRequirements: Requirement[] = (r.requirements ?? []).map((req) => ({
        ...createRequirement(req.type ?? 'functional'),
        code: req.code ?? '',
        description: req.description ?? '',
        priority: req.priority ?? 'should',
      }))

      const newProcessFlows: ProcessFlow[] = (r.processFlows ?? []).map((pf) => ({
        ...createProcessFlow(),
        name: pf.name ?? '',
        description: pf.description ?? '',
        steps: (pf.steps ?? []).map((s) => ({
          ...createProcessStep(),
          actor: s.actor ?? '',
          action: s.action ?? '',
        })),
      }))

      const newWireframes: Wireframe[] = (r.wireframes ?? []).map((w) => ({
        ...createWireframe(),
        name: w.name ?? '',
        notes: w.notes ?? '',
      }))

      const newRaid: RaidEntry[] = (r.raid ?? []).map((x) => ({
        ...createRaidEntry(x.type ?? 'risk'),
        description: x.description ?? '',
        impact: x.impact ?? 'medium',
        owner: x.owner ?? '',
        status: x.status ?? 'open',
      }))

      const newRtm: RtmEntry[] = (r.rtm ?? []).map((x) => ({
        ...createRtmEntry(),
        requirementCode: x.requirementCode ?? '',
        userStoryId: resolveUsId(x.userStoryIndex),
        testCaseRef: x.testCaseRef ?? '',
        status: x.status ?? 'not-covered',
      }))

      return {
        ...d,
        title:        d.title.trim()        ? d.title        : (r.title ?? d.title),
        summary:      d.summary.trim()      ? d.summary      : (r.summary ?? d.summary),
        businessCase: d.businessCase.trim() ? d.businessCase : (r.businessCase ?? d.businessCase),
        notes:        d.notes.trim()        ? d.notes        : (r.notes ?? d.notes),
        objectives:   [...d.objectives, ...(r.objectives ?? [])],
        scopeIn:      [...d.scopeIn,    ...(r.scopeIn    ?? [])],
        scopeOut:     [...d.scopeOut,   ...(r.scopeOut   ?? [])],
        userStories:  [...d.userStories,  ...newUserStories],
        requirements: [...d.requirements, ...newRequirements],
        processFlows: [...d.processFlows, ...newProcessFlows],
        wireframes:   [...d.wireframes,   ...newWireframes],
        raid:         [...d.raid,         ...newRaid],
        rtm:          [...d.rtm,          ...newRtm],
      }
    })
    setAiOpen(false)
  }, [])

  const generateTestSuite = useCallback(async () => {
    if (!draft) return
    setSuiteConfirmOpen(false)
    setSuiteError(null)
    setSuiteGenerating(true)
    try {
      const userStoriesText = draft.userStories.map((us, i) => {
        const criteriaText = us.criteria
          .map((c, j) => `    AC-${j + 1}: Given ${c.given || '—'}; When ${c.when || '—'}; Then ${c.then || '—'}.`)
          .join('\n')
        return [
          `US-${i + 1}: As a ${us.asA || '—'}, I want ${us.iWant || '—'}, so that ${us.soThat || '—'}.`,
          `  Priority: ${us.priority}. Status: ${us.status}.`,
          us.criteria.length > 0 ? `  Acceptance criteria:\n${criteriaText}` : '',
        ].filter(Boolean).join('\n')
      }).join('\n\n')

      const promptLines = [
        `Business story: ${draft.title || 'Untitled'}`,
        draft.summary ? `Story summary: ${draft.summary}` : '',
        '',
        'Generate one comprehensive test suite that covers ALL of the following user stories together.',
        'Produce a sub-test-case for each user story; treat the full set as the scope of a single suite.',
        '',
        userStoriesText || 'No user stories defined yet — generate sensible coverage for this story.',
      ].filter(Boolean)

      const formData = new FormData()
      formData.append('prompt', promptLines.join('\n'))

      const result = await apiUpload<AIFillResult & { aiMessage?: string }>(
        '/ai/fill-test-case',
        formData,
      )
      if (result.aiMessage) throw new Error(result.aiMessage)

      const fallbackTitle = (draft.title || 'Story').slice(0, 90)
      const tc: CustomTestCase = {
        ...createCustomTestCase(),
        title: result.title || `Test suite — ${fallbackTitle}`,
        summary: result.summary || '',
        objective: result.objective || '',
        preconditions: result.preconditions ?? [],
        tags: result.tags ?? [],
        priority: 'medium',
        testCases: (result.testCases ?? []).map((sub) => ({
          ...createCustomTC(),
          name: sub.name,
          priority: sub.priority ?? 'medium',
          steps: sub.steps,
          expected: sub.expected,
        })),
        projectId: draft.projectId ?? null,
      }

      await addCustomTestCase(tc)
      navigate({ to: '/test-cases/custom/$id', params: { id: tc.id } })
    } catch (err) {
      const msg =
        err instanceof ApiError && err.aiMessage ? err.aiMessage :
        err instanceof Error ? err.message :
        'Generation failed.'
      setSuiteError(msg)
    } finally {
      setSuiteGenerating(false)
    }
  }, [draft, navigate])

  // Keyboard save (Ctrl/Cmd+S)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [save])

  if (!ready || (story && !draft)) {
    return <LoadingCurtain visible={true} message="Loading Story" />
  }

  if (!story || !draft) {
    return (
      <PageShell>
        <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--mute)', marginBottom: 16 }}>Story not found.</p>
            <Link to="/stories" style={{ textDecoration: 'none' }}>
              <Button variant="gradient">
                <ArrowLeft size={14} /> Back to Stories
              </Button>
            </Link>
          </div>
        </div>
      </PageShell>
    )
  }

  const phasePercents = computePhasePercents(draft)
  const counts = {
    userStories: draft.userStories.length,
    requirements: draft.requirements.length,
    flows: draft.processFlows.length,
    rtm: draft.rtm.length,
    raid: draft.raid.length,
  }

  return (
    <PageShell>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 20, marginBottom: 14, flexWrap: 'wrap', fontSize: 13, color: 'var(--mute)' }}>
        <Link
          to="/stories"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--mute)', textDecoration: 'none' }}
        >
          <ArrowLeft size={13} /> Stories
        </Link>
        <span style={{ opacity: 0.5 }}>/</span>
        <span style={{ color: 'var(--ink)', fontWeight: 500, maxWidth: 520, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {draft.title || 'Untitled Story'}
        </span>
      </div>

      {/* Header strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'start', marginBottom: 22 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <EyebrowChip icon="sparkles" tone="purple">BA Story</EyebrowChip>
            <Pill tone={STATUS_TONE[draft.status]} icon={STATUS_ICON[draft.status]}>
              {STATUS_OPTIONS.find((s) => s.value === draft.status)?.label ?? draft.status}
            </Pill>
            <StoryProjectPicker
              projects={projects}
              projectId={draft.projectId ?? null}
              onSelect={(id) => set({ projectId: id })}
            />
          </div>
          <input
            className="tz-title-input"
            style={{
              width: '100%',
              fontFamily: 'inherit',
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              color: 'var(--ink)',
              background: 'transparent',
              border: showErrors && titleError ? '1px solid var(--red)' : '1px solid transparent',
              borderRadius: 10,
              padding: showErrors && titleError ? '6px 10px' : '6px 0',
              outline: 'none',
            }}
            placeholder="Story title"
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
          />
          {showErrors && titleError && (
            <p style={{ fontSize: 12, color: 'var(--red)', margin: '6px 0 0' }}>Title is required.</p>
          )}
          <input
            style={{
              width: '100%',
              fontFamily: 'inherit',
              fontSize: 16,
              color: 'var(--mute)',
              background: 'transparent',
              border: showErrors && summaryError ? '1px solid var(--red)' : '1px solid transparent',
              borderRadius: 10,
              padding: showErrors && summaryError ? '6px 10px' : '6px 0',
              marginTop: 6,
              outline: 'none',
            }}
            placeholder="Short summary — one sentence about what this story delivers"
            value={draft.summary}
            onChange={(e) => set({ summary: e.target.value })}
          />
          {showErrors && summaryError && (
            <p style={{ fontSize: 12, color: 'var(--red)', margin: '6px 0 0' }}>Summary is required.</p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, paddingTop: 4 }}>
          <Button variant="gradient" onClick={() => setAiOpen(true)}>
            <Sparkles size={14} /> AI Generate
          </Button>
          <select
            value={draft.status}
            onChange={(e) => set({ status: e.target.value as StoryStatus })}
            style={{
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--ink)',
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '8px 12px',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <Button
            variant={dirty ? 'gradient' : 'default'}
            onClick={save}
            disabled={!dirty}
            style={!dirty ? { opacity: 0.55, cursor: 'default' } : undefined}
          >
            <Save size={14} />
            {saved ? 'Saved' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Progress strip */}
      <ProgressStrip
        manual={draft.manualProgress ?? null}
        onManualChange={(v) => set({ manualProgress: v })}
        updatedAt={draft.updatedAt}
        attachmentCount={draft.attachments?.length ?? 0}
      />

      {/* Phase rail */}
      <PhaseRail phase={phase} percents={phasePercents} onSelect={setPhase} />

      {/* Count tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12, marginBottom: 22 }}>
        <CountTile icon="file-text" gradient="grad-pink" label="User stories" value={counts.userStories} />
        <CountTile icon="layers" gradient="grad-blue" label="Requirements" value={counts.requirements} />
        <CountTile icon="branch" gradient="grad-green" label="Flows" value={counts.flows} />
        <CountTile icon="target" gradient="grad-orange" label="RTM" value={counts.rtm} />
        <CountTile icon="alert" gradient="grad-red" label="RAID" value={counts.raid} />
      </div>

      {/* Phase content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {phase === 'discover' && <OverviewTab story={draft} set={set} />}

        {phase === 'define' && (
          <>
            <UserStoriesTab
              story={draft}
              set={set}
              onGenerateSuite={() => setSuiteConfirmOpen(true)}
              suiteGenerating={suiteGenerating}
            />
            <RequirementsTab story={draft} set={set} />
          </>
        )}

        {phase === 'design' && (
          <>
            <ProcessFlowsTab story={draft} set={set} />
            <WireframesTab story={draft} set={set} />
          </>
        )}

        {phase === 'validate' && (
          <>
            <RtmTab story={draft} set={set} />
            <RaidTab story={draft} set={set} />
          </>
        )}

        {phase === 'deliver' && <NotesTab story={draft} set={set} />}
      </div>

      {/* AI fill panel */}
      {aiOpen && (
        <AIFillStoryPanel
          onFill={handleAiFill}
          onClose={() => setAiOpen(false)}
          onLoading={setAiLoading}
        />
      )}

      <LoadingCurtain visible={aiLoading} message="Generating BA story" transparent />
      <LoadingCurtain visible={suiteGenerating} message="Generating test suite from all user stories" />

      {suiteConfirmOpen && (
        <GenerateSuiteConfirmModal
          storyTitle={draft.title}
          userStoryCount={draft.userStories.length}
          onConfirm={generateTestSuite}
          onClose={() => setSuiteConfirmOpen(false)}
        />
      )}

      {suiteError && <SuiteErrorToast message={suiteError} onDone={() => setSuiteError(null)} />}

      {/* Sticky unsaved changes pill */}
      {dirty && (
        <div
          style={{
            position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            zIndex: 50, display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px 8px 16px', borderRadius: 999,
            background: 'color-mix(in oklab, var(--panel) 92%, transparent)',
            border: '1px solid var(--border)',
            boxShadow: '0 10px 30px rgba(20,20,40,0.12)',
            backdropFilter: 'blur(12px)',
            color: 'var(--ink)', fontSize: 13, fontWeight: 500,
          }}
        >
          Unsaved changes
          <Button variant="gradient" onClick={save}>
            <Save size={12} /> Save
          </Button>
        </div>
      )}
    </PageShell>
  )
}

/* ── Canvas helpers for the detail chrome ──────────────────────────── */

const STATUS_TONE: Record<StoryStatus, 'neutral' | 'blue' | 'purple' | 'amber' | 'green'> = {
  discovery: 'neutral',
  analysis: 'blue',
  development: 'purple',
  uat: 'amber',
  done: 'green',
}

const STATUS_ICON: Record<StoryStatus, IconName> = {
  discovery: 'search',
  analysis: 'eye',
  development: 'edit',
  uat: 'play',
  done: 'check-circle',
}

function CountTile({
  icon, gradient, label, value,
}: {
  icon: IconName
  gradient: 'grad-purple' | 'grad-pink' | 'grad-blue' | 'grad-green' | 'grad-orange' | 'grad-red'
  label: string
  value: number
}) {
  const gradClass = gradient === 'grad-red' ? 'grad-orange' : gradient
  return (
    <div
      className="panel"
      style={{
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 12, minWidth: 0,
      }}
    >
      <span
        className={`section-icon ${gradClass}`}
        style={{ width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center', color: 'white', flexShrink: 0 }}
      >
        <StoryTileIcon name={icon} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div
          className="tz-mono"
          style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase' }}
        >
          {label}
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, marginTop: 3, color: 'var(--ink)' }}>
          {value}
        </div>
      </div>
    </div>
  )
}

function StoryTileIcon({ name }: { name: IconName }) {
  const SZ = 22
  const map: Record<IconName, React.ReactNode> = {
    users: <Users size={SZ} />,
    'file-text': <FileText size={SZ} />,
    layers: <ListTree size={SZ} />,
    branch: <GitBranch size={SZ} />,
    target: <Target size={SZ} />,
    alert: <AlertTriangle size={SZ} />,
    check: <CheckCircle2 size={SZ} />,
    x: <X size={SZ} />,
    clock: <Clock size={SZ} />,
    calendar: <Clock size={SZ} />,
    flag: <Clock size={SZ} />,
    clipboard: <FileText size={SZ} />,
    tag: <FileText size={SZ} />,
    search: <HelpCircle size={SZ} />,
    filter: <HelpCircle size={SZ} />,
    sort: <HelpCircle size={SZ} />,
    more: <HelpCircle size={SZ} />,
    plus: <Plus size={SZ} />,
    'arrow-right': <ChevronRight size={SZ} />,
    'chevron-down': <ChevronDown size={SZ} />,
    'chevron-right': <ChevronRight size={SZ} />,
    folder: <FolderOpen size={SZ} />,
    book: <FileText size={SZ} />,
    'trend-up': <Target size={SZ} />,
    bell: <HelpCircle size={SZ} />,
    moon: <HelpCircle size={SZ} />,
    sun: <HelpCircle size={SZ} />,
    edit: <StickyNote size={SZ} />,
    link: <Network size={SZ} />,
    play: <Sparkles size={SZ} />,
    'check-circle': <CheckCircle2 size={SZ} />,
    'x-circle': <X size={SZ} />,
    sparkles: <Sparkles size={SZ} />,
    home: <HelpCircle size={SZ} />,
    grid: <ImageIcon size={SZ} />,
    list: <ListTree size={SZ} />,
    split: <HelpCircle size={SZ} />,
    user: <Users size={SZ} />,
    eye: <HelpCircle size={SZ} />,
  }
  return <>{map[name] ?? <HelpCircle size={14} />}</>
}

function formatUpdated(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getMonth()]} ${d.getDate()}`
}

function ProgressStrip({
  manual,
  onManualChange,
  updatedAt,
  attachmentCount,
}: {
  manual: number | null
  onManualChange: (v: number) => void
  updatedAt: string | undefined
  attachmentCount: number
}) {
  const value = typeof manual === 'number' ? Math.max(0, Math.min(100, manual)) : 0

  return (
    <div
      className="panel"
      style={{
        padding: '14px 18px', marginBottom: 22,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center', gap: 16,
      }}
    >
      <Ring value={value} size={42} stroke={4} color="var(--purple)" />
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 2 }}>
            Progress
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink)', fontFamily: "'JetBrains Mono', monospace" }}>
            {value}%
            <span style={{ fontSize: 13, color: 'var(--mute)', fontWeight: 500 }}> complete</span>
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(e) => onManualChange(Number(e.target.value))}
          className="tz-progress-slider"
          style={{ width: '100%' }}
          aria-label="Story progress"
        />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <Pill tone="neutral" icon="calendar">Updated {formatUpdated(updatedAt)}</Pill>
        {attachmentCount > 0 && (
          <Pill tone="blue" icon="clipboard">{attachmentCount} file{attachmentCount === 1 ? '' : 's'}</Pill>
        )}
      </div>
    </div>
  )
}

function PhaseRail({
  phase,
  percents,
  onSelect,
}: {
  phase: PhaseId
  percents: Record<PhaseId, number>
  onSelect: (id: PhaseId) => void
}) {
  return (
    <div className="panel" style={{ padding: 16, marginBottom: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
        {PHASES.map((p) => {
          const pct = percents[p.id]
          const active = p.id === phase
          const done = pct === 100
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              style={{
                border: active ? '1.5px solid var(--purple)' : '1px solid var(--border)',
                background: active
                  ? 'color-mix(in oklab, var(--purple) 6%, var(--panel))'
                  : done
                    ? 'color-mix(in oklab, var(--green) 5%, var(--panel))'
                    : 'var(--panel)',
                borderRadius: 11, padding: '12px 14px',
                display: 'flex', flexDirection: 'column', gap: 8,
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                transition: 'all .15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span
                  style={{
                    width: 26, height: 26, borderRadius: 999,
                    background: done ? 'var(--green)' : active ? 'var(--purple)' : 'var(--panel-2)',
                    color: done || active ? 'white' : 'var(--mute)',
                    display: 'grid', placeItems: 'center',
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                    border: done || active ? 0 : '1px solid var(--border-strong)',
                  }}
                >
                  {done ? <CheckCircle2 size={12} /> : p.num}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{p.label}</span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--mute)', lineHeight: 1.35 }}>{p.desc}</div>
              <div style={{ height: 3, borderRadius: 2, background: 'var(--panel-2)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: done ? 'var(--green)' : 'var(--purple)',
                    transition: 'width .3s',
                  }}
                />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}


function GenerateSuiteConfirmModal({
  storyTitle,
  userStoryCount,
  onConfirm,
  onClose,
}: {
  storyTitle: string
  userStoryCount: number
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'color-mix(in oklab, var(--ink) 28%, transparent)',
        backdropFilter: 'blur(8px)',
        display: 'grid', placeItems: 'center', padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="panel"
        style={{
          width: 'min(480px, 100%)', padding: 22,
          display: 'flex', flexDirection: 'column', gap: 14,
          boxShadow: '0 30px 90px rgba(20,20,40,0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            className="section-icon grad-purple"
            style={{ width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center', color: 'white' }}
          >
            <Sparkles size={16} />
          </span>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>Generate test suite?</div>
        </div>
        <p style={{ fontSize: 14, color: 'var(--mute)', lineHeight: 1.5, margin: 0 }}>
          We'll use AI to build a single test suite covering {userStoryCount === 0
            ? 'this story'
            : `all ${userStoryCount} user stor${userStoryCount === 1 ? 'y' : 'ies'}`} on
          <span style={{ color: 'var(--ink)', fontWeight: 500 }}> {storyTitle || 'this story'}</span>. The
          generated suite opens in a new test case — you'll be navigated there when it's ready.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button variant="gradient" onClick={onConfirm}>
            <Sparkles size={14} /> Generate
          </Button>
        </div>
      </div>
    </div>
  )
}

function SuiteErrorToast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 5000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 70,
        padding: '12px 16px', borderRadius: 12,
        background: 'var(--panel)',
        border: '1px solid var(--red)',
        boxShadow: '0 20px 50px rgba(20,20,40,0.18)',
        display: 'flex', alignItems: 'center', gap: 10,
        maxWidth: 380,
      }}
    >
      <AlertTriangle size={16} color="var(--red)" />
      <div style={{ fontSize: 13, color: 'var(--ink)', flex: 1 }}>{message}</div>
      <button
        onClick={onDone}
        style={{ background: 'transparent', border: 'none', color: 'var(--mute)', cursor: 'pointer' }}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}
