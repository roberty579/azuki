import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * Enforces the linked-intent convention documented in README.md.
 *
 * Without this, tags rot silently: a requirement gets implemented with no tag,
 * or a tag outlives the requirement it names. Both directions are checked here,
 * so the spec and the code cannot drift apart unnoticed.
 *
 * This file is excluded from its own scan — the patterns below would otherwise
 * register as tags.
 */

const root = process.cwd();
const SPEC = join("requirements", "home_requirements.md");
const SELF = join("__tests__", "traceability.test.ts");

const IMPLEMENTATION_DIRS = ["app", "components", "content"];
const TEST_DIRS = ["__tests__", "e2e"];
const SCANNED_EXTENSIONS = new Set([".ts", ".tsx", ".css"]);

const ID = /HOME-\d+/g;

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

/** Requirement IDs defined by the spec, taken from its `### HOME-n —` headings. */
function definedIds(): string[] {
  return [...read(SPEC).matchAll(/^###\s+(HOME-\d+)\s+—/gm)].map((m) => m[1]);
}

/**
 * Maps each tagged ID to the files tagging it.
 *
 * `tag` matches one tag occurrence and captures the text holding its IDs, so a
 * single `@implements HOME-2, HOME-3` contributes both.
 */
function collect(dirs: string[], tag: RegExp): Map<string, string[]> {
  const found = new Map<string, string[]>();

  for (const dir of dirs) {
    for (const file of walk(dir)) {
      if (file === SELF) continue;

      for (const [, idList] of read(file).matchAll(tag)) {
        for (const [id] of idList.matchAll(ID)) {
          const files = found.get(id) ?? [];
          if (!files.includes(file)) found.set(id, [...files, file]);
        }
      }
    }
  }

  return found;
}

/** `@implements HOME-2, HOME-3 — note`, in a comment, up to the end of the line. */
const implemented = collect(IMPLEMENTATION_DIRS, /@implements\s+([^\n]*)/g);

/** `[HOME-4]` in a test title; several may appear in one title. */
const tested = collect(TEST_DIRS, /(\[HOME-\d+\](?:\s*\[HOME-\d+\])*)/g);

const ids = definedIds();

describe("linked intent", () => {
  test("the spec defines requirement IDs at all", () => {
    expect(ids.length).toBeGreaterThan(0);
  });

  test("IDs are unique and numbered without gaps", () => {
    expect(new Set(ids).size).toBe(ids.length);

    const numbers = ids.map((id) => Number(id.split("-")[1]));
    expect(numbers).toEqual(
      Array.from({ length: numbers.length }, (_, i) => i + 1),
    );
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

    expect(orphans, `tags reference IDs missing from ${SPEC}`).toEqual([]);
  });
});
