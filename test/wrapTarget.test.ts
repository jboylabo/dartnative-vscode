import { describe, expect, it } from "vitest";
import { findWrapTarget } from "../src/core/wrapTarget";

describe("findWrapTarget", () => {
  it("finds a simple widget call", () => {
    const text = "Text('hi')";
    const target = findWrapTarget(text, text.indexOf("hi"));
    expect(target?.identifier).toBe("Text");
    expect(target?.start).toBe(0);
    expect(target?.end).toBe(text.length);
  });

  it("picks the smallest enclosing call for a nested cursor", () => {
    const text = "Padding(child: Text('hi'))";
    const target = findWrapTarget(text, text.indexOf("hi'"));
    expect(target?.identifier).toBe("Text");
  });

  it("picks the outer call when the cursor is outside the nested call's span", () => {
    const text = "Padding(child: Text('hi'))";
    const target = findWrapTarget(text, text.indexOf("child"));
    expect(target?.identifier).toBe("Padding");
  });

  it("excludes lowercase-identifier calls", () => {
    const text = "foo('x')";
    expect(findWrapTarget(text, text.indexOf("x"))).toBeUndefined();
  });

  it("returns undefined when the cursor is not inside any call", () => {
    const text = "final x = 5;";
    expect(findWrapTarget(text, 3)).toBeUndefined();
  });

  it("is not confused by a ')' inside a string argument", () => {
    const text = "Text('a)b')";
    const target = findWrapTarget(text, text.indexOf("a)b"));
    expect(target?.identifier).toBe("Text");
    expect(target?.end).toBe(text.length);
  });

  it("excludes Foo.Bar(...) named-constructor-style calls", () => {
    const text = "Foo.Bar(1)";
    expect(findWrapTarget(text, text.indexOf("1"))).toBeUndefined();
  });

  it("falls through to the enclosing widget call for a lowercase named constructor", () => {
    const text = "Padding(padding: EdgeInsets.all(8), child: Text('x'))";
    const target = findWrapTarget(text, text.indexOf("8"));
    expect(target?.identifier).toBe("Padding");
  });
});
