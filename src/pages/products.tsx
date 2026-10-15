import { Box, Gift, Leaf, Pause, Play, Plus, Soup, Coffee } from 'lucide-react'
import { useMemo } from 'react'
import { CATEGORIES, DISCOUNTS, PRODUCTS, stockLevels, type Category } from '../sim/catalog'
import { monthStart } from '../sim/dates'
import { isDiscountActive } from '../sim/state'
import type { EmberApi } from '../sim/useEmber'
import { PageHead } from '../components/shared'
import { Button, Card, eur, eur0, IconTile, LimitBar, num, Status } from '../components/ui'

const CAT_ICON: Record<Category, typeof Box> = { Tableware: Soup, Drinkware: Coffee, Home: Leaf, Gifts: Gift }

function useSales(api: EmberApi) {
  return useMemo(() => {
    const from = monthStart(api.today)
    const units: Record<string, number> = {}, revenue: Record<string, number> = {}
    for (const o of api.orders) if (o.day >= from && o.status !== 'refunded') for (const l of o.lines) { units[l.productId] = (units[l.productId] ?? 0) + l.qty; revenue[l.productId] = (revenue[l.productId] ?? 0) + l.qty * l.price }
    return { units, revenue }
  }, [api.orders, api.today])
}

export function Catalog({ api }: { api: EmberApi }) {
  const sales = useSales(api)
  const stock = stockLevels(api.orders, api.today, api.state.restocks)
  return (
    <>
      <PageHead title="Catalog" subtitle={`${PRODUCTS.length} products in ${CATEGORIES.length} categories. Prices include VAT.`} />
      <Card>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Product</th><th>Category</th><th className="num">Price</th><th className="num">Margin</th><th className="num">In stock</th><th className="num">Sold this month</th><th className="num">Revenue</th></tr></thead>
            <tbody>
              {PRODUCTS.map(p => {
                const st = stock.find(x => x.product.id === p.id)!
                return (
                  <tr key={p.id}>
                    <td><span className="cust"><IconTile icon={CAT_ICON[p.category]} tone="inset" /><span className="t-body-medium">{p.name}</span></span></td>
                    <td className="c-secondary">{p.category}</td>
                    <td className="num t-numeric tnum">{eur(p.price)}</td>
                    <td className="num tnum">{p.cost ? `${Math.round((1 - p.cost / (p.price / 1.23)) * 100)}%` : '—'}</td>
                    <td className="num tnum">{p.id === 'gift' ? '∞' : st.low ? <Status status={st.stock ? 'warning' : 'negative'} label={String(st.stock)} /> : st.stock}</td>
                    <td className="num tnum">{num(sales.units[p.id] ?? 0)}</td>
                    <td className="num t-numeric tnum">{eur0(sales.revenue[p.id] ?? 0)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

export function Inventory({ api }: { api: EmberApi }) {
  const stock = stockLevels(api.orders, api.today, api.state.restocks).filter(x => x.product.id !== 'gift').sort((a, b) => a.stock / a.reorder - b.stock / b.reorder)
  const low = stock.filter(x => x.low).length
  return (
    <>
      <PageHead title="Inventory" subtitle={low ? `${low} products at or below their reorder point.` : 'Every product is above its reorder point.'} />
      <Card>
        <ul className="list">
          {stock.map(x => (
            <li key={x.product.id}>
              <IconTile icon={CAT_ICON[x.product.category]} tone="inset" size={40} />
              <span className="list-text grow">
                <span className="split"><span className="t-body-medium">{x.product.name}</span><span className="t-numeric tnum">{x.stock} in stock</span></span>
                <LimitBar value={x.stock / (x.product.target * 1.5)} label={`${x.product.name} stock`} />
                <span className="t-caption c-secondary">Reorder at {x.reorder} · {x.soldThisMonth} sold this month</span>
              </span>
              {x.low ? <Status status={x.stock ? 'warning' : 'negative'} label={x.stock ? 'Low' : 'Sold out'} /> : <Status status="positive" label="OK" />}
              <Button size="s" kind={x.low ? 'primary' : 'secondary'} icon={Plus} onClick={() => api.act({ type: 'restock', productId: x.product.id, name: x.product.name, qty: Math.round(x.product.target / 2) })}>Restock {Math.round(x.product.target / 2)}</Button>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}

export function Categories({ api }: { api: EmberApi }) {
  const sales = useSales(api)
  const rows = CATEGORIES.map(c => {
    const ps = PRODUCTS.filter(p => p.category === c)
    const revenue = ps.reduce((a, p) => a + (sales.revenue[p.id] ?? 0), 0)
    const units = ps.reduce((a, p) => a + (sales.units[p.id] ?? 0), 0)
    const top = [...ps].sort((a, b) => (sales.revenue[b.id] ?? 0) - (sales.revenue[a.id] ?? 0))[0]
    return { c, revenue, units, top, count: ps.length }
  })
  const total = rows.reduce((a, r) => a + r.revenue, 0) || 1
  return (
    <>
      <PageHead title="Categories" subtitle="Revenue by category this month." />
      <div className="grid-2">
        {rows.map(r => (
          <Card key={r.c} title={r.c} subtitle={`${r.count} products · ${num(r.units)} units sold`} action={<IconTile icon={CAT_ICON[r.c]} tone="accent" size={40} />}>
            <p className="t-display-kpi tnum">{eur0(r.revenue)}</p>
            <LimitBar value={r.revenue / total} label={`${r.c} share of revenue`} />
            <p className="split t-caption c-secondary"><span>{Math.round((r.revenue / total) * 100)}% of revenue</span><span>Best seller: {r.top.name}</span></p>
          </Card>
        ))}
      </div>
    </>
  )
}

export function Discounts({ api }: { api: EmberApi }) {
  return (
    <>
      <PageHead title="Discounts" subtitle="Codes customers can use at checkout." />
      <Card>
        <ul className="list">
          {DISCOUNTS.map(d => {
            const on = isDiscountActive(api.state, d.code)
            return (
              <li key={d.code}>
                <span className="code tnum">{d.code}</span>
                <span className="list-text grow"><span className="t-body-medium">{d.label}</span><span className="t-caption c-secondary">Used {num(d.uses)} times</span></span>
                <Status status={on ? 'positive' : 'neutral'} label={on ? 'Active' : 'Paused'} />
                <Button size="s" kind="secondary" icon={on ? Pause : Play} aria-pressed={on} onClick={() => api.act({ type: 'discount', code: d.code, on: !on })}>{on ? 'Pause' : 'Turn on'}</Button>
              </li>
            )
          })}
        </ul>
      </Card>
    </>
  )
}
