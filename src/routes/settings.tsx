import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

type SettingsTab = 'general' | 'account'

const TABS: { key: SettingsTab; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'account', label: 'Account' },
]

function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('general')

  return (
    <div className="min-h-screen text-foreground overflow-hidden relative" style={{ background: 'var(--app-bg)', fontFamily: "'Poppins', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
        @keyframes moveSettings {
          from { transform: translate(-10%, -10%); }
          to   { transform: translate(20%, 20%); }
        }
        .blob-settings {
          position: absolute;
          border-radius: 50%;
          background: var(--app-accent-gradient);
          filter: blur(80px);
          opacity: 0.18;
          animation: moveSettings 20s infinite alternate;
          pointer-events: none;
        }
      `}</style>
      <div className="blob-settings" style={{ width: 400, height: 400, top: -100, left: -100 }} />
      <div className="blob-settings" style={{ width: 300, height: 300, bottom: -50, right: -50, animationDelay: '-5s' }} />

      <div className="max-w-4xl mx-auto px-4 pt-8 pb-16 relative z-10">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Sidebar */}
          <nav className="w-full md:w-48 flex-shrink-0">
            <ul className="flex flex-row md:flex-col gap-1">
              {TABS.map((t) => (
                <li key={t.key}>
                  <button
                    onClick={() => setTab(t.key)}
                    className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                    style={tab === t.key ? {
                      background: 'var(--app-section-header-bg)',
                      color: 'var(--app-text)',
                      border: '1px solid var(--app-glass-border)',
                    } : {
                      background: 'transparent',
                      color: 'var(--app-text-secondary)',
                      border: '1px solid transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (tab !== t.key) e.currentTarget.style.background = 'var(--app-glass)'
                    }}
                    onMouseLeave={(e) => {
                      if (tab !== t.key) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    {t.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div
              className="rounded-xl p-5 md:p-8"
              style={{
                background: 'var(--app-glass)',
                border: '1px solid var(--app-glass-border)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <h2 className="text-xl font-semibold mb-2 capitalize">{tab}</h2>
              <p className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>
                {tab === 'general'
                  ? 'General application settings will appear here.'
                  : 'Account and profile settings will appear here.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
