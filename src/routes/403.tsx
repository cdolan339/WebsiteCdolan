import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/403')({
  component: ForbiddenPage,
})

function ForbiddenPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-white overflow-hidden relative" style={{ background: '#0f0c29', fontFamily: "'Poppins', sans-serif" }}>
      {/* Animated background blobs */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
        @keyframes move403 {
          from { transform: translate(-10%, -10%); }
          to   { transform: translate(20%, 20%); }
        }
        .blob-403 {
          position: absolute;
          border-radius: 50%;
          background: linear-gradient(45deg, #6a11cb, #00d2ff);
          filter: blur(80px);
          opacity: 0.3;
          animation: move403 20s infinite alternate;
          pointer-events: none;
        }
      `}</style>
      <div className="blob-403" style={{ width: 400, height: 400, top: -100, left: -100 }} />
      <div className="blob-403" style={{ width: 300, height: 300, bottom: -50, right: -50, animationDelay: '-5s' }} />

      <div className="relative text-center space-y-2 z-10">
        <p style={{ fontSize: '5rem', fontWeight: 700, color: '#ffffff' }}>403</p>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Access Denied</h1>
        <p style={{ fontSize: '0.85rem', color: '#ccc', maxWidth: 280, margin: '0 auto' }}>
          Your session has expired or you are not authorised to view this page.
        </p>
      </div>

      <Link
        to="/login"
        className="relative z-10"
        style={{
          padding: '14px 32px',
          borderRadius: 10,
          background: 'linear-gradient(45deg, #6a11cb, #00d2ff)',
          color: '#fff',
          fontWeight: 600,
          fontSize: '0.95rem',
          textDecoration: 'none',
          transition: '0.3s',
        }}
      >
        Back to Login
      </Link>
    </div>
  )
}
