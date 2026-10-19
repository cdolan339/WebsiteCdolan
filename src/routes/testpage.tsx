import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import '../styles/testpage.css'

// Public, unlinked POC page: Shooting Creek Designs homepage redesign (direction 1a).
// Links, form handler and reCAPTCHA are intentionally placeholders.

export const Route = createFileRoute('/testpage')({
  head: () => ({
    meta: [
      { title: 'Shooting Creek Designs' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Source+Sans+3:wght@400;500;600&display=swap',
      },
    ],
  }),
  component: TestPage,
})

const IMG = '/testpage'

const NAV = [
  { label: 'Home', href: '#top', active: true },
  { label: 'About', href: '#' },
  { label: 'Portfolio', href: '#portfolio' },
  { label: 'Ctesibius AI', href: '#' },
]

const SERVICES = [
  { eyebrow: '01 — BUILD', title: 'Web development', body: 'Custom sites from scratch or a careful redesign of the one you have.' },
  { eyebrow: '02 — MOBILE', title: 'Responsive by default', body: 'Looks right and works right on every phone, tablet and desktop.' },
  { eyebrow: '03 — PLAN', title: 'Planning & strategy', body: 'User-friendly structure built around your goals, not a template.' },
  { eyebrow: '04 — TEST', title: 'Tested, then supported', body: 'Checked across devices and browsers — and maintained long after launch.' },
]

const FILTERS = ['All', 'eCommerce', 'Restaurant', 'AI Systems', 'Business', 'Organization'] as const
type Filter = (typeof FILTERS)[number]

const PROJECTS: { name: string; tag: string; cats: Filter[]; img: string; visit: boolean }[] = [
  { name: 'Max-Strength', tag: 'PrestaShop eCommerce · Custom development', cats: ['eCommerce'], img: 'work-max-strength.png', visit: true },
  { name: 'Circle H Chophouse', tag: 'Bootstrap 5 · Restaurant website', cats: ['Restaurant'], img: 'work-circle-h.png', visit: true },
  { name: 'JR Chophouse AI Specials', tag: 'Custom AI specials & staff management', cats: ['AI Systems', 'Restaurant'], img: 'work-jr-ai.png', visit: false },
  { name: 'Cox and Son Roofing', tag: 'Return client · Bootstrap 5', cats: ['Business'], img: 'work-cox-roofing.png', visit: false },
  { name: 'Adelman Therapy', tag: 'Return client · Bootstrap 5 · Blog', cats: ['Business'], img: 'work-adelman.png', visit: false },
  { name: 'JR Chophouse', tag: 'Return client · Bootstrap 5', cats: ['Restaurant'], img: 'work-jr-chophouse.png', visit: false },
  { name: 'Murphy’s Chophouse', tag: 'Bootstrap · Restaurant', cats: ['Restaurant'], img: 'work-murphys.png', visit: false },
  { name: 'Hawg Wild BBQ Hiawassee', tag: 'Restaurant website', cats: ['Restaurant'], img: 'work-hawg-wild.png', visit: false },
  { name: 'USS Bradley FF 1041', tag: 'Rewrite with Bootstrap', cats: ['Organization'], img: 'work-uss-bradley.png', visit: false },
]

function TestPage() {
  const [filter, setFilter] = useState<Filter>('All')
  const [menuOpen, setMenuOpen] = useState(false)

  // Smooth-scroll the in-page anchors only while this page is mounted
  useEffect(() => {
    const html = document.documentElement
    const prev = html.style.scrollBehavior
    html.style.scrollBehavior = 'smooth'
    return () => { html.style.scrollBehavior = prev }
  }, [])

  return (
    <div className="sc" id="top">
      {/* ── Header ── */}
      <header className="sc-header">
        <a href="#top" className="sc-brand">
          <img src={`${IMG}/logo-transparent.png`} alt="" width={56} height={48} />
          <span>Shooting Creek <b>Designs</b></span>
        </a>
        <nav className={'sc-nav' + (menuOpen ? ' open' : '')} aria-label="Primary">
          {NAV.map((n) => (
            <a key={n.label} href={n.href} className={n.active ? 'active' : undefined} onClick={() => setMenuOpen(false)}>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="sc-header-actions">
          <a href="#contact" className="sc-btn sc-btn-primary sc-btn-sm">Get a quote</a>
          <button
            type="button"
            className="sc-burger"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="sc-hero">
          <img
            className="sc-hero-img"
            src={`${IMG}/hero-clean.jpg`}
            alt="Sunset over layered mountain ridges"
            fetchPriority="high"
          />
          <div className="sc-hero-overlay" />
          <div className="sc-hero-content">
            <p className="sc-eyebrow">WEB DEVELOPMENT · ECOMMERCE · SUPPORT</p>
            <h1>Websites built by people. <strong>Accelerated by AI.</strong></h1>
            <p className="sc-hero-sub">
              Professional websites, eCommerce and custom business tools — designed, built, tested and supported by one team that stays with you after launch.
            </p>
            <div className="sc-hero-ctas">
              <a href="#contact" className="sc-btn sc-btn-primary">Book a free consultation</a>
              <a href="#portfolio" className="sc-btn sc-btn-secondary">See our work</a>
            </div>
          </div>
        </section>

        {/* ── Intro ── */}
        <section className="sc-intro">
          <h2>The job isn’t done until you’re <em>completely satisfied.</em></h2>
          <div className="sc-intro-copy">
            <p className="sc-lead">
              We design, build and maintain professional websites, eCommerce stores and custom business tools. More than a decade of hands-on development, now paired with modern AI tooling — so we move faster and build more, without giving up careful review, testing or control.
            </p>
            <p>
              Every project is priced around what you actually need: a few polished pages, custom photography, an online store, automated forms or a full business application. It all starts with a free consultation.
            </p>
            <p>
              When you need more than a website — AI strategy, agents, automated workflows or API integrations — our sister company <strong>Ctesibius AI</strong> acts as your AI consultant, turning generative AI into tools your business actually uses.
            </p>
          </div>
        </section>

        {/* ── Services ── */}
        <section className="sc-services" aria-label="Services">
          {SERVICES.map((s) => (
            <div key={s.eyebrow} className="sc-service">
              <p className="sc-eyebrow">{s.eyebrow}</p>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </section>

        {/* ── Portfolio ── */}
        <section className="sc-portfolio" id="portfolio">
          <div className="sc-portfolio-head">
            <div>
              <p className="sc-eyebrow">PORTFOLIO</p>
              <h2><strong>Explore</strong> our projects</h2>
              <p className="sc-portfolio-intro">
                Sites we’ve designed and still manage — restaurants, inns, builders and organizations across the country.
              </p>
            </div>
            <div className="sc-chips" role="group" aria-label="Filter projects">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={'sc-chip' + (filter === f ? ' active' : '')}
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="sc-grid">
            {PROJECTS.map((p) => (
              <article
                key={p.name}
                className="sc-card"
                data-cats={p.cats.join(',')}
                hidden={filter !== 'All' && !p.cats.includes(filter)}
              >
                <img src={`${IMG}/${p.img}`} alt={`${p.name} website screenshot`} loading="lazy" />
                <div className="sc-card-body">
                  <p className="sc-card-tag">{p.tag}</p>
                  <h3>{p.name}</h3>
                  <div className="sc-card-links">
                    <a href="#">View project →</a>
                    {p.visit && <a href="#" target="_blank" rel="noopener noreferrer" className="muted">Visit site ↗</a>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── Ctesibius AI band ── */}
        <section className="sc-band">
          <div className="sc-band-copy">
            <p className="sc-band-eyebrow">CTESIBIUS AI — OUR SISTER COMPANY</p>
            <h2>Your AI consultant, from first idea to working tool.</h2>
            <p>
              Internal tools, automated marketing, AI agents, custom workflows and API integrations — practical generative AI, built for how your business already runs.
            </p>
          </div>
          <div className="sc-band-cta">
            <a href="#" target="_blank" rel="noopener noreferrer" className="sc-btn sc-btn-inverse">Visit Ctesibius AI ↗</a>
          </div>
        </section>

        {/* ── Contact ── */}
        <section className="sc-contact" id="contact">
          <div className="sc-contact-main">
            <h2>Contact us for a quote</h2>
            <p className="sc-contact-intro">Give us an idea of what you’d like to do and we’ll get back to you quickly.</p>
            <form className="sc-form" onSubmit={(e) => e.preventDefault()}>
              <div className="sc-form-row">
                <label>Name*<input type="text" name="name" required autoComplete="name" /></label>
                <label>Email*<input type="email" name="email" required autoComplete="email" /></label>
                <label>Phone*<input type="tel" name="phone" required autoComplete="tel" /></label>
              </div>
              <label>Subject*<input type="text" name="subject" required /></label>
              <label>Message*<textarea name="message" required /></label>
              <div>
                <button type="submit" className="sc-btn sc-btn-primary">Send message</button>
              </div>
            </form>
          </div>
          <aside className="sc-contact-aside">
            <p className="sc-eyebrow">LOCATIONS</p>
            <div className="sc-office">
              <h3>Gulf Breeze Office</h3>
              <p>6443 Outrigger Cove<br />Gulf Breeze, FL 32563</p>
            </div>
            <div className="sc-office">
              <h3>Fort Lauderdale Office</h3>
              <p>Fort Lauderdale, FL</p>
            </div>
            <a href="tel:7069701533" className="sc-phone">706.970.1533</a>
          </aside>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="sc-footer">
        <p>© {new Date().getFullYear()} Shooting Creek Designs, LLC. All rights reserved.</p>
        <a href="#top">Back to top ↑</a>
      </footer>
    </div>
  )
}
