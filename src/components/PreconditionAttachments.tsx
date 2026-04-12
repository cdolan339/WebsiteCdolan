/**
 * PreconditionAttachments
 *
 * An image upload/display section shown under Preconditions.
 * Two modes:
 *   1. testCaseId provided — loads/uploads from DB (category='precondition')
 *   2. pendingFiles provided — shows files held in memory (for new test cases before save)
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Image, Upload, Trash2, X, Eye, Paperclip } from 'lucide-react'
import { api, apiUpload, attachmentUrl } from '@/lib/api'

type AttachmentMeta = {
  id: number
  filename: string
  mimetype: string
  size: number
  note: string
  category: string
  created_at: string
}

export type PendingImage = {
  file: File
  preview: string // object URL for display
  name: string
}

type Props = {
  testCaseId?: string
  readOnly?: boolean
  // For new test cases: managed externally
  pendingImages?: PendingImage[]
  onPendingChange?: (images: PendingImage[]) => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function PreconditionAttachments({ testCaseId, readOnly = false, pendingImages, onPendingChange }: Props) {
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([])
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null) // url
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isPending = !testCaseId // no saved test case yet

  const load = useCallback(async () => {
    if (!testCaseId) return
    try {
      const data = await api<AttachmentMeta[]>(`/attachments/${testCaseId}?category=precondition`)
      setAttachments(data)
    } catch {
      // silently fail
    }
  }, [testCaseId])

  useEffect(() => { load() }, [load])

  // Upload to server (existing test case)
  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || !testCaseId) return
    setUploading(true)
    try {
      const fd = new FormData()
      for (const f of Array.from(fileList)) {
        fd.append('files', f)
      }
      fd.append('category', 'precondition')
      const results = await apiUpload<AttachmentMeta[]>(`/attachments/${testCaseId}`, fd)
      setAttachments((prev) => [...prev, ...results])
    } catch {
      // silently fail
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Add to pending list (new test case)
  const handlePendingAdd = (fileList: FileList | null) => {
    if (!fileList || !onPendingChange) return
    const added = Array.from(fileList).map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
      name: f.name,
    }))
    onPendingChange([...(pendingImages || []), ...added])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDelete = async (id: number) => {
    if (!testCaseId) return
    try {
      await api(`/attachments/${testCaseId}/${id}`, { method: 'DELETE' })
      setAttachments((prev) => prev.filter((a) => a.id !== id))
      setConfirmDelete(null)
    } catch {
      // silently fail
    }
  }

  const removePending = (index: number) => {
    if (!onPendingChange || !pendingImages) return
    const removed = pendingImages[index]
    URL.revokeObjectURL(removed.preview)
    onPendingChange(pendingImages.filter((_, i) => i !== index))
  }

  // Determine what to display
  const savedImages = attachments.filter((a) => a.mimetype.startsWith('image/'))
  const savedDocs = attachments.filter((a) => !a.mimetype.startsWith('image/'))
  const hasContent = savedImages.length > 0 || savedDocs.length > 0 || (pendingImages && pendingImages.length > 0)

  return (
    <div style={{ marginTop: '14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: hasContent ? '10px' : '0' }}>
        <Image size={13} style={{ opacity: 0.6 }} />
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--app-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Reference Images
        </span>
        {(savedImages.length + savedDocs.length + (pendingImages?.length || 0)) > 0 && (
          <span style={{
            fontSize: '0.65rem', fontWeight: 600,
            background: 'var(--app-glass)', color: 'var(--app-text)',
            border: '1px solid var(--app-glass-border)',
            borderRadius: '10px', padding: '1px 7px',
          }}>
            {savedImages.length + savedDocs.length + (pendingImages?.length || 0)}
          </span>
        )}
        <div style={{ flex: 1 }} />
        {!readOnly && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-semibold transition-opacity hover:opacity-90"
            style={{
              background: 'var(--app-btn-primary)',
              color: 'var(--app-btn-text)',
              boxShadow: '0 2px 8px var(--app-btn-primary-shadow)',
            }}
          >
            <Upload size={11} /> {uploading ? 'Uploading...' : 'Upload'}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          multiple
          onChange={(e) => isPending ? handlePendingAdd(e.target.files) : handleUpload(e.target.files)}
          style={{ display: 'none' }}
        />
      </div>

      {/* Saved image grid */}
      {savedImages.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
          gap: '8px',
          marginBottom: '8px',
        }}>
          {savedImages.map((att) => (
            <div
              key={att.id}
              onClick={() => setLightbox(attachmentUrl(testCaseId!, att.id))}
              style={{
                position: 'relative', borderRadius: '8px', overflow: 'hidden',
                border: '1px solid var(--app-glass-border)',
                background: 'rgba(0,0,0,0.15)',
                aspectRatio: '1',
                cursor: 'pointer',
              }}
            >
              <img
                src={attachmentUrl(testCaseId!, att.id)}
                alt={att.note || att.filename}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              <div
                style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(transparent 30%, rgba(0,0,0,0.8))',
                  display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                  padding: '8px', opacity: 0, transition: 'opacity 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0' }}
              >
                <span style={{ fontSize: '0.65rem', color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>
                  {att.note || att.filename}
                </span>
                {!readOnly && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(att.id) }}
                    style={{
                      padding: '3px 8px', borderRadius: '4px',
                      background: 'rgba(220,38,38,0.6)', border: 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
                      color: '#fff', fontSize: '0.6rem', fontWeight: 600,
                    }}
                  >
                    <Trash2 size={9} /> Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Saved non-image docs */}
      {savedDocs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '8px' }}>
          {savedDocs.map((att) => (
            <div
              key={att.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 10px', borderRadius: '6px',
                background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)',
              }}
            >
              <Paperclip size={13} style={{ color: 'var(--app-text-secondary)', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '0.78rem', color: 'var(--app-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {att.note || att.filename}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--app-text-secondary)', flexShrink: 0 }}>{formatSize(att.size)}</span>
              <a
                href={attachmentUrl(testCaseId!, att.id)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '2px 6px', borderRadius: '4px',
                  background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)',
                  color: 'var(--app-text-secondary)', fontSize: '0.65rem', fontWeight: 600,
                  textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px', flexShrink: 0,
                }}
              >
                <Eye size={9} /> View
              </a>
              {!readOnly && (
                <button
                  onClick={() => setConfirmDelete(att.id)}
                  style={{
                    padding: '2px 6px', borderRadius: '4px',
                    background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)',
                    color: '#f87171', fontSize: '0.65rem', fontWeight: 600,
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', flexShrink: 0,
                  }}
                >
                  <Trash2 size={9} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pending images (new test case — not yet saved) */}
      {pendingImages && pendingImages.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
          gap: '8px',
          marginBottom: '8px',
        }}>
          {pendingImages.map((img, i) => (
            <div
              key={`pending-${i}`}
              onClick={() => setLightbox(img.preview)}
              style={{
                position: 'relative', borderRadius: '8px', overflow: 'hidden',
                border: '1px solid var(--app-glass-border)',
                background: 'rgba(0,0,0,0.15)',
                aspectRatio: '1',
                cursor: 'pointer',
              }}
            >
              <img
                src={img.preview}
                alt={img.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              <div
                style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(transparent 30%, rgba(0,0,0,0.8))',
                  display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                  padding: '8px', opacity: 0, transition: 'opacity 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0' }}
              >
                <span style={{ fontSize: '0.65rem', color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>
                  {img.name}
                </span>
                {!readOnly && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removePending(i) }}
                    style={{
                      padding: '3px 8px', borderRadius: '4px',
                      background: 'rgba(220,38,38,0.6)', border: 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
                      color: '#fff', fontSize: '0.6rem', fontWeight: 600,
                    }}
                  >
                    <Trash2 size={9} /> Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!hasContent && !readOnly && (
        <p style={{ fontSize: '0.75rem', color: 'var(--app-text-secondary)', margin: '4px 0 0', lineHeight: 1.5 }}>
          Upload screenshots, mockups, or reference images related to preconditions.
        </p>
      )}

      {/* Lightbox */}
      {lightbox && (
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
            src={lightbox}
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
              borderRadius: '12px', padding: '24px',
              maxWidth: '340px', width: '90vw',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              textAlign: 'center',
            }}
          >
            <Trash2 size={24} style={{ color: '#dc2626', marginBottom: '12px' }} />
            <h3 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 700, color: 'var(--app-text)' }}>Remove image?</h3>
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

/**
 * Helper: upload pending images as precondition attachments after a test case is saved.
 * Call this from the save handler once you have the new testCaseId.
 */
export async function uploadPreconditionImages(testCaseId: string, images: PendingImage[]): Promise<void> {
  if (images.length === 0) return
  const fd = new FormData()
  for (const img of images) {
    fd.append('files', img.file, img.name)
  }
  fd.append('category', 'precondition')
  await apiUpload(`/attachments/${testCaseId}`, fd)
}
