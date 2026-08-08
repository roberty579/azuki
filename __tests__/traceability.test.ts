import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * Enforces the linked-intent convention documented in README.md.
 *
 * Without this, tags rot silently: a requirement gets implemented with no tag,
 * or a tag outlives the requirement it names. Both directions are checked here,
 * so the specs and the code cannot drift apart unnoticed.
 *
 * Every spec under requirements/ that uses `### PREFIX-n —` headings is picked
 * up automatically, so tagging a new page needs no change to this file.
 *
 * This file is excluded from its own scan — the patterns below would otherwise
 * register as tags.
 */

const root = process.cwd();
const SPEC_DIR = "requirements";
const SELF = join("__tests__", "traceability.test.ts");

const IMPLEMENTATION_DIRS = ["src"];
const TEST_DIRS = ["__tests__", "e2e"];
const SCANNED_EXTENSIONS = new Set([".ts", ".tsx", ".css"]);

function walk(dir: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(join(root, dir))) {
    const path = join(root, dir, entry);
    if (statSync(path).isDirectory()) {
      files.push(...walk(join(dir, entry)));
    } else if (SCANNED_EXTENSIONS.has(extname(entry))) {
      files.push(relative(root, path));
    }
  }

  return files;
}

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

/** Requirement IDs per spec file, taken from `### PREFIX-n —` headings. */
function definedIds(): Map<string, string[]> {
  const specs = new Map<string, string[]>();

  for (const file of readdirSync(join(root, SPEC_DIR))) {
    if (extname(file) !== ".md") continue;

    const spec = join(SPEC_DIR, file);
    const ids = [...read(spec).matchAll(/^###\s+([A-Z]+-\d+)\s+—/gm)].map(
      (match) => match[1],
    );
    if (ids.length > 0) specs.set(spec, ids);
  }

  return specs;
}

const specs = definedIds();
const ids = [...specs.values()].flat();

/** Only prefixes an actual spec defines count as tags, so "TODO-1" is not one. */
const prefixes = [...new Set(ids.map((id) => id.split("-")[0]))];
const ID_PATTERN = new RegExp(`(?:${prefixes.join("|")})-\\d+`, "g");

/**
 * Maps each tagged ID to the files tagging it.
 *
 * `tag` matches one tag occurrence and captures the text holding its IDs, so a
 * single `@implements SHOP-8, SHOP-9` contributes both.
 */
function collect(dirs: string[], tag: RegExp): Map<string, string[]> {
  const found = new Map<string, string[]>();

  for (const dir of dirs) {
    for (const file of walk(dir)) {
      if (file === SELF) continue;

      for (const [, idList] of read(file).matchAll(tag)) {
        for (const [id] of idList.matchAll(ID_PATTERN)) {
          const files = found.get(id) ?? [];
          if (!files.includes(file)) found.set(id, [...files, file]);
        }
      }
    }
  }

  return found;
}

/** `@implements SHOP-8, SHOP-9 — note`, in a comment, to the end of the line. */
const implemented = collect(IMPLEMENTATION_DIRS, /@implements\s+([^\n]*)/g);

/** `[SHOP-4]` in a test title; several may appear in one title. */
const tested = collect(
  TEST_DIRS,
  new RegExp(`((?:\\[(?:${prefixes.join("|")})-\\d+\\]\\s*)+)`, "g"),
);

describe("linked intent", () => {
  test("at least one spec defines requirement IDs", () => {
    expect(specs.size).toBeGreaterThan(0);
    expect(ids.length).toBeGreaterThan(0);
  });

  test.each([...specs])("%s numbers its IDs 1..n with no gaps", (_spec, own) => {
    expect(new Set(own).size).toBe(own.length);

    // Compared as a set: specs group requirements by topic, so document order
    // is deliberately not numeric order.
    const numbers = own.map((id) => Number(id.split("-")[1])).sort((a, b) => a - b);
    expect(numbers).toEqual(
      Array.from({ length: numbers.length }, (_, index) => index + 1),
    );
  });

  test("IDs are unique across specs", () => {
    expect(new Set(ids).size).toBe(ids.length);
  });

  test.each(ids)("%s is implemented by tagged code", (id) => {
    expect(
      implemented.get(id),
      `no "@implements ${id}" tag under ${IMPLEMENTATION_DIRS.join(", ")}`,
    ).toBeTruthy();
  });

  test.each(ids)("%s is covered by a tagged test", (id) => {
    expect(
      tested.get(id),
      `no test title containing [${id}] under ${TEST_DIRS.join(", ")}`,
    ).toBeTruthy();
  });

  test("no tag points at a requirement that does not exist", () => {
    const known = new Set(ids);
    const orphans = [...implemented, ...tested]
      .filter(([id]) => !known.has(id))
      .map(([id, files]) => `${id} (in ${files.join(", ")})`);

    expect(orphans, `tags reference IDs missing from ${SPEC_DIR}/`).toEqual([]);
  });
});
