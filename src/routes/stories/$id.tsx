import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ArrowLeft, Save, Plus, X, Trash2, Sparkles, Target, FileText, ListTree,
  GitBranch, Image as ImageIcon, Network, AlertTriangle, StickyNote, ChevronRight,
  FolderOpen, ChevronDown, Users, HelpCircle, CheckCircle2, Clock, Paperclip, Upload, Download,
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
  PageShell, EyebrowChip, Pill, Button, Ring, Segmented,
  type IconName,
} from '@/components/design/primitives'

export const Route = createFileRoute('/stories/$id')({
  component: StoryDetail,
})

type TabKey =
  | 'overview' | 'user-stories' | 'requirements' | 'process-flows'
  | 'wireframes' | 'rtm' | 'raid' | 'notes'

const TABS: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: 'overview',      label: 'Overview',       icon: <Target size={14} /> },
  { key: 'user-stories',  label: 'User Stories',   icon: <FileText size={14} /> },
  { key: 'requirements',  label: 'Requirements',   icon: <ListTree size={14} /> },
  { key: 'process-flows', label: 'Process Flows',  icon: <GitBranch size={14} /> },
  { key: 'wireframes',    label: 'Wireframes',     icon: <ImageIcon size={14} /> },
  { key: 'rtm',           label: 'RTM',            icon: <Network size={14} /> },
  { key: 'raid',          label: 'RAID Log',       icon: <AlertTriangle size={14} /> },
  { key: 'notes',         label: 'Notes',          icon: <StickyNote size={14} /> },
]

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
const textareaClass = inputClass

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
    <>
      <SectionCard title="Business Case" subtitle="Why this project matters — problem statement and expected outcomes.">
        <AutoGrowTextarea
          className={textareaClass}
          placeholder="Describe the business problem, opportunity, and expected value…"
          value={story.businessCase}
          onChange={(e) => set({ businessCase: e.target.value })}
        />
      </SectionCard>

      <SectionCard title="Objectives">
        <StringListEditor
          label="SMART objective"
          placeholder="e.g. Reduce customer support tickets by 20% within 3 months"
          items={story.objectives}
          onChange={(objectives) => set({ objectives })}
        />
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard title="In Scope">
          <StringListEditor
            label="In-scope item"
            placeholder="e.g. Password reset via email"
            items={story.scopeIn}
            onChange={(scopeIn) => set({ scopeIn })}
          />
        </SectionCard>
        <SectionCard title="Out of Scope">
          <StringListEditor
            label="Out-of-scope item"
            placeholder="e.g. SSO with third-party IdPs"
            items={story.scopeOut}
            onChange={(scopeOut) => set({ scopeOut })}
          />
        </SectionCard>
      </div>

      <AttachmentsSection
        attachments={story.attachments ?? []}
        onChange={(attachments) => set({ attachments })}
      />
    </>
  )
}

// ── User Stories tab ───────────────────────────────────────────────

const US_PRIORITY: Array<{ value: UserStoryPriority; label: string; style: React.CSSProperties }> = [
  { value: 'low',      label: 'Low',      style: { background: 'rgba(22,163,74,0.15)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.3)' } },
  { value: 'medium',   label: 'Medium',   style: { background: 'rgba(202,138,4,0.15)', color: '#ca8a04', border: '1px solid rgba(202,138,4,0.3)' } },
  { value: 'high',     label: 'High',     style: { background: 'rgba(234,88,12,0.15)', color: '#ea580c', border: '1px solid rgba(234,88,12,0.3)' } },
  { value: 'critical', label: 'Critical', style: { background: 'rgba(220,38,38,0.15)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)' } },
]

const US_STATUS: Array<{ value: UserStoryStatus; label: string }> = [
  { value: 'draft',       label: 'Draft' },
  { value: 'ready',       label: 'Ready' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done',        label: 'Done' },
]

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
        <p className="text-sm text-muted-foreground">No user stories yet. Click "Add Story" to create one.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {story.userStories.map((us, idx) => {
            const pri = US_PRIORITY.find((p) => p.value === us.priority)!
            return (
              <div
                key={us.id}
                className="p-4 rounded-lg"
                style={{ background: 'var(--app-bg)', border: '1px solid var(--app-glass-border)' }}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">US-{idx + 1}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={pri.style}>{pri.label}</span>
                    <select
                      className="text-xs px-2 py-0.5 rounded-md border border-border bg-background"
                      value={us.status}
                      onChange={(e) => updateUS(us.id, { status: e.target.value as UserStoryStatus })}
                    >
                      {US_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="text-xs px-2 py-1 rounded-md border border-border bg-background"
                      value={us.priority}
                      onChange={(e) => updateUS(us.id, { priority: e.target.value as UserStoryPriority })}
                    >
                      {US_PRIORITY.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                    <button
                      onClick={() => removeUS(us.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Remove user story"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-muted-foreground">As a</label>
                    <AutoGrowTextarea className={inputClass} minHeight={38} focusMinHeight={100} placeholder="role" value={us.asA} onChange={(e) => updateUS(us.id, { asA: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-muted-foreground">I want</label>
                    <AutoGrowTextarea className={inputClass} minHeight={38} focusMinHeight={100} placeholder="goal" value={us.iWant} onChange={(e) => updateUS(us.id, { iWant: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-muted-foreground">So that</label>
                    <AutoGrowTextarea className={inputClass} minHeight={38} focusMinHeight={100} placeholder="benefit" value={us.soThat} onChange={(e) => updateUS(us.id, { soThat: e.target.value })} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acceptance Criteria</label>
                    <button
                      onClick={() => addAC(us.id)}
                      className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Plus size={12} /> Add criterion
                    </button>
                  </div>
                  {us.criteria.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No criteria yet.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {us.criteria.map((ac, i) => (
                        <div key={ac.id} className="grid grid-cols-12 gap-2 items-start">
                          <span className="col-span-1 text-xs text-muted-foreground mt-2 text-right">AC-{i + 1}</span>
                          <AutoGrowTextarea className={inputClass + ' col-span-11 md:col-span-3'} minHeight={38} focusMinHeight={100} placeholder="Given…" value={ac.given} onChange={(e) => updateAC(us.id, ac.id, { given: e.target.value })} />
                          <AutoGrowTextarea className={inputClass + ' col-span-12 md:col-span-3 md:col-start-auto'} minHeight={38} focusMinHeight={100} placeholder="When…" value={ac.when} onChange={(e) => updateAC(us.id, ac.id, { when: e.target.value })} />
                          <AutoGrowTextarea className={inputClass + ' col-span-11 md:col-span-4'} minHeight={38} focusMinHeight={100} placeholder="Then…" value={ac.then} onChange={(e) => updateAC(us.id, ac.id, { then: e.target.value })} />
                          <button
                            onClick={() => removeAC(us.id, ac.id)}
                            className="col-span-1 justify-self-center text-muted-foreground hover:text-destructive transition-colors mt-2"
                            aria-label="Remove criterion"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}

// ── Requirements tab ───────────────────────────────────────────────

const MOSCOW: Array<{ value: MoscowPriority; label: string; style: React.CSSProperties }> = [
  { value: 'must',   label: 'Must',    style: { background: 'rgba(220,38,38,0.15)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)' } },
  { value: 'should', label: 'Should',  style: { background: 'rgba(234,88,12,0.15)', color: '#ea580c', border: '1px solid rgba(234,88,12,0.3)' } },
  { value: 'could',  label: 'Could',   style: { background: 'rgba(202,138,4,0.15)', color: '#ca8a04', border: '1px solid rgba(202,138,4,0.3)' } },
  { value: 'wont',   label: "Won't",   style: { background: 'rgba(107,114,128,0.15)', color: '#6b7280', border: '1px solid rgba(107,114,128,0.3)' } },
]

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
      return <p className="text-sm text-muted-foreground">None yet.</p>
    }
    return (
      <div className="flex flex-col gap-2">
        {reqs.map((r) => {
          const pri = MOSCOW.find((m) => m.value === r.priority)!
          return (
            <div
              key={r.id}
              className="grid grid-cols-12 gap-2 items-start p-3 rounded-md"
              style={{ background: 'var(--app-bg)', border: '1px solid var(--app-glass-border)' }}
            >
              <input
                className={inputClass + ' col-span-3 md:col-span-2 text-xs font-mono'}
                value={r.code}
                onChange={(e) => updateReq(r.id, { code: e.target.value })}
              />
              <AutoGrowTextarea
                className={inputClass + ' col-span-12 md:col-span-7'}
                minHeight={44}
                focusMinHeight={120}
                placeholder="Description"
                value={r.description}
                onChange={(e) => updateReq(r.id, { description: e.target.value })}
              />
              <select
                className={inputClass + ' col-span-8 md:col-span-2'}
                value={r.priority}
                onChange={(e) => updateReq(r.id, { priority: e.target.value as MoscowPriority })}
                style={pri.style}
              >
                {MOSCOW.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <button
                onClick={() => removeReq(r.id)}
                className="col-span-1 justify-self-center text-muted-foreground hover:text-destructive transition-colors mt-2"
                aria-label="Remove requirement"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <SectionCard
        title="Functional Requirements"
        subtitle="What the system must do. Prioritised with MoSCoW."
        action={
          <button
            onClick={() => addReq('functional')}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-opacity hover:opacity-90"
            style={{ background: 'var(--app-btn-primary)', color: 'var(--app-btn-text)' }}
          >
            <Plus size={13} /> Add FR
          </button>
        }
      >
        {renderList('functional')}
      </SectionCard>
      <SectionCard
        title="Non-Functional Requirements"
        subtitle="Performance, security, usability, reliability constraints."
        action={
          <button
            onClick={() => addReq('non-functional')}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-opacity hover:opacity-90"
            style={{ background: 'var(--app-btn-primary)', color: 'var(--app-btn-text)' }}
          >
            <Plus size={13} /> Add NFR
          </button>
        }
      >
        {renderList('non-functional')}
      </SectionCard>
    </>
  )
}

// ── Process Flows tab ──────────────────────────────────────────────

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
        <button
          onClick={addPF}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-opacity hover:opacity-90"
          style={{ background: 'var(--app-btn-primary)', color: 'var(--app-btn-text)' }}
        >
          <Plus size={13} /> Add Flow
        </button>
      }
    >
      {story.processFlows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No process flows yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {story.processFlows.map((pf) => (
            <div
              key={pf.id}
              className="p-4 rounded-lg"
              style={{ background: 'var(--app-bg)', border: '1px solid var(--app-glass-border)' }}
            >
              <div className="flex items-start gap-2 mb-3">
                <AutoGrowTextarea
                  className={inputClass + ' flex-1 font-semibold'}
                  minHeight={38}
                  focusMinHeight={100}
                  placeholder="Flow name (e.g. New user onboarding)"
                  value={pf.name}
                  onChange={(e) => updatePF(pf.id, { name: e.target.value })}
                />
                <button
                  onClick={() => removePF(pf.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 mt-2"
                  aria-label="Remove flow"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <AutoGrowTextarea
                className={textareaClass + ' mb-3'}
                placeholder="Describe the flow — trigger, happy path, alternate paths…"
                value={pf.description}
                onChange={(e) => updatePF(pf.id, { description: e.target.value })}
              />

              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Steps</label>
                <button
                  onClick={() => addStep(pf.id)}
                  className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus size={12} /> Add step
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {pf.steps.map((step, i) => (
                  <div key={step.id} className="grid grid-cols-12 gap-2 items-start">
                    <span className="col-span-1 text-xs text-muted-foreground text-right mt-2">{i + 1}.</span>
                    <AutoGrowTextarea
                      className={inputClass + ' col-span-4'}
                      minHeight={38}
                      focusMinHeight={100}
                      placeholder="Actor (e.g. User)"
                      value={step.actor}
                      onChange={(e) => updateStep(pf.id, step.id, { actor: e.target.value })}
                    />
                    <AutoGrowTextarea
                      className={inputClass + ' col-span-6'}
                      minHeight={38}
                      focusMinHeight={100}
                      placeholder="Action (e.g. Submits signup form)"
                      value={step.action}
                      onChange={(e) => updateStep(pf.id, step.id, { action: e.target.value })}
                    />
                    <button
                      onClick={() => removeStep(pf.id, step.id)}
                      className="col-span-1 justify-self-center text-muted-foreground hover:text-destructive transition-colors mt-2"
                      aria-label="Remove step"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
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
        <button
          onClick={addWF}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-opacity hover:opacity-90"
          style={{ background: 'var(--app-btn-primary)', color: 'var(--app-btn-text)' }}
        >
          <Plus size={13} /> Add Wireframe
        </button>
      }
    >
      {story.wireframes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No wireframes yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {story.wireframes.map((wf) => (
            <div
              key={wf.id}
              className="p-3 rounded-lg"
              style={{ background: 'var(--app-bg)', border: '1px solid var(--app-glass-border)' }}
            >
              <div className="flex items-start gap-2 mb-2">
                <AutoGrowTextarea
                  className={inputClass + ' flex-1 font-semibold'}
                  minHeight={38}
                  focusMinHeight={100}
                  placeholder="Wireframe name"
                  value={wf.name}
                  onChange={(e) => updateWF(wf.id, { name: e.target.value })}
                />
                <button
                  onClick={() => removeWF(wf.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 mt-2"
                  aria-label="Remove wireframe"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <input
                className={inputClass + ' mb-2 text-xs'}
                placeholder="Image URL (https://…)"
                value={wf.imageUrl}
                onChange={(e) => updateWF(wf.id, { imageUrl: e.target.value })}
              />
              {wf.imageUrl && (
                <div
                  className="mb-2 rounded-md overflow-hidden"
                  style={{ border: '1px solid var(--app-glass-border)', background: 'var(--app-glass)' }}
                >
                  <img
                    src={wf.imageUrl}
                    alt={wf.name || 'Wireframe'}
                    className="w-full h-auto max-h-64 object-contain"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
              )}
              <AutoGrowTextarea
                className={textareaClass + ' text-xs'}
                minHeight={60}
                focusMinHeight={160}
                placeholder="Notes about this wireframe…"
                value={wf.notes}
                onChange={(e) => updateWF(wf.id, { notes: e.target.value })}
              />
            </div>
          ))}
        </div>
      )}
    </SectionCard>
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

const RAID_TYPE_META: Record<RaidType, { label: string; style: React.CSSProperties }> = {
  risk:        { label: 'Risk',        style: { background: 'rgba(220,38,38,0.15)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)' } },
  assumption:  { label: 'Assumption',  style: { background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' } },
  issue:       { label: 'Issue',       style: { background: 'rgba(234,88,12,0.15)', color: '#ea580c', border: '1px solid rgba(234,88,12,0.3)' } },
  dependency:  { label: 'Dependency',  style: { background: 'rgba(168,85,247,0.15)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)' } },
}

const RAID_IMPACT: Array<{ value: RaidImpact; label: string }> = [
  { value: 'low',    label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High' },
]

const RAID_STATUS: Array<{ value: RaidStatus; label: string }> = [
  { value: 'open',      label: 'Open' },
  { value: 'mitigated', label: 'Mitigated' },
  { value: 'closed',    label: 'Closed' },
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
        <div className="flex items-center gap-1.5 flex-wrap">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => addRaid(t)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-opacity hover:opacity-90"
              style={RAID_TYPE_META[t].style}
            >
              <Plus size={11} /> {RAID_TYPE_META[t].label}
            </button>
          ))}
        </div>
      }
    >
      {story.raid.length === 0 ? (
        <p className="text-sm text-muted-foreground">No entries yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {types.map((type) => {
            const items = grouped[type]
            if (items.length === 0) return null
            const meta = RAID_TYPE_META[type]
            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={meta.style}>{meta.label}</span>
                  <span className="text-xs text-muted-foreground">({items.length})</span>
                </div>
                <div className="flex flex-col gap-2">
                  {items.map((r) => (
                    <div
                      key={r.id}
                      className="grid grid-cols-12 gap-2 items-start p-3 rounded-md"
                      style={{ background: 'var(--app-bg)', border: '1px solid var(--app-glass-border)' }}
                    >
                      <AutoGrowTextarea
                        className={inputClass + ' col-span-12 md:col-span-5'}
                        minHeight={44}
                        focusMinHeight={120}
                        placeholder="Description"
                        value={r.description}
                        onChange={(e) => updateRaid(r.id, { description: e.target.value })}
                      />
                      <AutoGrowTextarea
                        className={inputClass + ' col-span-6 md:col-span-3 text-xs'}
                        minHeight={38}
                        focusMinHeight={100}
                        placeholder="Owner"
                        value={r.owner}
                        onChange={(e) => updateRaid(r.id, { owner: e.target.value })}
                      />
                      <select
                        className={inputClass + ' col-span-3 md:col-span-1 text-xs'}
                        value={r.impact}
                        onChange={(e) => updateRaid(r.id, { impact: e.target.value as RaidImpact })}
                      >
                        {RAID_IMPACT.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
                      </select>
                      <select
                        className={inputClass + ' col-span-2 md:col-span-2 text-xs'}
                        value={r.status}
                        onChange={(e) => updateRaid(r.id, { status: e.target.value as RaidStatus })}
                      >
                        {RAID_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                      <button
                        onClick={() => removeRaid(r.id)}
                        className="col-span-1 justify-self-center text-muted-foreground hover:text-destructive transition-colors mt-2"
                        aria-label="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
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
        <div ref={addWrapperRef} className="relative">
          <button
            type="button"
            onClick={() => setAddOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-opacity hover:opacity-90"
            style={{ background: 'var(--app-btn-primary)', color: 'var(--app-btn-text)' }}
          >
            <Plus size={13} /> Add note
            <ChevronDown size={12} className={`opacity-70 transition-transform ${addOpen ? 'rotate-180' : ''}`} />
          </button>
          {addOpen && (
            <div
              className="absolute right-0 top-full mt-2 z-50 w-52 rounded-xl overflow-hidden"
              style={{
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                background: 'var(--app-overlay)',
                border: '1px solid var(--app-overlay-border)',
                backdropFilter: 'blur(16px)',
              }}
            >
              {NOTE_CATEGORIES.map((cat) => {
                const meta = NOTE_CATEGORY_META[cat]
                return (
                  <button
                    key={cat}
                    type="button"
                    onMouseDown={() => addEntry(cat)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors"
                    style={{ color: 'var(--app-text)', borderBottom: '1px solid var(--app-glass-border)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--app-glass)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <span
                      className="inline-flex items-center justify-center rounded-md flex-shrink-0"
                      style={{ background: meta.bg, color: meta.color, width: 24, height: 24 }}
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
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {chips.map((chip) => {
            const active = filter === chip.key
            const count = counts[chip.key] ?? 0
            return (
              <button
                key={chip.key}
                onClick={() => setFilter(chip.key)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  background: active ? chip.color : 'var(--app-glass)',
                  color: active ? '#fff' : 'var(--app-text-secondary)',
                  border: `1px solid ${active ? chip.color : 'var(--app-glass-border)'}`,
                }}
              >
                {chip.icon}
                {chip.label}
                <span
                  className="px-1.5 rounded-full text-[10px] leading-[16px]"
                  style={{
                    background: active ? 'rgba(255,255,255,0.22)' : 'var(--app-bg)',
                    color: active ? '#fff' : 'var(--app-text-secondary)',
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
          className="rounded-xl p-8 text-center"
          style={{ background: 'var(--app-bg)', border: '1px dashed var(--app-glass-border)' }}
        >
          <StickyNote size={28} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">
            {entries.length === 0
              ? 'No notes yet. Click "Add note" to capture a meeting, question, decision, or follow-up.'
              : `No ${NOTE_CATEGORY_META[filter as NoteCategory].label.toLowerCase()} notes yet.`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((entry) => {
            const meta = NOTE_CATEGORY_META[entry.category]
            return (
              <div
                key={entry.id}
                className="rounded-xl"
                style={{
                  background: 'var(--app-bg)',
                  border: '1px solid var(--app-glass-border)',
                  borderLeft: `3px solid ${meta.color}`,
                }}
              >
                <div className="flex items-start gap-2 px-3 pt-3">
                  <select
                    value={entry.category}
                    onChange={(e) => updateEntry(entry.id, { category: e.target.value as NoteCategory })}
                    className="text-xs font-semibold px-2 py-1 rounded-md border-0 focus:outline-none cursor-pointer flex-shrink-0"
                    style={{ background: meta.bg, color: meta.color }}
                    title="Change category"
                  >
                    {NOTE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{NOTE_CATEGORY_META[c].label}</option>
                    ))}
                  </select>

                  <input
                    className="flex-1 bg-transparent text-sm font-semibold border-0 focus:outline-none placeholder:text-muted-foreground px-1 py-1 min-w-0"
                    placeholder="Title…"
                    value={entry.title}
                    onChange={(e) => updateEntry(entry.id, { title: e.target.value })}
                    style={{ color: 'var(--app-text)' }}
                  />

                  <span className="text-[11px] text-muted-foreground flex-shrink-0 mt-1.5 whitespace-nowrap">
                    {noteRelTime(entry.createdAt)}
                  </span>

                  <button
                    onClick={() => removeEntry(entry.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 mt-1.5"
                    aria-label="Delete note"
                    title="Delete note"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="px-3 pb-3 pt-2">
                  {editingId === entry.id ? (
                    <AutoGrowTextarea
                      className={textareaClass}
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
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingId(entry.id)}
                      className="w-full text-left rounded-md px-3 py-2.5 transition-colors cursor-text"
                      style={{
                        background: 'var(--app-glass)',
                        border: '1px solid var(--app-glass-border)',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--app-overlay)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--app-glass)' }}
                      title="Click to edit"
                    >
                      {entry.content.trim() ? (
                        <NoteBodyDisplay text={entry.content} />
                      ) : (
                        <span className="text-sm italic" style={{ color: 'var(--app-text-secondary)' }}>
                          Click to add details…
                        </span>
                      )}
                    </button>
                  )}
                </div>
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
  const [tab, setTab] = useState<TabKey>('overview')
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

  const progressPct = computeStoryProgress(draft)
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
            disabled={!dirty && !saved}
            style={!dirty && !saved ? { opacity: 0.55, cursor: 'default' } : undefined}
          >
            <Save size={14} />
            {saved ? 'Saved' : dirty ? 'Save' : 'Saved'}
          </Button>
        </div>
      </div>

      {/* Count tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12, marginBottom: 22 }}>
        <CountTile icon="file-text" gradient="grad-pink" label="User stories" value={counts.userStories} />
        <CountTile icon="layers" gradient="grad-blue" label="Requirements" value={counts.requirements} />
        <CountTile icon="branch" gradient="grad-green" label="Flows" value={counts.flows} />
        <CountTile icon="target" gradient="grad-orange" label="RTM" value={counts.rtm} />
        <CountTile icon="alert" gradient="grad-red" label="RAID" value={counts.raid} />
      </div>

      {/* Progress strip */}
      <ProgressStrip
        progressPct={progressPct}
        manual={draft.manualProgress ?? null}
        onManualChange={(v) => set({ manualProgress: v })}
        updatedAt={draft.updatedAt}
        attachmentCount={draft.attachments?.length ?? 0}
      />

      {/* Tabs */}
      <div style={{ marginBottom: 22, overflowX: 'auto', paddingBottom: 4 }}>
        <Segmented
          variant="gradient"
          value={tab}
          onChange={(v) => setTab(v as TabKey)}
          options={TABS.map((t) => ({ value: t.key, label: t.label, icon: TAB_ICON[t.key] }))}
        />
      </div>

      {/* Tab content */}
      {tab === 'overview'      && <OverviewTab      story={draft} set={set} />}
      {tab === 'user-stories'  && <UserStoriesTab   story={draft} set={set} onGenerateSuite={() => setSuiteConfirmOpen(true)} suiteGenerating={suiteGenerating} />}
      {tab === 'requirements'  && <RequirementsTab  story={draft} set={set} />}
      {tab === 'process-flows' && <ProcessFlowsTab  story={draft} set={set} />}
      {tab === 'wireframes'    && <WireframesTab    story={draft} set={set} />}
      {tab === 'rtm'           && <RtmTab           story={draft} set={set} />}
      {tab === 'raid'          && <RaidTab          story={draft} set={set} />}
      {tab === 'notes'         && <NotesTab         story={draft} set={set} />}

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

const TAB_ICON: Record<TabKey, IconName> = {
  overview: 'target',
  'user-stories': 'file-text',
  requirements: 'layers',
  'process-flows': 'branch',
  wireframes: 'grid',
  rtm: 'link',
  raid: 'alert',
  notes: 'edit',
}

function CountTile({
  icon, gradient, label, value,
}: {
  icon: IconName
  gradient: 'grad-purple' | 'grad-pink' | 'grad-blue' | 'grad-green' | 'grad-orange' | 'grad-red'
  label: string
  value: number
}) {
  // grad-red falls back to grad-orange if the theme doesn't define it
  const gradClass = gradient === 'grad-red' ? 'grad-orange' : gradient
  return (
    <div
      className="panel"
      style={{
        position: 'relative', overflow: 'hidden',
        padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          className={`section-icon ${gradClass}`}
          style={{ width: 28, height: 28, borderRadius: 8, display: 'inline-grid', placeItems: 'center', color: 'white' }}
        >
          <StoryTileIcon name={icon} />
        </span>
        <span style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value}
      </div>
    </div>
  )
}

function StoryTileIcon({ name }: { name: IconName }) {
  const map: Record<IconName, React.ReactNode> = {
    users: <Users size={14} />,
    'file-text': <FileText size={14} />,
    layers: <ListTree size={14} />,
    branch: <GitBranch size={14} />,
    target: <Target size={14} />,
    alert: <AlertTriangle size={14} />,
    check: <CheckCircle2 size={14} />,
    x: <X size={14} />,
    clock: <Clock size={14} />,
    calendar: <Clock size={14} />,
    flag: <Clock size={14} />,
    clipboard: <FileText size={14} />,
    tag: <FileText size={14} />,
    search: <HelpCircle size={14} />,
    filter: <HelpCircle size={14} />,
    sort: <HelpCircle size={14} />,
    more: <HelpCircle size={14} />,
    plus: <Plus size={14} />,
    'arrow-right': <ChevronRight size={14} />,
    'chevron-down': <ChevronDown size={14} />,
    'chevron-right': <ChevronRight size={14} />,
    folder: <FolderOpen size={14} />,
    book: <FileText size={14} />,
    'trend-up': <Target size={14} />,
    bell: <HelpCircle size={14} />,
    moon: <HelpCircle size={14} />,
    sun: <HelpCircle size={14} />,
    edit: <StickyNote size={14} />,
    link: <Network size={14} />,
    play: <Sparkles size={14} />,
    'check-circle': <CheckCircle2 size={14} />,
    'x-circle': <X size={14} />,
    sparkles: <Sparkles size={14} />,
    home: <HelpCircle size={14} />,
    grid: <ImageIcon size={14} />,
    list: <ListTree size={14} />,
    split: <HelpCircle size={14} />,
    user: <Users size={14} />,
    eye: <HelpCircle size={14} />,
  }
  return <>{map[name] ?? <HelpCircle size={14} />}</>
}

function computeStoryProgress(s: Story): number {
  if (typeof s.manualProgress === 'number') {
    return Math.max(0, Math.min(100, Math.round(s.manualProgress)))
  }
  const done = s.userStories.filter((u) => u.status === 'done').length
  const verified = s.rtm.filter((r) => r.status === 'verified').length
  const totalItems = s.userStories.length + s.rtm.length
  if (totalItems === 0) return 0
  return Math.round(((done + verified) / totalItems) * 100)
}

function formatUpdated(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getMonth()]} ${d.getDate()}`
}

function ProgressStrip({
  progressPct,
  manual,
  onManualChange,
  updatedAt,
  attachmentCount,
}: {
  progressPct: number
  manual: number | null
  onManualChange: (v: number | null) => void
  updatedAt: string | undefined
  attachmentCount: number
}) {
  const isManual = typeof manual === 'number'
  const displayValue = isManual ? Math.max(0, Math.min(100, manual!)) : progressPct

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
      <Ring value={displayValue} size={42} stroke={4} color="var(--purple)" />
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 2 }}>
              Progress
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink)', fontFamily: "'JetBrains Mono', monospace" }}>
              {displayValue}%
              <span style={{ fontSize: 13, color: 'var(--mute)', fontWeight: 500 }}> complete</span>
              <span
                style={{
                  marginLeft: 10, fontSize: 11, fontWeight: 600,
                  color: isManual ? 'var(--purple)' : 'var(--mute)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  fontFamily: 'inherit',
                }}
              >
                {isManual ? 'Manual' : 'Auto'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onManualChange(isManual ? null : progressPct)}
            style={{
              fontSize: 12, fontWeight: 500, color: 'var(--mute)',
              background: 'transparent', border: '1px solid var(--border)',
              padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
            }}
          >
            {isManual ? 'Use auto-computed' : 'Set manually'}
          </button>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={displayValue}
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
