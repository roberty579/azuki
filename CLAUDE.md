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
npm run test       # vitest run — unit/component tests in __tests__/
npm run test:watch # vitest in watch mode
npm run test:e2e   # playwright — builds and serves, then drives a real browser
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

**Two test layers, split by what each can observe.** `__tests__/` is Vitest + React Testing Library in jsdom — no CSS, no images, no server, and it cannot render async Server Components. `e2e/` is Playwright against a real production build at three viewports (desktop 1280, tablet 900, mobile Pixel 5). Anything depending on CSS, layout, image loading, or routing belongs in `e2e/`; component structure and behaviour belong in `__tests__/`. Two files in `__tests__/` are plain Node tests rather than component tests: `contrast.test.ts` parses the CSS palette, and `traceability.test.ts` scans for requirement tags.

Breakpoint-specific E2E behaviour is scoped by filename, not skipped at runtime: `*.wide.spec.ts` runs only on desktop, `*.narrow.spec.ts` only on tablet/mobile, plain `*.spec.ts` everywhere (`testIgnore` in `playwright.config.ts`). **A passing E2E run reports zero skips** — treat any skip as a misconfiguration, not as normal.

## Product context

This is a crochet commission & shop site (scheduling consultations, custom commission requests, a configurable "Build a Bunny" product, a shop, a portfolio, and an admin order/cost dashboard). Design direction: "sophisticated but cute" — professional small-business storefront, mobile-first.

`requirements/` holds the authoritative per-page specs (`navigation_`, `home_`, `schedule_`, `commission_`, `build_a_bunny_`, `shop_`, `portfolio_`, `admin_`, `common_requirements.md`). `requirements/initial_requirements.md` is the original combined document these were split from — **the split files are the ones to work from**; treat the combined one as historical.

`home_requirements.md` is further along than the rest: its requirements carry IDs (`HOME-1`…`HOME-13`) that are tagged into the code and tests, enforced by `__tests__/traceability.test.ts`. See "Linked intent development" in `README.md`. The other specs are not yet tagged. Read the relevant page spec before building a page; several specs contain explicit "Needs decision" items (payment processor vs. manual Zelle/Venmo, e-signature, Google Sheets sync) that are unresolved — surface them rather than silently picking one.

Routes, per `src/content/navigation.ts`: `/`, `/schedule`, `/commission`, `/build-a-bunny`, `/shop`, `/portfolio`.

## Current state

The **home page is built and covered** against `HOME-1`…`HOME-13`: header, opening section, calls to action, gallery, contact links.

The **shop is built and covered** against `SHOP-1`…`SHOP-13`: grid at `/shop`, item pages at `/shop/[slug]` (prerendered via `generateStaticParams`, `dynamicParams = false`), and a cart plus manual checkout at `/shop/cart`. The cart is an external store over `localStorage` (`src/components/shop/cart-store.ts`) read through `useSyncExternalStore` — there is no provider, and no React state mirrors it. Checkout is deliberately **not** a payment processor: it collects Zelle/Venmo/cash and hands off a prefilled email, because there is no server. Admin item management is out of scope and untagged.

Copy and catalogue are visibly-marked placeholders in `src/content/site.ts` and `src/content/shop.ts` — replacing either is a one-file edit.

The remaining four routes (`/schedule`, `/commission`, `/build-a-bunny`, `/portfolio`) are **one-screen "coming soon" stubs** (`src/components/coming-soon.tsx`) that exist only so the nav resolves.

Money is integer cents everywhere (`src/lib/money.ts`); it becomes a string only at display.
