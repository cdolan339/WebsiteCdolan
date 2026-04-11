import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/wiki')({
  component: WikiPage,
})

// ── Types ─────────────────────────────────────────────────────────────────────

type Section = {
  id: string
  label: string
  subsections?: { id: string; label: string }[]
}

// ── Sidebar structure ─────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    id: 'overview',
    label: 'Overview',
  },
  {
    id: 'pages',
    label: 'Pages',
    subsections: [
      { id: 'page-login',          label: 'Login' },
      { id: 'page-homepage',       label: 'Homepage (Test Cases)' },
      { id: 'page-projects-list',  label: 'Projects List' },
      { id: 'page-project-detail', label: 'Project Detail' },
      { id: 'page-new-test-case',  label: 'New Test Case' },
      { id: 'page-test-case-detail', label: 'Test Case Detail' },
      { id: 'page-settings',       label: 'Settings' },
      { id: 'page-wiki',           label: 'Wiki (this page)' },
    ],
  },
  {
    id: 'frontend-lib',
    label: 'Frontend Libraries',
    subsections: [
      { id: 'lib-api',           label: 'api.ts' },
      { id: 'lib-auth',          label: 'auth.ts' },
      { id: 'lib-permissions',   label: 'permissions.ts' },
      { id: 'lib-custom-tc',     label: 'customTestCases.ts' },
      { id: 'lib-projects',      label: 'projects.ts' },
      { id: 'lib-test-status',   label: 'useTestStatus.ts' },
      { id: 'lib-test-order',    label: 'useTestOrder.ts' },
      { id: 'lib-websocket',     label: 'useWebSocket.ts' },
    ],
  },
  {
    id: 'components',
    label: 'Components',
    subsections: [
      { id: 'comp-websocket-sync',  label: 'WebSocketSync' },
      { id: 'comp-loading-curtain', label: 'LoadingCurtain' },
      { id: 'comp-ai-fill-panel',   label: 'AIFillPanel' },
    ],
  },
  {
    id: 'api',
    label: 'API Reference',
    subsections: [
      { id: 'api-auth',       label: 'Auth' },
      { id: 'api-tc',         label: 'Custom Test Cases' },
      { id: 'api-projects',   label: 'Projects' },
      { id: 'api-data',       label: 'Data (Statuses / Priorities / Order)' },
      { id: 'api-perms',      label: 'Permissions' },
      { id: 'api-websocket',  label: 'WebSocket' },
      { id: 'api-ai',         label: 'AI (Test Case Generator)' },
    ],
  },
  {
    id: 'database',
    label: 'Database',
    subsections: [
      { id: 'db-schema',  label: 'Schema' },
      { id: 'db-queries', label: 'Key Queries' },
    ],
  },
  {
    id: 'realtime',
    label: 'Real-Time Sync',
  },
  {
    id: 'auth-flow',
    label: 'Auth Flow',
  },
]

// ── Shared style helpers ──────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'var(--app-glass)',
  border: '1px solid var(--app-glass-border)',
  backdropFilter: 'blur(10px)',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '24px',
}

const sectionHeader = (label: string) => (
  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '16px', color: 'var(--app-text)' }}>{label}</h2>
)

const subHeader = (label: string) => (
  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '10px', color: 'var(--app-text)' }}>{label}</h3>
)

const prose = (text: string) => (
  <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '12px' }}>{text}</p>
)

const Chip = ({ label, color = '#00d2ff' }: { label: string; color?: string }) => (
  <span style={{
    display: 'inline-block',
    background: `${color}22`,
    color,
    border: `1px solid ${color}55`,
    borderRadius: '6px',
    padding: '2px 10px',
    fontSize: '0.78rem',
    fontWeight: 600,
    marginRight: '6px',
    marginBottom: '4px',
  }}>{label}</span>
)

const Method = ({ m }: { m: string }) => {
  const colors: Record<string, string> = { GET: '#4ade80', POST: '#60a5fa', PUT: '#f59e0b', PATCH: '#c084fc', DELETE: '#f87171' }
  return <Chip label={m} color={colors[m] ?? '#fff'} />
}

const CodeBlock = ({ code }: { code: string }) => (
  <pre style={{
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid var(--app-glass-border)',
    borderRadius: '8px',
    padding: '14px 16px',
    fontSize: '0.8rem',
    color: '#c084fc',
    overflowX: 'auto',
    marginBottom: '12px',
    fontFamily: "'Fira Code', 'Consolas', monospace",
    lineHeight: 1.6,
    whiteSpace: 'pre',
  }}>{code}</pre>
)

const Divider = () => (
  <hr style={{ border: 'none', borderTop: '1px solid var(--app-glass-border)', margin: '20px 0' }} />
)

// ── Route endpoint row ────────────────────────────────────────────────────────

function RouteRow({ method, path, desc, auth = true }: { method: string; path: string; desc: string; auth?: boolean }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '10px 0',
      borderBottom: '1px solid var(--app-glass-border)',
    }}>
      <div style={{ flexShrink: 0, width: '60px' }}><Method m={method} /></div>
      <div style={{ flexShrink: 0, minWidth: '280px', fontFamily: 'monospace', fontSize: '0.82rem', color: '#e2e8f0' }}>{path}</div>
      <div style={{ color: 'var(--app-text-secondary)', fontSize: '0.82rem', flex: 1 }}>{desc}{!auth && <Chip label="public" color="#fbbf24" />}</div>
    </div>
  )
}

// ── DB table component ────────────────────────────────────────────────────────

function DBTable({ name, columns }: { name: string; columns: { col: string; type: string; note?: string }[] }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--app-text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>TABLE</span>
        <span style={{ fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 700, color: 'var(--app-text)' }}>{name}</span>
      </div>
      <div style={{ background: 'var(--app-glass)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--app-glass-border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', padding: '8px 14px', background: 'var(--app-section-header-bg)', borderBottom: '1px solid var(--app-glass-border)' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--app-text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Column</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--app-text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Type</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--app-text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Notes</span>
        </div>
        {columns.map(({ col, type, note }) => (
          <div key={col} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', padding: '7px 14px', borderBottom: '1px solid var(--app-glass-border)' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#e2e8f0' }}>{col}</span>
            <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#a78bfa' }}>{type}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--app-text-secondary)' }}>{note ?? ''}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main wiki content ─────────────────────────────────────────────────────────

function WikiContent({ active }: { active: string }) {

  // ── Overview ────────────────────────────────────────────────────────────────
  if (active === 'overview') return (
    <div>
      <div style={card}>
        {sectionHeader('Application Overview')}
        {prose('QA & BA Assistant is a multi-user, browser-based test case management tool. It lets QA and business analysis teams create, organise, track, and execute test cases across multiple projects — all in real time.')}
        {prose('The application is a full-stack system split into two separate repositories: a React/TanStack Start frontend deployed on Netlify/Render, and an Express + PostgreSQL REST API backend.')}
        <Divider />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '12px', marginTop: '4px' }}>
          {[
            { label: 'Framework', value: 'TanStack Start (React 19)' },
            { label: 'Routing', value: 'TanStack Router v1 (file-based)' },
            { label: 'Styling', value: 'Tailwind CSS 4 + inline styles' },
            { label: 'Build', value: 'Vite 7' },
            { label: 'Backend', value: 'Express.js (Node.js)' },
            { label: 'Database', value: 'PostgreSQL (pg pool)' },
            { label: 'Auth', value: 'JWT (jsonwebtoken + bcrypt)' },
            { label: 'Real-time', value: 'WebSockets (ws package)' },
            { label: 'AI', value: 'Anthropic Claude (claude-haiku)' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--app-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--app-text)', fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        {sectionHeader('Route Map')}
        {[
          { route: '/', desc: 'Redirect — sends authenticated users to /homepage, others to /login' },
          { route: '/login', desc: 'Public auth page' },
          { route: '/homepage', desc: 'Main dashboard — lists all active/completed test cases with drag-and-drop ordering' },
          { route: '/projects', desc: 'Grid of all QA projects' },
          { route: '/projects/$id', desc: 'Individual project detail — shows all test cases in that project' },
          { route: '/test-cases/custom/new', desc: 'Create a new custom test case' },
          { route: '/test-cases/custom/$id', desc: 'View/edit a specific test case (steps, status, expected results)' },
          { route: '/settings', desc: 'User settings (general & account tabs)' },
          { route: '/wiki', desc: 'This documentation page' },
          { route: '/403', desc: 'Forbidden page (unauthenticated access attempt)' },
          { route: '/404', desc: 'Not-found catch-all' },
        ].map(({ route, desc }) => (
          <div key={route} style={{ display: 'flex', gap: '16px', padding: '8px 0', borderBottom: '1px solid var(--app-glass-border)' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--app-text)', minWidth: '260px', flexShrink: 0 }}>{route}</span>
            <span style={{ color: 'var(--app-text-secondary)', fontSize: '0.82rem' }}>{desc}</span>
          </div>
        ))}
      </div>
    </div>
  )

  // ── PAGES ────────────────────────────────────────────────────────────────────

  if (active === 'page-login') return (
    <div style={card}>
      {sectionHeader('Login Page — /login')}
      {prose('The entry point for all users. Redirects to /homepage immediately if a valid JWT is already stored in localStorage. Otherwise displays a two-column card: an animated ship mascot on the left, and a username/password form on the right.')}
      <Divider />
      {subHeader('Key Behaviours')}
      <ul style={{ color: 'var(--app-text-secondary)', fontSize: '0.88rem', lineHeight: 1.8, paddingLeft: '20px' }}>
        <li><code>beforeLoad</code> guard — redirects to <code>/homepage</code> if already authenticated, preventing double-login.</li>
        <li>On submit, calls <code>login(username, password)</code> from <code>auth.ts</code>, which POSTs to <code>/api/auth/login</code>.</li>
        <li>On success, stores the JWT in localStorage and shows a <code>LoadingCurtain</code> overlay during the navigation transition.</li>
        <li>On failure, displays a human-readable error message inline.</li>
      </ul>
      <Divider />
      {subHeader('State')}
      <CodeBlock code={`username: string         // controlled input
password: string         // controlled input
error: string            // validation / API error message
loading: boolean         // disables the submit button while fetching
transitioning: boolean   // triggers the LoadingCurtain overlay`} />
    </div>
  )

  if (active === 'page-homepage') return (
    <div style={card}>
      {sectionHeader('Homepage — /homepage')}
      {prose('The main dashboard. Displays all custom test cases for the authenticated user, split into Active and Completed tabs. Each row is drag-and-droppable via @dnd-kit/sortable to set a custom order that is persisted to the database.')}
      <Divider />
      {subHeader('Key Features')}
      <ul style={{ color: 'var(--app-text-secondary)', fontSize: '0.88rem', lineHeight: 1.8, paddingLeft: '20px' }}>
        <li><b>Project selector</b> — dropdown to filter test cases by project. Switching project reloads the list via <code>reloadForProject()</code>.</li>
        <li><b>Active / Completed tabs</b> — test cases with <code>completed: true</code> are in the Completed tab.</li>
        <li><b>Status summary</b> — shows counts of pass / fail / pending / blocked statuses relevant to the current view.</li>
        <li><b>Drag-and-drop ordering</b> — uses <code>DndContext</code> + <code>SortableContext</code>. On drag end, calls <code>setOrder(arrayMove(...))</code> which saves order to the API and broadcasts a WebSocket event to other browsers.</li>
        <li><b>Complete / Reactivate buttons</b> — inline confirm step prevents accidents. Calls <code>completeTestCase(id, true/false)</code>.</li>
        <li><b>Search</b> — the global search bar in the navbar debounces calls to <code>/api/custom-test-cases/search?q=</code> and renders a portal dropdown.</li>
      </ul>
      <Divider />
      {subHeader('Data Flow')}
      {prose('On mount, useCustomTestCases() fetches all test cases for the active project from the API and caches them in the module-level caseCache. Drag events update the in-memory order immediately (optimistic) then persist to the API. Other browsers receive a WebSocket message and re-fetch.')}
      <Divider />
      {subHeader('Sub-components')}
      <CodeBlock code={`ProjectSelector     // dropdown to switch the active project
StatusSummary       // 4-stat grid (pass/fail/pending/blocked)
CompleteButton      // confirm popover — marks TC as completed
ReactivateButton    // confirm popover — moves TC back to active
SortableTestCaseRow // individual draggable row with dnd-kit useSortable`} />
    </div>
  )

  if (active === 'page-projects-list') return (
    <div style={card}>
      {sectionHeader('Projects List — /projects')}
      {prose('A grid of all QA projects visible to all authenticated users. Projects are created by users with the STAFF_CREATE_PROJECT permission. Clicking a tile navigates to the project detail page.')}
      <Divider />
      {subHeader('Permissions Gate')}
      {prose('The "New Project", edit (pencil), and delete (trash) controls are only rendered when useHasPermission("STAFF_CREATE_PROJECT") returns true. The API enforces nothing extra here — permission is frontend-only for the UI controls.')}
      <Divider />
      {subHeader('Sub-components')}
      <CodeBlock code={`ProjectTile         // card with name, description, tags, timeline, deadline badge
ProjectFormModal    // create/edit modal with name, description, tags, timeline, deadline
DeleteConfirmModal  // "are you sure?" modal before deletion`} />
    </div>
  )

  if (active === 'page-project-detail') return (
    <div style={card}>
      {sectionHeader('Project Detail — /projects/$id')}
      {prose('Fetches and displays all test cases belonging to a specific project. Unlike the homepage (which uses the in-memory cache), this page calls the API directly on mount with the projectId so it always shows a fresh list.')}
      <Divider />
      {subHeader('Data Fetching')}
      <CodeBlock code={`useEffect(() => {
  api(\`/custom-test-cases?projectId=\${id}\`)
    .then(setTestCases)
}, [id])`} />
      {prose('The project metadata (name, description, tags, timeline, deadline) comes from the shared useProjects() cache. Status and priority overlays come from useAllTestStatuses() and useAllTestPriorities().')}
    </div>
  )

  if (active === 'page-new-test-case') return (
    <div style={card}>
      {sectionHeader('New Test Case — /test-cases/custom/new')}
      {prose('A single-page form for creating a new custom test case. All edits are kept in a local draft state object. Nothing is saved until the user clicks "Save Test Case".')}
      <Divider />
      {subHeader('AI Fill')}
      {prose('An "AI Fill" button in the top-right opens the AIFillPanel drawer. The user pastes business requirements and Claude generates the title, summary, objective, preconditions, and all test cases automatically. Priority, project, and tags are left for the user to set. The LoadingCurtain displays while the AI is generating.')}
      <Divider />
      {subHeader('Draft State Shape')}
      <CodeBlock code={`{
  title:         string
  summary:       string
  tags:          string[]
  objective:     string
  preconditions: string[]
  priority:      "low" | "medium" | "high" | "critical"
  testCases:     CustomTC[]    // array of sub-test-case objects
  projectId:     number | null
}`} />
      <Divider />
      {subHeader('Sub-components')}
      <CodeBlock code={`AIFillPanel   // slide-in drawer for AI-powered generation
TagInput      // pill-style tag entry with keyboard shortcuts (Enter/comma to add, Backspace to remove)
SubTCEditor   // inline editor per sub-test-case — shows "Test Case 01" gradient identifier label
ProjectPicker // dropdown to assign to a project`} />
      <Divider />
      {subHeader('Save Flow')}
      {prose('On save: validates title is non-empty and not "Untitled Test Case", then calls addCustomTestCase(tc). This optimistically adds the case to the in-memory cache and POSTs to /api/custom-test-cases in the background. The user is immediately navigated to the new test case detail page.')}
    </div>
  )

  if (active === 'page-test-case-detail') return (
    <div style={card}>
      {sectionHeader('Test Case Detail — /test-cases/custom/$id')}
      {prose('The full editing view for a single test case. Has two modes: view mode (read-only with interactive dropdowns) and edit mode (full form). This is the most complex page in the app.')}
      <Divider />
      {subHeader('View Mode')}
      <ul style={{ color: 'var(--app-text-secondary)', fontSize: '0.88rem', lineHeight: 1.8, paddingLeft: '20px' }}>
        <li>Objective, Preconditions, and each Test Case are rendered in dark frosted cards matching the edit mode style.</li>
        <li>Each test case card shows a gradient <strong>"Test Case 01"</strong> identifier label with a separator line.</li>
        <li>Each section card has its own gradient Edit button that opens edit mode.</li>
        <li>Sub-test-case status tracking — pass/fail/pending/blocked dropdowns that persist to <code>/api/data/statuses</code>.</li>
        <li>Expected result checkboxes — each expected result has a checkbox tracked in <code>/api/data/expected</code>.</li>
      </ul>
      <Divider />
      {subHeader('Edit Mode')}
      <ul style={{ color: 'var(--app-text-secondary)', fontSize: '0.88rem', lineHeight: 1.8, paddingLeft: '20px' }}>
        <li><strong>AI Fill</strong> — "AI Fill" button in the top-right opens AIFillPanel. LoadingCurtain shows while generating.</li>
        <li>Each SubTCEditor card shows a gradient "Test Case 01" identifier at the top.</li>
        <li>Title wraps correctly on long AI-generated titles (<code>wordBreak: break-word</code>).</li>
        <li>All edits held in local draft state — saved on "Done" button click.</li>
        <li>Delete — confirmation popover, calls <code>DELETE /api/custom-test-cases/:id</code> then navigates back to homepage.</li>
      </ul>
    </div>
  )

  if (active === 'page-settings') return (
    <div style={card}>
      {sectionHeader('Settings — /settings')}
      {prose('A tabbed settings page with "General" and "Account" sections. Currently both tabs show placeholder copy — intended for future expansion such as notification preferences, password change, and theme overrides.')}
    </div>
  )

  if (active === 'page-wiki') return (
    <div style={card}>
      {sectionHeader('Wiki — /wiki')}
      {prose('This page. A self-contained documentation module mounted as a TanStack Router file route at /wiki. All content is hardcoded JSX — no external CMS or markdown parser is used. The sidebar drives section rendering through a controlled active-section state.')}
    </div>
  )

  // ── FRONTEND LIBS ────────────────────────────────────────────────────────────

  if (active === 'lib-api') return (
    <div style={card}>
      {sectionHeader('src/lib/api.ts')}
      {prose('Thin fetch wrapper used by every other lib module. Attaches the JWT Bearer token to every request and handles 401 responses by clearing the token and redirecting to /login.')}
      <Divider />
      {subHeader('Exported Functions')}
      <CodeBlock code={`setToken(t: string | null): void
  // Stores JWT in memory + localStorage. Pass null to clear.

getToken(): string | null
  // Reads JWT from memory (fast) then localStorage (fallback).

api<T>(path: string, options?: RequestInit): Promise<T>
  // Performs a fetch to API_BASE + path with Content-Type: application/json
  // and Authorization: Bearer <token>. Throws on 4xx/5xx responses.`} />
      <Divider />
      {subHeader('Base URL')}
      <CodeBlock code={`DEV:  /api          (proxied by Vite → http://localhost:3001)
PROD: https://qa-assistant-api.onrender.com/api`} />
    </div>
  )

  if (active === 'lib-auth') return (
    <div style={card}>
      {sectionHeader('src/lib/auth.ts')}
      {prose('Manages the user session. Decodes the JWT payload client-side (no library needed) to extract username and expiry. The server re-validates the token on every API call.')}
      <Divider />
      {subHeader('Exported Functions')}
      <CodeBlock code={`getSession(): Session | null
  // Decodes JWT from localStorage, checks expiry.
  // Returns { id, username, exp } or null.

isAuthenticated(): boolean
  // getSession() !== null

getCurrentUser(): string | null
  // getSession()?.username

login(username, password): Promise<boolean>
  // POSTs to /api/auth/login.
  // Stores JWT on success. Returns true/false.

register(username, password): Promise<boolean>
  // POSTs to /api/auth/register (requires existing JWT — admin action).
  // Throws on error.

logout(): void
  // Calls setToken(null) — removes JWT from memory + localStorage.`} />
    </div>
  )

  if (active === 'lib-permissions') return (
    <div style={card}>
      {sectionHeader('src/lib/permissions.ts')}
      {prose('Fetches and caches the current user\'s permissions (string array) from the API. Uses the same listener/notify pattern as other caches.')}
      <Divider />
      {subHeader('Exported Hooks & Functions')}
      <CodeBlock code={`clearPermissionCache(): void
  // Call on logout to invalidate.

usePermissions(): { permissions: string[]; loading: boolean }
  // Hook — returns cached permissions array.

useHasPermission(permission: string): boolean
  // Derived hook — returns true if permission is in the array.`} />
      <Divider />
      {subHeader('Known Permissions')}
      <CodeBlock code={`STAFF_CREATE_PROJECT
  // Gates the "New Project", edit, and delete controls on /projects.`} />
    </div>
  )

  if (active === 'lib-custom-tc') return (
    <div style={card}>
      {sectionHeader('src/lib/customTestCases.ts')}
      {prose('The main data layer for test cases. Uses a module-level in-memory cache (caseCache) so the same data is shared across all components without prop drilling or a context provider. Writes are optimistic — the cache updates immediately and the API call happens in the background.')}
      <Divider />
      {subHeader('Cache Mechanism')}
      <CodeBlock code={`let caseCache: CustomTestCase[] | null = null
let loadPromise: Promise<void> | null = null
let cachedProjectId: number | null | undefined = undefined
const listeners = new Set<() => void>()

// When any write happens:
notify()  →  listeners.forEach(fn => fn())
         →  each useCustomTestCases() instance re-renders

// When WebSocket signals remote change:
invalidateCustomCache()  →  caseCache = null  →  notify()`} />
      <Divider />
      {subHeader('Key Exports')}
      <CodeBlock code={`useCustomTestCases(): { cases, loading }
useCustomTestCase(id): { tc, ready }
addCustomTestCase(tc): Promise<void>
updateCustomTestCase(tc): Promise<void>
getCustomTestCase(id): Promise<CustomTestCase | undefined>
completeTestCase(id, completed): Promise<void>
reloadForProject(projectId): void
clearCustomCache(): void
invalidateCustomCache(): void   // used by WebSocketSync`} />
      <Divider />
      {subHeader('Real-time sync note')}
      {prose('When invalidateCustomCache() is called (e.g. on a remote test-case:updated WebSocket event), caseCache is set to null. The listener registered by useCustomTestCase() calls ensureLoaded() — not the raw cache — so it always triggers a fresh fetch rather than returning undefined from a null cache.')}
      <CodeBlock code={`// Correct — always goes through ensureLoaded():
const sync = () => ensureLoaded().then(data => setTc(data.find(c => c.id === id)))

// Wrong (old bug) — reads null cache directly after invalidation:
// const sync = () => setTc((caseCache ?? []).find(c => c.id === id))`} />
      <Divider />
      {subHeader('CustomTestCase shape')}
      <CodeBlock code={`{
  id:            string        // "tc-<timestamp>"
  title:         string
  summary:       string
  createdAt:     string        // ISO 8601
  updatedAt:     string
  tags:          string[]
  objective:     string
  preconditions: string[]
  priority:      "low" | "medium" | "high" | "critical"
  testCases:     CustomTC[]   // sub-cases
  completed?:    boolean
  completedAt?:  string | null
  projectId?:    number | null
}`} />
    </div>
  )

  if (active === 'lib-projects') return (
    <div style={card}>
      {sectionHeader('src/lib/projects.ts')}
      {prose('Same cache pattern as customTestCases.ts but for Project objects. Also manages the active project selection, persisted to localStorage so it survives page refreshes.')}
      <Divider />
      {subHeader('Key Exports')}
      <CodeBlock code={`useProjects(): { projects, loading }
useActiveProjectId(): [number | null, (id: number | null) => void]
getActiveProjectId(): number | null
setActiveProjectId(id): void
createProject(payload): Promise<Project>
updateProject(id, payload): Promise<Project>
deleteProject(id): Promise<void>
clearProjectCache(): void
invalidateProjectCache(): void   // used by WebSocketSync`} />
    </div>
  )

  if (active === 'lib-test-status') return (
    <div style={card}>
      {sectionHeader('src/lib/useTestStatus.ts')}
      {prose('Manages three separate in-memory caches: statuses (pass/fail/pending/blocked per test case slug), priorities (low/medium/high/critical), and expected result checkboxes. Each cache has its own listener set for fine-grained re-renders.')}
      <Divider />
      {subHeader('Exports')}
      <CodeBlock code={`// Statuses
useTestStatus(slug)          → { status, setStatus }
useAllTestStatuses()         → Record<string, TestStatus>

// Priorities
useTestPriority(slug, def)   → { priority, setPriority }
useAllTestPriorities()       → Record<string, TestPriority>

// Expected results (checkboxes)
useExpectedChecked(key)      → { checked, setChecked }
useAllExpectedCounts()       → Record<string, number>  // # checked per slug
loadExpectedMap()            → Record<string, boolean>

// WebSocket direct-patch — update cache without a round-trip re-fetch
applyStatusUpdate(slug, status)       // called by WebSocketSync on "status:updated"
applyPriorityUpdate(slug, priority)   // called by WebSocketSync on "priority:updated"
applyExpectedUpdate(key, checked)     // called by WebSocketSync on "expected:updated"

// Lifecycle
clearCaches()                // call on logout`} />
      <Divider />
      {subHeader('Slug format')}
      <CodeBlock code={`test case slug:      "custom:<tc-id>"      e.g. "custom:tc-1712345"
expected key format: "<slug>__expected__<index>"`} />
    </div>
  )

  if (active === 'lib-test-order') return (
    <div style={card}>
      {sectionHeader('src/lib/useTestOrder.ts')}
      {prose('Manages the drag-and-drop sort order for the homepage. Fetches the saved slug array from /api/data/order on first use, then stores it in a module-level cache so it survives tab switches. On reorder, saves back to the API and broadcasts a WebSocket event.')}
      <Divider />
      {subHeader('Hook')}
      <CodeBlock code={`useTestOrder(defaultSlugs: string[])
  → { order: string[], setOrder: (next: string[]) => void }

// defaultSlugs: slugs from the current visible test cases
// order: merged array — saved order first, then any new slugs appended
// setOrder: updates cache + persists to API`} />
      <Divider />
      {subHeader('mergeOrder logic')}
      <CodeBlock code={`// Keeps saved positions for existing slugs.
// Appends any new slugs (recently created TCs) at the end.
// Removes slugs that no longer exist in the current view.`} />
      <Divider />
      {subHeader('Invalidation')}
      <CodeBlock code={`invalidateOrderCache()
  // Sets savedOrderCache = null
  // Notifies all useTestOrder() instances to re-fetch from API
  // Called by WebSocketSync on "order:updated" event`} />
    </div>
  )

  if (active === 'lib-websocket') return (
    <div style={card}>
      {sectionHeader('src/lib/useWebSocket.ts')}
      {prose('Opens a single WebSocket connection shared across all components (singleton pattern). Auto-reconnects after 3 seconds if the connection drops. Authenticates by passing the JWT as a query parameter in the WS URL.')}
      <Divider />
      {subHeader('Hook')}
      <CodeBlock code={`useWebSocket(handler: (event: WSEvent) => void): void
  // Registers handler for incoming WebSocket messages.
  // Cleans up on unmount. Opens socket on first caller,
  // closes it when last caller unmounts.`} />
      <Divider />
      {subHeader('WSEvent types')}
      <CodeBlock code={`{ type: "test-case:created",   id: string      }
{ type: "test-case:updated",   id: string      }
{ type: "test-case:completed", id: string      }
{ type: "test-case:deleted",   id: string      }
{ type: "project:created",     id: number      }
{ type: "project:updated",     id: number      }
{ type: "project:deleted",     id: number      }
{ type: "order:updated"                        }
{ type: "status:updated";   slug: string; status: string   }
{ type: "priority:updated"; slug: string; priority: string }
{ type: "expected:updated"; key: string;  checked: boolean }
{ type: "ping"                                 }`} />
      <Divider />
      {subHeader('URL')}
      <CodeBlock code={`DEV:  ws://<host>/ws?token=<jwt>    (proxied by Vite /ws → ws://localhost:3001)
PROD: wss://qa-assistant-api.onrender.com/ws?token=<jwt>`} />
    </div>
  )

  // ── COMPONENTS ───────────────────────────────────────────────────────────────

  if (active === 'comp-websocket-sync') return (
    <div style={card}>
      {sectionHeader('WebSocketSync')}
      {prose('An invisible component (returns null) mounted once in the root layout for all authenticated users. Connects the useWebSocket hook to the three cache invalidation functions.')}
      <CodeBlock code={`// Event routing:
"test-case:*"     →  invalidateCustomCache()         →  re-fetch test cases
"project:*"       →  invalidateProjectCache()         →  re-fetch projects
"order:updated"   →  invalidateOrderCache()           →  re-fetch sort order

// Direct cache patch — no re-fetch, instant local update:
"status:updated"  →  applyStatusUpdate(slug, status)
"priority:updated"→  applyPriorityUpdate(slug, priority)
"expected:updated"→  applyExpectedUpdate(key, checked)`} />
      {prose('Status, priority, and expected checkbox updates are patched directly into the in-memory cache rather than triggering a full re-fetch. This avoids a network round-trip and keeps updates instant for all listeners.')}
      {prose('By mounting in __root.tsx (inside AppShell, outside the public route guard), it is only active when the user is logged in. The socket is closed cleanly on logout because the component unmounts.')}
    </div>
  )

  if (active === 'comp-loading-curtain') return (
    <div style={card}>
      {sectionHeader('LoadingCurtain')}
      {prose('A full-screen overlay that fades in/out with a gradient animation. Used during page transitions (login → homepage, logout), while data is loading on most pages, and while the AI generator is running.')}
      <CodeBlock code={`<LoadingCurtain visible={boolean} message="Loading Test Cases" />`} />
      {prose('Uses CSS transitions — when visible=false, opacity fades to 0 and pointer-events are disabled. The component stays mounted so the fade-out animation plays before the element is removed.')}
    </div>
  )

  if (active === 'comp-ai-fill-panel') return (
    <div style={card}>
      {sectionHeader('AIFillPanel')}
      {prose('A slide-in drawer panel that lets the user paste business requirements, user stories, or BA notes and have Claude generate a complete test case structure. Mounted on both the New Test Case and Edit Test Case pages.')}
      <Divider />
      {subHeader('Props')}
      <CodeBlock code={`type Props = {
  onFill: (result: AIFillResult) => void  // merges AI output into draft state
  onClose: () => void                     // closes the panel
  onLoading?: (loading: boolean) => void  // fires true/false to show LoadingCurtain
}`} />
      <Divider />
      {subHeader('AIFillResult shape')}
      <CodeBlock code={`type AIFillResult = {
  title:         string
  summary:       string
  objective:     string
  preconditions: string[]
  testCases: {
    name:     string
    steps:    string[]
    expected: string
  }[]
}`} />
      <Divider />
      {subHeader('Flow')}
      <CodeBlock code={`1. User clicks "AI Fill" button (top-right of New/Edit page)
2. AIFillPanel slides in from the right
3. User pastes business story / BA requirements into the textarea
4. User clicks "Generate Test Case"
5. onLoading(true) fires → LoadingCurtain appears over the page
6. POST /api/ai/fill-test-case is called with { prompt }
7. Claude (claude-haiku) returns structured JSON
8. onFill(result) merges title, summary, objective, preconditions,
   and testCases into the draft state
9. Panel closes, LoadingCurtain fades out
10. Priority, project, and tags are left for the user to set manually`} />
      <Divider />
      {subHeader('What the AI fills')}
      {prose('Title, summary, objective, preconditions, and all test case sub-items (name, steps, expected result). Priority, project, and tags are intentionally excluded — the user sets those manually.')}
    </div>
  )

  // ── API REFERENCE ─────────────────────────────────────────────────────────────

  if (active === 'api-auth') return (
    <div style={card}>
      {sectionHeader('API — Auth')}
      {prose('All auth endpoints live under /api/auth. Login is public. Register requires a valid JWT (admin-only action).')}
      <Divider />
      <RouteRow method="POST" path="/api/auth/login" desc="Verify credentials, return JWT. Body: { username, password }" auth={false} />
      <RouteRow method="POST" path="/api/auth/register" desc="Create new user, return JWT. Body: { username, password }. Requires existing JWT." />
      <Divider />
      {subHeader('Login SQL')}
      <CodeBlock code={`SELECT * FROM users WHERE username = $1
-- Then bcrypt.compare(password, user.password_hash)
-- Returns JWT: { id, username } signed with JWT_SECRET`} />
      {subHeader('Register SQL')}
      <CodeBlock code={`INSERT INTO users (username, password_hash)
VALUES ($1, $2)
RETURNING id, username, created_at`} />
      <Divider />
      {subHeader('JWT Payload')}
      <CodeBlock code={`{ id: number, username: string, iat: number, exp: number }`} />
      {prose('Expiry is set by JWT_EXPIRES_IN env variable. The client decodes the payload without a library (base64 decode of the second segment) to check expiry client-side.')}
    </div>
  )

  if (active === 'api-tc') return (
    <div style={card}>
      {sectionHeader('API — Custom Test Cases')}
      {prose('All endpoints require a valid JWT. Test cases are owned by user_id but the query filters by user_id on every read/write.')}
      <Divider />
      <RouteRow method="GET"    path="/api/custom-test-cases"              desc="List all TCs for this user. ?projectId=N filters by project." />
      <RouteRow method="GET"    path="/api/custom-test-cases/search"       desc="Full-text search on title, summary, tags. ?q=keyword&projectId=N" />
      <RouteRow method="GET"    path="/api/custom-test-cases/:id"          desc="Single TC by ID (must belong to user)." />
      <RouteRow method="POST"   path="/api/custom-test-cases"              desc="Create TC. Body: CustomTestCase shape (minus createdAt/updatedAt)." />
      <RouteRow method="PUT"    path="/api/custom-test-cases/:id"          desc="Full update. All mutable fields. updated_at auto-set by DB." />
      <RouteRow method="PATCH"  path="/api/custom-test-cases/:id/complete" desc="Toggle completed status. Body: { completed: boolean }." />
      <RouteRow method="DELETE" path="/api/custom-test-cases/:id"          desc="Hard delete. Cannot be undone." />
      <Divider />
      {subHeader('Search SQL')}
      <CodeBlock code={`SELECT c.id, c.title, c.summary, c.tags, c.priority,
       c.completed, c.created_at, p.name AS project_name
FROM custom_test_cases c
LEFT JOIN projects p ON p.id = c.project_id
WHERE c.user_id = $1
  AND (
    LOWER(c.title)   LIKE $2  OR
    LOWER(c.summary) LIKE $2  OR
    EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(c.tags) t
      WHERE LOWER(t) LIKE $2
    )
  )
ORDER BY c.created_at DESC
LIMIT 8`} />
    </div>
  )

  if (active === 'api-projects') return (
    <div style={card}>
      {sectionHeader('API — Projects')}
      {prose('Projects are visible to all authenticated users (no per-user filter on reads). Only creation/editing/deletion requires the STAFF_CREATE_PROJECT permission — enforced on the frontend only.')}
      <Divider />
      <RouteRow method="GET"    path="/api/projects"      desc="List all projects with creator username via JOIN on users." />
      <RouteRow method="POST"   path="/api/projects"      desc="Create project. Body: { name, description, tags, timelineStart, timelineEnd, deadline }." />
      <RouteRow method="PUT"    path="/api/projects/:id"  desc="Update project fields. All fields optional (COALESCE pattern)." />
      <RouteRow method="DELETE" path="/api/projects/:id"  desc="Delete project and all its test cases (CASCADE in DB)." />
      <Divider />
      {subHeader('List SQL')}
      <CodeBlock code={`SELECT p.id, p.name, p.description, p.tags,
       p.timeline_start, p.timeline_end, p.deadline,
       p.created_at, p.updated_at, p.user_id,
       u.username AS created_by
FROM projects p
JOIN users u ON u.id = p.user_id
ORDER BY p.created_at ASC`} />
    </div>
  )

  if (active === 'api-data') return (
    <div style={card}>
      {sectionHeader('API — Data (Statuses / Priorities / Order)')}
      {prose('The /api/data namespace stores three types of per-user state that are not part of the main test case record: run statuses, priorities, and sort order. All use upsert (INSERT … ON CONFLICT DO UPDATE).')}
      <Divider />
      {subHeader('Statuses')}
      <RouteRow method="GET" path="/api/data/statuses"  desc="Returns { [slug]: status } map for the current user." />
      <RouteRow method="PUT" path="/api/data/statuses"  desc="Upsert one status. Body: { slug, status }." />
      <CodeBlock code={`INSERT INTO test_statuses (user_id, slug, status)
VALUES ($1, $2, $3)
ON CONFLICT (user_id, slug) DO UPDATE SET status = $3`} />
      <Divider />
      {subHeader('Priorities')}
      <RouteRow method="GET" path="/api/data/priorities" desc="Returns { [slug]: priority } map." />
      <RouteRow method="PUT" path="/api/data/priorities" desc="Upsert one priority. Body: { slug, priority }. Broadcasts priority:updated." />
      <Divider />
      {subHeader('Expected Results (Checkboxes)')}
      <RouteRow method="GET" path="/api/data/expected" desc="Returns { [key]: boolean } map." />
      <RouteRow method="PUT" path="/api/data/expected" desc="Upsert one checkbox. Body: { key, checked }. Broadcasts expected:updated." />
      <Divider />
      {subHeader('Sort Order')}
      <RouteRow method="GET" path="/api/data/order" desc="Returns the saved slug array for the current user." />
      <RouteRow method="PUT" path="/api/data/order" desc="Save new slug order. Body: { slugs: string[] }. Broadcasts order:updated." />
      <CodeBlock code={`INSERT INTO test_case_order (user_id, slugs)
VALUES ($1, $2)
ON CONFLICT (user_id) DO UPDATE SET slugs = $2`} />
    </div>
  )

  if (active === 'api-perms') return (
    <div style={card}>
      {sectionHeader('API — Permissions')}
      {prose('Returns the current user\'s permission strings. Permissions are stored in the user_permissions table and managed directly in the database (no UI for granting/revoking yet).')}
      <Divider />
      <RouteRow method="GET" path="/api/permissions" desc="Returns string[] of permission names for the current user." />
      <CodeBlock code={`SELECT permission FROM user_permissions WHERE user_id = $1`} />
    </div>
  )

  if (active === 'api-websocket') return (
    <div style={card}>
      {sectionHeader('API — WebSocket')}
      {prose('The WebSocket server is attached to the same HTTP server as the Express API. It listens on /ws and authenticates via a JWT query parameter.')}
      <Divider />
      {subHeader('Connection URL')}
      <CodeBlock code={`ws://localhost:3001/ws?token=<jwt>        // dev
wss://qa-assistant-api.onrender.com/ws?token=<jwt>  // prod`} />
      <Divider />
      {subHeader('broadcast(event, excludeUserId)')}
      {prose('Called by route handlers after successful mutations. Sends the event JSON to all connected clients except the user who made the change (they already have the optimistic update).')}
      <CodeBlock code={`// Emitted events:
{ type: "test-case:created",   id: string }        // after POST /custom-test-cases
{ type: "test-case:updated",   id: string }        // after PUT /custom-test-cases/:id
{ type: "test-case:completed", id: string }        // after PATCH .../complete
{ type: "test-case:deleted",   id: string }        // after DELETE /custom-test-cases/:id
{ type: "project:created",     id: number }        // after POST /projects
{ type: "project:updated",     id: number }        // after PUT /projects/:id
{ type: "project:deleted",     id: number }        // after DELETE /projects/:id
{ type: "order:updated"        }                   // after PUT /data/order
{ type: "status:updated",   slug, status   }       // after PUT /data/statuses
{ type: "priority:updated", slug, priority }       // after PUT /data/priorities
{ type: "expected:updated", key,  checked  }       // after PUT /data/expected`} />
      <Divider />
      {subHeader('Keep-alive')}
      {prose('The server pings all connected clients every 30 seconds. Clients that do not respond with a pong are terminated. The frontend auto-reconnects after 3 seconds if the connection drops.')}
    </div>
  )

  if (active === 'api-ai') return (
    <div style={card}>
      {sectionHeader('API — AI (Test Case Generator)')}
      {prose('Single authenticated endpoint that accepts a free-text business requirement and returns a structured test case JSON generated by Claude (claude-haiku). The ANTHROPIC_API_KEY environment variable must be set on the server.')}
      <Divider />
      <RouteRow method="POST" path="/api/ai/fill-test-case" desc="Generate a structured test case from a business story. Body: { prompt: string }." />
      <Divider />
      {subHeader('Request')}
      <CodeBlock code={`POST /api/ai/fill-test-case
Authorization: Bearer <jwt>
Content-Type: application/json

{ "prompt": "As a user I want to log in with email and password..." }`} />
      {subHeader('Response')}
      <CodeBlock code={`{
  "title": "User Login Authentication",
  "summary": "Verify the login flow works correctly...",
  "objective": "Ensure that users can authenticate...",
  "preconditions": ["User account exists", "User is on /login"],
  "testCases": [
    {
      "name": "Successful login with valid credentials",
      "steps": ["Navigate to /login", "Enter valid email", "Click Submit"],
      "expected": "User is redirected to /homepage"
    }
  ]
}`} />
      <Divider />
      {subHeader('System prompt behaviour')}
      {prose('The AI is instructed to think as a QA Engineer, Business Analyst, and Product Owner combined. It generates: happy path cases first, then negative/error handling cases, then boundary and edge cases. Each test case has at least 3 detailed steps and a specific observable expected result.')}
      <CodeBlock code={`Model:      claude-haiku-4-5-20251001
Max tokens: 4096
Coverage:   3-8 sub test cases per generation
Priority:   Assigned per sub case (critical/high/medium/low)`} />
      <Divider />
      {subHeader('Error responses')}
      <CodeBlock code={`400  { error: "Prompt is required" }
500  { error: "AI service not configured — ANTHROPIC_API_KEY missing" }
502  { error: "AI response was incomplete. Please try again." }
500  { error: "<anthropic SDK error message>" }`} />
    </div>
  )

  // ── DATABASE ─────────────────────────────────────────────────────────────────

  if (active === 'db-schema') return (
    <div style={card}>
      {sectionHeader('Database Schema')}
      {prose('PostgreSQL. All tables created by running npm run db:init in the backend project. The pool is shared via src/config/db.js.')}
      <Divider />
      <DBTable name="users" columns={[
        { col: 'id',            type: 'SERIAL PK',   note: 'Auto-incrementing user ID' },
        { col: 'username',      type: 'VARCHAR(100)', note: 'UNIQUE — login identifier' },
        { col: 'password_hash', type: 'VARCHAR(255)', note: 'bcrypt hash (cost 12)' },
        { col: 'created_at',    type: 'TIMESTAMPTZ', note: 'DEFAULT NOW()' },
      ]} />
      <DBTable name="projects" columns={[
        { col: 'id',             type: 'SERIAL PK',   note: '' },
        { col: 'user_id',        type: 'INTEGER FK',  note: 'References users(id) CASCADE' },
        { col: 'name',           type: 'VARCHAR(200)', note: 'Required' },
        { col: 'description',    type: 'TEXT',        note: 'DEFAULT empty string' },
        { col: 'tags',           type: 'JSONB',       note: 'DEFAULT []' },
        { col: 'timeline_start', type: 'DATE',        note: 'Nullable' },
        { col: 'timeline_end',   type: 'DATE',        note: 'Nullable' },
        { col: 'deadline',       type: 'DATE',        note: 'Nullable' },
        { col: 'created_at',     type: 'TIMESTAMPTZ', note: 'DEFAULT NOW()' },
        { col: 'updated_at',     type: 'TIMESTAMPTZ', note: 'DEFAULT NOW()' },
      ]} />
      <DBTable name="custom_test_cases" columns={[
        { col: 'id',            type: 'VARCHAR(100)', note: 'Client-generated "tc-<timestamp>" — part of PK' },
        { col: 'user_id',       type: 'INTEGER FK',  note: 'References users(id) CASCADE — part of PK' },
        { col: 'project_id',    type: 'INTEGER FK',  note: 'References projects(id) CASCADE. Nullable.' },
        { col: 'title',         type: 'VARCHAR(500)', note: '' },
        { col: 'summary',       type: 'TEXT',        note: '' },
        { col: 'tags',          type: 'JSONB',       note: 'string[]' },
        { col: 'objective',     type: 'TEXT',        note: '' },
        { col: 'preconditions', type: 'JSONB',       note: 'string[]' },
        { col: 'priority',      type: 'VARCHAR(20)', note: '"low" | "medium" | "high" | "critical"' },
        { col: 'test_cases',    type: 'JSONB',       note: 'CustomTC[] — full sub-case objects stored as JSON' },
        { col: 'completed',     type: 'BOOLEAN',     note: 'DEFAULT false' },
        { col: 'completed_at',  type: 'TIMESTAMPTZ', note: 'Nullable' },
        { col: 'created_at',    type: 'TIMESTAMPTZ', note: 'DEFAULT NOW()' },
        { col: 'updated_at',    type: 'TIMESTAMPTZ', note: 'Updated by PUT handler via updated_at = NOW()' },
      ]} />
      <DBTable name="test_statuses" columns={[
        { col: 'id',      type: 'SERIAL PK',   note: '' },
        { col: 'user_id', type: 'INTEGER FK',  note: 'References users(id) CASCADE' },
        { col: 'slug',    type: 'VARCHAR(500)', note: '"custom:<tc-id>"' },
        { col: 'status',  type: 'VARCHAR(20)', note: '"pass" | "fail" | "pending" | "blocked"' },
        { col: '',        type: 'UNIQUE',      note: '(user_id, slug)' },
      ]} />
      <DBTable name="test_priorities" columns={[
        { col: 'id',       type: 'SERIAL PK',   note: '' },
        { col: 'user_id',  type: 'INTEGER FK',  note: '' },
        { col: 'slug',     type: 'VARCHAR(500)', note: '' },
        { col: 'priority', type: 'VARCHAR(20)', note: '"low" | "medium" | "high" | "critical"' },
        { col: '',         type: 'UNIQUE',      note: '(user_id, slug)' },
      ]} />
      <DBTable name="expected_results" columns={[
        { col: 'id',      type: 'SERIAL PK',   note: '' },
        { col: 'user_id', type: 'INTEGER FK',  note: '' },
        { col: 'key',     type: 'VARCHAR(500)', note: '"<slug>__expected__<i>"' },
        { col: 'checked', type: 'BOOLEAN',     note: 'DEFAULT false' },
        { col: '',        type: 'UNIQUE',      note: '(user_id, key)' },
      ]} />
      <DBTable name="test_case_order" columns={[
        { col: 'user_id', type: 'INTEGER PK',  note: 'References users(id) CASCADE. One row per user.' },
        { col: 'slugs',   type: 'JSONB',       note: 'Ordered string[] of test case slugs' },
      ]} />
      <DBTable name="user_permissions" columns={[
        { col: 'id',         type: 'SERIAL PK',   note: '' },
        { col: 'user_id',    type: 'INTEGER FK',  note: 'References users(id) CASCADE' },
        { col: 'permission', type: 'VARCHAR(100)', note: 'e.g. "STAFF_CREATE_PROJECT"' },
        { col: 'granted_at', type: 'TIMESTAMPTZ', note: 'DEFAULT NOW()' },
        { col: '',           type: 'UNIQUE',      note: '(user_id, permission)' },
      ]} />
    </div>
  )

  if (active === 'db-queries') return (
    <div style={card}>
      {sectionHeader('Key Database Queries')}

      {subHeader('Create test case')}
      <CodeBlock code={`INSERT INTO custom_test_cases
  (id, user_id, title, summary, tags, objective,
   preconditions, priority, test_cases, project_id)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
RETURNING *`} />

      {subHeader('Update test case (full)')}
      <CodeBlock code={`UPDATE custom_test_cases
SET title         = COALESCE($1, title),
    summary       = COALESCE($2, summary),
    tags          = COALESCE($3, tags),
    objective     = COALESCE($4, objective),
    preconditions = COALESCE($5, preconditions),
    priority      = COALESCE($6, priority),
    test_cases    = COALESCE($7, test_cases),
    project_id    = $8,
    updated_at    = NOW()
WHERE id = $9 AND user_id = $10
RETURNING *`} />

      {subHeader('Toggle completion')}
      <CodeBlock code={`UPDATE custom_test_cases
SET completed    = $1,
    completed_at = $2,
    updated_at   = NOW()
WHERE id = $3 AND user_id = $4
RETURNING *`} />

      {subHeader('Upsert sort order')}
      <CodeBlock code={`INSERT INTO test_case_order (user_id, slugs)
VALUES ($1, $2)
ON CONFLICT (user_id) DO UPDATE SET slugs = $2`} />

      {subHeader('Upsert test status')}
      <CodeBlock code={`INSERT INTO test_statuses (user_id, slug, status)
VALUES ($1, $2, $3)
ON CONFLICT (user_id, slug) DO UPDATE SET status = $3`} />

      {subHeader('Delete project (cascade)')}
      <CodeBlock code={`DELETE FROM projects WHERE id = $1
-- custom_test_cases with project_id = $1 are also deleted
-- via ON DELETE CASCADE constraint`} />
    </div>
  )

  // ── REAL-TIME ────────────────────────────────────────────────────────────────

  if (active === 'realtime') return (
    <div style={card}>
      {sectionHeader('Real-Time Sync (WebSockets)')}
      {prose('When multiple users are on the same page simultaneously, changes made by one user propagate to all others within ~100ms via WebSocket push — no polling required.')}
      <Divider />
      {subHeader('Architecture — cache invalidation (test cases, projects, order)')}
      <CodeBlock code={`Browser A                    Server (Express + ws)              Browser B
─────────────────────────────────────────────────────────────────────
1. User drags test case
2. setOrder(newOrder)         ← optimistic update (instant)
3. PUT /api/data/order ──────►
                              4. DB upsert
                              5. broadcast({ type:"order:updated" },
                                           excludeUserId: A.user.id)
                                           ────────────────────────► 6. WS message received
                                                                     7. WebSocketSync calls
                                                                        invalidateOrderCache()
                                                                     8. useTestOrder re-fetches
                                                                        /api/data/order
                                                                     9. UI re-renders with new order`} />
      <Divider />
      {subHeader('Architecture — direct cache patch (status, priority, expected)')}
      {prose('Status, priority, and expected checkbox changes use a faster path. Instead of invalidating the cache and re-fetching the full map, the backend broadcasts the exact new value and the frontend patches it directly into the in-memory cache — no extra HTTP request needed.')}
      <CodeBlock code={`Browser A                    Server (Express + ws)              Browser B
─────────────────────────────────────────────────────────────────────
1. User sets status = "pass"
2. statusCache updated        ← optimistic update (instant)
3. PUT /api/data/statuses ───►
                              4. DB upsert
                              5. broadcast({ type:"status:updated",
                                             slug, status:"pass" },
                                           excludeUserId: A.user.id)
                                           ────────────────────────► 6. WS message received
                                                                     7. WebSocketSync calls
                                                                        applyStatusUpdate(slug,"pass")
                                                                     8. statusCache[slug] = "pass"
                                                                        notifyStatus()
                                                                     9. All useTestStatus() hooks
                                                                        re-render — no fetch needed`} />
      <Divider />
      {subHeader('Why exclude the sender?')}
      {prose('The user who made the change already has an optimistic update applied instantly. If we sent the WebSocket event back to them, their UI would needlessly re-fetch and potentially flicker. So broadcast() skips clients whose ws.user.id matches the requester.')}
      <Divider />
      {subHeader('Reconnection')}
      {prose('If the WebSocket connection drops (server restart, network blip), the frontend\'s onclose handler waits 3 seconds and reconnects automatically. The refCount in useWebSocket.ts ensures the socket only opens when at least one component is mounted, and closes cleanly when none are.')}
    </div>
  )

  // ── AUTH FLOW ────────────────────────────────────────────────────────────────

  if (active === 'auth-flow') return (
    <div style={card}>
      {sectionHeader('Authentication Flow')}
      <CodeBlock code={`1. User visits any protected route (e.g. /homepage)
   └─► __root.tsx beforeLoad() calls isAuthenticated()
       └─► getSession() decodes JWT from localStorage
           ├─ No JWT / expired  →  redirect to /403
           └─ Valid JWT         →  allow navigation

2. User opens /login
   └─► beforeLoad() redirects to /homepage if already authed

3. User submits login form
   └─► login(username, password)
       └─► POST /api/auth/login
           ├─ 401  →  show "Invalid credentials" error
           └─ 200  →  setToken(jwt) → localStorage + memory
                       → navigate to /homepage

4. Every API call
   └─► api() attaches Authorization: Bearer <jwt>
       └─► backend middleware jwt.verify()
           ├─ Invalid / expired  →  401 → frontend setToken(null) → /login
           └─ Valid              →  req.user = { id, username }

5. Logout
   └─► logout() → setToken(null)
       clearCustomCache(), clearCaches(), clearProjectCache(),
       clearPermissionCache()
       → navigate to /login
       (WebSocketSync unmounts → socket closes)`} />
    </div>
  )

  return null
}

// ── Main page component ───────────────────────────────────────────────────────

function WikiPage() {
  const [active, setActive] = useState('overview')
  const [mobileOpen, setMobileOpen] = useState(false)

  const currentSection = SECTIONS.find(
    (s) => s.id === active || s.subsections?.some((sub) => sub.id === active)
  )

  return (
    <div style={{ background: 'var(--app-bg)', minHeight: '100vh', fontFamily: "'Poppins', sans-serif", color: 'var(--app-text)', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Fira+Code&display=swap');
        @keyframes movewiki { from { transform: translate(-10%,-10%); } to { transform: translate(20%,20%); } }
        .blob-wiki { position:absolute; border-radius:50%; background:var(--app-accent-gradient); filter:blur(80px); opacity:0.15; animation:movewiki 20s infinite alternate; pointer-events:none; }
        .wiki-sidebar-item { cursor:pointer; padding:6px 12px; border-radius:8px; font-size:0.83rem; transition:background 0.15s, color 0.15s; border:none; background:transparent; text-align:left; width:100%; color:var(--app-text-secondary); }
        .wiki-sidebar-item:hover { background:var(--app-glass); }
        .wiki-sidebar-sub { cursor:pointer; padding:5px 12px 5px 22px; border-radius:8px; font-size:0.78rem; transition:background 0.15s, color 0.15s; border:none; background:transparent; text-align:left; width:100%; color:var(--app-text-secondary); }
        .wiki-sidebar-sub:hover { background:var(--app-glass); }
        .wiki-scroll::-webkit-scrollbar { width:5px; }
        .wiki-scroll::-webkit-scrollbar-track { background:transparent; }
        .wiki-scroll::-webkit-scrollbar-thumb { background:var(--app-glass-border); border-radius:4px; }
      `}</style>

      {/* Background blobs */}
      <div className="blob-wiki" style={{ width: 500, height: 500, top: -150, left: -150 }} />
      <div className="blob-wiki" style={{ width: 400, height: 400, bottom: -100, right: -100, animationDelay: '-7s' }} />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 16px', position: 'relative', zIndex: 10 }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: '6px', background: 'var(--app-accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Application Wiki
              </h1>
              <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.9rem' }}>
                Complete reference for QA &amp; BA Assistant — pages, libraries, API, and database.
              </p>
            </div>
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              style={{ display: 'none', padding: '8px 12px', borderRadius: '8px', background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)', color: 'var(--app-text)', cursor: 'pointer', fontSize: '0.82rem' }}
              className="wiki-mobile-btn"
            >
              Menu
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '28px', alignItems: 'flex-start' }}>

          {/* ── Sidebar ─────────────────────────────────────────────────── */}
          <nav style={{
            width: '220px',
            flexShrink: 0,
            position: 'sticky',
            top: '20px',
            maxHeight: 'calc(100vh - 80px)',
            overflowY: 'auto',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--app-glass-border)',
            borderRadius: '14px',
            padding: '12px 8px',
          }} className="wiki-scroll">
            {SECTIONS.map((section) => (
              <div key={section.id} style={{ marginBottom: '2px' }}>
                <button
                  className="wiki-sidebar-item"
                  style={{
                    fontWeight: 600,
                    color: (active === section.id || section.subsections?.some((s) => s.id === active)) ? '#00d2ff' : 'rgba(255,255,255,0.7)',
                    background: (active === section.id || section.subsections?.some((s) => s.id === active)) ? 'rgba(0,210,255,0.1)' : 'transparent',
                  }}
                  onClick={() => { setActive(section.subsections ? section.subsections[0].id : section.id); setMobileOpen(false) }}
                >
                  {section.label}
                </button>
                {section.subsections?.map((sub) => (
                  <button
                    key={sub.id}
                    className="wiki-sidebar-sub"
                    style={{
                      color: active === sub.id ? '#00d2ff' : 'rgba(255,255,255,0.45)',
                      background: active === sub.id ? 'rgba(0,210,255,0.08)' : 'transparent',
                      fontWeight: active === sub.id ? 600 : 400,
                    }}
                    onClick={() => { setActive(sub.id); setMobileOpen(false) }}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          {/* ── Content ─────────────────────────────────────────────────── */}
          <main style={{ flex: 1, minWidth: 0 }}>
            {/* Breadcrumb */}
            <div style={{ marginBottom: '16px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>
              Wiki
              {currentSection && (
                <>
                  <span style={{ margin: '0 6px' }}>›</span>
                  <span style={{ color: 'var(--app-text-secondary)' }}>{currentSection.label}</span>
                </>
              )}
              {currentSection && (() => {
                const sub = currentSection.subsections?.find((s) => s.id === active)
                return sub ? (
                  <>
                    <span style={{ margin: '0 6px' }}>›</span>
                    <span style={{ color: 'var(--app-text)' }}>{sub.label}</span>
                  </>
                ) : null
              })()}
            </div>

            <WikiContent active={active} />
          </main>
        </div>
      </div>
    </div>
  )
}
