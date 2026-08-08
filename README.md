This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Edits to `src/app/page.tsx` hot-reload.

Use npm, not yarn/pnpm/bun — `package-lock.json` is committed and is what CI installs from.

## Commands

```bash
npm run dev        # dev server (Turbopack) → http://localhost:3000
npm run build      # production build
npm start          # serve the production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

### Tests

```bash
npm run test       # unit + component tests (Vitest), one pass
npm run test:watch # the same, re-running on save
npm run test:e2e   # end-to-end tests (Playwright)
```

`npm run test:e2e` builds the app and starts a server itself — you do **not** need `npm run dev`
running first. It will reuse a server already on port 3000, so if one is running from an older
build, stop it first or you will test stale code.

Narrowing a run:

```bash
npx vitest run __tests__/navbar.test.tsx     # one unit test file
npx vitest run -t "HOME-4"                   # tests whose name matches
npx playwright test e2e/navigation.spec.ts   # one e2e file
npx playwright test --project=mobile         # one viewport (desktop | tablet | mobile)
npx playwright test --ui                     # interactive runner
```

### Which layer to write in

| | `__tests__/` (Vitest) | `e2e/` (Playwright) |
|---|---|---|
| Runs in | jsdom, no browser | real Chromium, real production build |
| Sees CSS | **no** | yes |
| Loads images | **no** | yes |
| Speed | ~2s | ~10s |
| Use for | component structure, props, events, data | layout, breakpoints, visibility, routing, images |

jsdom applies no stylesheets, so it cannot tell whether something is hidden at a given
breakpoint — those assertions have to be end-to-end. Playwright runs at three viewports:
desktop (1280), tablet (900), and mobile (Pixel 5).

Some behaviour only exists on one side of a breakpoint. Rather than skip such tests at runtime,
scope them by filename so each project only collects what applies to it:

| Filename | Runs on |
|---|---|
| `*.spec.ts` | every viewport |
| `*.wide.spec.ts` | desktop only (≥1024px, the inline nav) |
| `*.narrow.spec.ts` | tablet and mobile (<1024px, the hamburger) |

The mapping is `testIgnore` in `playwright.config.ts`. Each scoped file also asserts in
`beforeEach` that it landed on a matching viewport, so adding a project and forgetting its
`testIgnore` fails loudly instead of passing vacuously. **A green run should report zero skipped
tests** — a skip means something is misconfigured.

The first `npm run test:e2e` on a new machine needs browsers installed:

```bash
npx playwright install --with-deps
```

## Linked intent development

Requirements in `requirements/` carry stable IDs (`HOME-1`, `HOME-2`, …). Those IDs are the link
between what was asked for and the code that delivers it, so any change can be traced back to the
requirement it serves.

| Where | How it is tagged | Example |
|---|---|---|
| Implementation (`.ts`, `.tsx`, `.css`) | `@implements` in a comment | `/** @implements HOME-2 — inline section list */` |
| Tests (`__tests__/`, `e2e/`) | the ID in square brackets in the test title | `test("[HOME-2] lists every section inline", …)` |

Rules:

- **IDs are permanent.** Never renumber, and never reuse a retired ID — a stale tag pointing at a
  different requirement is worse than no tag. Retire an entry in place and keep its number.
- **One `@implements` tag can list several IDs**, comma-separated: `@implements HOME-2, HOME-3`.
- **Every requirement needs at least one implementation tag and at least one test tag.**
  `__tests__/traceability.test.ts` enforces this in both directions: an untagged requirement fails
  the suite, and so does a tag naming an ID that no requirement defines.
- To find the code behind a requirement, grep its ID. Requirements files deliberately do not list
  file paths — such a list goes stale, while the tags cannot.

Only `requirements/home_requirements.md` uses IDs so far. The other specs are not yet tagged, and
files that exist purely as placeholders (the unbuilt route stubs) carry no tags.

Run `npm run test` to check the links are intact.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
