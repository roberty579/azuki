import type { Metadata } from "next";
import CommissionForm from "@/components/commission/commission-form";

export const metadata: Metadata = {
  title: "Commission a piece",
  description:
    "Tell us what you'd like made. We'll talk it through, then send a price and a timeline.",
};

/**
 * A Server Component wrapping the form, which is the only interactive part.
 * Nothing here reads a database, so the route still prerenders.
 */
export default function CommissionPage() {
  return (
    <main className="flex w-full flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
      <div className="flex max-w-2xl flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-tight text-ink">
          Commission a piece
        </h1>
        <p className="text-lg leading-8 text-ink-muted">
          Tell us what you have in mind and we&apos;ll take it from there.
          There&apos;s no price on this form and nothing to pay — we&apos;ll talk
          it through first, then send you a price and a timeline to agree to.
        </p>
      </div>

      <CommissionForm />
    </main>
  );
}
