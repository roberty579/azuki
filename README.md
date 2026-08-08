This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

```bash
npm install
cp .env.example .env.local     # then set your Postgres password in it
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Edits to `src/app/page.tsx` hot-reload.

Use npm, not yarn/pnpm/bun — `package-lock.json` is committed and is what CI installs from.

### The database

The shop reads and writes Postgres; the rest of the site does not need it yet. You need a local
Postgres and two databases — one for the app, one for the integration tests, which truncate tables
and must never point at the first:

```bash
psql -U postgres -c "CREATE DATABASE crochet;" -c "CREATE DATABASE crochet_test;"
```

Put both connection strings in `.env.local` (gitignored; `.env.example` is the committed template).
**Never** prefix a database variable with `NEXT_PUBLIC_` — that inlines it into the JavaScript sent
to every visitor.

```bash
npm run db:generate      # after editing src/db/schema.ts, derive a migration
npm run db:migrate       # apply migrations       (--fresh drops the schema first)
npm run db:migrate:test  # apply them to the test database
npm run db:seed          # load src/content/shop.ts into the database
npm run db:reset         # clear orders, restore stock
npm run db:studio        # browse the data
```

`src/db/schema.ts` is authoritative — migrations are generated *from* it, and the TypeScript types
come from it. `docs/schema-original.sql` is the SQL this was converted from and is historical;
editing it changes nothing.

`npm run build` does **not** need a database: the routes that query it render dynamically, so
nothing is prerendered from it.

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
npm run test             # unit + component tests (Vitest, jsdom), one pass
npm run test:watch       # the same, re-running on save
npm run test:integration # server code against a real Postgres (Vitest, node)
npm run test:e2e         # end-to-end tests (Playwright)
```

Three layers, split by what each can observe:

| Layer | Sees | Does not see |
|---|---|---|
| `__tests__/` | component markup, behaviour, accessibility roles | CSS, images, routing, the database |
| `integration/` | the database, Server Actions called directly | anything rendered |
| `e2e/` | the real thing in a real browser | internals |

`integration/` exists for the cases the UI cannot reach: a checkout POSTed without the form, a
replayed idempotency key, two customers racing for the last item. It runs against
`TEST_DATABASE_URL` and truncates between tests, and refuses to start if that variable is missing or
equal to `DATABASE_URL`.

`npm run test:e2e` builds the app and starts a server itself — you do **not** need `npm run dev`
running first. It will reuse a server already on port 3000, so if one is running from an older
build, stop it first or you will test stale code. It also resets and re-seeds the database before
the suite, because checkout decrements stock and the run would otherwise only pass once.

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
