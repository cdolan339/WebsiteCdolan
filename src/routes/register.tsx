import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import {
  isAuthenticated,
  register,
  checkTeamName,
  getRegistrationStatus,
  login,
} from '@/lib/auth'
import { LoadingCurtain } from '@/components/LoadingCurtain'
import { useTheme } from '@/lib/theme'
import { Sun, Moon, CheckCircle2, Clock, Mail } from 'lucide-react'

export const Route = createFileRoute('/register')({
  beforeLoad: () => {
    if (typeof window !== 'undefined' && isAuthenticated()) {
      throw redirect({ to: '/homepage' })
    }
  },
  component: RegisterPage,
})

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Step = 'form' | 'check-email' | 'awaiting-approval' | 'done'

function RegisterPage() {
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()

  const [step, setStep] = useState<Step>('form')

  // Step 1 form state
  const [username, setUsername] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [teamName, setTeamName] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  // Team lookup (debounced)
  const [teamInfo, setTeamInfo] = useState<{
    status: 'idle' | 'checking' | 'new' | 'existing' | 'error'
    memberCount?: number
    displayName?: string
  }>({ status: 'idle' })

  // Step 2/3 state
  const [requiresApproval, setRequiresApproval] = useState(false)
  const [transitioning, setTransitioning]       = useState(false)
  const cachedPasswordRef = useRef<string>('')

  // Keep a clean error if user edits the form
  function clearErr() { if (error) setError('') }

  // ── Debounced team name lookup ─────────────────────────────
  useEffect(() => {
    const name = teamName.trim()
    if (!name) { setTeamInfo({ status: 'idle' }); return }
    setTeamInfo({ status: 'checking' })
    const handle = window.setTimeout(async () => {
      try {
        const res = await checkTeamName(name)
        if (res.exists) {
          setTeamInfo({
            status: 'existing',
            displayName: res.displayName,
            memberCount: res.memberCount,
          })
        } else {
          setTeamInfo({ status: 'new' })
        }
      } catch {
        setTeamInfo({ status: 'error' })
      }
    }, 350)
    return () => window.clearTimeout(handle)
  }, [teamName])

  // ── Step 2/3 polling: every 3s, check verification + approval ──
  useEffect(() => {
    if (step !== 'check-email' && step !== 'awaiting-approval') return
    let cancelled = false

    async function tick() {
      if (cancelled) return
      try {
        const s = await getRegistrationStatus(username)
        if (cancelled) return
        if (s.email_verified) {
          // Step 2 → Step 3 or final success
          if (s.pending_approval) {
            setStep('awaiting-approval')
          } else {
            // Verified AND approved — auto-login with cached password
            const pw = cachedPasswordRef.current
            if (pw) {
              const result = await login(username, pw)
              if (result.ok && !cancelled) {
                setStep('done')
                setTransitioning(true)
                setTimeout(() => navigate({ to: '/homepage' }), 600)
                return
              }
            }
            // Fall back: send them to login manually
            if (!cancelled) {
              setStep('done')
              setTimeout(() => navigate({ to: '/login' }), 1500)
            }
          }
        }
      } catch {
        // keep polling — transient network issues shouldn't stop us
      }
    }

    tick()
    const id = window.setInterval(tick, 3000)
    return () => { cancelled = true; window.clearInterval(id) }
  }, [step, username, navigate])

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError('')

    const u = username.trim()
    const em = email.trim()
    const t = teamName.trim()
    if (!u || !em || !password || !t) {
      setError('All fields are required.'); return
    }
    if (!EMAIL_RE.test(em)) {
      setError('Please enter a valid email address.'); return
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters.'); return
    }

    setLoading(true)
    try {
      const res = await register({ username: u, email: em, password, teamName: t })
      cachedPasswordRef.current = password
      setRequiresApproval(res.requiresApproval)
      setStep('check-email')
    } catch (err) {
      const m = (err as { message?: string }).message || 'Registration failed'
      setError(m)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{registerCss}</style>
      <LoadingCurtain visible={transitioning} message="Initializing Session" />
      <div className="login-wrapper">
        <div className="bg-animate">
          <div className="circle" style={{ width: '400px', height: '400px', top: '-100px', left: '-100px' }} />
          <div className="circle" style={{ width: '300px', height: '300px', bottom: '-50px', right: '-50px', animationDelay: '-5s' }} />
        </div>

        <div className="login-container">
          <div className="mascot-section">
            <div className="register-mark">
              {step === 'form' && <span className="reg-emoji">✦</span>}
              {step === 'check-email' && <Mail size={64} strokeWidth={1.5} />}
              {step === 'awaiting-approval' && <Clock size={64} strokeWidth={1.5} />}
              {step === 'done' && <CheckCircle2 size={64} strokeWidth={1.5} />}
            </div>
            <h3>
              {step === 'form' && 'Create account'}
              {step === 'check-email' && 'Check your email'}
              {step === 'awaiting-approval' && 'Almost there'}
              {step === 'done' && 'You\u2019re in!'}
            </h3>
            <p className="mascot-subtitle">
              {step === 'form' && 'Join a team or start your own.'}
              {step === 'check-email' && 'We sent you a verification link.'}
              {step === 'awaiting-approval' && 'Waiting for team owner approval.'}
              {step === 'done' && 'Redirecting you now\u2026'}
            </p>
          </div>

          <div className="form-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0 }}>
                {step === 'form' ? 'Get started' : 'Almost done'}
              </h2>
              <button
                onClick={toggleTheme}
                className="theme-btn"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>

            {step === 'form' && (
              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="login-input-group">
                  <label>Username</label>
                  <input
                    type="text"
                    placeholder="pick a username"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); clearErr() }}
                    autoFocus
                    autoComplete="username"
                  />
                </div>
                <div className="login-input-group">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearErr() }}
                    autoComplete="email"
                  />
                </div>
                <div className="login-input-group">
                  <label>Password</label>
                  <input
                    type="password"
                    placeholder="at least 4 characters"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearErr() }}
                    autoComplete="new-password"
                  />
                </div>
                <div className="login-input-group">
                  <label>Team name</label>
                  <input
                    type="text"
                    placeholder="e.g. WTH"
                    value={teamName}
                    onChange={(e) => { setTeamName(e.target.value); clearErr() }}
                  />
                  <p className={`team-hint team-hint-${teamInfo.status}`}>
                    {teamInfo.status === 'idle'     && <>&nbsp;</>}
                    {teamInfo.status === 'checking' && 'Checking…'}
                    {teamInfo.status === 'new'      && `"${teamName.trim()}" is new — you'll be its owner.`}
                    {teamInfo.status === 'existing' && (
                      <>Joining <strong>{teamInfo.displayName}</strong> ({teamInfo.memberCount} member{teamInfo.memberCount === 1 ? '' : 's'}). Owner must approve.</>
                    )}
                    {teamInfo.status === 'error'    && 'Could not check team name.'}
                  </p>
                </div>

                {error && <p className="login-error">{error}</p>}

                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? 'Creating account…' : 'Create account'}
                </button>

                <p style={{
                  marginTop: 16,
                  fontSize: '0.8rem',
                  color: 'var(--app-text-secondary)',
                  textAlign: 'center',
                }}>
                  Already have an account?{' '}
                  <a
                    href="/login"
                    onClick={(e) => { e.preventDefault(); navigate({ to: '/login' }) }}
                    style={{ color: 'var(--app-text)', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    Sign in
                  </a>
                </p>
              </form>
            )}

            {step === 'check-email' && (
              <div className="status-panel">
                <p>We emailed <strong>{email}</strong> a verification link. Click it to continue — this tab will advance automatically.</p>
                <div className="pulse-dot" />
                <p className="fine-print">
                  {requiresApproval
                    ? 'After verification, the team owner will need to approve your join request.'
                    : 'After verification you\u2019ll be signed in automatically.'}
                </p>
                <p className="fine-print">
                  Didn{'\u2019'}t get an email? Check spam, or{' '}
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => setStep('form')}
                  >
                    try a different address
                  </button>.
                </p>
              </div>
            )}

            {step === 'awaiting-approval' && (
              <div className="status-panel">
                <p>Your email is verified. Now we{'\u2019'}re waiting for the team owner to approve your join request.</p>
                <div className="pulse-dot" />
                <p className="fine-print">
                  You{'\u2019'}ll be signed in automatically as soon as they approve.
                </p>
                <button
                  type="button"
                  className="btn-submit"
                  onClick={() => navigate({ to: '/login' })}
                  style={{ marginTop: 24 }}
                >
                  Go to sign in
                </button>
              </div>
            )}

            {step === 'done' && (
              <div className="status-panel">
                <p>All set. Redirecting you now{'\u2026'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

const registerCss = `
.login-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--app-bg);
  color: var(--app-text);
  overflow: hidden;
  position: relative;
  font-family: 'Segoe UI', system-ui, sans-serif;
}
.bg-animate {
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}
.circle {
  position: absolute;
  border-radius: 50%;
  background: var(--app-accent-gradient);
  filter: blur(80px);
  animation: move 20s infinite alternate;
  opacity: 0.3;
}
@keyframes move {
  from { transform: translate(-10%, -10%); }
  to   { transform: translate(20%, 20%); }
}
.login-container {
  position: relative;
  z-index: 1;
  width: 900px;
  max-width: calc(100vw - 40px);
  min-height: 580px;
  background: var(--app-glass);
  backdrop-filter: blur(20px);
  border: 1px solid var(--app-glass-border);
  border-radius: 30px;
  display: flex;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  animation: fadeIn 0.8s ease-out;
}
.mascot-section {
  flex: 1;
  background: rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
}
.mascot-section h3 {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 20px 0 6px;
  color: var(--app-text);
}
.mascot-subtitle {
  font-size: 0.8rem;
  color: var(--app-text-secondary);
  max-width: 220px;
}
.register-mark {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: rgba(255,255,255,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--app-text);
}
.reg-emoji {
  font-size: 48px;
  color: var(--app-text);
}
.form-section {
  flex: 1.2;
  padding: 40px 50px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.form-section h2 {
  font-size: 1.7rem;
  margin-bottom: 10px;
}
.login-input-group {
  margin-bottom: 14px;
}
.login-input-group label {
  display: block;
  font-size: 0.75rem;
  margin-bottom: 5px;
  color: var(--app-text-secondary);
}
.login-input-group input {
  width: 100%;
  padding: 11px;
  background: var(--app-glass);
  border: 1px solid var(--app-glass-border);
  border-radius: 10px;
  color: var(--app-text);
  outline: none;
  font-family: inherit;
  font-size: 0.9rem;
}
.login-input-group input:focus {
  border-color: var(--app-input-focus-border);
  box-shadow: 0 0 10px var(--app-btn-primary-shadow);
}
.team-hint {
  margin: 6px 2px 0;
  font-size: 0.75rem;
  min-height: 1em;
  line-height: 1.3;
}
.team-hint-idle    { color: transparent; }
.team-hint-checking{ color: var(--app-text-secondary); }
.team-hint-new     { color: #16a34a; }
.team-hint-existing{ color: #2563eb; }
.team-hint-error   { color: #dc2626; }
.btn-submit {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 10px;
  background: var(--app-btn-primary);
  color: var(--app-btn-text);
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
  transition: 0.3s;
  font-family: inherit;
  font-size: 0.95rem;
}
.btn-submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}
.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
.login-error {
  font-size: 0.8rem;
  color: #dc2626;
  margin: 4px 0 0;
}
.theme-btn {
  background: var(--app-glass);
  border: 1px solid var(--app-glass-border);
  border-radius: 8px;
  padding: 6px;
  cursor: pointer;
  color: var(--app-text);
  display: flex;
  align-items: center;
  justify-content: center;
}
.status-panel {
  font-size: 0.95rem;
  line-height: 1.55;
  color: var(--app-text);
}
.status-panel p { margin: 0 0 12px; }
.status-panel .fine-print {
  font-size: 0.8rem;
  color: var(--app-text-secondary);
  margin-top: 12px;
}
.link-btn {
  background: none;
  border: none;
  padding: 0;
  color: var(--app-text);
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
  font: inherit;
}
.pulse-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #2563eb;
  margin: 18px 0;
  animation: pulse 1.4s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.4; transform: scale(1);   }
  50%      { opacity: 1;   transform: scale(1.4); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@media (max-width: 768px) {
  .login-container { flex-direction: column; min-height: auto; margin: 20px; }
  .mascot-section  { display: none; }
}
`
