/**
 * Placeholder body for sections that are routed but not yet built.
 *
 * These exist so the nav links resolve instead of 404ing; each will be replaced
 * by the real page from its spec in requirements/.
 */
export default function ComingSoon({
  title,
  blurb,
}: {
  title: string;
  blurb: string;
}) {
  return (
    <main className="flex w-full flex-1 flex-col justify-center gap-4 px-4 py-20 sm:px-6 lg:px-10">
      <h1 className="text-4xl font-semibold tracking-tight text-ink">{title}</h1>
      <p className="max-w-xl text-lg text-ink-muted">{blurb}</p>
      <p className="text-sm font-medium uppercase tracking-widest text-accent">
        Coming soon
      </p>
    </main>
  );
}
