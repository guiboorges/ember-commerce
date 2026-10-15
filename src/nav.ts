// Menu and submenu: the top tabs pick an area, the sidebar lists that area's pages (Figma page "Patterns", Navigation map).
import {
  Activity, ArrowLeftRight, Banknote, Bell, ChartColumn, ChartPie, CreditCard, Download, FileText, LayoutGrid, List, Package, Percent,
  Receipt, ShoppingCart, Star, Tag, TrendingUp, Truck, Undo2, Users, Wallet, Box, type LucideIcon,
} from 'lucide-react'

export interface PageDef { id: string; label: string; icon: LucideIcon }
export interface AreaDef { id: string; label: string; pages: PageDef[] }

export const AREAS: AreaDef[] = [
  { id: 'overview', label: 'Overview', pages: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutGrid }, { id: 'activity', label: 'Activity', icon: Activity }, { id: 'alerts', label: 'Alerts', icon: Bell }] },
  { id: 'orders', label: 'Orders', pages: [{ id: 'all', label: 'All orders', icon: List }, { id: 'returns', label: 'Returns', icon: Undo2 }, { id: 'shipping', label: 'Shipping', icon: Truck }, { id: 'carts', label: 'Abandoned carts', icon: ShoppingCart }] },
  { id: 'products', label: 'Products', pages: [{ id: 'catalog', label: 'Catalog', icon: Package }, { id: 'inventory', label: 'Inventory', icon: Box }, { id: 'categories', label: 'Categories', icon: Tag }, { id: 'discounts', label: 'Discounts', icon: Percent }] },
  { id: 'customers', label: 'Customers', pages: [{ id: 'all', label: 'All customers', icon: Users }, { id: 'segments', label: 'Segments', icon: ChartPie }, { id: 'reviews', label: 'Reviews', icon: Star }] },
  { id: 'finance', label: 'Finance', pages: [{ id: 'accounts', label: 'Accounts & wallets', icon: Wallet }, { id: 'cards', label: 'Cards', icon: CreditCard }, { id: 'transfers', label: 'Transfers', icon: ArrowLeftRight }, { id: 'invoices', label: 'Invoices', icon: FileText }, { id: 'taxes', label: 'Taxes', icon: Receipt }] },
  { id: 'reports', label: 'Reports', pages: [{ id: 'sales', label: 'Sales', icon: TrendingUp }, { id: 'pnl', label: 'Profit & loss', icon: ChartColumn }, { id: 'cashflow', label: 'Cash flow', icon: Banknote }, { id: 'exports', label: 'Exports', icon: Download }] },
]

export interface Route { area: AreaDef; page: PageDef }
export function parseHash(hash: string): Route {
  const [, a, p] = hash.replace(/^#/, '').split('/')
  const area = AREAS.find(x => x.id === a) ?? AREAS[0]
  const page = area.pages.find(x => x.id === p) ?? area.pages[0]
  return { area, page }
}
export const href = (area: string, page?: string) => `#/${area}/${page ?? AREAS.find(a => a.id === area)!.pages[0].id}`
