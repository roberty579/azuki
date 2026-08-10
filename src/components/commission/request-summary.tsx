import { nextSteps } from "@/content/commission";
import { site } from "@/content/site";
import { describeRequest, type CommissionRequest } from "@/lib/commission";

/**
 * The confirmation, after a valid commission request.
 *
 * @implements COMM-8 — names every answer, and hands the request off.
 * @implements COMM-9 — explains what follows, so someone who has just described
 *   a bespoke piece and seen no price knows a quote is coming rather than
 *   wondering whether they have bought something.
 *
 * There is no server yet, so the request is a prefilled email to the shop's
 * contact address, mirroring SHOP-13 and BUNNY-10. `describeRequest` is what a
 * Server Action would receive instead; replacing the hand-off must not change
 * any rule above it.
 */
export default function RequestSummary({
  request,
}: {
  request: CommissionRequest;
}) {
  const rows = describeRequest(request);

  const body = [
    "Commission request",
    "",
    ...rows.map((row) => `${row.label}: ${row.value}`),
    "",
    "Terms accepted: yes",
  ].join("\n");

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <section
        aria-labelledby="request-ready"
        className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6"
      >
        <h2 id="request-ready" className="text-2xl font-semibold text-ink">
          Your request is ready to send
        </h2>

        <dl className="flex flex-col gap-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex flex-wrap justify-between gap-x-6 gap-y-1 text-base"
            >
              <dt className="text-ink-muted">{row.label}</dt>
              <dd className="max-w-prose text-left text-ink sm:text-right">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <a
          href={`mailto:${site.email}?subject=${encodeURIComponent(
            "Commission request",
          )}&body=${encodeURIComponent(body)}`}
          className="inline-flex h-12 w-fit items-center justify-center rounded-full bg-accent px-6 text-base font-medium text-on-accent transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Send to {site.email}
        </a>
      </section>

      <section aria-labelledby="next-steps" className="flex flex-col gap-4">
        <h2 id="next-steps" className="text-xl font-semibold text-ink">
          What happens next
        </h2>
        <ol className="flex flex-col gap-4">
          {nextSteps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent"
              >
                {index + 1}
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-medium text-ink">{step.title}</h3>
                <p className="max-w-prose text-sm leading-6 text-ink-muted">
                  {step.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
