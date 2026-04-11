/**
 * Attachments
 *
 * Displays and manages file attachments (images, PDFs, docs) for a test case.
 * Works outside of edit mode — uploads and deletes are immediate.
 *
 * Features:
 *   - Click to upload from file picker
 *   - Paste from clipboard (Ctrl+V / Cmd+V)
 *   - Image thumbnails with lightbox
 *   - Delete with confirmation
 *   - Read-only mode for edit view
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Paperclip, Upload, Trash2, X, Image, FileText, File, ClipboardPaste } from 'lucide-react'
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

export function Attachments({ testCaseId, readOnly = false }: Props) {
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const [dragOver, setDragOver] = useState(false)

  // Fetch attachments on mount
  const load = useCallback(async () => {
    try {
      const data = await api<AttachmentMeta[]>(`/attachments/${testCaseId}`)
      setAttachments(data)
    } catch {
      // silently fail on load
    }
  }, [testCaseId])

  useEffect(() => { load() }, [load])

  // Clipboard paste handler
  useEffect(() => {
    if (readOnly) return
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const files: File[] = []
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (file) files.push(file)
        }
      }
      if (files.length > 0) {
        e.preventDefault()
        uploadFiles(files)
      }
    }
    document.addEventListener('paste', handler)
    return () => document.removeEventListener('paste', handler)
  }, [readOnly, testCaseId])

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      for (const f of files) fd.append('files', f)
      const results = await apiUpload<AttachmentMeta[]>(`/attachments/${testCaseId}`, fd)
      setAttachments((prev) => [...prev, ...results])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setError(msg)
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) uploadFiles(Array.from(files))
    e.target.value = ''
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

  // Drag & drop
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true) }
  const handleDragLeave = () => setDragOver(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (readOnly) return
    const files = Array.from(e.dataTransfer.files)
    uploadFiles(files)
  }

  const images = attachments.filter((a) => isImage(a.mimetype))
  const docs = attachments.filter((a) => !isImage(a.mimetype))

  return (
    <section
      ref={dropRef}
      onDragOver={!readOnly ? handleDragOver : undefined}
      onDragLeave={!readOnly ? handleDragLeave : undefined}
      onDrop={!readOnly ? handleDrop : undefined}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: dragOver ? '2px dashed rgba(0,210,255,0.5)' : '1px solid rgba(255,255,255,0.1)',
        borderRadius: '10px',
        padding: '20px',
        transition: 'border-color 0.15s',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: attachments.length > 0 || !readOnly ? '16px' : '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Paperclip size={16} style={{ color: 'rgba(0,210,255,0.7)' }} />
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
            Attachments
          </h2>
          {attachments.length > 0 && (
            <span style={{
              fontSize: '0.7rem', fontWeight: 600,
              background: 'rgba(0,210,255,0.15)', color: '#00d2ff',
              border: '1px solid rgba(0,210,255,0.3)',
              borderRadius: '10px', padding: '2px 8px',
            }}>
              {attachments.length}
            </span>
          )}
        </div>

        {!readOnly && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-semibold transition-opacity hover:opacity-90 flex-shrink-0"
              style={{
                background: 'linear-gradient(45deg, #6a11cb, #00d2ff)',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(106,17,203,0.3)',
                cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading ? 0.6 : 1,
              }}
            >
              <Upload size={11} />
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,application/pdf,.doc,.docx,.txt"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Error */}
      {error && (
        <div style={{
          marginBottom: '12px', padding: '8px 12px', borderRadius: '8px',
          background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)',
          color: '#fca5a5', fontSize: '0.78rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: 2 }}>
            <X size={12} />
          </button>
        </div>
      )}

      {/* Empty state */}
      {attachments.length === 0 && !readOnly && (
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '10px', padding: '28px 20px',
            borderRadius: '8px', cursor: 'pointer',
            border: '1px dashed rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.02)',
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,210,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(0,210,255,0.3)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: '10px',
            background: 'rgba(0,210,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Upload size={18} style={{ color: 'rgba(0,210,255,0.6)' }} />
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 1.5 }}>
            Drop files here, click to browse, or paste from clipboard
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Image size={10} /> Images
            </span>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FileText size={10} /> PDFs
            </span>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ClipboardPaste size={10} /> Clipboard
            </span>
          </div>
        </div>
      )}

      {attachments.length === 0 && readOnly && (
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.3)' }}>No attachments</p>
      )}

      {/* Image grid */}
      {images.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '10px',
          marginBottom: docs.length > 0 ? '14px' : 0,
        }}>
          {images.map((att) => (
            <div
              key={att.id}
              style={{
                position: 'relative', borderRadius: '8px', overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.3)',
                cursor: 'pointer',
                aspectRatio: '1',
              }}
              onClick={() => setLightbox(att.id)}
            >
              <img
                src={attachmentUrl(testCaseId, att.id)}
                alt={att.filename}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {/* Hover overlay */}
              <div
                style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.7))',
                  display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                  padding: '8px',
                  opacity: 0, transition: 'opacity 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0' }}
              >
                <span style={{ fontSize: '0.68rem', color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {att.filename}
                </span>
                <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.5)' }}>
                  {formatSize(att.size)}
                </span>
                {!readOnly && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(att.id) }}
                    style={{
                      position: 'absolute', top: 6, right: 6,
                      width: 24, height: 24, borderRadius: '6px',
                      background: 'rgba(220,38,38,0.8)', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={12} color="#fff" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document list */}
      {docs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {docs.map((att) => (
            <div
              key={att.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 12px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: '6px', flexShrink: 0,
                background: att.mimetype.includes('pdf') ? 'rgba(220,38,38,0.15)' : 'rgba(0,210,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {att.mimetype.includes('pdf')
                  ? <FileText size={14} style={{ color: '#dc2626' }} />
                  : <File size={14} style={{ color: '#00d2ff' }} />
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <a
                  href={attachmentUrl(testCaseId, att.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 500, textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline' }}
                  onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none' }}
                >
                  {att.filename}
                </a>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>
                  {formatSize(att.size)} &middot; {new Date(att.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              {!readOnly && (
                <button
                  onClick={() => setConfirmDelete(att.id)}
                  style={{
                    background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)',
                    borderRadius: '6px', padding: '4px 8px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                    color: '#f87171', fontSize: '0.72rem', fontWeight: 600,
                  }}
                >
                  <Trash2 size={11} /> Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && (
        <>
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
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </>
      )}

      {/* Delete confirmation */}
      {confirmDelete !== null && (
        <>
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
                background: '#1a1530',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '340px',
                width: '90vw',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                textAlign: 'center',
              }}
            >
              <Trash2 size={24} style={{ color: '#dc2626', marginBottom: '12px' }} />
              <h3 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 700, color: '#fff' }}>Delete attachment?</h3>
              <p style={{ margin: '0 0 20px', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setConfirmDelete(null)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', fontWeight: 600,
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
        </>
      )}
    </section>
  )
}
