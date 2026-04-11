import { useState, useEffect } from 'react'

const css = `
.curtain-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--app-bg);
  font-family: 'Poppins', sans-serif;
  animation: curtainFadeIn 0.2s ease-out;
}

.curtain-overlay.curtain-exit {
  animation: curtainFadeOut 0.4s ease-in forwards;
}

@keyframes curtainFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes curtainFadeOut {
  from { opacity: 1; }
  to   { opacity: 0; }
}

/* ── Ship (120px version) ── */
.curtain-ship-wrap {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  background-color: #aae7ff;
  backface-visibility: hidden;
  transform: translate3d(0, 0, 0);
  margin-bottom: 24px;
}

.curtain-ship-wrap .c-wave {
  position: absolute;
  width: 240px;
  transform-origin: center center;
}

.curtain-ship-wrap .c-wave:before {
  content: "";
  position: absolute;
  left: 0;
  top: -3px;
  right: 0;
  background-repeat: repeat;
  height: 3px;
  background-size: 10px 10px;
  background-image: radial-gradient(circle at 2px -1px, transparent 2.4px, #91b9ff 2.4px);
}

.curtain-ship-wrap .c-wave:after {
  content: "";
  position: absolute;
  left: 0;
  top: -4px;
  right: 0;
  background-repeat: repeat;
  height: 4px;
  background-size: 20px 10px;
  background-image: radial-gradient(circle at 2px 3px, #91b9ff 2.4px, transparent 2.6px);
}

.curtain-ship-wrap .c-wave1 {
  height: 120px;
  background-color: #91b9ff;
  opacity: 0.8;
  animation: cwave1 15s ease-in-out infinite;
  bottom: -92px;
  z-index: 3;
}

.curtain-ship-wrap .c-wave2 {
  height: 120px;
  background-color: #91b9ff;
  opacity: 0.4;
  left: -30%;
  animation: cwave2 20s ease-out infinite;
  bottom: -88px;
  z-index: 1;
}

.curtain-ship-wrap .c-main {
  width: 30px;
  height: 7px;
  background-color: #684000;
  position: absolute;
  left: 0; right: 0;
  margin: auto;
  bottom: 27px;
  z-index: 2;
  animation: crocking 3s linear infinite;
}

.curtain-ship-wrap .c-main:before,
.curtain-ship-wrap .c-main:after {
  content: '';
  position: absolute;
  top: 0;
  width: 0;
  height: 0;
  border: 0;
}

.curtain-ship-wrap .c-main:before {
  left: -7px;
  border-top: 7px solid #684000;
  border-left: 7px solid transparent;
  border-bottom: 7px solid transparent;
}

.curtain-ship-wrap .c-main:after {
  right: -7px;
  border-top: 7px solid #684000;
  border-bottom: 7px solid transparent;
  border-right: 7px solid transparent;
}

.curtain-ship-wrap .c-mast {
  width: 1px;
  height: 30px;
  background-color: #684000;
  position: absolute;
  right: 20%;
  bottom: 7px;
  z-index: 2;
}

.curtain-ship-wrap .c-sail {
  width: 15px;
  height: 24px;
  background-color: #fff;
  position: absolute;
  right: 20%;
  top: -28px;
  border-top-left-radius: 100%;
}

.curtain-ship-wrap .c-sail:after {
  content: '';
  position: absolute;
  bottom: 0;
  right: 0;
  width: 110%;
  height: 1px;
  background-color: #684000;
}

.curtain-ship-wrap .c-fore {
  position: absolute;
  right: -1px;
  top: -35px;
  border-bottom: 24px solid #fff;
  border-right: 7px solid transparent;
  border-top: 6px solid transparent;
}

.curtain-ship-wrap .c-flag {
  background-color: red;
  position: absolute;
  top: -30px;
  right: 1px;
  width: 5px;
  height: 2px;
}

/* ── Sun ── */
.curtain-sun {
  position: absolute;
  top: 9px;
  right: 11px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #ffe066;
  box-shadow: 0 0 6px 2px rgba(255,220,50,0.5);
  z-index: 4;
  animation: csunpulse 3s ease-in-out infinite;
}

@keyframes csunpulse {
  0%, 100% { box-shadow: 0 0 6px 2px rgba(255,220,50,0.5); }
  50%       { box-shadow: 0 0 10px 4px rgba(255,220,50,0.7); }
}

@keyframes cwave1 {
  0%   { transform: translateX(0); }
  50%  { transform: translateX(-25%); }
  100% { transform: translateX(0); }
}

@keyframes cwave2 {
  0%   { transform: translateX(0); }
  50%  { transform: translateX(15%); }
  100% { transform: translateX(0); }
}

@keyframes crocking {
  0%   { transform: rotate(0); }
  75%  { transform: rotate(-3deg); }
  100% { transform: rotate(0); }
}

/* ── Loading dots ── */
.curtain-dots {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.curtain-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--app-text-secondary);
  animation: dotpulse 1.2s ease-in-out infinite;
}

.curtain-dots span:nth-child(2) { animation-delay: 0.2s; }
.curtain-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes dotpulse {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40%           { opacity: 1;   transform: scale(1.2); }
}
`

export function LoadingCurtain({ visible, message }: { visible: boolean; message?: string }) {
  const [show, setShow] = useState(visible)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (visible) {
      setShow(true)
      setExiting(false)
    } else if (show) {
      setExiting(true)
      const timer = setTimeout(() => { setShow(false); setExiting(false) }, 400)
      return () => clearTimeout(timer)
    }
  }, [visible])

  if (!show) return null

  return (
    <>
      <style>{css}</style>
      <div className={`curtain-overlay${exiting ? ' curtain-exit' : ''}`}>
        {/* Background blobs */}
        <div style={{ position: 'absolute', width: 300, height: 300, top: -80, left: -80, borderRadius: '50%', background: 'var(--app-accent-gradient)', filter: 'blur(80px)', opacity: 0.18, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 200, height: 200, bottom: -40, right: -40, borderRadius: '50%', background: 'var(--app-accent-gradient)', filter: 'blur(80px)', opacity: 0.18, pointerEvents: 'none' }} />

        <div className="curtain-ship-wrap">
          <div className="curtain-sun" />
          <div className="c-wave1 c-wave" />
          <div className="c-wave2 c-wave" />
          <div className="c-main">
            <div className="c-mast" />
            <div className="c-sail" />
            <div className="c-fore" />
            <div className="c-flag" />
          </div>
        </div>

        <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.85rem', fontWeight: 500, letterSpacing: '0.5px' }}>
          {message || 'Loading'}
        </p>
        <div className="curtain-dots">
          <span /><span /><span />
        </div>
      </div>
    </>
  )
}
