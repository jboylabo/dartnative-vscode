import { describe, expect, it } from "vitest";
import { findWrapTarget } from "../src/core/wrapTarget";
import { buildWrapReplacement } from "../src/core/wrapEdit";

function target(fullText: string, needle: string) {
  const t = findWrapTarget(fullText, fullText.indexOf(needle));
  if (!t) throw new Error(`no wrap target found around "${needle}"`);
  return t;
}

describe("buildWrapReplacement", () => {
  it("wraps a single-line expression with Container (child-style)", () => {
    const fullText = "      child: Text('hi'),\n";
    const replacement = buildWrapReplacement(fullText, target(fullText, "hi'"), "Container");
    expect(replacement).toBe("Container(\n        child: Text('hi'),\n      )");

    const t = target(fullText, "hi'");
    const spliced = fullText.slice(0, t.start) + replacement + fullText.slice(t.end);
    expect(spliced).toBe("      child: Container(\n        child: Text('hi'),\n      ),\n");
  });

  it("wraps with Column using children: [...] style", () => {
    const fullText = "      child: Text('hi'),\n";
    const replacement = buildWrapReplacement(fullText, target(fullText, "hi'"), "Column");
    expect(replacement).toBe("Column(\n        children: [\n          Text('hi'),\n        ],\n      )");
  });

  it("wraps with Row using children: [...] style", () => {
    const fullText = "      child: Text('hi'),\n";
    const replacement = buildWrapReplacement(fullText, target(fullText, "hi'"), "Row");
    expect(replacement).toBe("Row(\n        children: [\n          Text('hi'),\n        ],\n      )");
  });

  it("wraps with Padding and includes the default padding argument", () => {
    const fullText = "      child: Text('hi'),\n";
    const replacement = buildWrapReplacement(fullText, target(fullText, "hi'"), "Padding");
    expect(replacement).toBe(
      "Padding(\n        padding: const EdgeInsets.all(8.0),\n        child: Text('hi'),\n      )",
    );
  });

  it("reindents a multi-line original expression by one extra level for child-style wraps", () => {
    const fullText = "    child: Container(\n      color: Colors.red,\n    ),\n";
    const replacement = buildWrapReplacement(fullText, target(fullText, "Container"), "Center");
    expect(replacement).toBe(
      "Center(\n      child: Container(\n        color: Colors.red,\n      ),\n    )",
    );
  });

  it("reindents a multi-line original expression by two extra levels for children-style wraps", () => {
    const fullText = "    child: Container(\n      color: Colors.red,\n    ),\n";
    const replacement = buildWrapReplacement(fullText, target(fullText, "Container"), "Column");
    expect(replacement).toBe(
      "Column(\n      children: [\n        Container(\n          color: Colors.red,\n        ),\n      ],\n    )",
    );
  });
});
