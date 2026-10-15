// Ember components, one-to-one with the Figma library (page "Components").
import { ArrowDown, ArrowUp, Check, Nfc, Sparkles, X, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import type { OrderStatus } from '../sim/catalog'

export const STROKE = 1.75
const eurFmt = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const eur0Fmt = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
export const eur = (v: number) => eurFmt.format(v).replace('-', '−')
export const eur0 = (v: number) => eur0Fmt.format(v).replace('-', '−')
export const eurK = (v: number) => `${v < 0 ? '−' : ''}€${(Math.abs(v) / 1000).toFixed(1)}k`
export const pct = (v: number, digits = 0) => `${(Math.abs(v) * 100).toFixed(digits)}%`
export const num = (v: number) => v.toLocaleString('en-IE')

type ButtonKind = 'primary' | 'accent' | 'secondary' | 'ghost'
export function Button({ kind = 'primary', icon: Icon, size = 'm', children, ...rest }: { kind?: ButtonKind; icon?: LucideIcon; size?: 'm' | 's'; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className="btn" data-kind={kind} data-size={size} {...rest}>
      {Icon && <Icon size={size === 'm' ? 18 : 16} strokeWidth={STROKE} aria-hidden="true" />}
      {children}
    </button>
  )
}

export function IconButton({ icon: Icon, label, look = 'plain', dot, ...rest }: { icon: LucideIcon; label: string; look?: 'plain' | 'card' | 'inset' | 'inverse'; dot?: boolean | number } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className="icon-btn" data-look={look} aria-label={label} title={label} {...rest}>
      <Icon size={20} strokeWidth={STROKE} aria-hidden="true" />
      {dot ? <span className="icon-btn-dot" aria-hidden="true">{typeof dot === 'number' ? dot : ''}</span> : null}
    </button>
  )
}

const STATUS: Record<OrderStatus, string> = { completed: 'Completed', pending: 'Pending', processing: 'Processing', shipped: 'Shipped', refunded: 'Refunded' }
export function Status({ status, label }: { status: OrderStatus | 'positive' | 'negative' | 'warning' | 'info' | 'neutral'; label?: string }) {
  return <span className="status" data-status={status}><span className="status-dot" aria-hidden="true" />{label ?? STATUS[status as OrderStatus]}</span>
}

export type Trend = 'up' | 'down' | 'up-bad' | 'down-good' | 'flat'
export function Delta({ trend, children }: { trend: Trend; children: ReactNode }) {
  if (trend === 'flat') return <span className="delta" data-good="flat">{children}</span>
  const Icon = trend.startsWith('up') ? ArrowUp : ArrowDown
  const good = trend === 'up' || trend === 'down-good'
  return <span className="delta" data-good={good}><Icon size={13} strokeWidth={2} aria-label={trend.startsWith('up') ? 'up' : 'down'} />{children}</span>
}
/** Pick a delta for a change where higher is better (or worse, with lowerIsBetter). */
export const trendOf = (change: number, lowerIsBetter = false): Trend =>
  change >= 0 ? (lowerIsBetter ? 'up-bad' : 'up') : lowerIsBetter ? 'down-good' : 'down'

export function Avatar({ initials, size = 32 }: { initials: string; size?: 32 | 40 }) {
  return <span className="avatar" data-size={size} aria-hidden="true">{initials}</span>
}

export function IconTile({ icon: Icon, tone = 'card', size = 32 }: { icon: LucideIcon; tone?: 'card' | 'inset' | 'accent'; size?: 32 | 40 }) {
  return <span className="icon-tile" data-tone={tone} data-size={size} aria-hidden="true"><Icon size={size === 32 ? 16 : 20} strokeWidth={STROKE} /></span>
}

export function Card({ title, subtitle, action, children, className = '', id, tight }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string; id?: string; tight?: boolean }) {
  const hid = id ? `${id}-title` : undefined
  return (
    <section className={`card ${className}`} data-tight={tight || undefined} id={id} aria-labelledby={title ? hid : undefined}>
      {(title || action) && (
        <div className="card-header">
          {title && <div><h2 className="t-h2" id={hid}>{title}</h2>{subtitle && <p className="t-body c-secondary">{subtitle}</p>}</div>}
          {action && <div className="card-actions">{action}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

export function KpiTile({ label, value, delta, trend, period, icon, hero }: { label: string; value: string; delta: string; trend: Trend; period: string; icon: LucideIcon; hero?: boolean }) {
  const Icon = icon
  return (
    <div className="kpi" data-hero={hero || undefined}>
      <div className="kpi-top">
        <span className="t-body-medium kpi-label">{label}</span>
        {hero ? <span className="kpi-ring" aria-hidden="true"><Icon size={16} strokeWidth={STROKE} /></span> : <IconTile icon={icon} />}
      </div>
      <p className="t-display-kpi tnum">{value}</p>
      <p className="kpi-bottom">
        {hero ? <span className="delta" data-hero><ArrowUp size={13} strokeWidth={2} aria-label={trend.startsWith('up') ? 'up' : 'down'} style={trend.startsWith('up') ? undefined : { transform: 'rotate(180deg)' }} />{delta}</span> : <Delta trend={trend}>{delta}</Delta>}
        <span className="t-caption kpi-period">{period}</span>
      </p>
    </div>
  )
}

/** Spending limit bar: orange fill over a hatched track. */
export function LimitBar({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(1, value))
  return (
    <div className="limit" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)}>
      <span className="limit-fill" style={{ width: `${Math.max(2, v * 100)}%` }} />
    </div>
  )
}

export function WalletCard({ symbol, code, amount, limit, active }: { symbol: string; code: string; amount: string; limit: string; active: boolean }) {
  return (
    <div className="wallet">
      <div className="wallet-top">
        <span className="symbol" aria-hidden="true">{symbol}</span>
        <span className="t-label">{code}</span>
      </div>
      <p className="t-h3 tnum">{amount}</p>
      <p className="t-caption c-tertiary">{limit}</p>
      <p className="t-label-small" data-tone={active ? 'positive' : 'negative'}>{active ? 'Active' : 'Paused'}</p>
    </div>
  )
}

export function PaymentCard({ style, last4, exp, frozen }: { style: 'Ink' | 'Orange'; last4: string; exp: string; frozen?: boolean }) {
  return (
    <div className="pay-card" data-style={style} data-frozen={frozen || undefined} aria-label={`${style === 'Ink' ? 'Ink' : 'Orange'} card ending ${last4}, expires ${exp}${frozen ? ', frozen' : ''}`} role="img">
      <div className="pay-top"><Nfc size={16} strokeWidth={STROKE} aria-hidden="true" /><span className="pay-pill">{frozen ? 'Frozen' : 'Active'}</span></div>
      {style === 'Orange' && <Sparkles className="pay-spark" size={26} strokeWidth={STROKE} aria-hidden="true" />}
      <div className="pay-bottom">
        <div><span className="t-caption">Card number</span><span className="t-label tnum">•••• {last4}</span></div>
        <div><span className="t-caption">EXP</span><span className="t-label tnum">{exp}</span></div>
      </div>
    </div>
  )
}

export function Legend({ items }: { items: { label: string; series: 'accent' | 'neutral' }[] }) {
  return <ul className="legend">{items.map(i => <li key={i.label} className="t-label-small c-secondary"><span className="legend-swatch" data-series={i.series} aria-hidden="true" />{i.label}</li>)}</ul>
}

/** Stacked profit-and-loss columns: costs in ink, profit hatched orange on top. */
export function PnlChart({ months, height = 196, selected, onSelect }: { months: { label: string; revenue: number; costs: number; profit: number }[]; height?: number; selected?: number; onSelect?: (i: number) => void }) {
  const max = Math.max(...months.map(m => Math.max(m.revenue, m.costs)), 1)
  const step = max > 60000 ? 20000 : max > 30000 ? 10000 : 5000
  const top = Math.ceil(max / step) * step
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => top - i * step)
  return (
    <figure className="pnl" aria-label="Profit and loss by month">
      <div className="pnl-plot" style={{ height }}>
        <div className="pnl-axis t-caption c-tertiary" aria-hidden="true">{ticks.map(t => <span key={t}>{t ? `${t / 1000}k` : '0'}</span>)}</div>
        <div className="pnl-cols">
          {months.map((m, i) => {
            const profit = Math.max(0, m.profit)
            return (
              <button key={m.label} type="button" className="pnl-col" aria-pressed={selected === i} disabled={!onSelect} onClick={() => onSelect?.(i)}
                aria-label={`${m.label}: revenue ${eur0(m.revenue)}, costs ${eur0(m.costs)}, profit ${eur0(m.profit)}`}>
                <span className="pnl-bar" style={{ height: `${(Math.max(m.revenue, m.costs) / top) * 100}%` }}>
                  <span className="pnl-profit" style={{ flexGrow: profit }} />
                  <span className="pnl-costs" style={{ flexGrow: Math.min(m.costs, m.revenue) }} />
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="pnl-labels t-caption c-secondary" aria-hidden="true"><span />{months.map(m => <span key={m.label}>{m.label}</span>)}</div>
    </figure>
  )
}

export function Dialog({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  const id = `dlg-${title.replace(/\W+/g, '-').toLowerCase()}`
  return (
    <dialog ref={ref} className="dialog" data-wide={wide || undefined} onClose={onClose} onClick={e => { if (e.target === ref.current) onClose() }} aria-labelledby={id}>
      {open && (
        <>
          <div className="dialog-head"><h2 id={id} className="t-h1">{title}</h2><IconButton icon={X} label="Close" look="inset" onClick={onClose} /></div>
          {children}
        </>
      )}
    </dialog>
  )
}

export function Checkbox({ checked, onChange, label }: { checked: boolean | 'mixed'; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="checkbox" title={label}>
      <input type="checkbox" checked={checked === true} ref={el => { if (el) el.indeterminate = checked === 'mixed' }} onChange={e => onChange(e.target.checked)} aria-label={label} />
      <span aria-hidden="true">{checked === true && <Check size={13} strokeWidth={2.5} />}{checked === 'mixed' && <span className="dash" />}</span>
    </label>
  )
}

export function Stars({ n }: { n: number }) {
  return <span className="stars" role="img" aria-label={`${n} out of 5 stars`}>{'★★★★★'.slice(0, n)}<span className="stars-off">{'★★★★★'.slice(n)}</span></span>
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty t-body c-secondary">{children}</p>
}
