import { describe, expect, it } from "vitest";
import { hoverForToken } from "../src/core/hoverLookup";

describe("hoverForToken", () => {
  it("describes a widget by plain name", () => {
    const content = hoverForToken("Container");
    expect(content).toBeDefined();
    expect(content!.title).toBe("Container");
  });

  it("describes a verified icon by ClassName.member", () => {
    const content = hoverForToken("MaterialSymbolsRounded.home");
    expect(content).toBeDefined();
    expect(content!.title).toContain("MaterialSymbolsRounded.home");
    expect(content!.lines.join(" ")).toMatch(/確認済み/);
  });

  it("flags a derived (unverified) icon as such", () => {
    const content = hoverForToken("MaterialSymbolsSharp.home");
    expect(content).toBeDefined();
    expect(content!.lines.join(" ")).toMatch(/複製/);
  });

  it("returns undefined for a token that is neither a known widget nor icon", () => {
    expect(hoverForToken("NotARealThing")).toBeUndefined();
    expect(hoverForToken("NotAnIconClass.home")).toBeUndefined();
  });
});
