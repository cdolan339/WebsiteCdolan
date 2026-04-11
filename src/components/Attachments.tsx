/**
 * Attachments
 *
 * Per-test-case file attachments (images, PDFs, docs).
 * Upload dialog with title, browse, and clipboard paste (images only).
 * Files can be viewed inline or downloaded after upload.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Paperclip, Upload, Trash2, X, FileText, File, Download, Eye, ClipboardPaste } from 'lucide-react'
import { api, apiUpload, attachmentUrl } from '@/lib/api'

type AttachmentMeta = {
  id: number
  filename: string
  mimetype: string
  size: number
  note: string
  created_at: string
}

type Props = {
  testCaseId: string
  readOnly?: boolean
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImage(mimetype: string) {
  return mimetype.startsWith('image/')
}

// ── Upload Dialog ─────────────────────────────────────────────────────────────

type UploadDialogProps = {
  onUpload: (file: File, title: string) => Promise<void>
  onClose: () => void
  uploading: boolean
}

function UploadDialog({ onUpload, onClose, uploading }: UploadDialogProps) {
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [pastedPreview, setPastedPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pasteAreaRef = useRef<HTMLDivElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setPastedPreview(null)
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        e.preventDefault()
        const f = item.getAsFile()
        if (f) {
          setFile(f)
          setPastedPreview(URL.createObjectURL(f))
          if (!title) setTitle('Pasted image')
        }
        return
      }
    }
  }

  const handleSubmit = async () => {
    if (!file) return
    await onUpload(file, title || file.name)
  }

  const canSubmit = file !== null && !uploading

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 120,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Dialog */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 121,
        background: 'var(--app-panel-bg)',
        border: '1px solid var(--app-panel-border)',
        borderRadius: '14px',
        padding: '28px',
        width: '420px',
        maxWidth: '92vw',
        boxShadow: '0 12px 48px rgba(0,0,0,0.4)',
        fontFamily: "'Poppins', sans-serif",
        color: 'var(--app-text)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '8px',
              background: 'var(--app-btn-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 12px var(--app-btn-primary-shadow)',
            }}>
              <Upload size={15} color="var(--app-text)" />
            </div>
            <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>Attach a file</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--app-text-secondary)', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* File select */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--app-text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
            File
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{
              flex: 1, padding: '8px 12px',
              background: 'var(--app-glass)',
              border: '1px solid var(--app-glass-border)',
              borderRadius: '8px',
              fontSize: '0.82rem',
              color: file ? 'var(--app-text)' : 'var(--app-text-secondary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {file ? file.name : 'Click Browse to select a file'}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '8px 16px', borderRadius: '8px',
                background: 'var(--app-btn-primary)',
                border: 'none', color: 'var(--app-text)',
                fontSize: '0.82rem', fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px var(--app-btn-primary-shadow)',
                flexShrink: 0,
              }}
            >
              Browse...
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,application/pdf,.doc,.docx,.txt"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>

        {/* Title */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--app-text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give this attachment a name..."
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'var(--app-glass)',
              border: '1px solid var(--app-glass-border)',
              borderRadius: '8px',
              color: 'var(--app-text)',
              fontSize: '0.82rem',
              outline: 'none',
              fontFamily: "'Poppins', sans-serif",
              boxSizing: 'border-box',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--app-input-focus-border)' }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--app-glass-border)' }}
          />
        </div>

        {/* Paste area — images only */}
        <div style={{ marginBottom: '18px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--app-text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
            Or paste from clipboard
          </label>
          <div
            ref={pasteAreaRef}
            onPaste={handlePaste}
            tabIndex={0}
            style={{
              padding: pastedPreview ? '8px' : '20px',
              background: 'var(--app-glass)',
              border: '1px dashed var(--app-glass-border)',
              borderRadius: '8px',
              textAlign: 'center',
              cursor: 'text',
              outline: 'none',
              minHeight: pastedPreview ? 'auto' : '60px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: '6px',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--app-input-focus-border)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--app-glass-border)' }}
          >
            {pastedPreview ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={pastedPreview} alt="Pasted" style={{ maxWidth: '100%', maxHeight: '120px', borderRadius: '6px' }} />
                <button
                  onClick={() => { setFile(null); setPastedPreview(null) }}
                  style={{
                    position: 'absolute', top: -6, right: -6,
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'rgba(220,38,38,0.9)', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={10} color="#fff" />
                </button>
              </div>
            ) : (
              <>
                <ClipboardPaste size={16} style={{ color: 'var(--app-text-secondary)' }} />
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--app-text-secondary)', lineHeight: 1.4 }}>
                  Click here and use Ctrl+V to paste an image
                </p>
              </>
            )}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.65rem', color: 'var(--app-text-secondary)' }}>
            Images only (JPEG, PNG, GIF, WebP)
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '10px', borderRadius: '8px',
              background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)',
              color: 'var(--app-text-secondary)', fontSize: '0.82rem', fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              flex: 2, padding: '10px', borderRadius: '8px',
              background: canSubmit
                ? 'var(--app-btn-primary)'
                : 'var(--app-glass)',
              border: 'none',
              color: canSubmit ? 'var(--app-text)' : 'var(--app-text-secondary)',
              fontSize: '0.82rem', fontWeight: 600,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: canSubmit ? '0 2px 16px var(--app-btn-primary-shadow)' : 'none',
            }}
          >
            <Paperclip size={13} />
            {uploading ? 'Uploading...' : 'Attach the file'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Main Attachments Component ────────────────────────────────────────────────

export function Attachments({ testCaseId, readOnly = false }: Props) {
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api<AttachmentMeta[]>(`/attachments/${testCaseId}`)
      setAttachments(data)
    } catch {
      // silently fail on load
    }
  }, [testCaseId])

  useEffect(() => { load() }, [load])

  const handleUpload = async (file: File, title: string) => {
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('files', file, title + (file.name.match(/\.[^.]+$/)?.[0] || ''))
      fd.append('note', title)
      const results = await apiUpload<AttachmentMeta[]>(`/attachments/${testCaseId}`, fd)
      setAttachments((prev) => [...prev, ...results])
      setDialogOpen(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setError(msg)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api(`/attachments/${testCaseId}/${id}`, { method: 'DELETE' })
      setAttachments((prev) => prev.filter((a) => a.id !== id))
      setConfirmDelete(null)
    } catch {
      setError('Failed to delete attachment')
    }
  }

  const handleDownload = (att: AttachmentMeta) => {
    const url = attachmentUrl(testCaseId, att.id)
    const a = document.createElement('a')
    a.href = url
    a.download = att.note || att.filename
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const images = attachments.filter((a) => isImage(a.mimetype))
  const docs = attachments.filter((a) => !isImage(a.mimetype))

  return (
    <div style={{ marginTop: '14px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: attachments.length > 0 ? '10px' : '0' }}>
        <Paperclip size={13} style={{ opacity: 0.6 }} />
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--app-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Attachments
        </span>
        {attachments.length > 0 && (
          <span style={{
            fontSize: '0.65rem', fontWeight: 600,
            background: 'var(--app-glass)', color: 'var(--app-text)',
            border: '1px solid var(--app-glass-border)',
            borderRadius: '10px', padding: '1px 7px',
          }}>
            {attachments.length}
          </span>
        )}
        <div style={{ flex: 1 }} />
        {!readOnly && (
          <button
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-semibold transition-opacity hover:opacity-90"
            style={{
              background: 'var(--app-btn-primary)',
              color: 'var(--app-text)',
              boxShadow: '0 2px 8px var(--app-btn-primary-shadow)',
            }}
          >
            <Upload size={11} /> Upload
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          marginBottom: '8px', padding: '6px 10px', borderRadius: '6px',
          background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)',
          color: '#fca5a5', fontSize: '0.75rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: 2 }}>
            <X size={11} />
          </button>
        </div>
      )}

      {/* Image grid */}
      {images.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
          gap: '8px',
          marginBottom: docs.length > 0 ? '10px' : 0,
        }}>
          {images.map((att) => (
            <div
              key={att.id}
              onClick={() => setLightbox(att.id)}
              style={{
                position: 'relative', borderRadius: '8px', overflow: 'hidden',
                border: '1px solid var(--app-glass-border)',
                background: 'rgba(0,0,0,0.15)',
                aspectRatio: '1',
                cursor: 'pointer',
              }}
            >
              <img
                src={attachmentUrl(testCaseId, att.id)}
                alt={att.note || att.filename}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {/* Hover overlay */}
              <div
                style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(transparent 30%, rgba(0,0,0,0.8))',
                  display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                  padding: '8px',
                  opacity: 0, transition: 'opacity 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0' }}
              >
                <span style={{ fontSize: '0.65rem', color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>
                  {att.note || att.filename}
                </span>
                <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>
                  {formatSize(att.size)}
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownload(att) }}
                    style={{
                      flex: 1, padding: '3px 0', borderRadius: '4px',
                      background: 'rgba(255,255,255,0.15)', border: 'none',
                      color: '#fff', fontSize: '0.6rem', fontWeight: 600,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
                    }}
                  >
                    <Download size={9} /> Save
                  </button>
                  {!readOnly && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(att.id) }}
                      style={{
                        padding: '3px 6px', borderRadius: '4px',
                        background: 'rgba(220,38,38,0.6)', border: 'none',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={9} color="#fff" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document list */}
      {docs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {docs.map((att) => (
            <div
              key={att.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 10px', borderRadius: '6px',
                background: 'var(--app-glass)',
                border: '1px solid var(--app-glass-border)',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '5px', flexShrink: 0,
                background: att.mimetype.includes('pdf') ? 'rgba(220,38,38,0.15)' : 'rgba(0,210,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {att.mimetype.includes('pdf')
                  ? <FileText size={13} style={{ color: '#dc2626' }} />
                  : <File size={13} />
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--app-text)', fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {att.note || att.filename}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--app-text-secondary)' }}>
                  {formatSize(att.size)} &middot; {new Date(att.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <a
                  href={attachmentUrl(testCaseId, att.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '3px 8px', borderRadius: '5px',
                    background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)',
                    color: 'var(--app-text-secondary)', fontSize: '0.68rem', fontWeight: 600,
                    textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px',
                  }}
                >
                  <Eye size={10} /> View
                </a>
                <button
                  onClick={() => handleDownload(att)}
                  style={{
                    padding: '3px 8px', borderRadius: '5px',
                    background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)',
                    color: 'var(--app-text-secondary)', fontSize: '0.68rem', fontWeight: 600,
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px',
                  }}
                >
                  <Download size={10} /> Save
                </button>
                {!readOnly && (
                  <button
                    onClick={() => setConfirmDelete(att.id)}
                    style={{
                      padding: '3px 8px', borderRadius: '5px',
                      background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)',
                      color: '#f87171', fontSize: '0.68rem', fontWeight: 600,
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px',
                    }}
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload dialog */}
      {dialogOpen && (
        <UploadDialog
          onUpload={handleUpload}
          onClose={() => setDialogOpen(false)}
          uploading={uploading}
        />
      )}

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={attachmentUrl(testCaseId, lightbox)}
            alt=""
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: 20, right: 20,
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff',
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete !== null && (
        <div
          onClick={() => setConfirmDelete(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 110,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--app-overlay)',
              border: '1px solid var(--app-overlay-border)',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '340px',
              width: '90vw',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              textAlign: 'center',
            }}
          >
            <Trash2 size={24} style={{ color: '#dc2626', marginBottom: '12px' }} />
            <h3 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 700, color: 'var(--app-text)' }}>Delete attachment?</h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.82rem', color: 'var(--app-text-secondary)', lineHeight: 1.5 }}>
              This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{
                  flex: 1, padding: '8px', borderRadius: '8px',
                  background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)',
                  color: 'var(--app-text-secondary)', fontSize: '0.82rem', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                style={{
                  flex: 1, padding: '8px', borderRadius: '8px',
                  background: 'rgba(220,38,38,0.8)', border: 'none',
                  color: '#fff', fontSize: '0.82rem', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
