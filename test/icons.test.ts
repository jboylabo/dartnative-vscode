import { describe, expect, it } from "vitest";
import { searchIcons } from "../src/core/iconSearch";
import { apiIndex } from "../src/completion/apiIndex";

describe("searchIcons", () => {
  it.each(["home", "settings", "person", "camera", "search"])(
    "finds a real DartNative icon for keyword %s (sdd.md example)",
    (keyword) => {
      const results = searchIcons(keyword);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.verified)).toBe(true);
    },
  );

  it("returns nothing for an empty query", () => {
    expect(searchIcons("")).toEqual([]);
    expect(searchIcons("   ")).toEqual([]);
  });

  it("returns nothing for a query with no matches", () => {
    expect(searchIcons("zzz_not_a_real_icon_zzz")).toEqual([]);
  });

  it("ranks verified icons before derived (unverified) ones", () => {
    const results = searchIcons("home");
    const firstUnverifiedIndex = results.findIndex((r) => !r.verified);
    const firstVerifiedIndex = results.findIndex((r) => r.verified);
    if (firstUnverifiedIndex !== -1 && firstVerifiedIndex !== -1) {
      expect(firstVerifiedIndex).toBeLessThan(firstUnverifiedIndex);
    }
  });

  it("resolves the home/house PoC synonym in both directions", () => {
    const forHome = searchIcons("home").map((r) => r.name);
    const forHouse = searchIcons("house").map((r) => r.name);
    expect(forHome).toContain("house");
    expect(forHouse).toContain("home");
  });

  it("every result's expression is `ClassName.identifier` and resolves in the index", () => {
    for (const keyword of ["home", "camera", "person"]) {
      for (const match of searchIcons(keyword)) {
        expect(match.expression).toBe(`${match.className}.${match.name}`);
        const entry = apiIndex.icons[match.className].find((e) => e.name === match.name);
        expect(entry).toBeDefined();
      }
    }
  });
});

describe("dartnative-api.json icon data", () => {
  it("only marks MaterialSymbolsSharp/Outlined entries as derived, never CupertinoIcons or Rounded", () => {
    for (const entry of apiIndex.icons.CupertinoIcons) {
      expect(entry.verified).toBe(true);
    }
    for (const entry of apiIndex.icons.MaterialSymbolsRounded) {
      expect(entry.verified).toBe(true);
    }
  });
});
