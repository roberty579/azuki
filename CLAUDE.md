# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev     # dev server (Turbopack by default in Next 16) → http://localhost:3000
npm run build   # production build
npm start       # serve the production build
npm run lint       # eslint (flat config, ESLint 9)
npm run typecheck  # tsc --noEmit
npm run test       # vitest run — unit/component tests in __tests__/ (jsdom)
npm run test:watch # vitest in watch mode
npm run test:integration # vitest — integration/ against a real Postgres (node)
npm run test:e2e   # playwright — builds and serves, then drives a real browser

npm run db:generate     # derive a migration from src/db/schema.ts
npm run db:migrate      # apply migrations (add --fresh to drop the schema first)
npm run db:migrate:test # same, against TEST_DATABASE_URL
npm run db:seed         # load src/content/shop.ts into the database
npm run db:reset        # clear orders and restore stock
npm run db:studio       # drizzle-kit's database browser
```

Run a single unit test file with `npx vitest run __tests__/navbar.test.tsx`, or one E2E project with
`npx playwright test --project=desktop`.

## Next.js 16 — read the bundled docs first

This repo runs **Next.js 16.2.10 / React 19.2.4**, which post-dates most training data. Per `AGENTS.md`, read the relevant guide under `node_modules/next/dist/docs/` before writing code. The highest-value entry point is
`node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`, which enumerates the breaking changes — notably async request APIs (`params`, `searchParams`, `cookies`, `headers`), `middleware` → `proxy`, the new caching APIs (`revalidateTag`/`updateTag`/`refresh`, `cacheLife`/`cacheTag`), `next/image` default changes, and Turbopack-as-default configuration. Prefer these local docs over recalled API shapes.

## Architecture

App Router project under `src/` (`src/app`, `src/components`, `src/content`), TypeScript strict mode, path alias `@/*` → `./src/*`. `public/`, `__tests__/`, and `e2e/` stay at the repo root.

**Tailwind CSS v4** — configured CSS-first, there is no `tailwind.config.*`. The whole setup lives in `src/app/globals.css`: `@import "tailwindcss"` plus an `@theme inline` block mapping CSS custom properties (`--background`, `--foreground`, the Geist font variables) to Tailwind tokens. Add design tokens there, not in a JS config. PostCSS wiring is `@tailwindcss/postcss` in `postcss.config.mjs`.

Fonts are loaded in `src/app/layout.tsx` via `next/font/google` (Geist, Geist Mono) and exposed as CSS variables on `<html>`. Dark mode is driven by `prefers-color-scheme` in `globals.css` — there is no theme toggle, so both palettes must stand alone.

`src/app/layout.tsx` sets up a full-height flex column (`html.h-full` / `body.min-h-full flex flex-col`); page roots use `flex-1` to fill it.

**Three test layers, split by what each can observe.**

- `__tests__/` — Vitest + React Testing Library in jsdom. No CSS, no images, no sockets, and it cannot render async Server Components. Server modules are mocked here; `server-only` throws in this environment by design. Two files are plain Node tests rather than component tests: `contrast.test.ts` parses the CSS palette, and `traceability.test.ts` scans for requirement tags.
- `integration/` — Vitest in a **node** environment against a real Postgres (`TEST_DATABASE_URL`, truncated between tests, `fileParallelism: false`). This is where Server Actions are called directly with payloads the UI would never produce — a forged cash-plus-shipping order, a replayed idempotency key, a client-supplied price. `server-only` is aliased away here and only here. Its config is `vitest.integration.config.mts`.
- `e2e/` — Playwright against a real production build at three viewports (desktop 1280, tablet 900, mobile Pixel 5). `e2e/global-setup.ts` resets and re-seeds first, because checkout decrements stock and the suite would otherwise only pass once.

Anything depending on CSS, layout, image loading, or routing belongs in `e2e/`; anything about what the server does with a request belongs in `integration/`; component structure and behaviour belong in `__tests__/`.

Breakpoint-specific E2E behaviour is scoped by filename, not skipped at runtime: `*.wide.spec.ts` runs only on desktop, `*.narrow.spec.ts` only on tablet/mobile, plain `*.spec.ts` everywhere (`testIgnore` in `playwright.config.ts`). **A passing E2E run reports zero skips** — treat any skip as a misconfiguration, not as normal.

E2E writes to the same database the dev server uses, so order-placing specs use the deepest-stocked item and never the one the cart specs rely on. Three viewport projects run in parallel against one database; assertions about stock must be relative, not exact.

## Product context

This is a crochet commission & shop site (scheduling consultations, custom commission requests, a configurable "Build a Bunny" product, a shop, a portfolio, and an admin order/cost dashboard). Design direction: "sophisticated but cute" — professional small-business storefront, mobile-first.

`requirements/` holds the authoritative per-page specs (`navigation_`, `home_`, `schedule_`, `commission_`, `build_a_bunny_`, `shop_`, `portfolio_`, `admin_`, `common_requirements.md`). `requirements/initial_requirements.md` is the original combined document these were split from — **the split files are the ones to work from**; treat the combined one as historical.

`home_requirements.md` is further along than the rest: its requirements carry IDs (`HOME-1`…`HOME-13`) that are tagged into the code and tests, enforced by `__tests__/traceability.test.ts`. See "Linked intent development" in `README.md`. The other specs are not yet tagged. Read the relevant page spec before building a page; several specs contain explicit "Needs decision" items (payment processor vs. manual Zelle/Venmo, e-signature, Google Sheets sync) that are unresolved — surface them rather than silently picking one.

Routes, per `src/content/navigation.ts`: `/`, `/schedule`, `/commission`, `/build-a-bunny`, `/shop`, `/portfolio`.

## Current state

The **home page is built and covered** against `HOME-1`…`HOME-13`: header, opening section, calls to action, gallery, contact links.

The **shop is built and covered** against `SHOP-1`…`SHOP-13`: grid at `/shop`, item pages at `/shop/[slug]` (prerendered via `generateStaticParams`, `dynamicParams = false`), and a cart plus manual checkout at `/shop/cart`. The cart is an external store over `localStorage` (`src/components/shop/cart-store.ts`) read through `useSyncExternalStore` — there is no provider, and no React state mirrors it. Checkout is deliberately **not** a payment processor: it collects Zelle/Venmo/cash and hands off a prefilled email, because there is no server. Admin item management is out of scope and untagged.

The **shop now reads and writes Postgres** — `/shop` and `/shop/[slug]` query `src/db/products.ts`, and checkout is `submitOrder` in `src/lib/actions/orders.ts`. The cart is still an external store over `localStorage` holding slugs and quantities only; because the browser can no longer look a slug up for itself, `src/app/shop/layout.tsx` passes the catalogue down through `CatalogueProvider` and `use-cart.ts` resolves against it, dropping items that vanished and clamping to current stock on read.

**Build a Bunny is built and covered** against `BUNNY-1`…`BUNNY-11`: a configurator at `/build-a-bunny` with a live itemised estimate. It deliberately does **not** touch the shop cart — it is made to order, so it ends in a *request*, not a purchase, handed off as a prefilled email like SHOP-13. All the rules (naked bunnies carry no outfit colour, unknown ids are dropped, add-ons follow catalogue order) live in pure functions in `src/lib/bunny.ts` and go through `normaliseConfiguration`, so no React state can hold an invalid combination. The request payload is option ids only, never prices — see `docs/backend.md` §3 for why.

Copy and catalogues are visibly-marked placeholders in `src/content/site.ts`, `src/content/shop.ts`, and `src/content/bunny.ts` — replacing any of them is a one-file edit.

The remaining three routes (`/schedule`, `/commission`, `/portfolio`) are **one-screen "coming soon" stubs** (`src/components/coming-soon.tsx`) that exist only so the nav resolves.

Money is integer cents everywhere (`src/lib/money.ts`); it becomes a string only at display.

## Database

**Postgres, local, via Drizzle.** `src/db/schema.ts` is authoritative — `npm run db:generate` derives migrations from it into `drizzle/`, and query types are inferred from it. `docs/schema-original.sql` is the hand-written SQL this was converted from and is historical; editing it does nothing.

Setup is `.env.local` (copy `.env.example`), then `npm run db:migrate && npm run db:seed`. The catalogue in `src/content/shop.ts` is the **seed source**, not what pages read.

Three things to know before touching server code:

- **`src/db/client.ts` is the only place a connection is made.** It starts with `import "server-only"` and creates the pool lazily on first query — eagerly would make `next build` require a database. It is also the single file that changes for a serverless host, where a plain pool is wrong (`docs/backend.md` §5).
- **Money is `NUMERIC(10,2)` in the database and integer cents everywhere else.** `centsFromNumeric` / `numericFromCents` in `src/lib/money.ts` are the only conversion, and they never touch a float — `Math.round(parseFloat("1.005") * 100)` returns 100, not 101. Never register a global `pg` type parser for OID 1700.
- **A Server Action is a public POST endpoint.** `src/lib/actions/orders.ts` re-applies every rule the form applies, because the form can be skipped. The client sends slugs and quantities; prices are outputs, computed server-side. `docs/backend.md` §3 is the contract, §9 the security notes.

Shop routes render dynamically (`force-dynamic` on `src/app/shop/layout.tsx`) — prerendering would bake stock levels into the build. Everything else still prerenders, and `next build` needs no database.
