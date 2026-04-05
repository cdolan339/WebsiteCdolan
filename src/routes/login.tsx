import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { isAuthenticated, login } from '@/lib/auth'

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    if (typeof window !== 'undefined' && isAuthenticated()) {
      throw redirect({ to: '/homepage' })
    }
  },
  component: LoginPage,
})

const css = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');

:root {
  --primary: #00d2ff;
  --accent: #6a11cb;
  --bg-dark: #0f0c29;
  --glass: rgba(255, 255, 255, 0.1);
  --text: #ffffff;
}

.login-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f0c29;
  color: var(--text);
  overflow: hidden;
  position: relative;
  font-family: 'Poppins', sans-serif;
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
  background: linear-gradient(45deg, var(--accent), var(--primary));
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
  height: 580px;
  background: var(--glass);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 30px;
  display: flex;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  animation: fadeIn 0.8s ease-out;
}

.mascot-section {
  flex: 1;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
}

/* ── Ship animation ($loader-size: 240px compiled from SCSS) ── */
.ship-wrap {
  position: relative;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  overflow: hidden;
  background-color: #aae7ff;
  backface-visibility: hidden;
  transform: translate3d(0, 0, 0);
  margin-bottom: 20px;
}

.ship-wrap .wave {
  position: absolute;
  width: 480px;
  transform-origin: center center;
}

.ship-wrap .wave:before {
  content: "";
  position: absolute;
  left: 0;
  top: -4px;
  right: 0;
  background-repeat: repeat;
  height: 4px;
  background-size: 20px 20px;
  background-image: radial-gradient(circle at 4px -2px, transparent 4.8px, #91b9ff 4.8px);
}

.ship-wrap .wave:after {
  content: "";
  position: absolute;
  left: 0;
  top: -6px;
  right: 0;
  background-repeat: repeat;
  height: 6px;
  background-size: 40px 20px;
  background-image: radial-gradient(circle at 4px 6px, #91b9ff 4.8px, transparent 5.22px);
}

.ship-wrap .wave1 {
  height: 240px;
  background-color: #91b9ff;
  opacity: 0.8;
  animation: shipwave1 15s ease-in-out infinite;
  bottom: -184.62px;
  z-index: 3;
}

.ship-wrap .wave2 {
  height: 240px;
  background-color: #91b9ff;
  opacity: 0.4;
  left: -30%;
  animation: shipwave2 20s ease-out infinite;
  bottom: -177.78px;
  z-index: 1;
}

.ship-wrap .main {
  width: 60px;
  height: 13.33px;
  background-color: #684000;
  position: absolute;
  left: 0; right: 0;
  margin: auto;
  bottom: 53.33px;
  z-index: 2;
  animation: shiprocking 3s linear infinite;
}

.ship-wrap .main:before,
.ship-wrap .main:after {
  content: '';
  position: absolute;
  top: 0;
  width: 0;
  height: 0;
  border: 0;
}

.ship-wrap .main:before {
  left: -13.33px;
  border-top: 13.33px solid #684000;
  border-left: 13.33px solid transparent;
  border-bottom: 13.33px solid transparent;
}

.ship-wrap .main:after {
  right: -13.33px;
  border-top: 13.33px solid #684000;
  border-bottom: 13.33px solid transparent;
  border-right: 13.33px solid transparent;
}

.ship-wrap .main-mast {
  width: 1.5px;
  height: 60px;
  background-color: #684000;
  position: absolute;
  right: 20%;
  bottom: 13.33px;
  z-index: 2;
}

.ship-wrap .main-course {
  width: 30px;
  height: 48px;
  background-color: #fff;
  position: absolute;
  right: 20%;
  top: -57.14px;
  border-top-left-radius: 100%;
}

.ship-wrap .main-course:after {
  content: '';
  position: absolute;
  bottom: 0;
  right: 0;
  width: 110%;
  height: 1.5px;
  background-color: #684000;
}

.ship-wrap .fore-course {
  position: absolute;
  right: -1.33px;
  top: -70.59px;
  border-bottom: 48px solid #fff;
  border-right: 13.33px solid transparent;
  border-top: 12.63px solid transparent;
}

.ship-wrap .flag {
  background-color: red;
  position: absolute;
  top: -60px;
  right: 2.4px;
  width: 10px;
  height: 4px;
}

@keyframes shipwave1 {
  0%   { transform: translateX(0); }
  50%  { transform: translateX(-25%); }
  100% { transform: translateX(0); }
}

@keyframes shipwave2 {
  0%   { transform: translateX(0); }
  50%  { transform: translateX(15%); }
  100% { transform: translateX(0); }
}

@keyframes shiprocking {
  0%   { transform: rotate(0); }
  75%  { transform: rotate(-3deg); }
  100% { transform: rotate(0); }
}

/* ── Sun ── */
.ship-sun {
  position: absolute;
  top: 18px;
  right: 22px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #ffe066;
  box-shadow: 0 0 10px 4px rgba(255,220,50,0.5);
  z-index: 4;
  animation: sunpulse 3s ease-in-out infinite;
}

@keyframes sunpulse {
  0%, 100% { box-shadow: 0 0 10px 4px rgba(255,220,50,0.5); }
  50%       { box-shadow: 0 0 18px 8px rgba(255,220,50,0.7); }
}

/* ── Birds ── */
.ship-bird {
  position: absolute;
  z-index: 5;
  animation: birdfly linear infinite;
}

.ship-bird::before,
.ship-bird::after {
  content: '';
  position: absolute;
  width: 7px;
  height: 3px;
  border-top: 2px solid #444;
  border-radius: 50% 50% 0 0;
}

.ship-bird::before {
  left: 0;
  transform-origin: right center;
  animation: wingflap 0.5s ease-in-out infinite alternate;
}

.ship-bird::after {
  left: 6px;
  transform-origin: left center;
  animation: wingflap 0.5s ease-in-out infinite alternate-reverse;
}

@keyframes wingflap {
  from { transform: rotate(-20deg); }
  to   { transform: rotate(20deg); }
}

@keyframes birdfly {
  from { transform: translateX(260px); }
  to   { transform: translateX(-20px); }
}

.ship-bird:nth-child(1) { top: 28px; left: 0; animation-duration: 7s; animation-delay: 0s; }
.ship-bird:nth-child(2) { top: 38px; left: 0; animation-duration: 9s; animation-delay: -3s; }
.ship-bird:nth-child(3) { top: 20px; left: 0; animation-duration: 11s; animation-delay: -6s; }

.mascot-section h3 {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 6px;
  color: #fff;
  font-family: 'Poppins', sans-serif;
}

.mascot-subtitle {
  font-size: 0.8rem;
  color: rgba(255,255,255,0.6);
  font-family: 'Poppins', sans-serif;
}

.form-section {
  flex: 1.2;
  padding: 50px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.form-section h2 {
  font-size: 1.8rem;
  margin-bottom: 10px;
  font-family: 'Poppins', sans-serif;
}

.desc {
  font-size: 0.85rem;
  color: #ccc;
  margin-bottom: 25px;
  font-family: 'Poppins', sans-serif;
}

.login-input-group {
  margin-bottom: 15px;
}

.login-input-group label {
  display: block;
  font-size: 0.75rem;
  margin-bottom: 5px;
  color: var(--primary);
  font-family: 'Poppins', sans-serif;
}

.login-input-group input {
  width: 100%;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  color: white;
  outline: none;
  font-family: 'Poppins', sans-serif;
  font-size: 0.9rem;
}

.login-input-group input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 10px rgba(0, 210, 255, 0.1);
}

.login-input-group input::placeholder {
  color: rgba(255,255,255,0.3);
}

.btn-submit {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(45deg, var(--accent), var(--primary));
  color: white;
  font-weight: 600;
  cursor: pointer;
  margin-top: 15px;
  transition: 0.3s;
  font-family: 'Poppins', sans-serif;
  font-size: 0.95rem;
}

.btn-submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.login-error {
  font-size: 0.8rem;
  color: #ff6b6b;
  margin-bottom: 8px;
  font-family: 'Poppins', sans-serif;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@media (max-width: 768px) {
  .login-container { flex-direction: column; height: auto; margin: 20px; }
  .mascot-section  { display: none; }
}
`

function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const success = await login(username, password)
      if (success) {
        navigate({ to: '/homepage' })
      } else {
        setError('Invalid credentials.')
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
      <div className="login-wrapper">
        {/* Animated background blobs */}
        <div className="bg-animate">
          <div className="circle" style={{ width: '400px', height: '400px', top: '-100px', left: '-100px' }} />
          <div className="circle" style={{ width: '300px', height: '300px', bottom: '-50px', right: '-50px', animationDelay: '-5s' }} />
        </div>

        <div className="login-container">
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
            <p className="mascot-subtitle">Neural Testing Suite</p>
          </div>

          {/* Right — login form */}
          <div className="form-section">
            <h2>Welcome Back</h2>
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="login-input-group">
                <label>Username</label>
                <input
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError('') }}
                  autoFocus
                  autoComplete="username"
                />
              </div>
              <div className="login-input-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  autoComplete="current-password"
                />
              </div>
              {error && <p className="login-error">{error}</p>}
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Connecting…' : 'Initialize Session'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
