import { HeadContent, Scripts, createRootRoute, Link, useNavigate, useRouterState, redirect } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { isAuthenticated, logout, getCurrentUser } from '@/lib/auth'
import { clearCustomCache } from '@/lib/customTestCases'
import { clearStoryCache } from '@/lib/stories'
import { WebSocketSync } from '@/components/WebSocketSync'
import { clearCaches } from '@/lib/useTestStatus'
import { clearProjectCache } from '@/lib/projects'
import { clearPermissionCache } from '@/lib/permissions'
import { api } from '@/lib/api'
import { Search, Settings, LogOut, Sun, Moon, ChevronDown, Bell } from 'lucide-react'
import { LoadingCurtain } from '@/components/LoadingCurtain'
import { ThemeProvider, useTheme } from '@/lib/theme'
import '../styles.css'

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    const publicPaths = ['/', '/login', '/register', '/verify', '/403', '/404']
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
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px',
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 10, width: 280,
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <Search size={14} style={{ color: 'var(--mute)', flexShrink: 0 }} />
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
          placeholder="Search stories, tests, people…"
          style={{
            border: 0, background: 'transparent', outline: 'none',
            fontSize: 13, flex: 1, color: 'var(--ink)',
            fontFamily: 'inherit', minWidth: 0,
          }}
        />
        <span
          className="tz-mono"
          style={{
            fontSize: 10, color: 'var(--mute)',
            padding: '1px 5px', border: '1px solid var(--border)', borderRadius: 4,
          }}
        >⌘K</span>
      </div>

      {open && results.length > 0 && createPortal(
        <div
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            right: dropdownPos.right,
            zIndex: 9999,
            width: '340px',
            borderRadius: 'var(--tz-radius)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-md)',
            background: 'var(--panel)',
            border: '1px solid var(--border)',
          }}
        >
          {results.map((result, idx) => (
            <button
              key={result.id}
              onMouseDown={() => go(result)}
              className="w-full text-left"
              style={{
                background: 'transparent',
                borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                color: 'var(--ink)',
                padding: '10px 14px', fontFamily: 'inherit',
                transition: 'background .15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--panel-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span className="tz-truncate" style={{ fontSize: 13, fontWeight: 600, flex: 1, minWidth: 0 }}>
                  {result.title || 'Untitled Test Case'}
                </span>
                {result.projectName && (
                  <span className="tz-mono tz-truncate" style={{ fontSize: 11, color: 'var(--mute)', maxWidth: 110 }}>
                    {result.projectName}
                  </span>
                )}
              </div>
              {result.tags.length > 0 && (
                <p className="tz-truncate" style={{ fontSize: 11.5, marginTop: 2, color: 'var(--mute)' }}>
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
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '4px 11px 4px 4px',
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 999,
          boxShadow: 'var(--shadow-xs)',
          cursor: 'pointer', fontFamily: 'inherit',
        }}
        aria-label="User menu"
      >
        <span
          style={{
            width: 22, height: 22, borderRadius: 999,
            background: 'linear-gradient(135deg, var(--purple), var(--pink))',
            color: 'white', fontSize: 11, fontWeight: 600,
            display: 'grid', placeItems: 'center',
          }}
        >
          {initial || '?'}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
          {username || 'Guest'}
        </span>
        <ChevronDown size={12} style={{ color: 'var(--mute)' }} />
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            zIndex: 9999,
            width: 208,
            borderRadius: 'var(--tz-radius)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-md)',
            background: 'var(--panel)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{username}</p>
          </div>

          <div style={{ padding: 4 }}>
            <button
              onClick={() => { setOpen(false); navigate({ to: '/settings' }) }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 8, border: 0,
                background: 'transparent', color: 'var(--ink-2)', fontSize: 13,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--chip)'; e.currentTarget.style.color = 'var(--ink)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-2)' }}
            >
              <Settings size={14} style={{ opacity: 0.7 }} />
              Settings
            </button>
            <button
              onClick={handleLogout}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 8, border: 0,
                background: 'transparent', color: 'var(--ink-2)', fontSize: 13,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--chip)'; e.currentTarget.style.color = 'var(--ink)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-2)' }}
            >
              <LogOut size={14} style={{ opacity: 0.7 }} />
              Log out
            </button>
          </div>
        </div>
      , document.body)}
    </div>
  )
}

// ── Nav bar ───────────────────────────────────────────────────────────────────

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme()
  return (
    <button
      onClick={toggleTheme}
      className="tz-btn tz-btn-ghost"
      style={{ padding: 7 }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}

function NavBar({ onLogout }: { onLogout: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const links = [
    { to: '/homepage', label: 'Dashboard' },
    { to: '/projects', label: 'Projects' },
    { to: '/stories', label: 'Stories' },
    { to: '/test-suites', label: 'Test Suites' },
    { to: '/team', label: 'Team' },
    { to: '/wiki', label: 'Wiki' },
  ]

  const linkBase: React.CSSProperties = {
    padding: '6px 12px', borderRadius: 8,
    fontSize: 13.5, fontWeight: 500,
    color: 'var(--mute)', textDecoration: 'none',
    letterSpacing: '-0.005em', transition: 'all .15s',
    display: 'inline-flex', alignItems: 'center',
  }

  return (
    <nav
      style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'color-mix(in oklab, var(--bg) 82%, transparent)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* ── Desktop ────────────────────────────────── */}
      <div
        className="tz-nav-desktop"
        style={{
          maxWidth: 1200, margin: '0 auto',
          padding: '11px 48px',
          alignItems: 'center', gap: 20,
        }}
      >
        <ProfileButton onLogout={onLogout} />

        <div style={{ display: 'flex', gap: 2, marginLeft: 8 }}>
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              style={linkBase}
              activeProps={{ style: { ...linkBase, background: 'var(--chip)', color: 'var(--ink)', fontWeight: 600 } }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--ink)' }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLAnchorElement
                // Respect active styles — only reset if not active
                if (!el.dataset.status || el.dataset.status !== 'active') el.style.color = 'var(--mute)'
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        <SearchBar />

        <button className="tz-btn tz-btn-ghost" style={{ padding: 7 }} title="Notifications" aria-label="Notifications">
          <Bell size={16} />
        </button>

        <ThemeToggle />
      </div>

      {/* ── Mobile ─────────────────────────────────── */}
      <div
        className="tz-nav-mobile"
        style={{ padding: '10px 16px', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
            className="tz-btn tz-btn-ghost"
            style={{ padding: 7, flexDirection: 'column', alignItems: 'stretch', gap: 3 }}
          >
            <span style={{ width: 18, height: 2, background: 'var(--ink)', display: 'block' }} />
            <span style={{ width: 18, height: 2, background: 'var(--ink)', display: 'block' }} />
            <span style={{ width: 18, height: 2, background: 'var(--ink)', display: 'block' }} />
          </button>
          <ThemeToggle />
        </div>
        <ProfileButton onLogout={onLogout} />
      </div>

      {menuOpen && (
        <div className="tz-nav-mobile" style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--border)', flexDirection: 'column', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 14 }}>
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                style={{ ...linkBase, padding: '9px 12px' }}
                activeProps={{ style: { ...linkBase, padding: '9px 12px', background: 'var(--chip)', color: 'var(--ink)', fontWeight: 600 } }}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <SearchBar />
        </div>
      )}
    </nav>
  )
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { location } = useRouterState()
  const navigate = useNavigate()
  const hideNav = ['/', '/login', '/register', '/verify', '/403', '/404'].includes(location.pathname)
  const [mounted, setMounted] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = () => {
    setLoggingOut(true)
    setTimeout(() => {
      logout()
      clearCustomCache()
      clearStoryCache()
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
    return <div style={{ background: 'var(--bg)', minHeight: '100vh' }} />
  }

  if (!hideNav && !isAuthenticated() && !loggingOut) {
    return null
  }

  return (
    <>
      <LoadingCurtain visible={loggingOut} message="Signing Out" />
      {!hideNav && <WebSocketSync />}
      {!hideNav && <NavBar onLogout={handleLogout} />}
      {children}
    </>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var t = localStorage.getItem('app-theme') || 'dark';
            if (t === 'dark') document.documentElement.classList.add('dark');
          })();
        `}} />
      </head>
      <body style={{ background: 'var(--bg)', margin: 0 }}>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
