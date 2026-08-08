# Backend & database — decisions and notes

Captured 2026-08-08, while the app was still fully static (16 prerendered routes, no server code).
This is the reasoning behind the decisions, so the next session does not have to re-derive it.

> **Update, 2026-08-08 — the first pass is built.** Postgres is wired up, the shop reads from it,
> and checkout is a Server Action implementing §3's contract. What changed against this document as
> written:
>
> - **§7's "do not migrate the shop to Postgres yet" no longer applies.** That advice assumed admin
>   item management was out of scope. `schema.sql` arrived with `products`, `product_images` and
>   `admin_users`, so the premise changed. The shop went first for a different reason than §7
>   anticipated: it was the only surface with tests capable of proving the migration was faithful.
>   113 E2E specs passed against Postgres unmodified.
> - **§11 was wrong that the cart does not change.** It was right that storing only slugs limits the
>   blast radius, but `cart-store.ts` resolved those slugs by importing the catalogue *in the
>   browser*, which stops working when the catalogue is in Postgres. Resolution moved to
>   `use-cart.ts`, and the shop layout passes the catalogue down.
> - **Money stays NUMERIC(10,2)**, converted at the boundary by `centsFromNumeric` in
>   `src/lib/money.ts`. The scale is what guarantees no third decimal reaches it. A CHECK constraint
>   was tried and removed — Postgres rounds to scale *before* evaluating constraints, so
>   `col = round(col, 2)` can never fail.
> - **Stock decrements on order**, which §3 step 4 implied but did not state. Without it the row
>   lock has nothing to protect.
>
> Sections below are otherwise unchanged and still describe the intended design.

Related: `requirements/shop_requirements.md` (SHOP-9, SHOP-13 open items),
`requirements/admin_requirements.md`, `requirements/common_requirements.md` §10.

---

## 1. Where the backend lives

**Decision: inside this project. No separate API service.**

Postgres is its own host regardless of what we choose, so a separate backend would not be "somewhere
for the database to live" — it would be a *third* service between Next and Postgres:

```
what we want:   Browser → Next (Server Actions / Server Components) → Postgres
what we avoid:  Browser → Next → HTTP → API server → Postgres
```

The extra hop costs two deploys, two sets of env vars, CORS, auth passed between services,
duplicated types, and a network round trip per query — for nothing this project needs. Server
Components can query Postgres directly and render the result with no client-side fetch at all.

**A separate backend would earn its place if** we had multiple client apps sharing one API, very
different scaling profiles between API and site, background workers/queues, a team boundary, or a
non-JS requirement. None apply.

**Later exception:** scheduled work (nightly cost report, abandoned-cart email) genuinely does not
fit a request/response cycle. The answer then is a cron trigger or a small worker — still not a
restructure into a separate API. Do not design for this now.

## 2. Which Next surface for what

| Need | Surface | Location |
|---|---|---|
| Checkout submission | Server Action (`"use server"`) | `src/lib/actions/orders.ts` |
| Admin dashboard reads | Server Component querying the DB | `src/app/admin/page.tsx` |
| Catalogue reads | Server Component (replaces the content module) | `src/app/shop/page.tsx` |
| Stripe webhook, if ever | Route Handler | `src/app/api/stripe/route.ts` |

**A Server Action is not a public API.** Its endpoint IDs are build artifacts that change between
deploys, so nothing outside the app can depend on them. It is RPC for our own UI. Anything needing a
stable, addressable URL — a webhook, a third party — is a Route Handler.

### Security: Server Actions are public POST endpoints

From `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`:

> Server Functions are reachable via direct POST requests, not just through your application's UI.
> Always verify authentication and authorization inside every Server Function.

This is the single most important note in this document. Anyone can POST arbitrary JSON to a Server
Action. Everything below follows from it.

## 3. The checkout contract

**Rule: the server re-derives the order. It does not validate what the client sent.**

If the browser sends a subtotal and the server compares it against the database, we have built a
disagreement we then have to resolve — and prices legitimately change between page load and submit.
If the browser never sends a price, there is nothing to disagree about and nothing to spoof.

**The client sends only:**

```ts
{ idempotencyKey, items: [{ slug, quantity }], buyer, fulfilment, paymentMethod }
```

**The client must never send:** prices, line totals, or subtotals. Those are outputs.

**The server then:**

1. Parses and rejects anything malformed (zod or equivalent)
2. Re-applies the SHOP-9 rule — cash only with local pick-up
3. Checks the idempotency key; a repeat returns the original order rather than creating a second
4. Re-reads price and stock from the database, `FOR UPDATE`, so two concurrent orders cannot both
   pass the stock check on the last item
5. Computes line totals and the subtotal itself
6. Writes the order and returns its authoritative total

Step 2 is the one that gets skipped. The client-side cash/shipping logic in `order-form.tsx` is UX —
it stops mistakes. It is **not** enforcement. Both copies have to exist. Same for stock caps.

### Why this matters more once payments exist

Today the client computes the order total and that is *safe*, because checkout is manual — a human
reads the email and confirms payment before making anything. That protection disappears the moment a
processor charges a browser-computed amount. If Stripe ever lands, pricing must already be
server-side.

### Two bugs that appear the moment orders persist

- **Idempotency.** A double-click or a retry on a flaky connection creates two orders. Generate a
  UUID per checkout attempt client-side, unique-constrain it, treat a repeat as the same order. Cheap
  now, painful to retrofit.
- **Price drift.** Someone adds an item, we reprice it, they check out a week later. The server's
  number is correct, but they must *see* the current total and confirm — not discover it in the
  confirmation email.

## 4. Schema sketch

Grounded in what SHOP-13 and `admin_requirements.md` §8 actually need. Illustrative Drizzle.

```ts
products:    id, slug (unique), name, priceCents (integer), stock, description, image, alt, details
orders:      id, idempotencyKey (unique), buyerName, buyerEmail,
             fulfilment ('shipping'|'pickup'), address?, pickupLocation?,
             paymentMethod, subtotalCents (server-computed), status, createdAt
orderItems:  orderId → orders, productId → products, quantity, unitPriceCents
```

**`orderItems.unitPriceCents` is the schema decision people regret skipping.** It is the price *at
time of order*. Never join to `products` for historical totals — repricing an item must not silently
rewrite last month's orders.

Money stays integer cents everywhere, as it is today in `src/lib/money.ts`.

## 5. Hosting → pooling → provider

This is the one decision Postgres actually forces, and it constrains the database choice more than
anything else. **Pick the host first.**

| Host | Connections | Trade-off |
|---|---|---|
| Vercel / Netlify (serverless) | Needs a pooler — Neon's serverless driver, Supabase's pooler, or PgBouncer. A plain `pg` client exhausts connections. | Zero-ops, scales to nothing when idle |
| Railway / Fly / VPS (long-lived Node) | A normal `pg` pool just works | Simpler model, predictable cost |

**Client layer:** prefer **Drizzle** — TypeScript-native, no separate schema language or generate
step, small cold start (which matters on serverless). Prisma is friendlier if we want a GUI and more
migration handling, at a heavier cold start.

**Hard rule:** database config never gets a `NEXT_PUBLIC_` prefix. Anything with that prefix is
inlined into client JavaScript, so `NEXT_PUBLIC_DATABASE_URL` would ship credentials to every
visitor. Also add the `server-only` package and import it at the top of DB modules, so a stray client
import fails at build time instead of silently bundling server code.

## 6. What actually forces a backend — and what does not

The shop is the one feature that works fine without one. The trigger is the unbuilt pages.

| Page | Needs server code | Why |
|---|---|---|
| Schedule (§3) | **Yes, unavoidably** | Google Calendar OAuth — client-side would expose credentials |
| Commission (§4) | **Yes** | Submissions currently have nowhere to go |
| Admin (§8) | **Yes** | The order table *is* a backend |
| Build a Bunny (§5) | Only at submit | The configurator is pure computation; it feeds the commission pipeline |
| Portfolio (§7) | No | Read-only content; a typed module is fine |
| Home, Shop | No | Built and working |

Schedule is the hard forcing function: Google Calendar OAuth cannot be done from a browser without
leaking secrets. That is true regardless of Postgres, since Calendar is the store of record for
events.

## 7. Sequencing

**Do not add the backend as its own task.** Add it while building the next page that requires it, and
let that page's real needs define the schema. A schema designed in the abstract against requirements
documents will be wrong in ways nothing surfaces until something uses it; a schema designed while
building the commission form will be right, because the form says what fields actually exist.

~~**Do not migrate the shop to Postgres yet.**~~ *Superseded — see the update at the top.* The
argument was that moving the catalogue buys only admin item management, which was out of scope. Once
a schema arrived covering `products` and `admin_users`, that stopped being true. The shop also
turned out to be the right *first* migration for a reason this section missed: it was the only
surface whose existing tests could tell us whether the move was faithful. A page with no tests
teaches you nothing when it works.

## 8. Consequences to plan for

- **The fully-static build ends.** All 16 routes prerender today, which is why E2E runs in ~10s
  against a real production build. Dynamic data means Next 16's caching APIs (`revalidateTag` /
  `updateTag`, `cacheLife` / `cacheTag`) start mattering on every page.
- **Static-only hosting stops working.** Today this could deploy to a CDN bucket with no server. One
  Server Action ends that.
- **Admin authentication becomes required.** No spec covers it, and it is frequently as much work as
  the database itself.
- **Tests gain a third layer.** `cart-store.test.ts` and `money.test.ts` are unaffected — still no
  database. `shop-content.test.ts` largely dies, as SHOP-11 stops meaning "guard the content module".
  New: pure unit tests for pricing functions, plus integration tests for Server Actions against a
  real test database. E2E gains seeding and teardown.

## 9. Authentication and security

Adding auth does **not** change the §1 decision. A separate API service would mean two trust
boundaries instead of one — the browser→Next hop still needs authenticating, and now Next→API needs
service-to-service auth (a shared secret or mTLS) that has to be rotated and can be misconfigured.
It also would not remove the need for authorization checks next to the queries. More failure modes,
no fewer.

### The surface is small

- **Customers: no auth at all.** Guest checkout; no accounts are specified anywhere in the
  requirements. This deletes the hard half of the problem — no password resets, no session fixation,
  no account enumeration.
- **Admin: one person.** Schedule (§3) already requires Google OAuth for Calendar, so admin login can
  reuse the same OAuth app restricted to a single Google account. Auth is close to free because we
  are building the OAuth flow regardless.

### The rule that will otherwise bite us

From `node_modules/next/dist/docs/01-app/02-guides/data-security.md`:

> A page-level authentication check does not extend to the Server Actions defined within it. Always
> re-verify inside the action.

Redirecting unauthenticated visitors away from `/admin` protects the **UI only**. Every Server Action
on that page is a separate entry point, reachable by direct POST. Each one re-checks the session
itself. There is no "middleware protects everything under /admin" model that is safe on its own.

### Data Access Layer

Next recommends this for new projects, and it is the structural fix for the above — it makes the
check impossible to forget by putting it next to the query rather than in the caller:

- A `server-only` module is the sole place that touches the database
- Authorization lives there, not in pages or actions
- It returns minimal DTOs, never raw rows — so private columns cannot leak into a Client Component
- `"use server"` actions stay thin: parse input, call the DAL

Wrap the session lookup in React's `cache()` so the same request reuses one result instead of
re-reading cookies per call. Note `cookies()` is async in Next 16.

### Authorization, not just authentication

"Is the caller logged in?" is not the same as "may this caller act on *this* record?". Skipping the
second is an IDOR bug — passing someone else's order id to an action that only checks for a session.
Every action taking an id verifies ownership of that specific row.

### Rate limiting

The checkout action is a **public, unauthenticated endpoint that writes to the database**. Without a
limit it is a spam vector — junk orders, mailbox flooding, table growth. The idempotency key in §3
stops accidental duplicates; it does not stop deliberate abuse. Needed before launch, not after.

### PII changes our obligations more than our architecture

Persisting orders means storing names, emails, and shipping addresses. Today that data exists only in
the shop owner's email inbox. Once it is in Postgres we own retention, deletion requests, backup
access, and encryption at rest (managed Postgres providers handle the last one). **Decide a retention
policy while building this, not afterwards.**

### Non-negotiables

- Auth check inside **every** Server Action, not only on the page
- Ownership check on every action that takes an id
- Database config never carries a `NEXT_PUBLIC_` prefix (see §5)
- `import "server-only"` at the top of every DB and auth module
- Secrets in env vars, never in the repo
- Rate limit the public checkout action

## 10. Still undecided

- **Payment processor.** Deferred, see SHOP-9. Manual Zelle/Venmo/cash is a reasonable *permanent*
  answer for made-to-order work — it avoids PCI scope and chargebacks on custom pieces. Revisit when
  a customer actually asks, not before.
- **Google Sheets vs. a custom admin table** (`common_requirements.md` §10.6). **Decide this before
  choosing a database.** If Sheets is the store of record, submissions could write straight there,
  the "dashboard" is a spreadsheet already familiar, and we skip a database, an ORM, and migrations
  entirely. If we want a real in-site dashboard, we want Postgres.
- **Deployment target** — serverless or long-lived Node. Constrains everything in §5.
- **Customer accounts.** None are specified. If they ever exist, the cart becomes hybrid:
  localStorage while anonymous, server-side once signed in, merged on login. Until then, guest
  checkout with a localStorage cart is correct.

## 11. Why the cart does not change

`src/components/shop/cart-store.ts` is the only module that touches `localStorage`; the four cart
components only call `add` / `setQuantity` / `remove` / `clear`. Pointing the cart at a server later
is a rewrite of one module, not of the shop.

`order-form.tsx` is the only file that changes: it stops building a summary string and instead calls
the Server Action with slugs and quantities, then renders the server's numbers rather than its own.
