import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { isAuthenticated, login } from '@/lib/auth'
import { LoadingCurtain } from '@/components/LoadingCurtain'
import { useTheme } from '@/lib/theme'
import { Sun, Moon, ArrowRight } from 'lucide-react'

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    if (typeof window !== 'undefined' && isAuthenticated()) {
      throw redirect({ to: '/homepage' })
    }
  },
  component: LoginPage,
})

const css = `
.login-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  color: var(--ink);
  position: relative;
  padding: 32px 20px;
}

.login-atmos {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.login-atmos::before,
.login-atmos::after {
  content: "";
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.35;
}
.login-atmos::before {
  width: 520px; height: 520px;
  top: -180px; left: -160px;
  background: radial-gradient(circle, var(--purple), transparent 70%);
}
.login-atmos::after {
  width: 480px; height: 480px;
  bottom: -160px; right: -140px;
  background: radial-gradient(circle, var(--pink), transparent 70%);
}

.login-card {
  position: relative;
  z-index: 1;
  width: 980px;
  max-width: 100%;
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(20,20,40,0.10);
  animation: fadeIn 0.5s ease-out;
}

.mascot-section {
  position: relative;
  padding: 40px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: linear-gradient(160deg,
    color-mix(in oklab, var(--purple) 14%, var(--panel)),
    color-mix(in oklab, var(--pink) 10%, var(--panel)) 70%);
  border-right: 1px solid var(--border);
}

.mascot-section h3 {
  font-size: 18px;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: -0.01em;
  margin: 18px 0 4px;
}
.mascot-subtitle {
  font-size: 13px;
  color: var(--mute);
  margin: 0;
}

/* ── Ship animation (unchanged dimensions) ── */
.ship-wrap {
  position: relative;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  overflow: hidden;
  background-color: #aae7ff;
  transform: translate3d(0, 0, 0);
  box-shadow: 0 18px 40px rgba(124,92,255,0.25);
}
.ship-wrap .wave { position: absolute; width: 440px; transform-origin: center center; }
.ship-wrap .wave:before {
  content: ""; position: absolute; left: 0; top: -4px; right: 0;
  background-repeat: repeat; height: 4px; background-size: 20px 20px;
  background-image: radial-gradient(circle at 4px -2px, transparent 4.8px, #91b9ff 4.8px);
}
.ship-wrap .wave:after {
  content: ""; position: absolute; left: 0; top: -6px; right: 0;
  background-repeat: repeat; height: 6px; background-size: 40px 20px;
  background-image: radial-gradient(circle at 4px 6px, #91b9ff 4.8px, transparent 5.22px);
}
.ship-wrap .wave1 { height: 220px; background-color: #91b9ff; opacity: 0.8; animation: shipwave1 15s ease-in-out infinite; bottom: -169px; z-index: 3; }
.ship-wrap .wave2 { height: 220px; background-color: #91b9ff; opacity: 0.4; left: -30%; animation: shipwave2 20s ease-out infinite; bottom: -163px; z-index: 1; }
.ship-wrap .main {
  width: 55px; height: 12px; background-color: #684000; position: absolute;
  left: 0; right: 0; margin: auto; bottom: 49px; z-index: 2;
  animation: shiprocking 3s linear infinite;
}
.ship-wrap .main:before, .ship-wrap .main:after { content: ''; position: absolute; top: 0; width: 0; height: 0; border: 0; }
.ship-wrap .main:before { left: -12px; border-top: 12px solid #684000; border-left: 12px solid transparent; border-bottom: 12px solid transparent; }
.ship-wrap .main:after  { right: -12px; border-top: 12px solid #684000; border-bottom: 12px solid transparent; border-right: 12px solid transparent; }
.ship-wrap .main-mast { width: 1.5px; height: 55px; background-color: #684000; position: absolute; right: 20%; bottom: 12px; z-index: 2; }
.ship-wrap .main-course { width: 28px; height: 44px; background-color: #fff; position: absolute; right: 20%; top: -52px; border-top-left-radius: 100%; }
.ship-wrap .main-course:after { content: ''; position: absolute; bottom: 0; right: 0; width: 110%; height: 1.5px; background-color: #684000; }
.ship-wrap .fore-course { position: absolute; right: -1.3px; top: -65px; border-bottom: 44px solid #fff; border-right: 12px solid transparent; border-top: 11.6px solid transparent; }
.ship-wrap .flag { background-color: red; position: absolute; top: -55px; right: 2.4px; width: 10px; height: 4px; }

.ship-sun {
  position: absolute; top: 16px; right: 20px;
  width: 26px; height: 26px; border-radius: 50%;
  background: #ffe066; box-shadow: 0 0 10px 4px rgba(255,220,50,0.5);
  z-index: 4; animation: sunpulse 3s ease-in-out infinite;
}

.ship-bird {
  position: absolute; z-index: 5;
  animation: birdfly linear infinite;
}
.ship-bird::before, .ship-bird::after {
  content: ''; position: absolute; width: 7px; height: 3px;
  border-top: 2px solid #444; border-radius: 50% 50% 0 0;
}
.ship-bird::before { left: 0; transform-origin: right center; animation: wingflap 0.5s ease-in-out infinite alternate; }
.ship-bird::after  { left: 6px; transform-origin: left center; animation: wingflap 0.5s ease-in-out infinite alternate-reverse; }
.ship-bird:nth-child(2) { top: 28px; left: 0; animation-duration: 7s; animation-delay: 0s; }
.ship-bird:nth-child(3) { top: 38px; left: 0; animation-duration: 9s; animation-delay: -3s; }
.ship-bird:nth-child(4) { top: 20px; left: 0; animation-duration: 11s; animation-delay: -6s; }

@keyframes shipwave1 { 0%,100% { transform: translateX(0); } 50% { transform: translateX(-25%); } }
@keyframes shipwave2 { 0%,100% { transform: translateX(0); } 50% { transform: translateX(15%); } }
@keyframes shiprocking { 0%,100% { transform: rotate(0); } 75% { transform: rotate(-3deg); } }
@keyframes sunpulse { 0%,100% { box-shadow: 0 0 10px 4px rgba(255,220,50,0.5); } 50% { box-shadow: 0 0 18px 8px rgba(255,220,50,0.7); } }
@keyframes wingflap { from { transform: rotate(-20deg); } to { transform: rotate(20deg); } }
@keyframes birdfly { from { transform: translateX(240px); } to { transform: translateX(-20px); } }

.form-section {
  padding: 52px 56px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 18px;
}

.form-head {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
}

.form-title {
  font-size: 30px;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: -0.02em;
  margin: 0;
  line-height: 1.1;
}

.form-sub {
  font-size: 14px;
  color: var(--mute);
  margin: 0;
}

.theme-btn {
  width: 36px; height: 36px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  cursor: pointer;
  color: var(--mute);
  display: inline-grid; place-items: center;
  box-shadow: var(--shadow-xs);
  transition: color .15s, background .15s;
}
.theme-btn:hover { color: var(--ink); background: var(--chip); }

.field { display: flex; flex-direction: column; gap: 6px; }
.field label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--mute);
}
.field input {
  width: 100%;
  padding: 12px 14px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--ink);
  outline: none;
  font-family: inherit;
  font-size: 14px;
  transition: border-color .15s, box-shadow .15s;
}
.field input::placeholder { color: color-mix(in oklab, var(--mute) 80%, transparent); }
.field input:focus {
  border-color: color-mix(in oklab, var(--purple) 55%, var(--border));
  box-shadow: 0 0 0 4px color-mix(in oklab, var(--purple) 14%, transparent);
}

.login-submit {
  width: 100%;
  padding: 13px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(105deg, var(--purple), var(--pink));
  color: white;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  margin-top: 6px;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  box-shadow: 0 10px 24px color-mix(in oklab, var(--purple) 35%, transparent);
  transition: transform .15s, box-shadow .15s, opacity .15s;
}
.login-submit:hover { transform: translateY(-1px); box-shadow: 0 14px 30px color-mix(in oklab, var(--purple) 40%, transparent); }
.login-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

.login-error {
  font-size: 12.5px;
  color: var(--red);
  background: color-mix(in oklab, var(--red) 10%, transparent);
  border: 1px solid color-mix(in oklab, var(--red) 28%, transparent);
  padding: 10px 12px;
  border-radius: 10px;
  margin: 0;
}

.login-footer {
  font-size: 13px;
  color: var(--mute);
  text-align: center;
  margin: 10px 0 0;
}
.login-footer a {
  color: var(--ink);
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  border-bottom: 1px dashed color-mix(in oklab, var(--ink) 40%, transparent);
}
.login-footer a:hover { color: var(--purple); border-color: color-mix(in oklab, var(--purple) 60%, transparent); }

@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }

@media (max-width: 860px) {
  .login-card { grid-template-columns: 1fr; }
  .mascot-section { display: none; }
  .form-section { padding: 36px 28px; }
}
`

function LoginPage() {
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [transitioning, setTransitioning] = useState(false)

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await login(username, password)
      if (result.ok) {
        setTransitioning(true)
        setTimeout(() => navigate({ to: '/homepage' }), 600)
      } else if (result.needsVerification) {
        setError('Please verify your email before signing in. Check your inbox for the verification link.')
      } else if (result.needsApproval) {
        setError('Your team join request is still pending approval by the team owner.')
      } else {
        setError(result.error || 'Invalid credentials.')
      }
    } catch {
      setError('Connection error. Is the API server running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{css}</style>
      <LoadingCurtain visible={transitioning} message="Initializing Session" />
      <div className="login-wrapper">
        <div className="login-atmos" aria-hidden />

        <div className="login-card">
          {/* Left — ship mascot */}
          <div className="mascot-section">
            <div className="ship-wrap">
              <div className="ship-sun" />
              <div className="ship-bird" />
              <div className="ship-bird" />
              <div className="ship-bird" />
              <div className="wave1 wave" />
              <div className="wave2 wave" />
              <div className="ship">
                <div className="main">
                  <div className="main-mast" />
                  <div className="main-course" />
                  <div className="fore-course" />
                  <div className="flag" />
                </div>
              </div>
            </div>
            <h3>QA &amp; BA Assistant</h3>
            <p className="mascot-subtitle">Neural testing suite</p>
          </div>

          {/* Right — login form */}
          <div className="form-section">
            <div className="form-head">
              <div>
                <h1 className="form-title">Sign in</h1>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="theme-btn"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                title={isDark ? 'Light mode' : 'Dark mode'}
              >
                {isDark ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
              <div className="field">
                <label htmlFor="login-username">Username</label>
                <input
                  id="login-username"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError('') }}
                  autoFocus
                  autoComplete="username"
                />
              </div>
              <div className="field">
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  autoComplete="current-password"
                />
              </div>
              {error && <p className="login-error">{error}</p>}
              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? 'Connecting…' : 'Initialize session'}
                {!loading && <ArrowRight size={15} />}
              </button>
              <p className="login-footer">
                No account yet?{' '}
                <a
                  href="/register"
                  onClick={(e) => { e.preventDefault(); navigate({ to: '/register' }) }}
                >
                  Create one
                </a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
