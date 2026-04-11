import { createFileRoute, Link } from '@tanstack/react-router'
import { isAuthenticated } from '@/lib/auth'

export const Route = createFileRoute('/404')({
  component: NotFoundPage,
})

function NotFoundPage() {
  const loggedIn = typeof window !== 'undefined' && isAuthenticated()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-foreground overflow-hidden relative" style={{ background: 'var(--app-bg)', fontFamily: "'Poppins', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
        @keyframes move404 {
          from { transform: translate(-10%, -10%); }
          to   { transform: translate(20%, 20%); }
        }
        .blob-404 {
          position: absolute;
          border-radius: 50%;
          background: var(--app-accent-gradient);
          filter: blur(80px);
          opacity: 0.18;
          animation: move404 20s infinite alternate;
          pointer-events: none;
        }
      `}</style>
      <div className="blob-404" style={{ width: 400, height: 400, top: -100, left: -100 }} />
      <div className="blob-404" style={{ width: 300, height: 300, bottom: -50, right: -50, animationDelay: '-5s' }} />

      <div className="relative text-center space-y-2 z-10">
        <p style={{ fontSize: '5rem', fontWeight: 700 }}>404</p>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Page Not Found</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--app-text-secondary)', maxWidth: 280, margin: '0 auto' }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>

      <Link
        to={loggedIn ? '/homepage' : '/login'}
        className="relative z-10"
        style={{
          padding: '14px 32px',
          borderRadius: 10,
          background: 'var(--app-btn-primary)',
          color: 'var(--app-text)',
          fontWeight: 600,
          fontSize: '0.95rem',
          textDecoration: 'none',
          transition: '0.3s',
        }}
      >
        {loggedIn ? 'Back to Home' : 'Back to Login'}
      </Link>
    </div>
  )
}
