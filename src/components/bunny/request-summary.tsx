import { formatPrice } from "@/lib/money";
import { site } from "@/content/site";
import {
  describeConfiguration,
  requestPayload,
  totalCents,
  type BunnyConfiguration,
} from "@/lib/bunny";

/**
 * What the customer sees after asking to send their bunny.
 *
 * @implements BUNNY-10 — names every choice, says what happens next, and does
 *   not clear the configuration behind it.
 *
 * There is no server yet, so the request is handed off as a prefilled email,
 * mirroring SHOP-13. `requestPayload` is what would be POSTed instead: the ids
 * alone, per BUNNY-11 and docs/backend.md §3.
 */
export default function RequestSummary({
  config,
}: {
  config: BunnyConfiguration;
}) {
  const rows = describeConfiguration(config);
  const payload = requestPayload(config);

  const body = [
    "Build a Bunny request",
    "",
    ...rows.map((row) => `${row.label}: ${row.value}`),
    "",
    `Estimated total: ${formatPrice(totalCents(config))}`,
    "(estimate only — please confirm final pricing and timeline)",
    "",
    `Options: ${payload.baseId}, ${payload.bunnyColorId}${
      payload.outfitColorId ? `, ${payload.outfitColorId}` : ""
    }${payload.addOnIds.length > 0 ? `, ${payload.addOnIds.join(", ")}` : ""}`,
  ].join("\n");

  return (
    <section
      aria-labelledby="request-ready"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6"
    >
      <h2 id="request-ready" className="text-2xl font-semibold text-ink">
        Your bunny is ready to send
      </h2>

      <dl className="flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4 text-base">
            <dt className="text-ink-muted">{row.label}</dt>
            <dd className="text-right text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>

      <p className="text-base text-ink-muted">
        Send this over and we&apos;ll confirm the final price and timeline before
        starting. Nothing is charged now.
      </p>

      <a
        href={`mailto:${site.email}?subject=${encodeURIComponent(
          "Build a Bunny request",
        )}&body=${encodeURIComponent(body)}`}
        className="inline-flex h-12 w-fit items-center justify-center rounded-full bg-accent px-6 text-base font-medium text-on-accent transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Send to {site.email}
      </a>
    </section>
  );
}
