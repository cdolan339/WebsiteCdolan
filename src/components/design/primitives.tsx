import { type ReactNode, type CSSProperties, type MouseEvent } from 'react'
import {
  Check, X, Clock, Calendar, Flag, Users, FileText, Layers,
  GitBranch, Clipboard, AlertTriangle, Tag, Target, Search,
  Filter, ArrowUpDown, MoreHorizontal, Plus, ArrowRight,
  ChevronDown, ChevronRight, Folder, Book, TrendingUp, Bell,
  Moon, Sun, Edit3, Link as LinkIcon, Play, CheckCircle2,
  XCircle, Sparkles, Home, Grid3x3, List, Columns3, User as UserIcon,
  Eye,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   Shared design primitives — Tazar light mode (Canvas palette)
   ───────────────────────────────────────────────────────────── */

export const iconMap = {
  check: Check, x: X, clock: Clock, calendar: Calendar, flag: Flag,
  users: Users, 'file-text': FileText, layers: Layers, branch: GitBranch,
  clipboard: Clipboard, alert: AlertTriangle, tag: Tag, target: Target,
  search: Search, filter: Filter, sort: ArrowUpDown, more: MoreHorizontal,
  plus: Plus, 'arrow-right': ArrowRight, 'chevron-down': ChevronDown,
  'chevron-right': ChevronRight, folder: Folder, book: Book,
  'trend-up': TrendingUp, bell: Bell, moon: Moon, sun: Sun, edit: Edit3,
  link: LinkIcon, play: Play, 'check-circle': CheckCircle2,
  'x-circle': XCircle, sparkles: Sparkles, home: Home, grid: Grid3x3,
  list: List, split: Columns3, user: UserIcon, eye: Eye,
} as const

export type IconName = keyof typeof iconMap

export function Icon({ name, size = 14, className, style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  const Cmp = iconMap[name]
  if (!Cmp) return null
  return <Cmp size={size} className={className} style={style} strokeWidth={1.8} />
}

/* ── Pill ───────────────────────────────────────────────────── */

type PillTone = 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'neutral'

export function Pill({ tone = 'neutral', icon, children, style }: {
  tone?: PillTone
  icon?: IconName
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <span className={`tz-pill ${tone}`} style={style}>
      {icon && <Icon name={icon} size={11} />}
      {children}
    </span>
  )
}

/* ── PriorityPill ───────────────────────────────────────────── */

export type PriorityLevel = 'low' | 'med' | 'medium' | 'high' | 'critical'

export function PriorityPill({ level }: { level: PriorityLevel | string }) {
  const map: Record<string, { label: string; cls: PillTone; dot: string }> = {
    critical: { label: 'Critical', cls: 'red', dot: 'critical' },
    high: { label: 'High', cls: 'red', dot: 'high' },
    med: { label: 'Medium', cls: 'amber', dot: 'med' },
    medium: { label: 'Medium', cls: 'amber', dot: 'med' },
    low: { label: 'Low', cls: 'green', dot: 'low' },
  }
  const p = map[level] ?? map.med
  return (
    <span className={`tz-pill ${p.cls}`}>
      <span className={`priority-dot ${p.dot}`} />
      {p.label}
    </span>
  )
}

/* ── Avatar + Stack ────────────────────────────────────────── */

const AVATAR_COLORS = ['#7C5CFF', '#E85AA8', '#F28B3B', '#1E9F6E', '#3A6DF0', '#D68A1A', '#D8433B']
export function colorForName(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export function Avatar({ name, color, size = 24 }: { name: string; color?: string; size?: number }) {
  const bg = color ?? colorForName(name || '?')
  const initial = (name?.[0] ?? '?').toUpperCase()
  return (
    <span className="tz-avatar" style={{ background: bg, width: size, height: size, fontSize: Math.round(size * 0.4) }} title={name}>
      {initial}
    </span>
  )
}

export function AvatarStack({ people, max = 3, size = 24 }: {
  people: Array<{ name: string; color?: string }>
  max?: number
  size?: number
}) {
  const shown = people.slice(0, max)
  const extra = people.length - shown.length
  return (
    <span className="tz-avatar-stack">
      {shown.map((p, i) => <Avatar key={i} name={p.name} color={p.color} size={size} />)}
      {extra > 0 && (
        <span
          className="tz-avatar"
          style={{ width: size, height: size, fontSize: Math.round(size * 0.38), background: 'var(--chip)', color: 'var(--mute)' }}
        >+{extra}</span>
      )}
    </span>
  )
}

/* ── CaseBar — stacked progress ─────────────────────────────── */

export type CaseBreakdown = { pass?: number; fail?: number; pending?: number; blocked?: number }

export function CaseBar({ cases, total, height = 5 }: { cases: CaseBreakdown; total?: number; height?: number }) {
  const t = (total ?? ((cases.pass ?? 0) + (cases.fail ?? 0) + (cases.pending ?? 0) + (cases.blocked ?? 0))) || 1
  const pct = (n: number) => (n / t) * 100
  return (
    <div className="pbar" style={{ height }}>
      {!!cases.pass && <span style={{ width: pct(cases.pass) + '%', background: 'var(--green)' }} />}
      {!!cases.fail && <span style={{ width: pct(cases.fail) + '%', background: 'var(--red)' }} />}
      {!!cases.pending && <span style={{ width: pct(cases.pending) + '%', background: 'var(--amber)' }} />}
      {!!cases.blocked && <span style={{ width: pct(cases.blocked) + '%', background: 'var(--mute-2)' }} />}
    </div>
  )
}

/* ── Ring — circular progress ──────────────────────────────── */

export function Ring({ value, size = 36, stroke = 3, color = 'var(--green)' }: {
  value: number; size?: number; stroke?: number; color?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c - (Math.max(0, Math.min(100, value)) / 100) * c
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--chip)" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  )
}

/* ── StatChip ──────────────────────────────────────────────── */

export function StatChip({ icon, label, value }: { icon: IconName; label: string; value: number | string }) {
  return (
    <span
      className="tz-pill tz-mono"
      style={{
        background: 'var(--chip)', color: 'var(--ink-2)',
        fontSize: 11, padding: '4px 8px', gap: 6,
      }}
      title={label}
    >
      <Icon name={icon} size={12} style={{ opacity: 0.7 }} />
      <span style={{ color: 'var(--mute)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </span>
  )
}

/* ── SectionHead ───────────────────────────────────────────── */

export function SectionHead({ icon, gradient = 'grad-purple', label, meta, action }: {
  icon: IconName
  gradient?: 'grad-purple' | 'grad-pink' | 'grad-orange' | 'grad-blue' | 'grad-green'
    | 'grad-aurora-projects' | 'grad-aurora-stories' | 'grad-aurora-suites'
  label: string
  meta?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="section-head">
      <div className={'section-icon ' + gradient}>
        <Icon name={icon} size={22} />
      </div>
      <h2>{label}</h2>
      {meta !== undefined && <span className="tz-mono" style={{ color: 'var(--mute)', fontSize: 11, marginLeft: 4 }}>{meta}</span>}
      <span className="spacer" />
      {action && <div className="actions">{action}</div>}
    </div>
  )
}

/* ── Segmented ─────────────────────────────────────────────── */

export type SegmentedOption<V extends string = string> = {
  value: V
  label: string
  icon?: IconName
  count?: number | null
}

export function Segmented<V extends string = string>({
  options, value, onChange, variant = 'default',
}: {
  options: SegmentedOption<V>[]
  value: V
  onChange: (v: V) => void
  variant?: 'default' | 'gradient'
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        background: variant === 'gradient' ? 'transparent' : 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 999, padding: 3, gap: 2,
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      {options.map(opt => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              border: 0,
              background: active
                ? (variant === 'gradient' ? 'linear-gradient(105deg, var(--purple), var(--pink))' : 'var(--chip)')
                : 'transparent',
              color: active ? (variant === 'gradient' ? 'white' : 'var(--ink)') : 'var(--mute)',
              padding: variant === 'gradient' ? '10px 22px' : '6px 14px',
              fontSize: 13, fontWeight: 500, borderRadius: 999,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: 'inherit', transition: 'all .15s', letterSpacing: '-0.005em',
            }}
          >
            {opt.icon && <Icon name={opt.icon} size={14} />}
            {opt.label}
            {opt.count !== undefined && opt.count !== null && (
              <span
                style={{
                  background: active ? 'rgba(255,255,255,0.2)' : 'var(--chip)',
                  color: active ? 'white' : 'var(--mute)',
                  padding: '1px 7px', borderRadius: 999, fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
                }}
              >{opt.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ── Button helpers ────────────────────────────────────────── */

type BtnProps = {
  variant?: 'default' | 'gradient' | 'ghost'
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
  style?: CSSProperties
  children: ReactNode
  title?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

export function Button({ variant = 'default', onClick, style, children, title, disabled, type = 'button' }: BtnProps) {
  const cls = variant === 'gradient' ? 'tz-btn tz-btn-gradient' : variant === 'ghost' ? 'tz-btn tz-btn-ghost' : 'tz-btn'
  return (
    <button type={type} className={cls} onClick={onClick} style={style} title={title} disabled={disabled}>
      {children}
    </button>
  )
}

/* ── PageShell — atmosphere + centered column ─────────────── */

export function PageShell({ children, bleed = false }: { children: ReactNode; bleed?: boolean }) {
  return (
    <div className="page-enter" style={{ position: 'relative' }}>
      <div className="page-atmos" aria-hidden />
      {bleed ? children : <div className="shell">{children}</div>}
    </div>
  )
}

/* ── EyebrowChip ───────────────────────────────────────────── */

export function EyebrowChip({ icon, children, tone = 'purple' }: {
  icon?: IconName
  children: ReactNode
  tone?: 'purple' | 'blue' | 'orange' | 'pink' | 'green'
}) {
  const palette: Record<string, { bg: string; fg: string }> = {
    purple: { bg: 'color-mix(in oklab, var(--purple) 12%, transparent)', fg: 'color-mix(in oklab, var(--purple) 90%, var(--ink))' },
    blue: { bg: 'color-mix(in oklab, var(--blue) 12%, transparent)', fg: 'color-mix(in oklab, var(--blue) 85%, var(--ink))' },
    orange: { bg: 'color-mix(in oklab, var(--orange) 14%, transparent)', fg: 'color-mix(in oklab, var(--orange) 80%, var(--ink))' },
    pink: { bg: 'color-mix(in oklab, var(--pink) 14%, transparent)', fg: 'color-mix(in oklab, var(--pink) 80%, var(--ink))' },
    green: { bg: 'color-mix(in oklab, var(--green) 14%, transparent)', fg: 'color-mix(in oklab, var(--green) 80%, var(--ink))' },
  }
  const { bg, fg } = palette[tone]
  return (
    <span className="eyebrow-chip" style={{ background: bg, color: fg }}>
      {icon && <Icon name={icon} size={11} />}
      {children}
    </span>
  )
}
