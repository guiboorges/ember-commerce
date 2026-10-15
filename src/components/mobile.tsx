// Phone navigation (Figma: Components → Mobile navigation, Screens → Mobile screens).
// Under 600 px the top tabs and the sidebar give way to a bottom Tab Bar: Home, Orders, Create, Finance, More.
import { ArrowLeftRight, Bell, Box, ChevronRight, CircleAlert, Download, House, Menu, Plus, Search, ShoppingBag, Truck, Wallet } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { AREAS, href, type AreaDef, type PageDef } from '../nav'
import { stockLevels } from '../sim/catalog'
import type { EmberApi } from '../sim/useEmber'
import { Avatar, Button, IconTile, STROKE } from './ui'

const TABS = [
  { id: 'overview', label: 'Home', icon: House },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'finance', label: 'Finance', icon: Wallet },
  { id: 'more', label: 'More', icon: Menu },
] as const
export const MORE_AREAS = ['products', 'customers', 'reports']

export function MobileTopBar({ api, alertCount, onSearch }: { api: EmberApi; alertCount: number; onSearch: () => void }) {
  return (
    <header className="m-top">
      <a className="m-logo" href={href('overview')} aria-label="Ember, go to the dashboard"><span className="logo-mark" aria-hidden="true">e</span><span className="t-h3">Ember</span></a>
      <div className="m-actions">
        <button type="button" className="icon-btn" data-look="plain" aria-label="Search" onClick={onSearch}><Search size={20} strokeWidth={STROKE} aria-hidden="true" /></button>
        <a className="icon-btn" data-look="plain" href={href('overview', 'activity')} aria-label={`Notifications${api.state.unread ? `, ${api.state.unread} new` : ''}`} onClick={() => api.act({ type: 'read' })}>
          <Bell size={20} strokeWidth={STROKE} aria-hidden="true" />{api.state.unread > 0 && <span className="icon-btn-dot" aria-hidden="true" />}
        </a>
        <a className="icon-btn" data-look="plain" href={href('overview', 'alerts')} aria-label={`Alerts: ${alertCount}`}>
          <CircleAlert size={20} strokeWidth={STROKE} aria-hidden="true" />{alertCount > 0 && <span className="icon-btn-dot count" aria-hidden="true">{alertCount}</span>}
        </a>
        <a href="#/more" aria-label="Account and more"><Avatar initials="GB" /></a>
      </div>
    </header>
  )
}

/** The area's pages as a scrolling row under the page title (the desktop sidebar). */
export function Submenu({ area, page }: { area: AreaDef; page: PageDef }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => { ref.current?.querySelector('[aria-current]')?.scrollIntoView({ block: 'nearest', inline: 'center' }) }, [page])
  return (
    <nav className="m-sub" ref={ref} aria-label={`${area.label} pages`}>
      {area.pages.map(p => <a key={p.id} className="tab" href={href(area.id, p.id)} aria-current={p.id === page.id ? 'page' : undefined}>{p.label}</a>)}
    </nav>
  )
}

export function TabBar({ active, onCreate }: { active: string; onCreate: () => void }) {
  const item = (t: (typeof TABS)[number]) => (
    <a key={t.id} className="m-tab" href={t.id === 'more' ? '#/more' : href(t.id)} aria-current={active === t.id ? 'page' : undefined}>
      <span className="m-pill"><t.icon size={20} strokeWidth={STROKE} aria-hidden="true" /></span>
      <span className="t-label-small">{t.label}</span>
    </a>
  )
  return (
    <nav className="m-bar" aria-label="Main">
      {item(TABS[0])}{item(TABS[1])}
      <button type="button" className="m-create" aria-label="Create" aria-haspopup="dialog" onClick={onCreate}><Plus size={24} strokeWidth={2} aria-hidden="true" /></button>
      {item(TABS[2])}{item(TABS[3])}
    </nav>
  )
}

function SheetAction({ icon, title, detail, onClick, href: to }: { icon: typeof Plus; title: string; detail: string; onClick?: () => void; href?: string }) {
  const body: ReactNode = (<><IconTile icon={icon} tone="accent" size={40} /><span className="list-text grow"><span className="t-body-medium">{title}</span><span className="t-caption c-secondary">{detail}</span></span><ChevronRight size={18} strokeWidth={STROKE} aria-hidden="true" className="c-tertiary" /></>)
  return to ? <a className="sheet-action" href={to} onClick={onClick}>{body}</a> : <button type="button" className="sheet-action" onClick={onClick}>{body}</button>
}

export function CreateSheet({ api, open, onClose, onMoney }: { api: EmberApi; open: boolean; onClose: () => void; onMoney: (m: 'transfer' | 'request') => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  const waiting = api.orders.filter(o => o.status === 'pending' || o.status === 'processing').length
  const low = stockLevels(api.orders, api.today, api.state.restocks).filter(x => x.low).length
  return (
    <dialog ref={ref} className="sheet" aria-labelledby="sheet-title" onClose={onClose} onClick={e => { if (e.target === ref.current) onClose() }}>
      {open && (
        <>
          <span className="sheet-handle" aria-hidden="true" />
          <div><h2 className="t-h1" id="sheet-title">Create</h2><p className="t-body c-secondary">Quick actions for money and orders</p></div>
          <SheetAction icon={ArrowLeftRight} title="New transfer" detail="Pay a supplier from any wallet" onClick={() => { onClose(); onMoney('transfer') }} />
          <SheetAction icon={Download} title="Request payment" detail="Send a payment request" onClick={() => { onClose(); onMoney('request') }} />
          <SheetAction icon={Truck} title="Ship ready orders" detail={waiting ? `${waiting} orders waiting` : 'Nothing waiting'} href={href('orders', 'shipping')} onClick={onClose} />
          <SheetAction icon={Box} title="Restock a product" detail={low ? `${low} products running low` : 'Stock is fine'} href={href('products', 'inventory')} onClick={onClose} />
          <Button kind="secondary" onClick={onClose}>Cancel</Button>
        </>
      )}
    </dialog>
  )
}

export function MorePage({ theme, setTheme, onReset }: { theme: 'light' | 'dark'; setTheme: (t: 'light' | 'dark') => void; onReset: () => void }) {
  return (
    <>
      <div className="page-head"><div><h1 className="t-display-greeting">More</h1><p className="t-body c-secondary">Every other area, your settings, and the demo.</p></div></div>
      {AREAS.filter(a => MORE_AREAS.includes(a.id)).map(a => (
        <section key={a.id} className="card more-group" aria-labelledby={`more-${a.id}`}>
          <h2 className="t-overline c-tertiary" id={`more-${a.id}`}>{a.label}</h2>
          <ul>
            {a.pages.map(p => (
              <li key={p.id}><a className="more-link" href={href(a.id, p.id)}><IconTile icon={p.icon} tone="inset" /><span className="t-body-medium grow">{p.label}</span><ChevronRight size={18} strokeWidth={STROKE} aria-hidden="true" className="c-tertiary" /></a></li>
            ))}
          </ul>
        </section>
      ))}
      <section className="card more-group" aria-labelledby="more-settings">
        <h2 className="t-overline c-tertiary" id="more-settings">Settings</h2>
        <div className="split" role="radiogroup" aria-label="Theme">
          <span className="t-body-medium">Theme</span>
          <span className="theme-switch">
            <button type="button" role="radio" aria-checked={theme === 'light'} onClick={() => setTheme('light')}>Light</button>
            <button type="button" role="radio" aria-checked={theme === 'dark'} onClick={() => setTheme('dark')}>Dark</button>
          </span>
        </div>
        <p className="t-caption c-secondary">Kiln &amp; Co. is a simulated shop. Your changes are saved in this browser only.</p>
        <Button kind="secondary" onClick={onReset}>Reset the demo</Button>
      </section>
    </>
  )
}
