import { HeadContent, Scripts, createRootRoute, Link, useNavigate, useRouterState, redirect } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { isAuthenticated, logout, getCurrentUser } from '@/lib/auth'
import { clearCustomCache } from '@/lib/customTestCases'
import { clearCaches } from '@/lib/useTestStatus'
import { clearProjectCache } from '@/lib/projects'
import { clearPermissionCache } from '@/lib/permissions'
import { api } from '@/lib/api'
import { Search, Settings, LogOut } from 'lucide-react'
import { LoadingCurtain } from '@/components/LoadingCurtain'
import '../styles.css'

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    const publicPaths = ['/', '/login', '/403', '/404']
    if (publicPaths.includes(location.pathname)) return
    if (typeof window !== 'undefined' && !isAuthenticated()) {
      throw redirect({ to: '/403' })
    }
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1' },
      { title: 'QA & BA Assistant' },
    ],
    links: [
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    ],
  }),
  shellComponent: RootDocument,
})

// ── Search bar ────────────────────────────────────────────────────────────────

type SearchResult = { id: string; title: string; tags: string[]; completed?: boolean; projectName?: string | null }

function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()

  const search = (q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = q.trim()
    if (!trimmed) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api<SearchResult[]>(`/custom-test-cases/search?q=${encodeURIComponent(trimmed)}`)
        setResults(data)
      } catch {
        setResults([])
      }
    }, 200)
  }

  const updatePos = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right })
    }
  }

  const go = (result: SearchResult) => {
    setQuery('')
    setResults([])
    setOpen(false)
    navigate({ to: '/test-cases/custom/$id', params: { id: result.id } })
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-background text-sm focus-within:ring-1 focus-within:ring-ring transition-colors w-64">
        <Search size={13} className="text-muted-foreground flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); search(e.target.value); updatePos() }}
          onFocus={() => { setOpen(true); updatePos() }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results.length > 0) go(results[0])
            if (e.key === 'Escape') { setQuery(''); setResults([]); setOpen(false); inputRef.current?.blur() }
          }}
          placeholder="Search test cases…"
          className="bg-transparent outline-none text-foreground placeholder:text-muted-foreground flex-1 min-w-0"
        />
      </div>

      {open && results.length > 0 && createPortal(
        <div
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            right: dropdownPos.right,
            zIndex: 9999,
            width: '340px',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            background: 'rgba(15,12,41,0.97)',
            border: '1px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {results.map((result) => (
            <button
              key={result.id}
              onMouseDown={() => go(result)}
              className="w-full text-left px-4 py-2.5 transition-colors text-white/80 hover:text-white"
              style={{ background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate flex-1 min-w-0">{result.title || 'Untitled Test Case'}</p>
                {result.projectName && (
                  <span className="text-xs text-white/35 flex-shrink-0 truncate max-w-[100px]">{result.projectName}</span>
                )}
              </div>
              {result.tags.length > 0 && (
                <p className="text-xs text-white/40 mt-0.5 truncate">
                  {result.tags.slice(0, 4).join(', ')}
                  {result.tags.length > 4 && ` +${result.tags.length - 4} more`}
                </p>
              )}
            </button>
          ))}
        </div>
      , document.body)}
    </div>
  )
}

// ── Profile button ────────────────────────────────────────────────────────────

function ProfileButton({ onLogout }: { onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
  const username = getCurrentUser() ?? ''
  const initial = username.charAt(0).toUpperCase()
  const navigate = useNavigate()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 8, left: rect.left })
    }
    setOpen((o) => !o)
  }

  const handleLogout = () => {
    setOpen(false)
    onLogout()
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full transition-colors focus:outline-none"
        style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
        aria-label="User menu"
      >
        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'rgba(0,210,255,0.25)', border: '1px solid rgba(0,210,255,0.5)' }}>
          {initial}
        </span>
        <span className="text-sm font-medium text-white">{username}</span>
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            zIndex: 9999,
            width: '208px',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            background: 'rgba(15,12,41,0.97)',
            border: '1px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <p className="text-sm font-semibold text-white">{username}</p>
          </div>

          <div className="py-1">
            <button
              onClick={() => { setOpen(false); navigate({ to: '/settings' }) }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white transition-colors"
              style={{ background: 'transparent' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Settings size={15} className="opacity-60" />
              Settings
            </button>
          </div>

          <div className="py-1" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white transition-colors"
              style={{ background: 'transparent' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <LogOut size={15} className="opacity-60" />
              Log out
            </button>
          </div>
        </div>
      , document.body)}
    </div>
  )
}

// ── Nav bar ───────────────────────────────────────────────────────────────────

function NavBar({ onLogout }: { onLogout: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const links = [
    { to: '/homepage', label: 'Home' },
    { to: '/projects', label: 'Projects' },
  ]

  return (
    <nav className="w-full py-3" style={{ background: 'rgba(106,17,203,0.25)', borderBottom: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
      {/* ── Desktop ────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 hidden md:flex items-center justify-between">
        <div className="flex items-center gap-6">
          <ProfileButton onLogout={onLogout} />
          <ul className="flex items-center gap-5">
            {links.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  activeProps={{ className: 'text-sm font-semibold text-foreground' }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <SearchBar />
      </div>

      {/* ── Mobile ─────────────────────────────────── */}
      <div className="md:hidden px-4 flex items-center justify-between">
        <button
          className="flex flex-col gap-1.5 p-2"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <span className="block w-5 h-0.5 bg-foreground" />
          <span className="block w-5 h-0.5 bg-foreground" />
          <span className="block w-5 h-0.5 bg-foreground" />
        </button>
        <ProfileButton onLogout={onLogout} />
      </div>

      {menuOpen && (
        <div className="md:hidden pt-3 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <ul className="flex flex-col gap-1 px-4 mb-4">
            {links.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="block text-sm text-muted-foreground hover:text-white transition-colors px-3 py-2.5 rounded-lg"
                  activeProps={{ className: 'block text-sm font-semibold text-white px-3 py-2.5 rounded-lg' }}
                  activeOptions={{ exact: true }}
                  onClick={() => setMenuOpen(false)}
                  style={{ background: 'transparent' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="px-4">
            <SearchBar />
          </div>
        </div>
      )}
    </nav>
  )
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { location } = useRouterState()
  const navigate = useNavigate()
  const hideNav = ['/', '/login', '/403', '/404'].includes(location.pathname)
  const [mounted, setMounted] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = () => {
    setLoggingOut(true)
    setTimeout(() => {
      logout()
      clearCustomCache()
      clearCaches()
      clearProjectCache()
      clearPermissionCache()
      navigate({ to: '/login' })
      setTimeout(() => setLoggingOut(false), 400)
    }, 600)
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || hideNav) return
    if (!isAuthenticated()) {
      navigate({ to: '/403', replace: true })
    }
  }, [location.pathname, mounted])

  if (!mounted) {
    // Show public pages immediately, hide protected pages until auth is confirmed
    if (hideNav) return <>{children}</>
    return <div style={{ background: '#0f0c29', minHeight: '100vh' }} />
  }

  if (!hideNav && !isAuthenticated() && !loggingOut) {
    return null
  }

  return (
    <>
      <LoadingCurtain visible={loggingOut} message="Signing Out" />
      {!hideNav && <NavBar onLogout={handleLogout} />}
      {children}
    </>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body style={{ background: '#0f0c29', margin: 0 }}>
        <AppShell>{children}</AppShell>
        <Scripts />
      </body>
    </html>
  )
}
