import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { isAuthenticated } from '@/lib/auth'
import { useEffect, useState } from 'react'
import {
  ArrowRight, Play, Sun, Moon, Check, GitBranch, Plus,
  MessageSquare, Layers, Tag, Sparkles,
} from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { Icon, Pill, PriorityPill, AvatarStack, CaseBar } from '@/components/design/primitives'
import { LoadingCurtain } from '@/components/LoadingCurtain'
import '../styles/landing.css'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  const navigate = useNavigate()
  const authed = isAuthenticated()

  useEffect(() => {
    if (authed) navigate({ to: '/homepage', replace: true })
  }, [navigate, authed])

  if (authed) return <LoadingCurtain visible message="Loading" />

  return (
    <div className="landing" data-tone="technical">
      <LandingNav />
      <main>
        <Hero />
        <LogoWall />
        <FeatureGrid />
        <Walkthrough />
        <Workflow />
        <Testimonials />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  )
}

/* ============================================================
 * NAV
 * ============================================================ */
function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const { isDark, toggleTheme } = useTheme()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`L-nav${scrolled ? ' scrolled' : ''}`}>
      <div className="L-frame L-nav-inner">
        <a href="#" className="L-logo">
          <span className="L-logo-mark" aria-hidden="true" />
          cdolanqa
        </a>
        <div className="L-nav-links">
          <a href="#product" className="L-nav-link">Product</a>
          <a href="#workflow" className="L-nav-link">How it works</a>
          <a href="#pricing" className="L-nav-link">Pricing</a>
          <a href="#" className="L-nav-link">Changelog</a>
          <a href="#" className="L-nav-link">Docs</a>
        </div>
        <div className="L-nav-actions">
          <Link to="/login" className="L-nav-signin">Sign in</Link>
          <button
            className="L-theme-toggle"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <a href="#cta" className="L-btn L-btn-primary">
            Get started <ArrowRight size={13} />
          </a>
        </div>
      </div>
    </nav>
  )
}

/* ============================================================
 * HERO
 * ============================================================ */
function Hero() {
  return (
    <section className="L-hero" data-variant="split">
      <div className="L-hero-orb" />
      <div className="L-frame">
        <div className="L-hero-grid">
          <div className="L-hero-content">
            <span className="L-eyebrow">
              <span className="dot" />
              v0.4 · Now in private beta
            </span>
            <h1 className="L-display">
              The execution layer for <em>product teams</em> that ship.
            </h1>
            <p className="L-lede">
              Projects, stories, and test suites — all linked. Stop copying status between Jira, Notion, and TestRail.
            </p>
            <div className="L-btn-row">
              <a href="#cta" className="L-btn L-btn-primary">
                Get started <ArrowRight size={14} />
              </a>
              <a href="#workflow" className="L-btn L-btn-ghost">
                <Play size={14} /> Watch the tour · 2 min
              </a>
            </div>
          </div>
          <div className="L-hero-art-wrap">
            <HeroArt />
            {/* Float cards live outside L-hero-art so they aren't clipped */}
            <div className="L-float-card" style={{ top: 100, left: -28 }}>
              <span style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'color-mix(in oklab, var(--green) 18%, transparent)',
                color: 'var(--green)', display: 'grid', placeItems: 'center',
              }}>
                <Check size={15} />
              </span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 12.5 }}>Test passed</div>
                <div className="tz-mono" style={{ fontSize: 10.5, color: 'var(--mute)' }}>Rate-limit · 22/22</div>
              </div>
            </div>
            <div className="L-float-card" style={{ bottom: 90, right: -32 }}>
              <span style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'color-mix(in oklab, var(--purple) 16%, transparent)',
                color: 'var(--purple)', display: 'grid', placeItems: 'center',
              }}>
                <GitBranch size={14} />
              </span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 12.5 }}>Story linked</div>
                <div className="tz-mono" style={{ fontSize: 10.5, color: 'var(--mute)' }}>STR-238 → PR #1042</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function HeroArt() {
  const rows: Array<{
    title: string
    priority: 'high' | 'med'
    cases: { pass: number; fail: number; pending: number }
    total: number
  }> = [
    { title: 'Onboarding of Bank Connection', priority: 'high', cases: { pass: 12, fail: 1, pending: 4 }, total: 17 },
    { title: 'Multi-currency payout rules', priority: 'med', cases: { pass: 3, fail: 0, pending: 19 }, total: 22 },
    { title: 'Rate-limit behavior at 429', priority: 'med', cases: { pass: 22, fail: 0, pending: 0 }, total: 22 },
  ]
  const metrics = [
    { icon: 'folder' as const, grad: 'grad-purple', label: 'PROJECTS', val: 4 },
    { icon: 'book' as const, grad: 'grad-pink', label: 'STORIES', val: 23 },
    { icon: 'clipboard' as const, grad: 'grad-orange', label: 'TEST SUITES', val: 41 },
  ]

  return (
    <div className="L-hero-art">
      <div className="L-mini-toolbar">
        <div className="L-traffic"><span /><span /><span /></div>
        <div className="L-url">cdolanqa.com / projects / sprint-12-regression</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <span className="tz-pill neutral" style={{ fontSize: 10.5 }}>
            <Icon name="users" size={10} /> 5
          </span>
        </div>
      </div>

      <div style={{ padding: '22px 24px 26px' }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span className="eyebrow-chip" style={{ background: 'color-mix(in oklab, var(--purple) 12%, transparent)' }}>
            <Icon name="folder" size={10} /> Sprint 12 Regression
          </span>
          <Pill tone="amber" icon="alert">14d overdue</Pill>
          <span style={{ flex: 1 }} />
          <AvatarStack
            people={[
              { name: 'Christian', color: '#7C5CFF' },
              { name: 'Mira', color: '#E85AA8' },
              { name: 'Jun', color: '#F28B3B' },
              { name: 'Bea', color: '#1E9F6E' },
              { name: 'Ada', color: '#3A6DF0' },
            ]}
            max={4}
            size={22}
          />
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.025em', marginTop: 8, color: 'var(--ink)' }}>
          Last sprint before release · 38/44 stories shipped
        </div>

        {/* Metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 18 }}>
          {metrics.map((m) => (
            <div key={m.label} className="panel" style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className={`section-icon ${m.grad}`} style={{ width: 30, height: 30, borderRadius: 8 }}>
                  <Icon name={m.icon} size={16} />
                </div>
                <div>
                  <div className="tz-mono" style={{ fontSize: 9.5, color: 'var(--mute)', letterSpacing: '0.08em' }}>{m.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.05, color: 'var(--ink)' }}>{m.val}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Story rows */}
        <div className="panel" style={{ marginTop: 14, padding: 0, overflow: 'hidden' }}>
          <div className="L-mini-rows">
            {rows.map((r) => (
              <div key={r.title} className="L-mini-row">
                <span style={{ color: 'var(--pink)' }}><Icon name="file-text" size={13} /></span>
                <span className="title tz-truncate">{r.title}</span>
                <PriorityPill level={r.priority} />
                <Pill tone="purple" icon="branch">Sprint 12</Pill>
                <div style={{ width: 84 }}>
                  <div className="tz-mono" style={{
                    fontSize: 10, color: 'var(--mute)', marginBottom: 2,
                    display: 'flex', justifyContent: 'space-between',
                  }}>
                    <span>{r.cases.pass}/{r.total}</span>
                    <span>{Math.round((r.cases.pass / r.total) * 100)}%</span>
                  </div>
                  <CaseBar cases={r.cases} total={r.total} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
 * LOGO WALL
 * ============================================================ */
function LogoWall() {
  const logos = ['Northwind', 'Halcyon', 'Forge & Co.', 'Latitude', 'Beacon', 'Mercato']
  return (
    <section>
      <div className="L-frame L-logos">
        <div className="L-logos-label">Trusted by product teams at</div>
        {logos.map((name) => (
          <div key={name} className="L-logo-item">
            <span style={{
              width: 14, height: 14, borderRadius: 4,
              background: 'color-mix(in oklab, var(--mute) 30%, transparent)',
              display: 'inline-block',
            }} />
            {name}
          </div>
        ))}
      </div>
    </section>
  )
}

/* ============================================================
 * FEATURE GRID
 * ============================================================ */
function FeatureGrid() {
  return (
    <section className="L-section" id="product">
      <div className="L-frame">
        <div className="L-section-head">
          <span className="L-eyebrow"><Layers size={11} /> The three primitives</span>
          <h2 className="L-headline">
            Projects, Stories, and Test Suites.<br /><em>One system. Linked end-to-end.</em>
          </h2>
          <p className="L-lede">
            Most tools force you to choose: a ticket tracker, a spec doc, a test management system. cdolanqa merges all three so context never leaks between tabs.
          </p>
        </div>
        <div className="L-feature-grid">
          <FeatureCard
            icon={<Icon name="folder" size={20} />}
            accent="var(--purple)"
            title="Projects"
            desc="Group work by initiative, sprint, or product line. Roll up status, ownership, and risk without rebuilding the dashboard every Monday."
            viz={<FeatureProjectsViz />}
          />
          <FeatureCard
            icon={<Icon name="book" size={20} />}
            accent="var(--pink)"
            title="Stories"
            desc="Specs that don't go stale. Branching acceptance criteria, design links, and embedded discussion stay attached to the story — not in someone's tab."
            viz={<FeatureStoriesViz />}
          />
          <FeatureCard
            icon={<Icon name="clipboard" size={20} />}
            accent="var(--orange)"
            title="Test Suites"
            desc="Cases that live next to the work they verify. Run them manually or wire into your CI — results stream back to the story automatically."
            viz={<FeatureSuitesViz />}
          />
        </div>
      </div>
    </section>
  )
}

function FeatureCard({ icon, accent, title, desc, viz }: {
  icon: React.ReactNode
  accent: string
  title: string
  desc: string
  viz: React.ReactNode
}) {
  return (
    <div className="L-feature-card">
      <div className="L-feature-icon" style={{
        background: `linear-gradient(135deg, ${accent}, color-mix(in oklab, ${accent} 70%, black))`,
      }}>
        {icon}
      </div>
      <h3 className="L-feature-title">{title}</h3>
      <p className="L-feature-desc">{desc}</p>
      <div className="L-feature-viz">{viz}</div>
    </div>
  )
}

function FeatureProjectsViz() {
  const projects = [
    { name: 'Sprint 12 Regression', tone: 'amber', note: '14d overdue', pct: 86 },
    { name: 'KYC Rewrite', tone: 'blue', note: 'On track', pct: 40 },
    { name: 'Checkout v4', tone: 'green', note: 'Ready to ship', pct: 94 },
  ]
  const noteColor: Record<string, string> = {
    amber: '#7A5409',
    blue: '#1C44B5',
    green: '#0B6F49',
  }
  const noteBg: Record<string, string> = {
    amber: 'var(--amber-soft)',
    blue: 'var(--blue-soft)',
    green: 'var(--green-soft)',
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {projects.map((p) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
          <span style={{ color: 'var(--purple)' }}><Icon name="folder" size={13} /></span>
          <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }} className="tz-truncate">{p.name}</span>
          <div style={{ width: 60, height: 4, background: 'var(--chip)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: p.pct + '%', height: '100%', background: 'var(--purple)' }} />
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '1px 6px', borderRadius: 999, fontSize: 10, fontWeight: 500,
            background: noteBg[p.tone], color: noteColor[p.tone],
          }}>{p.note}</span>
        </div>
      ))}
    </div>
  )
}

function FeatureStoriesViz() {
  const stories = [
    { title: 'Onboarding of Bank Connection', prio: 'high' as const, branch: 3, tests: 8 },
    { title: 'Multi-currency payout rules', prio: 'med' as const, branch: 5, tests: 11 },
    { title: 'Self-serve refunds (Tier 1)', prio: 'low' as const, branch: 2, tests: 6 },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {stories.map((s) => (
        <div key={s.title} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <span style={{ color: 'var(--pink)' }}><Icon name="file-text" size={13} /></span>
          <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }} className="tz-truncate">{s.title}</span>
          <PriorityPill level={s.prio} />
          <span className="tz-mono" style={{ fontSize: 10, color: 'var(--mute)', display: 'flex', gap: 8 }}>
            <span><Icon name="branch" size={9} /> {s.branch}</span>
            <span><Icon name="clipboard" size={9} /> {s.tests}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

function FeatureSuitesViz() {
  const suites: Array<{
    name: string
    cases: { pass: number; fail: number; pending?: number; blocked?: number }
    total: number
    time: string
  }> = [
    { name: 'Rate-limit at 429', cases: { pass: 22, fail: 0, pending: 0 }, total: 22, time: '3m 41s' },
    { name: 'Passport OCR', cases: { pass: 8, fail: 3, pending: 2, blocked: 1 }, total: 14, time: '4m 02s' },
    { name: 'Session Test', cases: { pass: 14, fail: 0, pending: 0 }, total: 14, time: '58s' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {suites.map((t) => (
        <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <span style={{ color: 'var(--orange)' }}><Icon name="clipboard" size={13} /></span>
          <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }} className="tz-truncate">{t.name}</span>
          <div style={{ width: 72 }}>
            <CaseBar cases={t.cases} total={t.total} height={4} />
          </div>
          <span className="tz-mono" style={{ fontSize: 10, color: 'var(--mute)', minWidth: 48, textAlign: 'right' }}>{t.time}</span>
        </div>
      ))}
    </div>
  )
}

/* ============================================================
 * WALKTHROUGH
 * ============================================================ */
function Walkthrough() {
  const steps = [
    {
      n: '01', eyebrow: 'Plan',
      title: 'Start with the project. Branch into stories.',
      body: 'Spin up a project, pull in your team, drop in references. cdolanqa keeps the brief, designs, and conversation attached to the work — not buried in a doc somewhere.',
      art: <WalkArtPlan />,
    },
    {
      n: '02', eyebrow: 'Specify',
      title: 'Stories with branching acceptance criteria.',
      body: 'Write the spec once. Mark steps as acceptance criteria and cdolanqa mirrors them into runnable test cases. When the spec changes, the tests get flagged for review — never silently out of sync.',
      art: <WalkArtSpec />,
    },
    {
      n: '03', eyebrow: 'Verify',
      title: 'Run suites manually or from CI. Results land on the story.',
      body: 'Manual runs in-app for QA. Automation hooks for engineering. Either way, every pass and fail attaches itself to the story it verifies, with full history.',
      art: <WalkArtVerify />,
    },
  ]

  return (
    <section className="L-section">
      <div className="L-frame">
        <div className="L-section-head center">
          <span className="L-eyebrow"><Play size={11} /> The walkthrough</span>
          <h2 className="L-headline">A tour through one feature, from idea to ship.</h2>
          <p className="L-lede">
            Follow how a single onboarding story moves from project brief, to spec, to a passing test suite — without anyone copying anything between tools.
          </p>
        </div>
        {steps.map((s) => (
          <div key={s.n} className="L-walkthrough-step">
            <div className="L-walkthrough-text">
              <div className="L-step-num">STEP {s.n} · {s.eyebrow.toUpperCase()}</div>
              <h3 className="L-headline" style={{ fontSize: 30, margin: '0 0 14px' }}>{s.title}</h3>
              <p className="L-lede" style={{ fontSize: 16 }}>{s.body}</p>
            </div>
            <div className="L-walkthrough-art">{s.art}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function WalkArtPlan() {
  return (
    <div className="panel" style={{ padding: 20, borderRadius: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span className="eyebrow-chip"><Icon name="folder" size={10} /> Onboarding revamp</span>
        <Pill tone="blue" icon="target">Q2 2026</Pill>
        <span style={{ flex: 1 }} />
        <AvatarStack people={[
          { name: 'Christian', color: '#7C5CFF' },
          { name: 'Mira', color: '#E85AA8' },
          { name: 'Jun', color: '#F28B3B' },
        ]} size={22} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 6, color: 'var(--ink)' }}>
        Reduce drop-off in first 60 seconds.
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--mute)', lineHeight: 1.55, marginBottom: 14 }}>
        Audit the existing onboarding, identify the 3 highest-impact frictions, ship fixes for each behind a feature flag.
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Pill tone="purple" icon="tag">Onboarding</Pill>
        <Pill tone="purple" icon="tag">Activation</Pill>
        <Pill tone="neutral" icon="calendar">Due Jun 25</Pill>
      </div>
    </div>
  )
}

function WalkArtSpec() {
  const steps = [
    { txt: "User taps 'Connect your bank' on home", branch: false, ac: false },
    { txt: 'Plaid sheet opens with last-used bank pre-selected', branch: false, ac: true },
    { txt: "On success, account appears with 'Verifying…' state", branch: true, ac: true },
    { txt: 'On Plaid error: show retry + manual ACH fallback', branch: true, ac: true },
  ]
  return (
    <div className="panel" style={{ padding: 18, borderRadius: 12, fontSize: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ color: 'var(--pink)' }}><Icon name="file-text" size={14} /></span>
        <span style={{ fontWeight: 600 }}>STR-238 · Bank Connection</span>
        <PriorityPill level="high" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px',
            background: s.ac ? 'color-mix(in oklab, var(--green) 8%, transparent)' : 'var(--panel-2)',
            border: `1px solid ${s.ac ? 'color-mix(in oklab, var(--green) 25%, transparent)' : 'var(--border)'}`,
            borderRadius: 8,
          }}>
            <span className="tz-mono" style={{ fontSize: 10, color: 'var(--mute)', width: 24 }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span style={{ flex: 1, fontSize: 12.5 }}>{s.txt}</span>
            {s.branch && <Pill tone="purple" icon="branch">branch</Pill>}
            {s.ac && <Pill tone="green" icon="check">AC</Pill>}
          </div>
        ))}
      </div>
    </div>
  )
}

function WalkArtVerify() {
  const cases = [
    { name: "Tap connect — Plaid sheet opens", t: '1.2s' },
    { name: 'Pre-selected bank visible', t: '0.4s' },
    { name: 'Success state with verifying badge', t: '0.6s' },
    { name: 'Error → ACH fallback path', t: '2.1s' },
    { name: 'Account persists across reload', t: '0.3s' },
  ]
  return (
    <div className="panel" style={{ padding: 18, borderRadius: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ color: 'var(--orange)' }}><Icon name="clipboard" size={14} /></span>
        <span style={{ fontWeight: 600, fontSize: 13.5 }}>Bank Connection · Suite</span>
        <Pill tone="green" icon="check">PASS</Pill>
        <span style={{ flex: 1 }} />
        <span className="tz-mono" style={{ fontSize: 10.5, color: 'var(--mute)' }}>Last run · 4m ago</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
        {cases.map((c) => (
          <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', fontSize: 12 }}>
            <span style={{ color: 'var(--green)' }}><Icon name="check-circle" size={13} /></span>
            <span style={{ flex: 1 }}>{c.name}</span>
            <span className="tz-mono" style={{ fontSize: 10.5, color: 'var(--mute)' }}>{c.t}</span>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5, color: 'var(--mute)',
      }}>
        <Icon name="branch" size={12} />
        <span className="tz-mono">main @ a3f912e</span>
        <span style={{ flex: 1 }} />
        <Icon name="link" size={12} />
        <span>linked to STR-238</span>
      </div>
    </div>
  )
}

/* ============================================================
 * WORKFLOW DIAGRAM
 * ============================================================ */
function Workflow() {
  const nodes = [
    { icon: <Sparkles size={24} />, label: 'Idea', sub: 'Captured in the project brief', color: 'var(--purple)' },
    { icon: <Icon name="folder" size={24} />, label: 'Project', sub: 'Goals, team, timeline', color: 'var(--pink)' },
    { icon: <Icon name="book" size={24} />, label: 'Story', sub: 'Spec + acceptance criteria', color: '#D9528A' },
    { icon: <Icon name="clipboard" size={24} />, label: 'Test Suite', sub: 'Cases ↔ AC, run history', color: 'var(--orange)' },
    { icon: <Icon name="check-circle" size={24} />, label: 'Shipped', sub: 'Linked release notes', color: 'var(--green)' },
  ]

  return (
    <section className="L-section" id="workflow">
      <div className="L-frame">
        <div className="L-section-head center">
          <span className="L-eyebrow"><Layers size={11} /> How it connects</span>
          <h2 className="L-headline">Every layer links to the one above it.</h2>
          <p className="L-lede">No more reconciliation meetings. Status rolls up automatically because every artifact has a parent.</p>
        </div>
        <div className="L-workflow">
          <div className="L-workflow-nodes">
            <div className="L-workflow-connector" />
            {nodes.map((n) => (
              <div key={n.label} className="L-workflow-node">
                <div className="L-workflow-bubble" style={{ background: n.color, color: n.color }}>
                  <span style={{ color: 'white' }}>{n.icon}</span>
                </div>
                <div className="L-workflow-label">{n.label}</div>
                <div className="L-workflow-sub">{n.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ============================================================
 * TESTIMONIALS
 * ============================================================ */
function Testimonials() {
  const quotes = [
    {
      text: 'We replaced Jira, a Notion vault, and TestRail with cdolanqa. The bus factor of our QA process went from 1 to the whole team in a quarter.',
      name: 'Priya Shah',
      role: 'Head of Product, Mercato',
      color: '#7C5CFF',
    },
    {
      text: 'The fact that acceptance criteria automatically generate test cases sounds boring until you watch a designer change a spec and see the affected tests light up.',
      name: 'Marcus Lo',
      role: 'Staff Engineer, Halcyon',
      color: '#E85AA8',
    },
    {
      text: "I'm a one-person QA team for an eight-engineer crew. cdolanqa is the first tool that made that feel doable rather than impossible.",
      name: 'Sasha Reyes',
      role: 'QA Lead, Northwind',
      color: '#F28B3B',
    },
  ]

  return (
    <section className="L-section">
      <div className="L-frame">
        <div className="L-section-head">
          <span className="L-eyebrow"><MessageSquare size={11} /> What teams say</span>
          <h2 className="L-headline">Built with input from PMs, engineers, and QA leads in beta.</h2>
        </div>
        <div className="L-testimonial-grid">
          {quotes.map((q) => (
            <div key={q.name} className="L-testimonial">
              <div className="L-quote-mark">"</div>
              <p className="L-testimonial-text">{q.text}</p>
              <div className="L-testimonial-meta">
                <span className="tz-avatar" style={{ background: q.color, width: 32, height: 32, fontSize: 13, borderRadius: 999 }}>
                  {q.name[0]}
                </span>
                <div>
                  <div className="L-testimonial-name">{q.name}</div>
                  <div className="L-testimonial-role">{q.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================
 * PRICING
 * ============================================================ */
function Pricing() {
  const tiers = [
    {
      name: 'Starter',
      price: '0',
      unit: 'free forever',
      tag: 'For solo PMs and small teams getting started.',
      features: [
        'Up to 3 projects',
        'Unlimited stories',
        '10 active test suites',
        'Community support',
        'Single workspace',
      ],
      cta: 'Start free',
      featured: false,
    },
    {
      name: 'Team',
      price: '12',
      unit: '/user/mo',
      tag: 'For cross-functional teams shipping product weekly.',
      features: [
        'Unlimited projects & stories',
        'Unlimited test suites + CI hooks',
        'Branching acceptance criteria',
        'Linear / GitHub / Slack integrations',
        'Audit log (90 days)',
        'Priority support',
      ],
      cta: 'Start 14-day trial',
      featured: true,
    },
    {
      name: 'Scale',
      price: 'Custom',
      unit: '',
      tag: 'For orgs with compliance and security needs.',
      features: [
        'Everything in Team',
        'SAML SSO + SCIM',
        'Audit log (unlimited)',
        'Custom data retention',
        'SOC 2 Type II report',
        'Dedicated CSM',
      ],
      cta: 'Talk to sales',
      featured: false,
    },
  ]

  return (
    <section className="L-section" id="pricing">
      <div className="L-frame">
        <div className="L-section-head center">
          <span className="L-eyebrow"><Tag size={11} /> Pricing</span>
          <h2 className="L-headline">Honest pricing. No "talk to sales" for table stakes.</h2>
          <p className="L-lede">Start free. Upgrade when your team grows past three projects. Annual saves 20%.</p>
        </div>
        <div className="L-pricing-grid">
          {tiers.map((t) => (
            <div key={t.name} className={`L-price-card${t.featured ? ' featured' : ''}`}>
              {t.featured && <div className="L-price-badge">Most popular</div>}
              <div className="L-price-name">{t.name}</div>
              <div className="L-price-amount">
                {t.price === 'Custom'
                  ? <span className="num" style={{ fontSize: 36 }}>Custom</span>
                  : <><span className="num">${t.price}</span><span className="unit">{t.unit}</span></>
                }
              </div>
              <div className="L-price-tag">{t.tag}</div>
              <ul className="L-price-list">
                {t.features.map((f) => (
                  <li key={f}>
                    <span className="L-price-check"><Check size={11} /></span>
                    {f}
                  </li>
                ))}
              </ul>
              <a href="#cta" className={`L-btn${t.featured ? ' L-btn-primary' : ''}`}>
                {t.cta} <ArrowRight size={13} />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================
 * FAQ
 * ============================================================ */
function FAQ() {
  const items = [
    {
      q: 'How is this different from Jira + TestRail?',
      a: 'Jira is a ticket tracker bolted to documentation; TestRail is a separate test database. cdolanqa treats stories and tests as one connected artifact — when the spec changes, affected tests get flagged, and run results post back to the story automatically.',
    },
    {
      q: 'Do you support automated test runs?',
      a: 'Yes. Run manually in-app, or hit our webhook from your CI (we have examples for GitHub Actions, CircleCI, and Buildkite). Results stream back to the test suite with full history.',
    },
    {
      q: 'Can I import from Jira or Linear?',
      a: 'Yes. CSV and direct importers for Jira, Linear, GitHub Issues, and Notion. Most teams migrate in under an hour.',
    },
    {
      q: 'Where is data stored?',
      a: 'Primary region is US-East. EU region is available on Scale. All data is encrypted in transit and at rest, with SOC 2 Type II controls in place.',
    },
    {
      q: 'Does the free tier expire?',
      a: 'No. The Starter tier is free forever for up to 3 projects and 10 active suites — enough for solo PMs and small teams.',
    },
    {
      q: 'Is there a self-hosted version?',
      a: "Not yet. We're focused on the cloud product through 2026. Scale customers can request a single-tenant deployment.",
    },
  ]

  return (
    <section className="L-section">
      <div className="L-frame">
        <div className="L-section-head center">
          <span className="L-eyebrow"><MessageSquare size={11} /> FAQ</span>
          <h2 className="L-headline">Questions, answered.</h2>
        </div>
        <div className="L-faq-grid">
          {items.map((it) => (
            <details key={it.q} className="L-faq">
              <summary>
                <span style={{ flex: 1 }}>{it.q}</span>
                <span className="L-faq-toggle"><Plus size={12} /></span>
              </summary>
              <p className="L-faq-body">{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================
 * FINAL CTA
 * ============================================================ */
function FinalCTA() {
  const [submitted, setSubmitted] = useState(false)

  return (
    <section className="L-section" id="cta">
      <div className="L-frame">
        <div className="L-final-cta">
          <span className="L-eyebrow"><Sparkles size={11} /> Get started</span>
          <h2 className="L-headline" style={{ fontSize: 48, margin: '18px 0 14px' }}>
            Stop reconciling four tools by hand.
          </h2>
          <p className="L-lede" style={{ margin: '0 auto', maxWidth: 520 }}>
            Join the beta. We're onboarding new teams weekly.
          </p>
          <form
            className="L-email-row"
            onSubmit={(e) => { e.preventDefault(); setSubmitted(true) }}
          >
            <MessageSquare size={15} style={{ color: 'var(--mute)', flexShrink: 0 }} />
            <input
              type="email"
              placeholder="you@yourcompany.com"
              disabled={submitted}
            />
            <button type="submit" className="L-btn L-btn-primary" style={{ padding: '9px 16px' }}>
              {submitted
                ? <><Check size={14} /> You're in</>
                : <>Request access <ArrowRight size={13} /></>
              }
            </button>
          </form>
          <div className="L-fineprint">No credit card · 14-day trial on paid plans · Cancel anytime</div>
        </div>
      </div>
    </section>
  )
}

/* ============================================================
 * FOOTER
 * ============================================================ */
function LandingFooter() {
  return (
    <footer className="L-footer">
      <div className="L-frame">
        <div className="L-footer-grid">
          <div>
            <a href="#" className="L-logo" style={{ marginBottom: 14 }}>
              <span className="L-logo-mark" aria-hidden="true" />
              cdolanqa
            </a>
            <p style={{ fontSize: 13.5, color: 'var(--mute)', lineHeight: 1.55, margin: '14px 0 0', maxWidth: 280 }}>
              The execution layer for product teams. Projects, stories, and test suites in one place.
            </p>
          </div>
          <div>
            <h6 className="L-footer-col-title">Product</h6>
            <ul>
              <li><a href="#">Projects</a></li>
              <li><a href="#">Stories</a></li>
              <li><a href="#">Test Suites</a></li>
              <li><a href="#">Integrations</a></li>
              <li><a href="#">Changelog</a></li>
            </ul>
          </div>
          <div>
            <h6 className="L-footer-col-title">Company</h6>
            <ul>
              <li><a href="#">About</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Customers</a></li>
              <li><a href="#">Brand</a></li>
            </ul>
          </div>
          <div>
            <h6 className="L-footer-col-title">Resources</h6>
            <ul>
              <li><a href="#">Docs</a></li>
              <li><a href="#">API</a></li>
              <li><a href="#">Guides</a></li>
              <li><a href="#">Status</a></li>
            </ul>
          </div>
          <div>
            <h6 className="L-footer-col-title">Legal</h6>
            <ul>
              <li><a href="#">Privacy</a></li>
              <li><a href="#">Terms</a></li>
              <li><a href="#">Security</a></li>
              <li><a href="#">DPA</a></li>
            </ul>
          </div>
        </div>
        <div className="L-footer-bottom">
          <span>© 2026 cdolanqa, Inc.</span>
          <span>v0.4 · Made with ☕ in Miami</span>
        </div>
      </div>
    </footer>
  )
}
