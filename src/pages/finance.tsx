import { ArrowLeftRight, Check, Download, Lock, LockOpen, Receipt } from 'lucide-react'
import { useMemo, useState } from 'react'
import { addMonths, monthStart, shortDate } from '../sim/dates'
import { bills, costs, SYMBOL, vatDue } from '../sim/finance'
import { dueLabel, money } from '../sim/state'
import type { EmberApi } from '../sim/useEmber'
import { MoneyDialog, PageHead } from '../components/shared'
import { Button, Card, Empty, eur, IconTile, LimitBar, PaymentCard, Status, WalletCard } from '../components/ui'
import { BalanceCard, LimitCard } from './overview'

const LIMIT_TEXT: Record<string, string> = { EUR: '€20k / month', USD: '$10k / month', GBP: '£7.5k / month' }

export function Accounts({ api }: { api: EmberApi }) {
  const recent = api.state.transfers.slice(0, 6)
  return (
    <>
      <PageHead title="Accounts & wallets" subtitle="One balance in three currencies, converted to euros at fixed demo rates." />
      <div className="row row-1"><BalanceCard api={api} />
        <Card title="Wallets" subtitle="Daily limits and status">
          <div className="wallets big">{api.wallets.map(w => <WalletCard key={w.currency} symbol={SYMBOL[w.currency]} code={w.currency} amount={money(w.balance, w.currency)} limit={LIMIT_TEXT[w.currency]} active={w.active} />)}</div>
          <p className="t-caption c-secondary">The GBP wallet is paused: it can receive money but not send it.</p>
        </Card>
      </div>
      <Card title="Recent movements" subtitle="Transfers, refunds, and payments you made in this demo">
        {recent.length ? <MovementList api={api} list={recent} /> : <Empty>No movements yet. Send a transfer or pay a bill to see it here.</Empty>}
      </Card>
    </>
  )
}

function MovementList({ api, list }: { api: EmberApi; list: EmberApi['state']['transfers'] }) {
  const KIND = { out: 'Transfer', request: 'Request', refund: 'Refund', bill: 'Bill', vat: 'VAT' } as const
  return (
    <ul className="list">
      {list.map(t => (
        <li key={t.id}>
          <IconTile icon={t.kind === 'request' ? Download : ArrowLeftRight} tone="inset" size={40} />
          <span className="list-text grow"><span className="t-body-medium">{t.kind === 'request' ? `From ${t.counterparty}` : t.counterparty}</span><span className="t-caption c-secondary">{KIND[t.kind]}{t.note ? ` · ${t.note}` : ''} · {shortDate(t.day)}</span></span>
          {t.kind === 'request' ? <Status status="pending" label="Requested" /> : null}
          <span className="t-numeric tnum" data-tone={t.kind === 'request' ? 'positive' : undefined}>{t.kind === 'request' ? '+' : '−'}{money(t.amount, t.currency)}</span>
        </li>
      ))}
      {!list.length && <Empty>No movements yet.</Empty>}
      {api.state.transfers.length > list.length && <li className="t-caption c-secondary">and {api.state.transfers.length - list.length} more</li>}
    </ul>
  )
}

export function Cards({ api }: { api: EmberApi }) {
  const c = api.cards
  return (
    <>
      <PageHead title="Cards" subtitle="Company cards share one monthly limit." />
      <div className="row row-even">
        {c.cards.map(card => (
          <Card key={card.id} title={`${card.name} card`} subtitle={`Limit ${eur(card.limit)} a month`} action={
            <Button size="s" kind={card.frozen ? 'primary' : 'secondary'} icon={card.frozen ? LockOpen : Lock} aria-pressed={card.frozen} onClick={() => api.act({ type: 'freeze', card: card.id, on: !card.frozen })}>{card.frozen ? 'Unfreeze' : 'Freeze'}</Button>
          }>
            <PaymentCard style={card.style} last4={card.last4} exp={card.exp} frozen={card.frozen} />
            <LimitBar value={card.spent / card.limit} label={`${card.name} card spending`} />
            <p className="split"><span><span className="t-numeric tnum">{eur(card.spent)}</span> <span className="t-caption c-secondary">spent this month</span></span><span className="t-caption c-secondary">{Math.round((card.spent / card.limit) * 100)}%</span></p>
          </Card>
        ))}
      </div>
      <LimitCard api={api} />
      <Card title="Card transactions" subtitle="This month">
        <ul className="list">
          {[...c.items].reverse().map(x => (
            <li key={x.id}><IconTile icon={Receipt} tone="inset" size={40} /><span className="list-text grow"><span className="t-body-medium">{x.name}</span><span className="t-caption c-secondary">{x.kind} · {shortDate(x.day)} · •••• {c.cards.find(k => k.id === x.card)!.last4}</span></span><span className="t-numeric tnum">−{eur(x.amount)}</span></li>
          ))}
        </ul>
      </Card>
    </>
  )
}

export function Transfers({ api }: { api: EmberApi }) {
  const [dlg, setDlg] = useState<null | 'transfer' | 'request'>(null)
  const bank = useMemo(() => costs(api.today - 30, api.today).filter(x => !x.card).reverse(), [api.today])
  return (
    <>
      <PageHead title="Transfers" subtitle="Money out by bank transfer, and payment requests.">
        <Button kind="secondary" icon={Download} onClick={() => setDlg('request')}>Request</Button>
        <Button icon={ArrowLeftRight} onClick={() => setDlg('transfer')}>New transfer</Button>
      </PageHead>
      <Card title="Made in this demo"><MovementList api={api} list={api.state.transfers} /></Card>
      <Card title="Scheduled payments" subtitle="Last 30 days, from the EUR wallet">
        <ul className="list">
          {bank.map(x => <li key={x.id}><IconTile icon={ArrowLeftRight} tone="inset" size={40} /><span className="list-text grow"><span className="t-body-medium">{x.name}</span><span className="t-caption c-secondary">{x.kind} · {shortDate(x.day)}</span></span><span className="t-numeric tnum">−{eur(x.amount)}</span></li>)}
        </ul>
      </Card>
      <MoneyDialog api={api} mode="transfer" open={dlg === 'transfer'} onClose={() => setDlg(null)} />
      <MoneyDialog api={api} mode="request" open={dlg === 'request'} onClose={() => setDlg(null)} />
    </>
  )
}

export function Invoices({ api }: { api: EmberApi }) {
  const list = bills(api.today)
  const open = list.filter(b => api.state.billsPaid[b.id] === undefined)
  return (
    <>
      <PageHead title="Invoices" subtitle={`Supplier bills · ${open.length} to pay, ${eur(open.reduce((a, b) => a + b.amount, 0))} in total.`} />
      <Card>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Supplier</th><th>For</th><th className="num">Amount</th><th>Due</th><th>Status</th><th><span className="sr-only">Action</span></th></tr></thead>
            <tbody>
              {list.map(b => {
                const paid = api.state.billsPaid[b.id]
                const late = paid === undefined && b.due < api.today
                return (
                  <tr key={b.id}>
                    <td className="t-body-medium">{b.supplier}</td>
                    <td className="c-secondary">{b.what}</td>
                    <td className="num t-numeric tnum">{eur(b.amount)}</td>
                    <td className="c-secondary nowrap">{paid !== undefined ? `Paid ${shortDate(paid)}` : dueLabel(b.due, api.today)}</td>
                    <td><Status status={paid !== undefined ? 'completed' : late ? 'refunded' : 'pending'} label={paid !== undefined ? 'Paid' : late ? 'Overdue' : 'Due'} /></td>
                    <td>{paid === undefined && <Button size="s" kind={late ? 'primary' : 'secondary'} icon={Check} onClick={() => api.act({ type: 'payBill', id: b.id, supplier: b.supplier, amount: b.amount })}>Pay</Button>}</td>
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

export function Taxes({ api }: { api: EmberApi }) {
  const v = vatDue(api.orders, api.today)
  const paid = api.state.vatPaid[v.id]
  const past = [3, 2, 1].map(i => { const d = addMonths(monthStart(api.today), -3 * i - 3); return vatDue(api.orders, d + 1) })
  return (
    <>
      <PageHead title="Taxes" subtitle="Quarterly VAT at 23%, due on the 20th of the second month after the quarter." />
      <div className="row row-even">
        <Card title={`VAT ${v.period}`} subtitle={paid !== undefined ? `Paid ${shortDate(paid)}` : `Due ${shortDate(v.due)} · in ${v.daysLeft} days`} action={<Status status={paid !== undefined ? 'completed' : v.daysLeft <= 7 ? 'refunded' : 'pending'} label={paid !== undefined ? 'Paid' : v.daysLeft <= 7 ? 'Due soon' : 'Open'} />}>
          <dl className="ledger">
            <div><dt className="t-body">VAT collected on sales</dt><dd className="t-numeric tnum">{eur(v.output)}</dd></div>
            <div><dt className="t-body">VAT paid on costs</dt><dd className="t-numeric tnum">−{eur(v.input)}</dd></div>
            <div className="total"><dt className="t-body-strong">To pay</dt><dd className="t-numeric tnum">{eur(v.toPay)}</dd></div>
          </dl>
          {paid === undefined && <Button icon={Check} disabled={!v.closed} onClick={() => api.act({ type: 'payVat', id: v.id, period: v.period, amount: v.toPay })}>{v.closed ? `Pay ${eur(v.toPay)}` : 'Quarter still open'}</Button>}
        </Card>
        <Card title="Previous quarters" subtitle="Filed and paid">
          <ul className="list">{past.map(p => <li key={p.id}><IconTile icon={Receipt} tone="inset" size={40} /><span className="list-text grow"><span className="t-body-medium">VAT {p.period}</span><span className="t-caption c-secondary">Paid by {shortDate(p.due)}</span></span><span className="t-numeric tnum">{eur(p.toPay)}</span></li>)}</ul>
        </Card>
      </div>
    </>
  )
}
