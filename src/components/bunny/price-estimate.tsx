import { formatPrice } from "@/lib/money";
import { priceLines, totalCents, type BunnyConfiguration } from "@/lib/bunny";

/**
 * The running total, itemised.
 *
 * @implements BUNNY-5 — updates on every change, because it is derived from the
 *   configuration on each render rather than accumulated in state.
 * @implements BUNNY-6 — one line per contributing choice, not a single number.
 * @implements BUNNY-7 — cents throughout; formatPrice is the only conversion.
 *
 * Presentational: it takes a configuration and computes, so it can render on the
 * server and be tested without a user interaction.
 */
export default function PriceEstimate({
  config,
}: {
  config: BunnyConfiguration;
}) {
  const lines = priceLines(config);
  const total = totalCents(config);

  return (
    <section
      aria-labelledby="estimate"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6"
    >
      <h2
        id="estimate"
        className="text-sm font-semibold uppercase tracking-widest text-ink-muted"
      >
        Estimate
      </h2>

      <dl className="flex flex-col gap-2">
        {lines.map((line) => (
          <div key={line.id} className="flex justify-between gap-4 text-base">
            <dt className="text-ink-muted">{line.label}</dt>
            <dd className="shrink-0 tabular-nums text-ink">
              {formatPrice(line.amountCents)}
            </dd>
          </div>
        ))}
      </dl>

      {/*
        aria-live so the total is announced as options change. Without it a
        screen reader user would have to hunt for the number after every click.
      */}
      <div
        aria-live="polite"
        className="flex justify-between gap-4 border-t border-border pt-4 text-lg font-semibold text-ink"
      >
        <span>Estimated total</span>
        <span className="shrink-0 tabular-nums">{formatPrice(total)}</span>
      </div>

      {/* BUNNY-7: this is an estimate from the listed options, not a quote. */}
      <p className="text-sm text-ink-muted">
        An estimate from the options above. Final pricing and timeline are
        confirmed before any work begins.
      </p>
    </section>
  );
}
