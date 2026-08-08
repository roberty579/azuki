This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

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
