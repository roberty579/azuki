"use client";

import { useMemo, useState } from "react";
import RequestSummary from "./request-summary";
import {
  buildRequest,
  emptyDraft,
  validate,
  type CommissionDraft,
  type CommissionRequest,
  type Errors,
} from "@/lib/commission";
import { terms, yarnThicknesses } from "@/content/commission";
import {
  availablePaymentMethods,
  pickupLocations,
  type FulfilmentMethod,
} from "@/content/ordering";

/**
 * The commission request form.
 *
 * @implements COMM-1 — who is asking.
 * @implements COMM-2 — what they want made, and whether it is a gift.
 * @implements COMM-3 — yarn colour, type, and thickness.
 * @implements COMM-4 — a shipping address or a drop-off spot, never both.
 * @implements COMM-5 — cash is offered only for local drop-off.
 * @implements COMM-6 — terms must be accepted before submitting.
 * @implements COMM-7 — an incomplete form does not submit and marks what is
 *   missing.
 * @implements COMM-8 — a valid form produces the request.
 *
 * Every rule lives in src/lib/commission.ts rather than here, so it can be
 * tested without driving the UI and re-run by a server later. This component
 * owns the fields and the conditional rendering; it owns no rules.
 */
export default function CommissionForm() {
  const [draft, setDraft] = useState<CommissionDraft>(emptyDraft);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState<CommissionRequest | null>(null);

  const allowedPayments = useMemo(
    () => availablePaymentMethods(draft.fulfilment),
    [draft.fulfilment],
  );

  function set<K extends keyof CommissionDraft>(
    key: K,
    value: CommissionDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function setAddress(key: keyof CommissionDraft["address"], value: string) {
    setDraft((current) => ({
      ...current,
      address: { ...current.address, [key]: value },
    }));
  }

  /**
   * @implements COMM-5 — switching fulfilment must not leave a now-invalid
   *   payment method selected. Choosing cash, then switching to shipping,
   *   removes the cash radio but would otherwise keep "cash" in state and
   *   submit it silently.
   *
   * Done here rather than in an effect so the two values change together in one
   * render, with no frame where they disagree — and because a synchronous
   * setState inside an effect is a lint error in this repo.
   */
  function chooseFulfilment(next: FulfilmentMethod) {
    setDraft((current) => {
      const stillAllowed = availablePaymentMethods(next).some(
        (method) => method.id === current.payment,
      );
      return {
        ...current,
        fulfilment: next,
        payment: stillAllowed ? current.payment : "",
      };
    });
  }

  function handleSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();

    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitted(buildRequest(draft));
  }

  if (submitted) return <RequestSummary request={submitted} />;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby="commission-form"
      className="flex max-w-3xl flex-col gap-10"
    >
      <h2 id="commission-form" className="sr-only">
        Commission request
      </h2>

      <Section title="About you">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="first-name"
            label="First name"
            value={draft.firstName}
            onChange={(value) => set("firstName", value)}
            error={errors.firstName}
          />
          <Field
            id="last-name"
            label="Last name"
            value={draft.lastName}
            onChange={(value) => set("lastName", value)}
            error={errors.lastName}
          />
          <Field
            id="email"
            label="Email"
            type="email"
            value={draft.email}
            onChange={(value) => set("email", value)}
            error={errors.email}
          />
          <Field
            id="phone"
            label="Phone (optional)"
            type="tel"
            value={draft.phone}
            onChange={(value) => set("phone", value)}
            error={errors.phone}
          />
        </div>
      </Section>

      <Section title="What you'd like made">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="item-description"
            className="text-sm font-medium text-ink-muted"
          >
            Describe the piece
          </label>
          <textarea
            id="item-description"
            rows={4}
            value={draft.itemDescription}
            onChange={(event) => set("itemDescription", event.target.value)}
            aria-invalid={Boolean(errors.itemDescription)}
            placeholder="A cardigan, a plushie, something you saw and loved — as much or as little detail as you have."
            className="rounded-xl border border-border bg-surface px-4 py-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          <FieldError message={errors.itemDescription} />
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium text-ink-muted">
            Is this a gift?
          </legend>
          <Radio
            name="purpose"
            value="gift"
            checked={draft.purpose === "gift"}
            onChange={() => set("purpose", "gift")}
            label="Yes, it's a gift"
          />
          <Radio
            name="purpose"
            value="personal"
            checked={draft.purpose === "personal"}
            onChange={() => set("purpose", "personal")}
            label="No, it's for me"
          />
          <FieldError message={errors.purpose} />
        </fieldset>
      </Section>

      <Section title="Yarn">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="yarn-color"
            label="Colour"
            value={draft.yarnColor}
            onChange={(value) => set("yarnColor", value)}
            error={errors.yarnColor}
          />
          <Field
            id="yarn-type"
            label="Type"
            value={draft.yarnType}
            onChange={(value) => set("yarnType", value)}
            error={errors.yarnType}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="yarn-thickness"
            className="text-sm font-medium text-ink-muted"
          >
            Thickness
          </label>
          <select
            id="yarn-thickness"
            value={draft.yarnThickness}
            onChange={(event) => set("yarnThickness", event.target.value)}
            aria-invalid={Boolean(errors.yarnThickness)}
            className="h-12 rounded-xl border border-border bg-surface px-4 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <option value="">Choose a thickness…</option>
            {yarnThicknesses.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <FieldError message={errors.yarnThickness} />
        </div>
      </Section>

      <Section title="Getting it to you">
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium text-ink-muted">
            Fulfilment
          </legend>
          <Radio
            name="fulfilment"
            value="shipping"
            checked={draft.fulfilment === "shipping"}
            onChange={() => chooseFulfilment("shipping")}
            label="Ship it to me"
          />
          <Radio
            name="fulfilment"
            value="pickup"
            checked={draft.fulfilment === "pickup"}
            onChange={() => chooseFulfilment("pickup")}
            label="Local drop-off"
          />
        </fieldset>

        {draft.fulfilment === "shipping" ? (
          <div className="flex flex-col gap-4">
            <Field
              id="address-line1"
              label="Street address"
              value={draft.address.line1}
              onChange={(value) => setAddress("line1", value)}
              error={errors["address.line1"]}
            />
            <Field
              id="address-line2"
              label="Apartment, suite (optional)"
              value={draft.address.line2}
              onChange={(value) => setAddress("line2", value)}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                id="address-city"
                label="City"
                value={draft.address.city}
                onChange={(value) => setAddress("city", value)}
                error={errors["address.city"]}
              />
              <Field
                id="address-state"
                label="State"
                value={draft.address.state}
                onChange={(value) => setAddress("state", value)}
                error={errors["address.state"]}
              />
              <Field
                id="address-zip"
                label="Postcode"
                value={draft.address.zip}
                onChange={(value) => setAddress("zip", value)}
                error={errors["address.zip"]}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label
              htmlFor="dropoff"
              className="text-sm font-medium text-ink-muted"
            >
              Drop-off spot
            </label>
            <select
              id="dropoff"
              value={draft.dropoffLocation}
              onChange={(event) => set("dropoffLocation", event.target.value)}
              aria-invalid={Boolean(errors.dropoffLocation)}
              className="h-12 rounded-xl border border-border bg-surface px-4 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <option value="">Choose a spot…</option>
              {pickupLocations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
            <FieldError message={errors.dropoffLocation} />
          </div>
        )}
      </Section>

      <Section title="Payment">
        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">Payment method</legend>
          {allowedPayments.map((method) => (
            <Radio
              key={method.id}
              name="payment"
              value={method.id}
              checked={draft.payment === method.id}
              onChange={() => set("payment", method.id)}
              label={method.label}
            />
          ))}
          {draft.fulfilment === "shipping" && (
            <p className="text-sm text-ink-muted">
              Cash is available for local drop-off only.
            </p>
          )}
          <FieldError message={errors.payment} />
        </fieldset>
        <p className="text-sm text-ink-muted">
          Nothing is charged now. We&apos;ll agree a price after the
          consultation, and arrange payment then.
        </p>
      </Section>

      <Section title={terms.heading}>
        {/* COMM-6: the terms are shown in full rather than behind a link, so
            what was agreed to cannot quietly change. */}
        <p className="rounded-xl border border-border bg-surface p-4 text-sm leading-6 text-ink-muted">
          {terms.body}
        </p>
        <label className="flex items-start gap-3 text-base text-ink">
          <input
            type="checkbox"
            checked={draft.termsAccepted}
            onChange={(event) => set("termsAccepted", event.target.checked)}
            aria-invalid={Boolean(errors.termsAccepted)}
            className="mt-1 h-4 w-4 shrink-0 accent-accent"
          />
          {terms.checkboxLabel}
        </label>
        <FieldError message={errors.termsAccepted} />
      </Section>

      <button
        type="submit"
        className="inline-flex h-12 w-fit items-center justify-center rounded-full bg-accent px-6 text-base font-medium text-on-accent transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Review request
      </button>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-6 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-ink-muted">
        {title}
      </h3>
      {children}
    </section>
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

/** @implements COMM-7 — role="alert" so a problem is announced, not only shown. */
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm font-medium text-accent">
      {message}
    </p>
  );
}
