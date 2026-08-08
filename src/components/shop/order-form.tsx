"use client";

import { useMemo, useState } from "react";
import { useCart } from "./use-cart";
import { formatPrice } from "@/lib/money";
import { submitOrder, type CheckoutResult } from "@/lib/actions/orders";
import {
  availablePaymentMethods,
  paymentMethods,
  pickupLocations,
  type FulfilmentMethod,
} from "@/content/ordering";

/**
 * Checkout: collects the buyer's details and submits the order.
 *
 * @implements SHOP-8 — shipping address or a local drop-off, never both.
 * @implements SHOP-9 — cash is offered for local pick-up only.
 * @implements SHOP-13 — a completed request produces the order summary and
 *   payment instructions, and clears the cart.
 *
 * The validation here is UX: it catches mistakes before a round trip and points
 * at the field that needs fixing. It is *not* the enforcement — every rule is
 * re-applied in the Server Action, which is reachable by direct POST without
 * this form. Both copies have to exist.
 */

type Errors = Partial<Record<string, string>>;

type ConfirmedOrder = Extract<CheckoutResult, { ok: true }>["order"];

export default function OrderForm() {
  const { lines, clear } = useCart();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [fulfilment, setFulfilment] = useState<FulfilmentMethod>("shipping");
  const [address, setAddress] = useState("");
  const [pickup, setPickup] = useState("");
  const [payment, setPayment] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmed, setConfirmed] = useState<ConfirmedOrder | null>(null);

  /**
   * One key per mounted checkout, so every click of Submit carries the same
   * one. Regenerating per click would defeat the purpose — the server would see
   * two distinct orders rather than a replay.
   */
  const [attemptKey] = useState(() => crypto.randomUUID());

  const allowedPayments = useMemo(
    () => availablePaymentMethods(fulfilment),
    [fulfilment],
  );

  /**
   * Switching fulfilment must not leave a now-invalid payment method selected:
   * choosing cash, then switching to shipping, removes the cash radio but would
   * otherwise keep "cash" in state and submit it silently.
   *
   * Done here rather than in an effect so the two states change together, in
   * one render, with no intermediate frame where they disagree.
   */
  function chooseFulfilment(next: FulfilmentMethod) {
    setFulfilment(next);
    const stillAllowed = availablePaymentMethods(next).some(
      (method) => method.id === payment,
    );
    if (!stillAllowed) setPayment("");
  }

  function validate(): Errors {
    const next: Errors = {};
    if (!firstName.trim()) next.firstName = "Enter your first name.";
    if (!lastName.trim()) next.lastName = "Enter your last name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "Enter an email address we can reply to.";
    }
    if (fulfilment === "shipping" && !address.trim()) {
      next.address = "Enter the address to ship to.";
    }
    if (fulfilment === "pickup" && !pickup) {
      next.pickup = "Choose a drop-off spot.";
    }
    if (!payment) {
      next.payment = "Choose how you would like to pay.";
    } else if (!allowedPayments.some((method) => method.id === payment)) {
      // Belt and braces: the UI already prevents this, but an order must never
      // go out claiming cash on a shipped item.
      next.payment = "That payment method is not available for shipped orders.";
    }
    return next;
  }

  async function handleSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setPending(true);
    try {
      /**
       * Slugs and quantities only. No prices leave the browser — the server
       * reads them from the catalogue and computes the totals itself, so an
       * order can never claim a price it was not charged (docs/backend.md §3).
       *
       * The idempotency key is generated once per checkout attempt, not per
       * click, so a double-click sends the same key and gets the same order.
       */
      const result = await submitOrder({
        idempotencyKey: attemptKey,
        items: lines.map((line) => ({
          slug: line.product.slug,
          quantity: line.quantity,
        })),
        buyer: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
        },
        fulfilment,
        shippingAddress: fulfilment === "shipping" ? address.trim() : undefined,
        pickupLocation: fulfilment === "pickup" ? pickup : undefined,
        paymentMethod: payment as "zelle" | "venmo" | "cash",
      });

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setSubmitError(result.error);
        return;
      }

      setSubmitError(null);
      setConfirmed(result.order);
      clear();
    } finally {
      setPending(false);
    }
  }

  if (confirmed) {
    const method = paymentMethods.find((m) => m.id === confirmed.paymentMethod);

    return (
      <section
        aria-labelledby="order-sent"
        className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6"
      >
        <h2 id="order-sent" className="text-2xl font-semibold text-ink">
          Order request ready
        </h2>
        <p className="text-base text-ink-muted">{method?.instructions}</p>

        {/* Every figure below came back from the server, which recomputed it
            from the catalogue. Nothing here is the browser's arithmetic. */}
        <dl className="flex flex-col gap-2 text-base">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Reference</dt>
            <dd className="font-mono text-sm text-ink">{confirmed.id}</dd>
          </div>
          {confirmed.lines.map((line) => (
            <div key={line.name} className="flex justify-between gap-4">
              <dt className="text-ink-muted">
                {line.name} &times;{line.quantity}
              </dt>
              <dd className="tabular-nums text-ink">
                {formatPrice(line.lineTotalCents)}
              </dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 border-t border-border pt-2 font-semibold">
            <dt className="text-ink">Total</dt>
            <dd className="tabular-nums text-ink">
              {formatPrice(confirmed.totalCents)}
            </dd>
          </div>
        </dl>

        <p className="text-sm text-ink-muted">
          {confirmed.fulfilment === "shipping"
            ? "We'll be in touch to confirm shipping."
            : "We'll be in touch to arrange the drop-off."}
        </p>
      </section>
    );
  }

  if (lines.length === 0) return null;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby="checkout"
      className="flex flex-col gap-6"
    >
      <h2 id="checkout" className="text-2xl font-semibold text-ink">
        Checkout
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="first-name"
          label="First name"
          value={firstName}
          onChange={setFirstName}
          error={errors.firstName}
        />
        <Field
          id="last-name"
          label="Last name"
          value={lastName}
          onChange={setLastName}
          error={errors.lastName}
        />
      </div>

      <Field
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        error={errors.email}
      />

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold uppercase tracking-widest text-ink-muted">
          Fulfilment
        </legend>
        <Radio
          name="fulfilment"
          value="shipping"
          checked={fulfilment === "shipping"}
          onChange={() => chooseFulfilment("shipping")}
          label="Ship it to me"
        />
        <Radio
          name="fulfilment"
          value="pickup"
          checked={fulfilment === "pickup"}
          onChange={() => chooseFulfilment("pickup")}
          label="Local pick-up"
        />
      </fieldset>

      {fulfilment === "shipping" ? (
        <div className="flex flex-col gap-1">
          <label
            htmlFor="address"
            className="text-sm font-medium text-ink-muted"
          >
            Shipping address
          </label>
          <textarea
            id="address"
            rows={3}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            aria-invalid={Boolean(errors.address)}
            className="rounded-xl border border-border bg-surface px-4 py-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          <FieldError message={errors.address} />
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <label htmlFor="pickup" className="text-sm font-medium text-ink-muted">
            Drop-off spot
          </label>
          <select
            id="pickup"
            value={pickup}
            onChange={(event) => setPickup(event.target.value)}
            aria-invalid={Boolean(errors.pickup)}
            className="h-12 rounded-xl border border-border bg-surface px-4 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <option value="">Choose a spot…</option>
            {pickupLocations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
          <FieldError message={errors.pickup} />
        </div>
      )}

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold uppercase tracking-widest text-ink-muted">
          Payment
        </legend>
        {allowedPayments.map((method) => (
          <Radio
            key={method.id}
            name="payment"
            value={method.id}
            checked={payment === method.id}
            onChange={() => setPayment(method.id)}
            label={method.label}
          />
        ))}
        {fulfilment === "shipping" && (
          <p className="text-sm text-ink-muted">
            Cash is available for local pick-up only.
          </p>
        )}
        <FieldError message={errors.payment} />
      </fieldset>

      {/* Errors the server raised that belong to no single field — a race on
          stock, or a rule the form thought it had already satisfied. */}
      {submitError && (
        <p
          role="alert"
          className="rounded-xl border border-accent bg-accent-soft px-4 py-3 text-sm font-medium text-accent"
        >
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-fit items-center justify-center rounded-full bg-accent px-6 text-base font-medium text-on-accent transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Sending…" : "Review order request"}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-ink-muted">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className="h-12 rounded-xl border border-border bg-surface px-4 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      />
      <FieldError message={error} />
    </div>
  );
}

function Radio({
  name,
  value,
  checked,
  onChange,
  label,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 text-base text-ink">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-accent"
      />
      {label}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm font-medium text-accent">
      {message}
    </p>
  );
}
