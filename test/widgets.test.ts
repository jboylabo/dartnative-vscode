import { describe, expect, it } from "vitest";
import { searchWidgets } from "../src/core/widgetSearch";
import { apiIndex } from "../src/completion/apiIndex";

describe("searchWidgets", () => {
  it("finds ListTile for a partial query", () => {
    const results = searchWidgets("ListT");
    expect(results.map((w) => w.name)).toContain("ListTile");
  });

  it("ranks prefix matches before mid-string matches", () => {
    const results = searchWidgets("Text");
    expect(results[0].name.toLowerCase().startsWith("text")).toBe(true);
  });

  it("returns nothing for an empty query", () => {
    expect(searchWidgets("")).toEqual([]);
  });

  it("returns nothing for a query with no matches", () => {
    expect(searchWidgets("NotARealDartNativeWidget")).toEqual([]);
  });
});

describe("dartnative-api.json widget data", () => {
  it("was generated from docs/widgets.md and has a non-trivial number of widgets", () => {
    expect(apiIndex.source.docs).toContain("docs/widgets.md");
    expect(apiIndex.widgets.length).toBeGreaterThan(50);
  });

  it("includes the widgets StatelessWidget/StatefulWidget snippets rely on", () => {
    const names = apiIndex.widgets.map((w) => w.name);
    expect(names).toContain("Container");
  });
});
