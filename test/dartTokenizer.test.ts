import { describe, expect, it } from "vitest";
import { findBracketPairs } from "../src/core/dartTokenizer";

describe("findBracketPairs", () => {
  it("matches simple and nested parens", () => {
    const { matchForward } = findBracketPairs("(a(b)c)");
    expect(matchForward.get(0)).toBe(6);
    expect(matchForward.get(2)).toBe(4);
  });

  it("ignores a ')' inside a single-quoted string", () => {
    const { matchForward } = findBracketPairs("foo('a)b')");
    expect(matchForward.get(3)).toBe(9);
  });

  it("ignores a ')' inside a double-quoted string", () => {
    const { matchForward } = findBracketPairs('foo("a)b")');
    expect(matchForward.get(3)).toBe(9);
  });

  it("ignores a ')' inside a raw string", () => {
    const { matchForward } = findBracketPairs("foo(r'a)b')");
    expect(matchForward.get(3)).toBe(10);
  });

  it("ignores a ')' inside a multi-line triple-quoted string", () => {
    const text = "foo('''a\n)\nb''')";
    const { matchForward } = findBracketPairs(text);
    expect(matchForward.get(3)).toBe(text.length - 1);
  });

  it("ignores a ')' inside a // line comment", () => {
    const { matchForward } = findBracketPairs("(a) // )");
    expect(matchForward.size).toBe(1);
    expect(matchForward.get(0)).toBe(2);
  });

  it("ignores a ')' inside a block comment", () => {
    const { matchForward } = findBracketPairs("(a) /* ) */ (b)");
    expect(matchForward.size).toBe(2);
    expect(matchForward.get(0)).toBe(2);
    expect(matchForward.get(12)).toBe(14);
  });

  it("handles nested block comments", () => {
    const text = "/* outer /* inner */ still */ (a)";
    const { matchForward } = findBracketPairs(text);
    expect(matchForward.size).toBe(1);
    const openIdx = text.indexOf("(a)");
    expect(matchForward.get(openIdx)).toBe(openIdx + 2);
  });

  it("does not throw on an extra unmatched closer", () => {
    expect(() => findBracketPairs("(a))")).not.toThrow();
    expect(findBracketPairs("(a))").matchForward.get(0)).toBe(2);
  });

  it("does not throw on a mismatched bracket pair", () => {
    expect(() => findBracketPairs("(a]")).not.toThrow();
    expect(findBracketPairs("(a]").matchForward.size).toBe(0);
  });
});
