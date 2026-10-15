# Ember Commerce

[![CI](https://img.shields.io/github/actions/workflow/status/guiboorges/ember-commerce/ci.yml?label=CI&logo=githubactions&labelColor=2B1A12&logoColor=white)](https://github.com/guiboorges/ember-commerce/actions/workflows/ci.yml) [![Deploy](https://img.shields.io/github/actions/workflow/status/guiboorges/ember-commerce/pages.yml?label=Deploy&logo=githubactions&labelColor=2B1A12&logoColor=white)](https://github.com/guiboorges/ember-commerce/actions/workflows/pages.yml) [![Live demo](https://img.shields.io/badge/Live%20demo-guiboorges.github.io%2Fember--commerce-FF7722?logo=github&labelColor=2B1A12&logoColor=white)](https://guiboorges.github.io/ember-commerce/) [![Release](https://img.shields.io/github/v/release/guiboorges/ember-commerce?label=Release&color=FF7722&logo=github&labelColor=2B1A12&logoColor=white)](https://github.com/guiboorges/ember-commerce/releases/latest) [![License](https://img.shields.io/badge/License-MIT-B7410E?logo=opensourceinitiative&labelColor=2B1A12&logoColor=white)](LICENSE) [![Built with Claude](https://img.shields.io/badge/Built%20with-Claude-B7410E?logo=claude&labelColor=2B1A12&logoColor=white)](https://claude.com/claude-code)

A working business dashboard for a small online store, built with the **Ember** design system. It runs on a simulated
ceramics shop, Kiln & Co., in your browser: ship and refund orders, handle returns, restock products, move money
between wallets, freeze cards, pay supplier bills and VAT, and watch the numbers follow.

**[▶ Open the live demo](https://guiboorges.github.io/ember-commerce/)**

![Overview in light mode](docs/screenshots/overview-light.png)

![Overview in dark mode](docs/screenshots/overview-dark.png)

**On phones**, a bottom tab bar like Instagram's: Home, Orders, a **+** for quick actions, Finance, and More.

![Phone screens: Home, All orders, the Create sheet, and Shipping in dark mode, each with the bottom tab bar](docs/screenshots/mobile.png)

| Orders, sidebar collapsed | Profit & loss | Cards |
|---|---|---|
| ![All orders in dark mode with the sidebar collapsed to icons](docs/screenshots/orders-collapsed.png) | ![Profit and loss: 8 months of stacked bars and the lines for the selected month](docs/screenshots/reports-pnl.png) | ![Company cards with spending against each limit and a freeze button](docs/screenshots/finance-cards.png) |

## Menu and submenu

The top tabs choose an area; the sidebar shows that area's pages. Every page has its own address (`#/orders/returns`),
so links and the back button work. Collapse the sidebar to icons with the « button; the choice is remembered. On phones (under 600 px) the areas move to a
bottom tab bar (Home, Orders, +, Finance, More), and the pages become a scrolling row under the title.

| Area | Pages |
|---|---|
| Overview | Dashboard, Activity, Alerts |
| Orders | All orders, Returns, Shipping, Abandoned carts |
| Products | Catalog, Inventory, Categories, Discounts |
| Customers | All customers, Segments, Reviews |
| Finance | Accounts & wallets, Cards, Transfers, Invoices, Taxes |
| Reports | Sales, Profit & loss, Cash flow, Exports |

## What works

- **Live orders:** today's orders appear as the day goes on. Select rows to ship them in bulk, open an order to ship or refund it, filter by status, search, and export CSV.
- **Returns and carts:** approve a refund (it leaves the EUR wallet and revenue) or decline it; send reminders for abandoned carts.
- **Products:** stock falls with sales and rises when you restock; low stock raises an alert. Pause or turn on discount codes.
- **Customers:** lifetime spend, segments (VIP, returning, new, at risk), and replies to reviews.
- **Finance:** one balance across EUR, USD, and GBP wallets; transfers that cannot overdraw a wallet or use the paused one; payment requests; company cards with a shared monthly limit and a freeze button; supplier bills to pay; quarterly VAT computed from sales and costs.
- **Reports:** sales by month and best sellers, profit and loss by month with every line, cash flow, and CSV exports for an accountant.
- **Everywhere:** alerts that link to the page that fixes them, notifications, search (`⌘K`), light and dark themes (following your system by default), and a reset button. Your changes are saved in the browser (`localStorage`).

> The shop is simulated. Kiln & Co., its customers, orders, and figures are generated from a seed per day, so the history is the same on every reload and for every visitor; your own actions are added on top. Nothing leaves your browser.

## The design system

Ember was designed in Figma before any code: variables for color (Light and Dark), spacing, and radius, 15 text
styles, 4 effects, a hatch texture, 21 components, 56 icons, card patterns, the navigation map, and the Overview and
Orders screens. The tokens and the generated `ember.tokens.css` live in the
[design-studio library](https://github.com/guiboorges/design-studio/tree/main/library/design-systems/ember);
`src/styles/ember.tokens.css` is a copy of that file.

- Two oranges: a bright one for charts and bars, a deeper one for buttons and text, so white text stays above 4.5:1.
- Every text role passes WCAG 2.2 AA in both themes. Statuses pair a dot with a label, and deltas pair an arrow with a value.
- The pages beyond Overview and Orders reuse the same components and patterns from the Figma library.

Icons are [Lucide](https://lucide.dev) (ISC). The typeface is [Geist](https://vercel.com/font) (OFL).

## Run it

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # simulation tests
npm run build   # static site in dist/
```

React 19, TypeScript, and Vite, with no backend. The simulation is in `src/sim/`: `catalog.ts` (products, customers,
orders, returns, carts, reviews), `finance.ts` (costs, wallets, cards, bills, VAT, profit and loss), `state.ts` (every
action as a pure function), `alerts.ts`, and `useEmber.ts` (state, clock, storage). Navigation is in `src/nav.ts`, the
pages in `src/pages/`.

## License

[MIT](LICENSE) © 2026 Guilherme Borges
