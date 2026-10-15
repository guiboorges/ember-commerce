import { Bell, ChevronDown, ChevronsLeft, ChevronsRight, CircleAlert, CircleHelp, Moon, RotateCcw, Search, Sun } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AREAS, href, parseHash } from './nav'
import { alerts as computeAlerts } from './sim/alerts'
import { CUSTOMERS, customerById, orderId, PRODUCTS } from './sim/catalog'
import { useEmber } from './sim/useEmber'
import { MoneyDialog, OrderDialog } from './components/shared'
import { CreateSheet, MobileTopBar, MORE_AREAS, MorePage, Submenu, TabBar } from './components/mobile'
import { Avatar, Dialog, eur, IconButton, STROKE } from './components/ui'
import { ActivityPage, AlertsPage, Dashboard } from './pages/overview'
import { AllOrders, Carts, Returns, Shipping } from './pages/orders'
import { Catalog, Categories, Discounts, Inventory } from './pages/products'
import { AllCustomers, Reviews, Segments } from './pages/customers'
import { Accounts, Cards, Invoices, Taxes, Transfers } from './pages/finance'
import { CashFlow, Exports, Pnl, Sales } from './pages/reports'

type Theme = 'light' | 'dark'
const read = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const write = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* storage blocked */ } }
function initialTheme(): Theme {
  const p = new URLSearchParams(location.search).get('theme')
  if (p === 'light' || p === 'dark') return p
  const s = read('ember-commerce:theme')
  if (s === 'light' || s === 'dark') return s
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function App() {
  const api = useEmber()
  const [route, setRoute] = useState(() => parseHash(location.hash))
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [collapsed, setCollapsed] = useState(() => new URLSearchParams(location.search).get('sidebar') === 'collapsed' || read('ember-commerce:sidebar') === 'collapsed')
  const [menu, setMenu] = useState<null | 'bell' | 'user'>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [order, setOrder] = useState<number | null>(null)
  const [more, setMore] = useState(() => location.hash === '#/more')
  const [sheet, setSheet] = useState(false)
  const [money, setMoney] = useState<null | 'transfer' | 'request'>(null)
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const on = () => { setRoute(parseHash(location.hash)); setMore(location.hash === '#/more'); window.scrollTo({ top: 0 }); mainRef.current?.focus({ preventScroll: true }) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  useEffect(() => { document.documentElement.dataset.theme = theme; write('ember-commerce:theme', theme) }, [theme])
  useEffect(() => { write('ember-commerce:sidebar', collapsed ? 'collapsed' : 'expanded') }, [collapsed])
  useEffect(() => { document.title = more ? 'More — Ember' : `${route.page.label} · ${route.area.label} — Ember` }, [route, more])
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true) } if (e.key === 'Escape') setMenu(null) }
    const down = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.anchor')) setMenu(null) }
    window.addEventListener('keydown', key); window.addEventListener('mousedown', down)
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('mousedown', down) }
  }, [])

  const alertCount = useMemo(() => computeAlerts(api.state, api.orders, api.today, api.nowMinute).length, [api.state, api.orders, api.today, api.nowMinute])
  const { area, page } = route
  const open = (no: number) => setOrder(no)

  const activeTab = more || MORE_AREAS.includes(area.id) ? 'more' : area.id
  const content: ReactNode = more ? <MorePage theme={theme} setTheme={setTheme} onReset={() => api.act({ type: 'reset' })} /> : (() => {
    switch (`${area.id}/${page.id}`) {
      case 'overview/activity': return <ActivityPage api={api} onOpen={open} />
      case 'overview/alerts': return <AlertsPage api={api} />
      case 'orders/all': return <AllOrders api={api} onOpen={open} />
      case 'orders/returns': return <Returns api={api} />
      case 'orders/shipping': return <Shipping api={api} onOpen={open} />
      case 'orders/carts': return <Carts api={api} />
      case 'products/catalog': return <Catalog api={api} />
      case 'products/inventory': return <Inventory api={api} />
      case 'products/categories': return <Categories api={api} />
      case 'products/discounts': return <Discounts api={api} />
      case 'customers/all': return <AllCustomers api={api} />
      case 'customers/segments': return <Segments api={api} />
      case 'customers/reviews': return <Reviews api={api} />
      case 'finance/accounts': return <Accounts api={api} />
      case 'finance/cards': return <Cards api={api} />
      case 'finance/transfers': return <Transfers api={api} />
      case 'finance/invoices': return <Invoices api={api} />
      case 'finance/taxes': return <Taxes api={api} />
      case 'reports/sales': return <Sales api={api} />
      case 'reports/pnl': return <Pnl api={api} />
      case 'reports/cashflow': return <CashFlow api={api} />
      case 'reports/exports': return <Exports api={api} />
      default: return <Dashboard api={api} onOpen={open} />
    }
  })()

  const ago = (ms: number) => { const m = Math.round((api.now.getTime() - ms) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago` }

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <div className="window" data-collapsed={collapsed || undefined}>
        <MobileTopBar api={api} alertCount={alertCount} onSearch={() => setSearchOpen(true)} />
        <header className="header">
          <a className="pill logo" href={href('overview')} aria-label="Ember, go to the dashboard"><span className="logo-mark" aria-hidden="true">e</span><span className="t-h3">Ember</span></a>
          <nav className="pill tabs" aria-label="Areas">
            {AREAS.map(a => <a key={a.id} className="tab" href={href(a.id)} aria-current={a.id === area.id ? 'page' : undefined}>{a.label}</a>)}
          </nav>
          <div className="header-right">
            <div className="pill icons">
              <IconButton icon={Search} label="Search (⌘K)" onClick={() => setSearchOpen(true)} />
              <div className="anchor">
                <IconButton icon={Bell} label="Notifications" dot={api.state.unread > 0} aria-expanded={menu === 'bell'} onClick={() => { setMenu(menu === 'bell' ? null : 'bell'); api.act({ type: 'read' }) }} />
                {menu === 'bell' && (
                  <div className="popover" role="dialog" aria-label="Notifications">
                    <p className="t-h3">Notifications</p>
                    <ul className="feed">{api.state.events.slice(0, 7).map(e => <li key={e.id}><span className="status-dot" data-tone={e.tone} aria-hidden="true" /><span className="t-body-medium">{e.text}</span><span className="t-caption c-secondary">{e.detail ? `${e.detail} · ` : ''}{ago(e.at)}</span></li>)}</ul>
                    <a className="link t-label" href={href('overview', 'activity')} onClick={() => setMenu(null)}>See all activity</a>
                  </div>
                )}
              </div>
              <a className="icon-btn" data-look="plain" href={href('overview', 'alerts')} aria-label={`Alerts: ${alertCount}`} title="Alerts">
                <CircleAlert size={20} strokeWidth={STROKE} aria-hidden="true" />{alertCount > 0 && <span className="icon-btn-dot count" aria-hidden="true">{alertCount}</span>}
              </a>
            </div>
            <div className="anchor">
              <button type="button" className="pill user" aria-expanded={menu === 'user'} onClick={() => setMenu(menu === 'user' ? null : 'user')}>
                <Avatar initials="GB" size={40} /><span className="user-text"><span className="t-label">Guilherme Borges</span><span className="t-caption c-secondary">Owner · Kiln &amp; Co.</span></span><ChevronDown size={16} aria-hidden="true" />
              </button>
              {menu === 'user' && (
                <div className="popover" role="dialog" aria-label="Account">
                  <p className="t-caption c-secondary">Kiln &amp; Co. is a simulated shop. Your changes are saved in this browser only.</p>
                  <button type="button" className="menu-item" onClick={() => { api.act({ type: 'reset' }); setMenu(null) }}><RotateCcw size={18} strokeWidth={STROKE} aria-hidden="true" />Reset the demo</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="body">
          <nav className="sidebar" aria-label={`${area.label} pages`}>
            <div className="sidebar-head">
              {!collapsed && <span className="t-overline c-tertiary">{area.label}</span>}
              <IconButton icon={collapsed ? ChevronsRight : ChevronsLeft} look="inset" label={collapsed ? 'Expand the sidebar' : 'Collapse the sidebar'} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)} />
            </div>
            <ul className="side-links">
              {area.pages.map(p => (
                <li key={p.id}><a className="side-link" href={href(area.id, p.id)} aria-current={p.id === page.id ? 'page' : undefined} title={collapsed ? p.label : undefined} aria-label={collapsed ? p.label : undefined}>
                  <p.icon size={18} strokeWidth={STROKE} aria-hidden="true" />{!collapsed && <span>{p.label}</span>}
                  {p.id === 'alerts' && alertCount > 0 && <span className="side-count" aria-hidden="true">{alertCount}</span>}
                </a></li>
              ))}
            </ul>
            <div className="sidebar-foot">
              <div className="theme" role="radiogroup" aria-label="Theme">
                {!collapsed && <span className="t-body-medium c-secondary">Theme</span>}
                <span className="theme-switch">
                  <button type="button" role="radio" aria-checked={theme === 'light'} aria-label="Light" title="Light" onClick={() => setTheme('light')}><Sun size={16} strokeWidth={STROKE} aria-hidden="true" /></button>
                  <button type="button" role="radio" aria-checked={theme === 'dark'} aria-label="Dark" title="Dark" onClick={() => setTheme('dark')}><Moon size={16} strokeWidth={STROKE} aria-hidden="true" /></button>
                </span>
              </div>
              <hr />
              <a className="side-link" href="https://github.com/guiboorges/ember-commerce#readme" title={collapsed ? 'Help' : undefined} aria-label={collapsed ? 'Help' : undefined}><CircleHelp size={18} strokeWidth={STROKE} aria-hidden="true" />{!collapsed && <span>Help</span>}</a>
              <button type="button" className="side-link" onClick={() => api.act({ type: 'reset' })} title={collapsed ? 'Reset demo' : undefined} aria-label={collapsed ? 'Reset demo' : undefined}><RotateCcw size={18} strokeWidth={STROKE} aria-hidden="true" />{!collapsed && <span>Reset demo</span>}</button>
            </div>
          </nav>
          <main className="content" id="main" ref={mainRef} tabIndex={-1}>{!more && <Submenu area={area} page={page} />}{content}</main>
        </div>
      </div>
      <p className="footnote t-caption c-secondary">Ember demo · Kiln &amp; Co. is a simulated shop; every order, customer, and figure is generated. Built with the Ember design system.</p>

      <TabBar active={activeTab} onCreate={() => setSheet(true)} />
      <CreateSheet api={api} open={sheet} onClose={() => setSheet(false)} onMoney={setMoney} />
      <MoneyDialog api={api} mode="transfer" open={money === 'transfer'} onClose={() => setMoney(null)} />
      <MoneyDialog api={api} mode="request" open={money === 'request'} onClose={() => setMoney(null)} />
      <OrderDialog api={api} no={order} onClose={() => setOrder(null)} />
      <SearchDialog api={api} open={searchOpen} onClose={() => setSearchOpen(false)} onOpen={no => { setSearchOpen(false); setOrder(no) }} />
    </>
  )
}

function SearchDialog({ api, open, onClose, onOpen }: { api: ReturnType<typeof useEmber>; open: boolean; onClose: () => void; onOpen: (no: number) => void }) {
  const [q, setQ] = useState('')
  const s = q.trim().toLowerCase()
  const orders = s ? api.orders.slice(-3000).reverse().filter(o => `${orderId(o.no)} ${customerById[o.customerId].name}`.toLowerCase().includes(s)).slice(0, 5) : []
  const customers = s ? CUSTOMERS.filter(c => c.name.toLowerCase().includes(s)).slice(0, 4) : []
  const products = s ? PRODUCTS.filter(p => p.name.toLowerCase().includes(s)).slice(0, 4) : []
  const go = (h: string) => { location.hash = h; onClose() }
  return (
    <Dialog open={open} onClose={onClose} title="Search">
      <label className="search search-big"><Search size={18} strokeWidth={STROKE} aria-hidden="true" /><span className="sr-only">Search orders, customers, and products</span><input autoFocus type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Orders, customers, products" /></label>
      {s && !orders.length && !customers.length && !products.length && <p className="t-body c-secondary">Nothing matches “{q}”.</p>}
      {orders.length > 0 && <div><p className="t-overline c-tertiary">Orders</p><ul className="results">{orders.map(o => <li key={o.no}><button type="button" onClick={() => onOpen(o.no)}><span className="t-body-medium">{orderId(o.no)}</span><span className="t-caption c-secondary">{customerById[o.customerId].name} · {eur(o.total)}</span></button></li>)}</ul></div>}
      {customers.length > 0 && <div><p className="t-overline c-tertiary">Customers</p><ul className="results">{customers.map(c => <li key={c.id}><button type="button" onClick={() => go(href('customers', 'all'))}><span className="t-body-medium">{c.name}</span><span className="t-caption c-secondary">{c.country}</span></button></li>)}</ul></div>}
      {products.length > 0 && <div><p className="t-overline c-tertiary">Products</p><ul className="results">{products.map(p => <li key={p.id}><button type="button" onClick={() => go(href('products', 'catalog'))}><span className="t-body-medium">{p.name}</span><span className="t-caption c-secondary">{p.category} · {eur(p.price)}</span></button></li>)}</ul></div>}
    </Dialog>
  )
}
