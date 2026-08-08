"use client";

import { useMemo, useState } from "react";
import { useCart } from "./use-cart";
import { formatPrice } from "@/lib/money";
import {
  availablePaymentMethods,
  paymentMethods,
  pickupLocations,
  type FulfilmentMethod,
} from "@/content/ordering";
import { site } from "@/content/site";

/**
 * Manual checkout: collects the buyer's details and hands off an order request.
 *
 * @implements SHOP-8 — shipping address or a local drop-off, never both.
 * @implements SHOP-9 — cash is offered for local pick-up only.
 * @implements SHOP-13 — a completed request produces the order summary and
 *   payment instructions, and clears the cart.
 *
 * There is no server yet, so submission opens a prefilled email to the shop
 * rather than posting anywhere. Replacing this with a real endpoint should not
 * change any of the validation above it.
 */

type Errors = Partial<Record<string, string>>;

export default function OrderForm() {
  const { lines, subtotalCents, clear } = useCart();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [fulfilment, setFulfilment] = useState<FulfilmentMethod>("shipping");
  const [address, setAddress] = useState("");
  const [pickup, setPickup] = useState("");
  const [payment, setPayment] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState<string | null>(null);

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

  function buildSummary(): string {
    const method = paymentMethods.find((m) => m.id === payment);
    const items = lines
      .map(
        (line) =>
          `- ${line.product.name} x${line.quantity} — ${formatPrice(line.lineTotalCents)}`,
      )
      .join("\n");

    return [
      `Order request from ${firstName.trim()} ${lastName.trim()}`,
      `Email: ${email.trim()}`,
      "",
      "Items:",
      items,
      `Subtotal: ${formatPrice(subtotalCents)}`,
      "",
      fulfilment === "shipping"
        ? `Ship to:\n${address.trim()}`
        : `Local pick-up: ${pickup}`,
      `Payment: ${method?.label ?? payment}`,
    ].join("\n");
  }

  function handleSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const summary = buildSummary();
    setSubmitted(summary);
    clear();
  }

  if (submitted) {
    const method = paymentMethods.find((m) => m.id === payment);
    return (
      <section
        aria-labelledby="order-sent"
        className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6"
      >
        <h2 id="order-sent" className="text-2xl font-semibold text-ink">
          Order request ready
        </h2>
        <p className="text-base text-ink-muted">{method?.instructions}</p>
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-background p-4 text-sm text-ink">
          {submitted}
        </pre>
        <a
          href={`mailto:${site.email}?subject=${encodeURIComponent("Shop order request")}&body=${encodeURIComponent(submitted)}`}
          className="inline-flex h-12 w-fit items-center justify-center rounded-full bg-accent px-6 text-base font-medium text-on-accent transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Send to {site.email}
        </a>
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

      <button
        type="submit"
        className="inline-flex h-12 w-fit items-center justify-center rounded-full bg-accent px-6 text-base font-medium text-on-accent transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Review order request
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
