import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { verifyEmail } from '@/lib/auth'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export const Route = createFileRoute('/verify')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: VerifyPage,
})

type State =
  | { kind: 'loading' }
  | { kind: 'ok'; username: string }
  | { kind: 'err'; message: string }

function VerifyPage() {
  const { token } = Route.useSearch()
  const navigate  = useNavigate()
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!token) {
        if (!cancelled) setState({ kind: 'err', message: 'Missing verification token.' })
        return
      }
      try {
        const res = await verifyEmail(token)
        if (!cancelled) setState({ kind: 'ok', username: res.username })
      } catch (err) {
        if (!cancelled) {
          const m = (err as { message?: string }).message || 'Verification failed.'
          setState({ kind: 'err', message: m })
        }
      }
    }
    run()
    return () => { cancelled = true }
  }, [token])

  return (
    <>
      <style>{css}</style>
      <div className="verify-wrapper">
        <div className="verify-card">
          {state.kind === 'loading' && (
            <>
              <Loader2 className="spin" size={48} />
              <h2>Verifying{'\u2026'}</h2>
              <p>Hang tight while we confirm your email.</p>
            </>
          )}
          {state.kind === 'ok' && (
            <>
              <CheckCircle2 size={48} color="#16a34a" />
              <h2>Email verified</h2>
              <p>
                Welcome, <strong>{state.username}</strong>. You can close this tab — the one where you signed up
                will advance automatically. Or sign in below.
              </p>
              <button
                className="verify-btn"
                onClick={() => navigate({ to: '/login' })}
              >
                Go to sign in
              </button>
            </>
          )}
          {state.kind === 'err' && (
            <>
              <XCircle size={48} color="#dc2626" />
              <h2>Verification failed</h2>
              <p>{state.message}</p>
              <p className="fine-print">The link may have expired. Please register again to get a fresh one.</p>
              <button
                className="verify-btn"
                onClick={() => navigate({ to: '/register' })}
              >
                Back to registration
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

const css = `
.verify-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--app-bg);
  color: var(--app-text);
  font-family: 'Segoe UI', system-ui, sans-serif;
  padding: 20px;
}
.verify-card {
  max-width: 460px;
  width: 100%;
  background: var(--app-glass);
  backdrop-filter: blur(20px);
  border: 1px solid var(--app-glass-border);
  border-radius: 20px;
  padding: 40px 36px;
  text-align: center;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
}
.verify-card h2 {
  margin: 16px 0 8px;
  font-size: 1.5rem;
}
.verify-card p {
  color: var(--app-text-secondary);
  margin: 8px 0;
  line-height: 1.5;
}
.verify-card p.fine-print {
  font-size: 0.8rem;
  margin-top: 16px;
}
.verify-btn {
  margin-top: 24px;
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  background: var(--app-btn-primary);
  color: var(--app-btn-text);
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}
.verify-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}
.spin { animation: spin 1s linear infinite; color: var(--app-text-secondary); }
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
`
