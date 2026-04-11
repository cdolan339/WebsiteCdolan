import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useProjects, createProject, updateProject, deleteProject, type Project, type CreateProjectPayload } from '@/lib/projects'
import { useHasPermission } from '@/lib/permissions'
import { Badge } from '@/components/ui/badge'
import { LoadingCurtain } from '@/components/LoadingCurtain'
import { useState } from 'react'
import {
  Plus, Pencil, Trash2, Calendar, Clock, FolderOpen, X, ChevronRight,
} from 'lucide-react'

export const Route = createFileRoute('/projects/')({
  component: ProjectsPage,
})

// NOTE: TanStack file-based routing will auto-correct the route path on dev server start

// ── Create / Edit modal ───────────────────────────────────────────────────────

type ProjectFormData = {
  name: string
  description: string
  tags: string[]
  timelineStart: string
  timelineEnd: string
  deadline: string
}

function ProjectFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Project
  onSave: (data: ProjectFormData) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<ProjectFormData>({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    tags: initial?.tags ?? [],
    timelineStart: initial?.timelineStart ?? '',
    timelineEnd: initial?.timelineEnd ?? '',
    deadline: initial?.deadline ?? '',
  })
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleAddTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !form.tags.includes(trimmed)) {
      setForm((f) => ({ ...f, tags: [...f.tags, trimmed] }))
    }
    setTagInput('')
  }

  const handleRemoveTag = (tag: string) => {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }))
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('Project name is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(form)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--app-glass)',
    border: '1px solid var(--app-glass-border)',
    color: '#fff',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl p-6 relative"
        style={{
          background: 'var(--app-overlay)',
          border: '1px solid var(--app-glass-border)',
          boxShadow: '0 16px 64px rgba(0,0,0,0.5)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded hover:bg-white/10 transition-colors"
        >
          <X size={18} className="text-white/50" />
        </button>

        <h2 className="text-xl font-bold mb-6">
          {initial ? 'Edit Project' : 'Create New Project'}
        </h2>

        {error && (
          <div className="mb-4 px-4 py-2 rounded-lg text-sm" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Project Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Sprint 12 Regression"
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/30"
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief project description..."
              rows={3}
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none focus:ring-1 focus:ring-white/30"
              style={inputStyle}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Tags</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {form.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)' }}
                >
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="hover:text-white">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }}
                placeholder="Add a tag..."
                className="flex-1 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-white/30"
                style={inputStyle}
              />
              <button
                onClick={handleAddTag}
                className="px-3 py-2 rounded-lg text-xs font-medium"
                style={{ background: 'var(--app-glass)', color: 'var(--app-text-secondary)', border: '1px solid var(--app-glass-border)' }}
              >
                Add
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Timeline Start</label>
              <input
                type="date"
                value={form.timelineStart}
                onChange={(e) => setForm((f) => ({ ...f, timelineStart: e.target.value }))}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/30"
                style={{ ...inputStyle, colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Timeline End</label>
              <input
                type="date"
                value={form.timelineEnd}
                onChange={(e) => setForm((f) => ({ ...f, timelineEnd: e.target.value }))}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/30"
                style={{ ...inputStyle, colorScheme: 'dark' }}
              />
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Deadline</label>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/30"
              style={{ ...inputStyle, colorScheme: 'dark' }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'var(--app-glass)', color: 'var(--app-text-secondary)', border: '1px solid var(--app-glass-border)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--app-btn-primary)', color: 'var(--app-text)' }}
          >
            {saving ? 'Saving...' : initial ? 'Save Changes' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete confirmation ───────────────────────────────────────────────────────

function DeleteConfirmModal({
  project,
  onConfirm,
  onClose,
}: {
  project: Project
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl p-6"
        style={{
          background: 'var(--app-overlay)',
          border: '1px solid var(--app-glass-border)',
          boxShadow: '0 16px 64px rgba(0,0,0,0.5)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold mb-2">Delete Project</h3>
        <p className="text-sm text-white/60 mb-6">
          Are you sure you want to delete <strong className="text-white">"{project.name}"</strong>? All test cases in this project will also be deleted. This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'var(--app-glass)', color: 'var(--app-text-secondary)', border: '1px solid var(--app-glass-border)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Project tile ──────────────────────────────────────────────────────────────

function ProjectTile({
  project,
  canEdit,
  onEdit,
  onDelete,
}: {
  project: Project
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const navigate = useNavigate()
  const isOverdue = project.deadline && new Date(project.deadline) < new Date()
  const daysUntilDeadline = project.deadline
    ? Math.ceil((new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div
      className="rounded-xl overflow-hidden transition-all hover:scale-[1.02] cursor-pointer group"
      style={{
        background: 'var(--app-glass)',
        border: '1px solid var(--app-glass-border)',
        backdropFilter: 'blur(10px)',
      }}
      onClick={() => navigate({ to: '/projects/$id', params: { id: String(project.id) } })}
    >
      {/* Header bar */}
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{
          background: 'var(--app-section-header-bg)',
          borderBottom: '1px solid var(--app-glass-border)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <FolderOpen size={16} className="text-white/50 flex-shrink-0" />
          <h3 className="font-semibold text-white truncate">{project.name}</h3>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {canEdit && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit() }}
                className="p-1.5 rounded-md hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                title="Edit project"
              >
                <Pencil size={14} className="text-white/50" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                className="p-1.5 rounded-md hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                title="Delete project"
              >
                <Trash2 size={14} className="text-white/50" />
              </button>
            </>
          )}
          <ChevronRight size={16} className="text-white/30" />
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-3">
        {project.description && (
          <p className="text-sm text-white/60 line-clamp-2">{project.description}</p>
        )}

        {/* Tags */}
        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {project.tags.slice(0, 5).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
            {project.tags.length > 5 && (
              <span className="text-xs text-white/40">+{project.tags.length - 5} more</span>
            )}
          </div>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-white/40">
          {/* Timeline */}
          {(project.timelineStart || project.timelineEnd) && (
            <span className="inline-flex items-center gap-1">
              <Clock size={12} />
              {project.timelineStart && new Date(project.timelineStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {project.timelineStart && project.timelineEnd && ' – '}
              {project.timelineEnd && new Date(project.timelineEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}

          {/* Deadline */}
          {project.deadline && (
            <span
              className="inline-flex items-center gap-1"
              style={isOverdue ? { color: '#f87171' } : daysUntilDeadline !== null && daysUntilDeadline <= 7 ? { color: '#fbbf24' } : {}}
            >
              <Calendar size={12} />
              Due {new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {isOverdue && <span className="font-medium">(overdue)</span>}
              {!isOverdue && daysUntilDeadline !== null && daysUntilDeadline <= 7 && (
                <span className="font-medium">({daysUntilDeadline}d left)</span>
              )}
            </span>
          )}

          {/* Created by */}
          {project.createdBy && (
            <span className="inline-flex items-center gap-1">
              Created by {project.createdBy}
            </span>
          )}
        </div>

        {/* Created date */}
        <div className="flex items-center gap-1 text-xs text-white/30">
          <Calendar size={11} />
          Created {new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

function ProjectsPage() {
  const { projects, loading } = useProjects()
  const canCreate = useHasPermission('STAFF_CREATE_PROJECT')
  const [showCreate, setShowCreate] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)

  const handleCreate = async (data: ProjectFormData) => {
    const payload: CreateProjectPayload = {
      name: data.name.trim(),
      description: data.description.trim(),
      tags: data.tags,
      timelineStart: data.timelineStart || null,
      timelineEnd: data.timelineEnd || null,
      deadline: data.deadline || null,
    }
    await createProject(payload)
  }

  const handleEdit = async (data: ProjectFormData) => {
    if (!editingProject) return
    await updateProject(editingProject.id, {
      name: data.name.trim(),
      description: data.description.trim(),
      tags: data.tags,
      timelineStart: data.timelineStart || null,
      timelineEnd: data.timelineEnd || null,
      deadline: data.deadline || null,
    })
  }

  const handleDelete = async () => {
    if (!deletingProject) return
    await deleteProject(deletingProject.id)
    setDeletingProject(null)
  }

  if (loading) {
    return <LoadingCurtain visible={true} message="Loading Projects" />
  }

  return (
    <div
      className="min-h-screen text-foreground overflow-hidden relative"
      style={{ background: 'var(--app-bg)', fontFamily: "'Poppins', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
        @keyframes movepr {
          from { transform: translate(-10%, -10%); }
          to   { transform: translate(20%, 20%); }
        }
        .blob-pr {
          position: absolute;
          border-radius: 50%;
          background: var(--app-accent-gradient);
          filter: blur(80px);
          opacity: 0.3;
          animation: movepr 20s infinite alternate;
          pointer-events: none;
        }
      `}</style>
      <div className="blob-pr" style={{ width: 400, height: 400, top: -100, left: -100 }} />
      <div className="blob-pr" style={{ width: 300, height: 300, bottom: -50, right: -50, animationDelay: "-5s" }} />

      <div className="max-w-4xl mx-auto px-4 py-12 relative z-10">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Projects</h1>
            <p className="text-muted-foreground text-lg">
              Overview of all QA projects. Click a project to see its test cases.
            </p>
          </div>
          {canCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium flex-shrink-0 mt-1 transition-opacity hover:opacity-90"
              style={{ background: 'var(--app-btn-primary)', color: 'var(--app-text)' }}
            >
              <Plus size={16} />
              New Project
            </button>
          )}
        </div>

        {projects.length === 0 ? (
          <div
            className="rounded-xl px-4 py-16 text-center"
            style={{ background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)' }}
          >
            <FolderOpen size={40} className="mx-auto mb-3 text-white/20" />
            <p className="text-muted-foreground">No projects yet.</p>
            {canCreate && (
              <p className="text-sm text-white/40 mt-1">Click "New Project" to create one.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => (
              <ProjectTile
                key={project.id}
                project={project}
                canEdit={canCreate}
                onEdit={() => setEditingProject(project)}
                onDelete={() => setDeletingProject(project)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <ProjectFormModal onSave={handleCreate} onClose={() => setShowCreate(false)} />
      )}
      {editingProject && (
        <ProjectFormModal
          initial={editingProject}
          onSave={handleEdit}
          onClose={() => setEditingProject(null)}
        />
      )}
      {deletingProject && (
        <DeleteConfirmModal
          project={deletingProject}
          onConfirm={handleDelete}
          onClose={() => setDeletingProject(null)}
        />
      )}
    </div>
  )
}
