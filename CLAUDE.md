# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev     # dev server (Turbopack by default in Next 16) → http://localhost:3000
npm run build   # production build
npm start       # serve the production build
npm run lint    # eslint (flat config, ESLint 9)
```

No test runner is configured. Type checking happens through the build; for a standalone check run `npx tsc --noEmit`.

## Next.js 16 — read the bundled docs first

This repo runs **Next.js 16.2.10 / React 19.2.4**, which post-dates most training data. Per `AGENTS.md`, read the relevant guide under `node_modules/next/dist/docs/` before writing code. The highest-value entry point is
`node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`, which enumerates the breaking changes — notably async request APIs (`params`, `searchParams`, `cookies`, `headers`), `middleware` → `proxy`, the new caching APIs (`revalidateTag`/`updateTag`/`refresh`, `cacheLife`/`cacheTag`), `next/image` default changes, and Turbopack-as-default configuration. Prefer these local docs over recalled API shapes.

## Architecture

App Router project (`app/`), TypeScript strict mode, path alias `@/*` → repo root.

**Tailwind CSS v4** — configured CSS-first, there is no `tailwind.config.*`. The whole setup lives in `app/globals.css`: `@import "tailwindcss"` plus an `@theme inline` block mapping CSS custom properties (`--background`, `--foreground`, the Geist font variables) to Tailwind tokens. Add design tokens there, not in a JS config. PostCSS wiring is `@tailwindcss/postcss` in `postcss.config.mjs`.

Fonts are loaded in `app/layout.tsx` via `next/font/google` (Geist, Geist Mono) and exposed as CSS variables on `<html>`. Dark mode is driven by `prefers-color-scheme` in `globals.css` and `dark:` variants in components — there is no theme toggle.

`app/layout.tsx` sets up a full-height flex column (`html.h-full` / `body.min-h-full flex flex-col`); page roots use `flex-1` to fill it.

## Product context

This is a crochet commission & shop site (scheduling consultations, custom commission requests, a configurable "Build a Bunny" product, a shop, a portfolio, and an admin order/cost dashboard). Design direction: "sophisticated but cute" — professional small-business storefront, mobile-first.

`requirements/` holds the authoritative per-page specs (`navigation_`, `home_`, `schedule_`, `commission_`, `build_a_bunny_`, `shop_`, `portfolio_`, `admin_`, `common_requirements.md`). `website-requirements.md` at the repo root is the original combined document these were split from — **the split files in `requirements/` are the ones to work from**; treat the root file as historical. Read the relevant page spec before building a page; several specs contain explicit "Needs decision" items (payment processor vs. manual Zelle/Venmo, e-signature, Google Sheets sync) that are unresolved — surface them rather than silently picking one.

Planned routes, per `components/navbar.tsx`: `/`, `/schedule`, `/commission`, `/build-a-bunny`, `/shop`, `/portfolio`.

## Current state

The app is still close to the `create-next-app` scaffold — `app/page.tsx` is the default template page and `app/layout.tsx` still carries the generated metadata. `components/navbar.tsx` exists but is **not yet rendered by the layout**, and as written it needs two things before it will run: a `"use client"` directive (it uses `useState`) and `lucide-react`, which it imports but is not in `package.json`.
