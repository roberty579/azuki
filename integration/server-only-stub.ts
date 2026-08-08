/**
 * Stands in for the `server-only` package during integration tests.
 *
 * The real module throws on import. That is the whole point of it — it turns a
 * stray import from a Client Component into a build failure instead of a
 * credential leak. But these tests import server modules deliberately, from
 * Node, which the real module cannot distinguish from the mistake it guards
 * against.
 *
 * Aliased in vitest.integration.config.mts. It is not aliased in the component
 * test config, so the guard still bites where it should.
 */
export {};
