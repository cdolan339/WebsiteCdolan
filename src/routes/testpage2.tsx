import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'
import '../styles/testpage2.css'

// Public, unlinked POC page: Ctesibius AI site redesign.
// Outbound links, the contact form and newsletter signup are intentionally placeholders.

export const Route = createFileRoute('/testpage2')({
  head: () => ({
    meta: [
      { title: 'Ctesibius AI' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
    links: [
      { rel: 'icon', type: 'image/svg+xml', href: '/testpage2/favicon.svg' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@300;400;500;600&family=Questrial&display=swap',
      },
    ],
  }),
  component: CtesibiusPage,
})

const IMG = '/testpage2'

const HERO_WORDS = ['AI-accelerated development', 'intelligent automation', 'custom AI agents', 'secure AI systems']
const PLATFORMS = ['OpenAI', 'Anthropic', 'Google Gemini', 'OpenClaw', 'Ollama', 'Custom AI Agents']
const STAT_TARGETS = [50, 30, 98]
const TAB_MS = 7000

const SERVICES = [
  {
    title: 'AI Content Generation',
    body: 'Deploy AI systems that generate marketing content, social media posts, product descriptions, and digital media tailored to your brand and audience.',
    icon: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></>,
  },
  {
    title: 'AI-Accelerated Software Development',
    body: 'Custom applications, internal tools, website features, and business systems delivered faster with AI-assisted engineering — with full developer control over architecture, testing, security, and deployment.',
    icon: <><path d="M16 18l6-6-6-6" /><path d="M8 6l-6 6 6 6" /></>,
  },
  {
    title: 'AI Marketing Automation',
    body: 'Use generative AI to automate campaign creation, analyze customer behavior, optimize advertising performance, and produce high-converting marketing content.',
    icon: <><path d="M3 11l18-8v18L3 13z" /><path d="M7 12.5V18a2 2 0 004 0v-4" /></>,
  },
  {
    title: 'AI Strategy & Consulting',
    body: 'We identify high-impact AI opportunities inside your organization and design implementation strategies that maximize ROI and operational efficiency.',
    icon: <><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 6-7" /></>,
  },
  {
    title: 'Private & Secure AI Infrastructure',
    body: 'Deploy secure AI environments using private LLMs and protected data pipelines, so sensitive company data remains fully under your control.',
    icon: <><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" /><path d="M9 12l2 2 4-4" /></>,
  },
  {
    title: 'AI Operations & Monitoring',
    body: 'Ongoing monitoring, optimization, and support for AI systems to ensure performance, reliability, and continuous improvement.',
    icon: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  },
]

const CAPABILITIES = [
  { slug: '/ workflow', title: 'AI Workflow Automation', body: 'Use AI agents and custom business tools to automate time-consuming processes, connect software systems, and reduce repetitive manual work.', items: ['Automated document processing', 'Intelligent task routing', 'AI-generated reports'] },
  { slug: '/ intelligence', title: 'AI Business Intelligence', body: 'Turn operational data into actionable insight using AI-powered analysis tools.', items: ['Real-time dashboards', 'Predictive forecasting', 'Automated analytics reporting'] },
  { slug: '/ security', title: 'Secure AI Deployment', body: 'Solutions designed with security and privacy at their core, keeping sensitive business data protected.', items: ['Private model hosting', 'Data isolation', 'Access control and monitoring'] },
  { slug: '/ teams', title: 'AI Team Productivity', body: 'Empower employees with AI assistants that summarize information, generate documentation, and streamline collaboration.', items: ['AI meeting summaries', 'Knowledge assistants', 'Automated internal documentation'] },
]

const TABS = [
  { label: 'Innovation', sub: 'Creative solutions', tag: 'Innovation Hub', title: 'Generative AI That Creates Real Operational Value', body: 'Generative AI enables entirely new ways to create, automate, and scale business operations. We help organizations implement AI agents, intelligent assistants, and automated systems that transform how work gets done.', stats: [['3x', 'Faster content ops'], ['24/7', 'AI availability']], points: ['Deploy AI agents for marketing, support, and operations', 'Automate repetitive business processes', 'Turn new AI capabilities into usable systems'], img: 'tab-innovation.svg', alt: 'Innovation: AI chip with a lightbulb idea and a team building' },
  { label: 'Strategy', sub: 'Business growth', tag: 'Strategy', title: 'An AI Roadmap Built Around Your Business Goals', body: 'We start with your operations, not the technology. Every recommendation is tied to a measurable outcome, so investment goes where AI delivers the clearest return.', stats: [['ROI', 'Focused planning'], ['1:1', 'Consultation first']], points: ['Identify high-impact automation opportunities', 'Prioritize projects by cost and expected return', 'Plan adoption alongside your existing team'], img: 'tab-strategy.svg', alt: 'Strategy: roadmap board and target' },
  { label: 'Performance', sub: 'Optimal results', tag: 'Performance', title: 'Systems That Stay Fast, Accurate, and Reliable', body: 'AI systems need ongoing attention. We monitor output quality, response times, and costs, then refine prompts, models, and workflows as your needs evolve.', stats: [['24/7', 'Monitoring'], ['Ongoing', 'Optimization']], points: ['Track output quality and model costs', 'Refine workflows based on real usage', 'Upgrade models as better options emerge'], img: 'tab-performance.svg', alt: 'Performance: live dashboard and speed gauge' },
  { label: 'Integration', sub: 'Seamless workflow', tag: 'Integration', title: 'AI That Works Inside the Tools You Already Use', body: 'We connect AI directly to your website, CRM, eCommerce platform, and internal software through secure APIs, so new capabilities fit naturally into existing workflows.', stats: [['API', 'First integrations'], ['Secure', 'Data handling']], points: ['Connect AI to your CRM, eCommerce, and databases', 'Build custom APIs and middleware', 'Keep sensitive data inside your systems'], img: 'tab-integration.svg', alt: 'Integration: AI hub connected to database, cloud, commerce and email' },
]

const FILTERS = ['All', 'Marketing AI', 'E-Commerce AI', 'Automation', 'Development AI']

const PROJECTS = [
  { img: 'chophouse.png', cat: 'Marketing AI', cats: ['Marketing AI', 'Automation'], title: 'Chophouse Group, LLC', lead: 'Generative AI for social media food specials.', body: 'We built a workflow that creates daily restaurant specials, writes promotional copy, and prepares Instagram- and Facebook-ready creative around featured menu items.' },
  { img: 'restaurant.png', cat: 'Automation', cats: ['Marketing AI', 'Automation'], title: 'Restaurant Marketing Automation', lead: 'Campaign-ready in minutes.', body: 'AI-generated captions, hashtags, promotional descriptions, and campaign assets help restaurants publish polished specials faster and more consistently.' },
  { img: 'maxstrength.png', cat: 'E-Commerce AI', cats: ['E-Commerce AI', 'Development AI'], title: 'Max-Strength E-Commerce', lead: 'AI-assisted engineering for site and module development.', body: 'We use generative AI to augment PHP, JavaScript, CSS, and PrestaShop module work so features can be developed, debugged, and refined faster.' },
  { img: 'devflow.png', cat: 'Development AI', cats: ['Development AI'], title: 'AI-Augmented Development Workflow', lead: 'Faster delivery, full control.', body: 'AI-assisted engineering accelerates code generation, refactoring, debugging, and module analysis while keeping full developer control of the codebase and deployment process.' },
]

const STEPS = [
  { title: 'Discovery', body: 'We analyze your business processes, software systems, and operational goals to identify where AI can deliver the greatest impact.' },
  { title: 'Planning', body: 'A detailed architecture and implementation roadmap, including technology stack, integrations, and expected ROI.' },
  { title: 'Execution', body: 'Our engineers build and deploy AI agents, automation pipelines, and integrations customized to your organization.' },
  { title: 'Delivery', body: 'After deployment we monitor performance and continuously refine the system for improved results.' },
]

const TESTIMONIALS = [
  { initials: 'J', name: 'Jeff', role: 'FL Marketing Director', quote: 'Having Dave and his company on board is truly one of the best decisions Max-Strength could have made. From the very beginning, Dave has brought an incredible depth of technical knowledge and strategic thinking to our project. His ability to solve complex problems, improve our systems, and guide the technical direction of our platform has been invaluable. Dave doesn’t just build solutions—he understands the bigger picture and helps move the entire business forward. Working with Dave and his team has been a tremendous asset for Max-Strength, and we look forward to continuing to grow and innovate together.' },
  { initials: 'JB', name: 'Joel Buckman', role: 'CEO, Max-Strength', quote: 'What sets Dave apart is not only his technical expertise, but also his ability to understand the business side of what we’re trying to accomplish. He consistently finds solutions that are efficient, scalable, and tailored exactly to our needs. Dave has played a key role in helping us move our platform forward, and we consider him a trusted technology partner.' },
]

const FAQS: { q: string; a: string; list?: string[]; after?: string }[] = [
  { q: 'Are consulting fees waived?', a: 'We strive to keep our pricing fair and accessible for small and medium-sized businesses. In many cases, an initial consultation may be provided at no cost so we can better understand your goals and determine how we can help. For larger projects or ongoing engagements, consulting fees may apply. However, in certain situations—particularly when a project moves forward under a service agreement or contract—we may waive the initial consulting fee. Our goal is to build long-term partnerships with our clients while keeping costs reasonable and transparent.' },
  { q: 'What AI agents do you use?', a: 'We use a variety of leading AI models and agent frameworks depending on the needs of each project. Rather than relying on a single system, we take a model-agnostic approach, selecting the best tools for performance, reliability, and cost efficiency. Our solutions may use models from providers such as OpenAI, OpenClaw, Google, and Anthropic, along with custom AI agents designed specifically for business workflows. This lets us build systems that generate content, automate tasks, analyze data, and integrate directly with your existing software.' },
  { q: 'Will AI replace my employees?', a: 'No. Our approach focuses on augmenting employees, not replacing them. AI is best used to automate repetitive tasks so your team can focus on higher-value work such as customer service, sales, and strategy.' },
  { q: 'Is my business data safe when using AI?', a: 'Yes. Data security is extremely important to us. Depending on the project, we can design systems that:', list: ['Limit what data is sent to AI models', 'Use secure APIs', 'Store business knowledge in private systems (RAG architecture)', 'Implement on-premise or private-cloud AI solutions'], after: 'We always discuss data handling before implementing any AI solution.' },
  { q: 'What problems can AI actually solve for my business?', a: 'AI can help businesses with:', list: ['Social media and marketing content generation', 'Customer service automation', 'Product descriptions and SEO content', 'Business data analysis', 'Workflow automation', 'Website content updates', 'Internal knowledge assistants for employees'], after: 'We focus on practical AI solutions that save time or increase revenue — not experimental technology.' },
]

const NAV = [
  { label: 'About', href: '#about' },
  { label: 'Services', href: '#services' },
  { label: 'Portfolio', href: '#portfolio' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Shooting Creek Designs', href: '#' },
]

/* ─── Helpers ─────────────────────────────────────────── */

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// "Circuit C" mark (direction 1b). `hole` matches the background the mark sits on.
function LogoMark({ size, stroke, hole }: { size: number; stroke: number; hole: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" strokeLinecap="round" style={{ flex: 'none' }} aria-hidden="true">
      <path d="M53.3 17.1A26 26 0 1 0 53.3 46.9" stroke="#d8e4f2" strokeWidth={stroke} />
      <path d="M44.2 17.4A19 19 0 1 0 44.2 46.6" stroke="#4a9eff" strokeWidth={stroke} />
      <path d="M36.1 20.7A12 12 0 1 0 36.1 43.3" stroke="#d8e4f2" strokeWidth={stroke} />
      <circle cx="53.3" cy="17.1" r="2.8" fill={hole} stroke="#d8e4f2" strokeWidth="2" />
      <circle cx="44.2" cy="46.6" r="2.8" fill={hole} stroke="#4a9eff" strokeWidth="2" />
      <circle cx="36.1" cy="20.7" r="2.8" fill={hole} stroke="#d8e4f2" strokeWidth="2" />
    </svg>
  )
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4a9eff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div data-reveal="" className="cx-eyebrow">{children}</div>
}

/* ─── Page ────────────────────────────────────────────── */

function CtesibiusPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const barRefs = useRef<(HTMLSpanElement | null)[]>([])

  const [motion, setMotion] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [word, setWord] = useState(0)
  const [stats, setStats] = useState([0, 0, 0])
  const [tab, setTab] = useState(0)
  const [tabCycle, setTabCycle] = useState(0) // bumps on click so re-selecting a tab restarts its timer
  const [filter, setFilter] = useState('All')
  const [openFaqs, setOpenFaqs] = useState<Set<number>>(() => new Set([0]))
  const [sent, setSent] = useState(false)

  // Smooth in-page scrolling + reduced-motion detection, only while mounted
  useEffect(() => {
    setMotion(!prefersReducedMotion())
    const html = document.documentElement
    const prev = html.style.scrollBehavior
    html.style.scrollBehavior = 'smooth'
    return () => { html.style.scrollBehavior = prev }
  }, [])

  // Hero phrase rotator
  useEffect(() => {
    if (!motion) return
    const id = setInterval(() => setWord((w) => (w + 1) % HERO_WORDS.length), 2800)
    return () => clearInterval(id)
  }, [motion])

  // Scroll reveal. Elements already in view on load are never hidden.
  useEffect(() => {
    if (!motion || !rootRef.current) return
    let io: IntersectionObserver | undefined
    let check = () => {}
    const raf = requestAnimationFrame(() => {
      const vh = window.innerHeight
      const els = [...rootRef.current!.querySelectorAll<HTMLElement>('[data-reveal]')]
        .filter((el) => el.getBoundingClientRect().top > vh)
      const hidden = new Set(els)
      els.forEach((el) => {
        el.style.opacity = '0'
        el.style.transform = 'translateY(28px)'
        el.style.transition = 'opacity .8s cubic-bezier(.2,.7,.2,1), transform .8s cubic-bezier(.2,.7,.2,1)'
        el.style.transitionDelay = (el.dataset.delay || 0) + 'ms'
      })
      const show = (el: HTMLElement) => { el.style.opacity = '1'; el.style.transform = 'none'; hidden.delete(el) }
      // Fallback in case IntersectionObserver never fires
      check = () => {
        const h = window.innerHeight * 0.92
        hidden.forEach((el) => { if (el.getBoundingClientRect().top < h) show(el) })
      }
      window.addEventListener('scroll', check, { passive: true })
      window.addEventListener('resize', check)
      if ('IntersectionObserver' in window) {
        io = new IntersectionObserver((entries) => entries.forEach((e) => {
          if (e.isIntersecting) { show(e.target as HTMLElement); io!.unobserve(e.target) }
        }), { threshold: 0.1 })
        els.forEach((el) => io!.observe(el))
      }
      check()
    })
    return () => {
      cancelAnimationFrame(raf)
      io?.disconnect()
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [motion])

  // Stats count-up once 40% visible
  useEffect(() => {
    const el = statsRef.current
    if (!el) return
    let done = false
    let raf = 0
    const run = () => {
      if (done) return
      done = true
      const t0 = performance.now()
      const d = motion ? 1600 : 0
      const step = (now: number) => {
        const p = d ? Math.min(1, (now - t0) / d) : 1
        const e = 1 - Math.pow(1 - p, 3)
        setStats(STAT_TARGETS.map((v) => Math.round(v * e)))
        if (p < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { run(); io.disconnect() } }, { threshold: 0.4 })
    io.observe(el)
    const fallback = () => { if (el.getBoundingClientRect().top < window.innerHeight * 0.6) run() }
    window.addEventListener('scroll', fallback, { passive: true })
    return () => { io.disconnect(); cancelAnimationFrame(raf); window.removeEventListener('scroll', fallback) }
  }, [motion])

  // Focus tabs: progress bar + auto-advance every 7s
  useEffect(() => {
    barRefs.current.forEach((b) => { if (b) b.style.width = '0%' })
    if (!motion) return
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / TAB_MS)
      const bar = barRefs.current[tab]
      if (bar) bar.style.width = p * 100 + '%'
      if (p >= 1) { setTab((t) => (t + 1) % TABS.length); return }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [tab, tabCycle, motion])

  const onHeroMove = (e: React.MouseEvent) => {
    const el = heroRef.current
    if (!el || !motion) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', e.clientX - r.left + 'px')
    el.style.setProperty('--my', e.clientY - r.top + 'px')
  }

  const toggleFaq = (i: number) => setOpenFaqs((prev) => {
    const next = new Set(prev)
    if (next.has(i)) next.delete(i)
    else next.add(i)
    return next
  })

  const T = TABS[tab]
  const projects = PROJECTS.filter((p) => filter === 'All' || p.cats.includes(filter))

  return (
    <div className={'cx' + (motion ? '' : ' cx-nomotion')} ref={rootRef} id="home">
      {/* ── Header ── */}
      <header className="cx-header">
        <div className="cx-header-inner">
          <a href="#home" aria-label="Ctesibius AI" className="cx-brand">
            <LogoMark size={40} stroke={3.6} hole="#232527" />
            <span className="cx-brand-text">
              <span className="cx-wordmark">CTESIBIUS<span className="cx-wordmark-bar" /><span className="cx-wordmark-ai">AI</span></span>
              <span className="cx-brand-url">CTESIBIUS-AI.COM</span>
            </span>
          </a>
          <nav className={'cx-nav' + (menuOpen ? ' open' : '')} aria-label="Primary">
            {NAV.map((n) => (
              <a key={n.label} href={n.href} onClick={() => setMenuOpen(false)}>{n.label}</a>
            ))}
          </nav>
          <div className="cx-header-actions">
            <a href="#contact" className="cx-btn-nav">Book a Consultation</a>
            <button
              type="button"
              className="cx-burger"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="cx-hero" ref={heroRef} onMouseMove={onHeroMove}>
        <div className="cx-hero-grid-bg" />
        <div className="cx-wrap cx-hero-inner">
          <div data-reveal="">
            <div className="cx-badge">
              <span className="cx-badge-dot" />
              AI Consulting &amp; Development — Gulf Breeze &amp; Fort Lauderdale, FL
            </div>
            <h1>
              Build faster with<br />
              <span className="cx-hero-word-wrap">
                <span key={word} className="cx-hero-word">{HERO_WORDS[word]}</span>
              </span>
            </h1>
            <p className="cx-hero-lead">
              Ctesibius AI is the AI development and consulting firm behind advanced projects from the Shooting Creek team. We build practical AI applications, automated workflows, custom business tools, AI agents, and integrations that turn generative AI into working software for real businesses.
            </p>
            <div className="cx-hero-ctas">
              <a href="#contact" className="cx-btn-primary">Start Your AI Project <span>→</span></a>
              <a href="#" className="cx-demo">
                <span className="cx-demo-btn">
                  <span className="cx-demo-ring" />
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M7 4v16l13-8z" /></svg>
                </span>
                Watch Demo
              </a>
            </div>
          </div>
          <div data-reveal="" data-delay="150" className="cx-hero-art">
            <div className="cx-orbit" />
            <div className="cx-orbit-inner" />
            <div className="cx-hero-glow" />
            <img src={`${IMG}/hero.png`} alt="AI systems illustration" fetchPriority="high" />
          </div>
        </div>
      </section>

      {/* ── Platforms marquee ── */}
      <section className="cx-platforms" aria-label="Supported AI platforms">
        <div className="cx-platforms-inner">
          <div className="cx-platforms-label">Model-agnostic by design</div>
          <div className="cx-marquee">
            <div className="cx-marquee-track">
              {[...PLATFORMS, ...PLATFORMS].map((p, i) => (
                <div key={i} className="cx-marquee-item" aria-hidden={i >= PLATFORMS.length}>
                  <span>{p}</span><span className="cx-diamond">◆</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="cx-section cx-about">
        <div className="cx-wrap cx-about-grid">
          <div data-reveal="" className="cx-about-media">
            <div className="cx-about-frame" />
            <img src={`${IMG}/team.png`} alt="Ctesibius AI team reviewing a project" loading="lazy" />
            <div className="cx-about-badge">
              <span className="cx-about-badge-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a9eff" strokeWidth="1.8" aria-hidden="true"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" /></svg>
              </span>
              <div>
                <div className="cx-about-badge-label">Human-led</div>
                <div className="cx-about-badge-value">AI-accelerated</div>
              </div>
            </div>
          </div>
          <div>
            <Eyebrow>01 — Who we are</Eyebrow>
            <h2 data-reveal="" className="cx-h2">AI Development, Automation, and Practical Business Systems</h2>
            <p data-reveal="" className="cx-about-lead">
              Ctesibius AI is our dedicated AI development company, created to take AI-assisted engineering beyond the website and into complete business applications, automation, and custom workflows.
            </p>
            <p data-reveal="" className="cx-about-body">
              Built on the web-development experience of Shooting Creek Designs, with offices in Gulf Breeze and Fort Lauderdale, Florida, Ctesibius AI pairs experienced engineering with modern generative AI tools to rapidly prototype, build, debug, and deploy dependable software. AI accelerates the work; human review, testing, architecture, security, and business requirements stay firmly in control. Our work ranges from custom internal tools and marketing automation to AI agents, API integrations, eCommerce enhancements, and complete AI-enabled business systems.
            </p>
            <div ref={statsRef} className="cx-stats">
              <div><div className="cx-stat-num">{stats[0]}+</div><div className="cx-stat-label">Projects completed</div></div>
              <div><div className="cx-stat-num">{stats[1]}+</div><div className="cx-stat-label">Years experience</div></div>
              <div><div className="cx-stat-num">{stats[2]}%</div><div className="cx-stat-label">Client satisfaction</div></div>
            </div>
            <a href="#process" className="cx-btn-outline">Learn About Our Approach <span>→</span></a>
          </div>
        </div>
      </section>

      {/* ── Services ── */}
      <section id="services" className="cx-section cx-alt">
        <div className="cx-wrap">
          <div className="cx-services-head">
            <div style={{ maxWidth: 640 }}>
              <Eyebrow>02 — Services</Eyebrow>
              <h2 data-reveal="" className="cx-h2" style={{ margin: 0 }}>What we build</h2>
            </div>
            <p data-reveal="" className="cx-services-intro">
              Practical AI solutions designed to automate business operations, improve efficiency, and unlock new growth opportunities.
            </p>
          </div>
          <div className="cx-services-grid">
            {SERVICES.map((s, i) => (
              <div key={s.title} data-reveal="" data-delay={(i % 3) * 80} className="cx-service">
                <div className="cx-service-icon"><Icon>{s.icon}</Icon></div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
                <a href="#contact">Learn more →</a>
              </div>
            ))}
          </div>
          <div className="cx-capabilities">
            {CAPABILITIES.map((c, i) => (
              <div key={c.slug} data-reveal="" data-delay={i * 80}>
                <div className="cx-cap-slug">{c.slug}</div>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
                <div className="cx-checklist">
                  {c.items.map((it) => <div key={it}><span>✓</span>{it}</div>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Focus tabs ── */}
      <section className="cx-section" aria-label="Focus areas">
        <div className="cx-wrap">
          <div data-reveal="" className="cx-tabbar" role="tablist">
            {TABS.map((t, i) => (
              <button
                key={t.label}
                type="button"
                role="tab"
                aria-selected={i === tab}
                className={'cx-tab' + (i === tab ? ' active' : '')}
                onClick={() => { setTab(i); setTabCycle((c) => c + 1) }}
              >
                <span className="cx-tab-num">0{i + 1}</span>
                <span className="cx-tab-text">
                  <span className="cx-tab-label">{t.label}</span>
                  <span className="cx-tab-sub">{t.sub}</span>
                </span>
                <span className="cx-tab-bar" ref={(el) => { barRefs.current[i] = el }} />
              </button>
            ))}
          </div>
          <div className="cx-tab-body">
            <div key={tab} className="cx-tab-panel" role="tabpanel">
              <div className="cx-tab-tag">● {T.tag}</div>
              <h2>{T.title}</h2>
              <p className="cx-tab-desc">{T.body}</p>
              <div className="cx-tab-stats">
                {T.stats.map(([v, l]) => (
                  <div key={l}><div className="cx-tab-stat-num">{v}</div><div className="cx-stat-label">{l}</div></div>
                ))}
              </div>
              <div className="cx-tab-points">
                {T.points.map((p) => <div key={p}><span>→</span>{p}</div>)}
              </div>
              <a href="#portfolio" className="cx-tab-link">Explore use cases ↗</a>
            </div>
            <div data-reveal="" className="cx-tab-media">
              <div className="cx-tab-glow" />
              <div className="cx-tab-well">
                {TABS.map((t, i) => (
                  <img
                    key={t.img}
                    src={`${IMG}/${t.img}`}
                    alt={t.alt}
                    className={i === tab ? 'active' : undefined}
                    aria-hidden={i !== tab}
                  />
                ))}
                <div className="cx-tab-dots">
                  {TABS.map((t, i) => <span key={t.label} className={i === tab ? 'active' : undefined} />)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Portfolio ── */}
      <section id="portfolio" className="cx-section cx-alt">
        <div className="cx-wrap">
          <div className="cx-center-head">
            <Eyebrow>03 — Portfolio</Eyebrow>
            <h2 data-reveal="" className="cx-h2">Real AI Use Cases</h2>
            <p data-reveal="">Examples of how businesses are using AI to automate operations, increase productivity, and create new digital capabilities.</p>
          </div>
          <div data-reveal="" className="cx-filters" role="group" aria-label="Filter use cases">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                className={'cx-filter' + (filter === f ? ' active' : '')}
                onClick={() => setFilter(f)}
              >
                {f === 'All' ? 'All use cases' : f}
              </button>
            ))}
          </div>
          <div className="cx-projects">
            {projects.map((p) => (
              <article key={p.title} className="cx-project">
                <div className="cx-project-img"><img src={`${IMG}/${p.img}`} alt={p.title} loading="lazy" /></div>
                <div className="cx-project-body">
                  <div className="cx-project-cat">{p.cat}</div>
                  <h3>{p.title}</h3>
                  <p><strong>{p.lead}</strong> {p.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Process ── */}
      <section id="process" className="cx-section">
        <div className="cx-wrap">
          <div className="cx-center-head" style={{ marginBottom: 72 }}>
            <Eyebrow>04 — Process</Eyebrow>
            <h2 data-reveal="" className="cx-h2">How We Work</h2>
            <p data-reveal="">Our implementation process keeps AI systems aligned with real business objectives and deployed successfully.</p>
          </div>
          <div className="cx-steps-wrap">
            <svg className="cx-steps-line" preserveAspectRatio="none" viewBox="0 0 100 2" aria-hidden="true">
              <line x1="0" y1="1" x2="100" y2="1" stroke="#1a4fa3" strokeWidth="1" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="cx-steps">
              {STEPS.map((s, i) => (
                <div key={s.title} data-reveal="" data-delay={i * 120}>
                  <div className={'cx-step-num' + (i === STEPS.length - 1 ? ' filled' : '')}>{i + 1}</div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="cx-section cx-alt">
        <div className="cx-wrap">
          <div style={{ maxWidth: 720, marginBottom: 56 }}>
            <Eyebrow>05 — Client feedback</Eyebrow>
            <h2 data-reveal="" className="cx-h2" style={{ margin: 0 }}>What our clients say</h2>
          </div>
          <div className="cx-testimonials">
            {TESTIMONIALS.map((t, i) => (
              <figure key={t.name} data-reveal="" data-delay={i * 120} className="cx-testimonial">
                <div className="cx-quote-glyph" aria-hidden="true">”</div>
                <div className="cx-stars" aria-label="5 out of 5 stars">★★★★★</div>
                <blockquote>{t.quote}</blockquote>
                <figcaption>
                  <span className="cx-avatar">{t.initials}</span>
                  <span className="cx-person">
                    <span className="cx-person-name">{t.name}</span>
                    <span className="cx-person-role">{t.role}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="cx-section">
        <div className="cx-wrap">
          <div className="cx-center-head" style={{ maxWidth: 760, marginBottom: 64 }}>
            <Eyebrow>06 — Pricing</Eyebrow>
            <h2 data-reveal="" className="cx-h2">Engagements</h2>
            <p data-reveal="">Flexible consulting and implementation packages for small businesses exploring AI and for companies deploying advanced AI systems.</p>
          </div>
          <div className="cx-pricing">
            <div data-reveal="" className="cx-plan featured">
              <span className="cx-plan-badge">Most Popular</span>
              <h3>AI Marketing Starter</h3>
              <p>Perfect for small businesses getting started.</p>
              <div className="cx-price">$7,500<span> – $12,000</span></div>
              <a href="#contact" className="cx-plan-btn">Get Started</a>
            </div>
            <div data-reveal="" data-delay="100" className="cx-plan">
              <h3>Integrated AI Business Systems</h3>
              <p>Ideal for growing businesses and teams that need more AI capability.</p>
              <div className="cx-price">$15,000<span> – $30,000</span></div>
              <a href="#contact" className="cx-plan-btn">Contact for Consultation</a>
            </div>
            <div data-reveal="" data-delay="200" className="cx-plan">
              <h3>Monthly Optimization &amp; Support</h3>
              <p>Comprehensive ongoing plans.</p>
              <div className="cx-price"><span>from </span>$750<span>/mo</span></div>
              <a href="#contact" className="cx-plan-btn outline">Contact Sales</a>
            </div>
          </div>
          <p data-reveal="" className="cx-pricing-note">
            Every business is different, so we begin with a consultation to determine the best approach for your needs. <a href="#contact">Contact our team →</a>
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="cx-section cx-alt">
        <div className="cx-wrap cx-faq-grid">
          <div className="cx-faq-head">
            <Eyebrow>07 — FAQ</Eyebrow>
            <h2 data-reveal="" className="cx-h2">Frequently Asked Questions</h2>
            <p data-reveal="">Answers to common questions about deploying generative AI systems inside real businesses.</p>
          </div>
          <div className="cx-faq-list">
            {FAQS.map((f, i) => {
              const open = openFaqs.has(i)
              return (
                <div key={f.q} className={'cx-faq' + (open ? ' open' : '')}>
                  <button type="button" aria-expanded={open} onClick={() => toggleFaq(i)}>
                    <span className="cx-faq-num">0{i + 1}</span>
                    <span className="cx-faq-q">{f.q}</span>
                    <span className="cx-faq-plus" aria-hidden="true">+</span>
                  </button>
                  <div className="cx-faq-panel">
                    <div>
                      <div className="cx-faq-a">
                        <p>{f.a}</p>
                        {f.list && (
                          <>
                            <div className="cx-faq-bullets">
                              {f.list.map((li) => <div key={li}><span>—</span>{li}</div>)}
                            </div>
                            <p>{f.after}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" className="cx-section">
        <div className="cx-wrap cx-contact-grid">
          <div data-reveal="" style={{ padding: '8px 0' }}>
            <div className="cx-eyebrow">08 — Contact</div>
            <h2 className="cx-h2" style={{ marginBottom: 18 }}>Let’s start a conversation</h2>
            <p className="cx-contact-intro">
              Interested in how AI can improve your business operations? Tell us what you want to automate, improve, or build, and we’ll help you map the right solution.
            </p>
            {sent ? (
              <div className="cx-thanks">Thank you — your message has been received. We’ll be in touch within one business day.</div>
            ) : (
              <form className="cx-form" onSubmit={(e) => { e.preventDefault(); setSent(true) }}>
                <label>Name<input required placeholder="Your name" autoComplete="name" /></label>
                <label>Email<input required type="email" placeholder="you@company.com" autoComplete="email" /></label>
                <label>Phone<input type="tel" placeholder="Your phone" autoComplete="tel" /></label>
                <label>Subject<input placeholder="Subject" /></label>
                <label className="full">Message<textarea rows={5} placeholder="Tell us about your project" /></label>
                <div><button type="submit" className="cx-btn-primary">Send Message →</button></div>
              </form>
            )}
          </div>
          <div data-reveal="" data-delay="120" className="cx-info">
            <div className="cx-info-row">
              <Icon><path d="M12 21s-7-6.2-7-12a7 7 0 0114 0c0 5.8-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></Icon>
              <div className="cx-info-col" style={{ gap: 12 }}>
                <div className="cx-info-label">Locations</div>
                <div><div className="cx-info-strong">Gulf Breeze Office</div><div className="cx-info-muted">Gulf Breeze, FL</div></div>
                <div><div className="cx-info-strong">Fort Lauderdale Office</div><div className="cx-info-muted">Fort Lauderdale, FL</div></div>
              </div>
            </div>
            <div className="cx-info-row">
              <Icon><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></Icon>
              <div className="cx-info-col"><div className="cx-info-label">Email</div><div>Please use the contact form</div></div>
            </div>
            <div className="cx-info-row">
              <Icon><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.5c.9.3 1.8.6 2.8.7a2 2 0 011.8 2z" /></Icon>
              <div className="cx-info-col"><div className="cx-info-label">Phone</div><a href="tel:7069701533" className="cx-info-link">706-970-1533</a></div>
            </div>
            <div className="cx-info-row">
              <Icon><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>
              <div className="cx-info-col"><div className="cx-info-label">Hours</div><div>Monday – Friday: 9AM – 5PM</div><div>Saturday: 10AM – 4PM</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="cx-footer">
        <div className="cx-wrap">
          <div className="cx-footer-grid">
            <div className="cx-footer-brand">
              <div className="cx-footer-logo" aria-label="Ctesibius AI">
                <LogoMark size={48} stroke={3.4} hole="#1d1f21" />
                <span className="cx-wordmark cx-wordmark-lg">CTESIBIUS<span className="cx-wordmark-bar" /><span className="cx-wordmark-ai">AI</span></span>
              </div>
              <p>Ctesibius AI is the dedicated AI development and consulting firm from the Shooting Creek team, building practical generative AI systems, automation, and custom business applications.</p>
              <div className="cx-footer-title" style={{ marginBottom: 12 }}>Stay updated</div>
              <form className="cx-subscribe" onSubmit={(e) => e.preventDefault()}>
                <input type="email" placeholder="Enter your email" aria-label="Email address" />
                <button type="submit">Subscribe</button>
              </form>
            </div>
            <div className="cx-footer-col">
              <div className="cx-footer-title">Company</div>
              <a href="#about">About</a><a href="#">Careers</a><a href="#">Press</a><a href="#">Blog</a><a href="#contact">Contact</a><a href="#">Shooting Creek Designs</a>
            </div>
            <div className="cx-footer-col">
              <div className="cx-footer-title">Solutions</div>
              <a href="#services">Digital Strategy</a><a href="#services">AI Social Marketing</a><a href="#services">AI Application Development</a><a href="#services">AI Solutions</a><a href="#services">AI Data Analytics</a>
            </div>
            <div className="cx-footer-col">
              <div className="cx-footer-title">Get in touch</div>
              <div>Gulf Breeze, FL</div><div>Fort Lauderdale, FL</div><a href="tel:7069701533">706-970-1533</a>
              <div className="cx-socials">
                <a href="#" aria-label="LinkedIn">in</a>
                <a href="#" aria-label="X">X</a>
                <a href="#" aria-label="Facebook">f</a>
                <a href="#" aria-label="Instagram">ig</a>
              </div>
            </div>
          </div>
          <div className="cx-footer-bottom">
            <div>© {new Date().getFullYear()} Ctesibius AI. All rights reserved.</div>
            <div className="cx-legal"><a href="#">Privacy Policy</a><a href="#">Terms of Service</a><a href="#">Cookie Policy</a></div>
          </div>
        </div>
      </footer>
    </div>
  )
}
