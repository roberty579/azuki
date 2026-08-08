/**
 * The cart, backed by localStorage.
 *
 * @implements SHOP-6 — survives navigation and reloads.
 *
 * Modelled as an external store rather than React state because that is what it
 * is: the browser owns the data, React subscribes to it. That also makes it
 * consistent across tabs for free, via the `storage` event.
 *
 * Only `{ slug, quantity }` is persisted. Names, prices, and stock are always
 * re-read from the catalogue, so a cart stored last week can never display a
 * stale price.
 *
 * This module knows nothing about the catalogue. It used to import the content
 * module directly to check stock, which only worked while the catalogue was a
 * file the browser could read too; products now live in Postgres. So stock caps
 * arrive as an argument from callers that already have the product, and
 * resolving a stored cart against the catalogue — dropping items that no longer
 * exist, clamping quantities that exceed stock — happens in use-cart.ts, which
 * is where the catalogue is.
 */

export type CartLine = { slug: string; quantity: number };

const STORAGE_KEY = "azuki.cart.v1";

/** Stable reference: getSnapshot must not return a new array each call. */
const EMPTY: CartLine[] = [];

let cache: CartLine[] | null = null;
const listeners = new Set<() => void>();

/**
 * Shape validation only — corrupt JSON and entries that are not
 * `{ slug: string, quantity: number }`. Whether the slug still exists, and
 * whether the quantity exceeds stock, are catalogue questions answered on read.
 */
function sanitise(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return EMPTY;

  const lines = value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const { slug, quantity } = entry as Partial<CartLine>;
    if (typeof slug !== "string" || slug === "") return [];
    if (typeof quantity !== "number" || !Number.isFinite(quantity)) return [];

    const whole = Math.floor(quantity);
    return whole > 0 ? [{ slug, quantity: whole }] : [];
  });

  return lines.length > 0 ? lines : EMPTY;
}

function read(): CartLine[] {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? sanitise(JSON.parse(stored)) : EMPTY;
  } catch {
    // Corrupt JSON, or storage blocked in private mode. An empty cart is the
    // right fallback — never let this take the page down.
    return EMPTY;
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function commit(next: CartLine[]) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked; the in-memory cart still works for this visit.
  }
  emit();
}

function handleStorage(event: StorageEvent) {
  // key === null means the whole store was cleared.
  if (event.key !== null && event.key !== STORAGE_KEY) return;
  cache = read();
  emit();
}

export function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    window.addEventListener("storage", handleStorage);
  }
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

/** Only ever called in the browser; the lazy read keeps it out of render on the server. */
export function getSnapshot(): CartLine[] {
  if (cache === null) cache = read();
  return cache;
}

/** The server has no cart. React uses this during SSR and hydration. */
export function getServerSnapshot(): CartLine[] {
  return EMPTY;
}

/**
 * @implements SHOP-4, SHOP-10 — adding accumulates onto an existing line rather
 *   than duplicating it, and never exceeds `maxQuantity`.
 *
 * `maxQuantity` is the product's stock. Passing 0 is how a sold-out item is
 * refused, which callers get for free by passing `product.stock`.
 */
export function addLine(slug: string, quantity: number, maxQuantity: number) {
  if (maxQuantity < 1 || quantity < 1) return;

  const current = getSnapshot();
  const existing = current.find((line) => line.slug === slug);
  const clamped = Math.min(
    (existing?.quantity ?? 0) + Math.floor(quantity),
    maxQuantity,
  );

  commit(
    existing
      ? current.map((line) =>
          line.slug === slug ? { ...line, quantity: clamped } : line,
        )
      : [...current, { slug, quantity: clamped }],
  );
}

/** @implements SHOP-5, SHOP-10 — below one removes the line; above stock clamps. */
export function setLineQuantity(
  slug: string,
  quantity: number,
  maxQuantity: number,
) {
  const current = getSnapshot();

  if (quantity < 1 || maxQuantity < 1) {
    commit(current.filter((line) => line.slug !== slug));
    return;
  }

  const clamped = Math.min(Math.floor(quantity), maxQuantity);
  commit(
    current.map((line) =>
      line.slug === slug ? { ...line, quantity: clamped } : line,
    ),
  );
}

export function removeLine(slug: string) {
  commit(getSnapshot().filter((line) => line.slug !== slug));
}

export function clearLines() {
  commit(EMPTY);
}
