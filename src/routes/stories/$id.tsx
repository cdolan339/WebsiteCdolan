import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ArrowLeft, Save, Plus, X, Trash2, Sparkles, Target, FileText, ListTree,
  GitBranch, Image as ImageIcon, Network, AlertTriangle, StickyNote, ChevronRight,
} from 'lucide-react'
import {
  useStory, updateStory,
  createStakeholder, createUserStory, createAcceptanceCriterion, createRequirement,
  createProcessFlow, createProcessStep, createWireframe, createRtmEntry, createRaidEntry,
  type Story, type StoryStatus, type Stakeholder, type UserStory, type AcceptanceCriterion,
  type Requirement, type ProcessFlow, type ProcessFlowStep, type Wireframe,
  type RtmEntry, type RaidEntry, type RaidType, type UserStoryPriority,
  type UserStoryStatus, type RequirementType, type MoscowPriority, type RaciRole,
  type RtmStatus, type RaidImpact, type RaidStatus,
} from '@/lib/stories'
import { AIFillStoryPanel, type AIStoryFillResult } from '@/components/AIFillStoryPanel'
import { LoadingCurtain } from '@/components/LoadingCurtain'

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
const textareaClass = inputClass + ' resize-y min-h-[80px]'

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

// ── Overview tab ───────────────────────────────────────────────────

function OverviewTab({ story, set }: { story: Story; set: (patch: Partial<Story>) => void }) {
  const updateStakeholder = (id: string, patch: Partial<Stakeholder>) => {
    set({ stakeholders: story.stakeholders.map((s) => s.id === id ? { ...s, ...patch } : s) })
  }
  const removeStakeholder = (id: string) => {
    set({ stakeholders: story.stakeholders.filter((s) => s.id !== id) })
  }
  const addStakeholder = () => set({ stakeholders: [...story.stakeholders, createStakeholder()] })

  return (
    <>
      <SectionCard title="Business Case" subtitle="Why this project matters — problem statement and expected outcomes.">
        <textarea
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

      <SectionCard
        title="Stakeholders (RACI)"
        subtitle="Responsible, Accountable, Consulted, Informed"
        action={
          <button
            onClick={addStakeholder}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-opacity hover:opacity-90"
            style={{ background: 'var(--app-btn-primary)', color: 'var(--app-btn-text)' }}
          >
            <Plus size={13} /> Add
          </button>
        }
      >
        {story.stakeholders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No stakeholders yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {story.stakeholders.map((sh) => (
              <div
                key={sh.id}
                className="grid grid-cols-12 gap-2 items-center p-3 rounded-md"
                style={{ background: 'var(--app-bg)', border: '1px solid var(--app-glass-border)' }}
              >
                <input
                  className={inputClass + ' col-span-12 md:col-span-4'}
                  placeholder="Name"
                  value={sh.name}
                  onChange={(e) => updateStakeholder(sh.id, { name: e.target.value })}
                />
                <input
                  className={inputClass + ' col-span-8 md:col-span-5'}
                  placeholder="Role (e.g. Product Owner)"
                  value={sh.role}
                  onChange={(e) => updateStakeholder(sh.id, { role: e.target.value })}
                />
                <select
                  className={inputClass + ' col-span-3 md:col-span-2'}
                  value={sh.raci}
                  onChange={(e) => updateStakeholder(sh.id, { raci: e.target.value as RaciRole })}
                >
                  <option value="R">R</option>
                  <option value="A">A</option>
                  <option value="C">C</option>
                  <option value="I">I</option>
                </select>
                <button
                  onClick={() => removeStakeholder(sh.id)}
                  className="col-span-1 justify-self-center text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Remove stakeholder"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
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

function UserStoriesTab({ story, set }: { story: Story; set: (patch: Partial<Story>) => void }) {
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
        <button
          onClick={addUS}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-opacity hover:opacity-90"
          style={{ background: 'var(--app-btn-primary)', color: 'var(--app-btn-text)' }}
        >
          <Plus size={13} /> Add Story
        </button>
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
                    <input className={inputClass} placeholder="role" value={us.asA} onChange={(e) => updateUS(us.id, { asA: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-muted-foreground">I want</label>
                    <input className={inputClass} placeholder="goal" value={us.iWant} onChange={(e) => updateUS(us.id, { iWant: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-muted-foreground">So that</label>
                    <input className={inputClass} placeholder="benefit" value={us.soThat} onChange={(e) => updateUS(us.id, { soThat: e.target.value })} />
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
                          <input className={inputClass + ' col-span-11 md:col-span-3'} placeholder="Given…" value={ac.given} onChange={(e) => updateAC(us.id, ac.id, { given: e.target.value })} />
                          <input className={inputClass + ' col-span-12 md:col-span-3 md:col-start-auto'} placeholder="When…" value={ac.when} onChange={(e) => updateAC(us.id, ac.id, { when: e.target.value })} />
                          <input className={inputClass + ' col-span-11 md:col-span-4'} placeholder="Then…" value={ac.then} onChange={(e) => updateAC(us.id, ac.id, { then: e.target.value })} />
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
              <textarea
                className={inputClass + ' col-span-12 md:col-span-7 resize-y min-h-[44px]'}
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
              <div className="flex items-center gap-2 mb-3">
                <input
                  className={inputClass + ' flex-1 font-semibold'}
                  placeholder="Flow name (e.g. New user onboarding)"
                  value={pf.name}
                  onChange={(e) => updatePF(pf.id, { name: e.target.value })}
                />
                <button
                  onClick={() => removePF(pf.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                  aria-label="Remove flow"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <textarea
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
                  <div key={step.id} className="grid grid-cols-12 gap-2 items-center">
                    <span className="col-span-1 text-xs text-muted-foreground text-right">{i + 1}.</span>
                    <input
                      className={inputClass + ' col-span-4'}
                      placeholder="Actor (e.g. User)"
                      value={step.actor}
                      onChange={(e) => updateStep(pf.id, step.id, { actor: e.target.value })}
                    />
                    <input
                      className={inputClass + ' col-span-6'}
                      placeholder="Action (e.g. Submits signup form)"
                      value={step.action}
                      onChange={(e) => updateStep(pf.id, step.id, { action: e.target.value })}
                    />
                    <button
                      onClick={() => removeStep(pf.id, step.id)}
                      className="col-span-1 justify-self-center text-muted-foreground hover:text-destructive transition-colors"
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
              <div className="flex items-center gap-2 mb-2">
                <input
                  className={inputClass + ' flex-1 font-semibold'}
                  placeholder="Wireframe name"
                  value={wf.name}
                  onChange={(e) => updateWF(wf.id, { name: e.target.value })}
                />
                <button
                  onClick={() => removeWF(wf.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
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
              <textarea
                className={textareaClass + ' text-xs'}
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
                      <textarea
                        className={inputClass + ' col-span-12 md:col-span-5 resize-y min-h-[44px]'}
                        placeholder="Description"
                        value={r.description}
                        onChange={(e) => updateRaid(r.id, { description: e.target.value })}
                      />
                      <input
                        className={inputClass + ' col-span-6 md:col-span-3 text-xs'}
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

function NotesTab({ story, set }: { story: Story; set: (patch: Partial<Story>) => void }) {
  return (
    <SectionCard title="Notes" subtitle="Free-form space for meeting notes, questions, decisions, follow-ups.">
      <textarea
        className={textareaClass + ' min-h-[300px]'}
        placeholder="Capture anything relevant…"
        value={story.notes}
        onChange={(e) => set({ notes: e.target.value })}
      />
    </SectionCard>
  )
}

// ── Main component ─────────────────────────────────────────────────

function StoryDetail() {
  const { id } = Route.useParams()
  const { story, ready } = useStory(id)
  const [draft, setDraft] = useState<Story | null>(null)
  const [tab, setTab] = useState<TabKey>('overview')
  const [saved, setSaved] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (story && !draft) setDraft(story)
  }, [story, draft])

  const dirty = !!draft && !!story && JSON.stringify(draft) !== JSON.stringify(story)

  const set = useCallback((patch: Partial<Story>) => {
    setDraft((d) => d ? { ...d, ...patch } : d)
  }, [])

  const save = useCallback(() => {
    if (!draft) return
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

      const newStakeholders: Stakeholder[] = (r.stakeholders ?? []).map((s) => ({
        ...createStakeholder(),
        name: s.name ?? '',
        role: s.role ?? '',
        raci: s.raci ?? 'R',
      }))

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
        stakeholders: [...d.stakeholders, ...newStakeholders],
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--app-bg)' }}>
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Story not found.</p>
          <Link
            to="/stories"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: 'var(--app-btn-primary)', color: 'var(--app-btn-text)' }}
          >
            <ArrowLeft size={14} /> Back to Stories
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-foreground relative" style={{ background: 'var(--app-bg)', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-2 text-sm mb-4 flex-wrap">
          <Link
            to="/stories"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-opacity hover:opacity-90"
            style={{ background: 'var(--app-btn-primary)', color: 'var(--app-btn-text)', boxShadow: '0 2px 12px var(--app-btn-primary-shadow)' }}
          >
            <ArrowLeft size={12} /> Back to Stories
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground truncate">{draft.title || 'Untitled Story'}</span>
        </div>

        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 mb-2 text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: 'var(--app-accent-bg)', color: 'var(--app-accent-color)', border: '1px solid var(--app-glass-border)' }}>
              <Sparkles size={11} /> BA Story
            </div>
            <input
              className="w-full text-3xl font-bold bg-transparent outline-none border-0 focus:ring-0 mb-2"
              placeholder="Story title"
              value={draft.title}
              onChange={(e) => set({ title: e.target.value })}
            />
            <input
              className="w-full text-base bg-transparent outline-none border-0 focus:ring-0 text-muted-foreground"
              placeholder="Short summary — one sentence about what this story delivers"
              value={draft.summary}
              onChange={(e) => set({ summary: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setAiOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition-opacity hover:opacity-90"
              style={{ background: 'var(--app-btn-primary)', color: 'var(--app-btn-text)', boxShadow: '0 2px 12px var(--app-btn-primary-shadow)' }}
            >
              <Sparkles size={14} /> AI Generate
            </button>
            <select
              className={inputClass + ' text-xs'}
              value={draft.status}
              onChange={(e) => set({ status: e.target.value as StoryStatus })}
            >
              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button
              onClick={save}
              disabled={!dirty && !saved}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all"
              style={{
                background: dirty ? 'var(--app-btn-primary)' : 'var(--app-glass)',
                color: dirty ? 'var(--app-btn-text)' : 'var(--app-text-secondary)',
                border: dirty ? 'none' : '1px solid var(--app-glass-border)',
                opacity: !dirty && !saved ? 0.6 : 1,
                cursor: !dirty && !saved ? 'default' : 'pointer',
              }}
            >
              <Save size={14} />
              {saved ? 'Saved' : dirty ? 'Save' : 'Saved'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 mb-6 p-1 rounded-lg overflow-x-auto"
          style={{ background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)' }}
        >
          {TABS.map((t) => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all whitespace-nowrap"
                style={active ? {
                  background: 'var(--app-btn-primary)',
                  color: 'var(--app-btn-text)',
                  boxShadow: `0 2px 12px var(--app-btn-primary-shadow)`,
                } : {
                  background: 'transparent',
                  color: 'var(--app-text-secondary)',
                }}
              >
                {t.icon}
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        {tab === 'overview'      && <OverviewTab      story={draft} set={set} />}
        {tab === 'user-stories'  && <UserStoriesTab   story={draft} set={set} />}
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

        {/* Sticky footer save hint */}
        {dirty && (
          <div
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium"
            style={{ background: 'var(--app-overlay)', border: '1px solid var(--app-overlay-border)', backdropFilter: 'blur(12px)', color: 'var(--app-text)' }}
          >
            Unsaved changes
            <button
              onClick={save}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-opacity hover:opacity-90"
              style={{ background: 'var(--app-btn-primary)', color: 'var(--app-btn-text)' }}
            >
              <Save size={11} /> Save
              <ChevronRight size={11} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
