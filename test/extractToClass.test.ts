import { describe, expect, it } from "vitest";
import { findWrapTarget } from "../src/core/wrapTarget";
import { findEnclosingClass } from "../src/core/enclosingClass";
import { buildExtractToClassEdits, suggestClassName } from "../src/core/extractToClass";

const FIXTURE = `class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Text('hi');
  }
}

class Other extends StatelessWidget {}
`;

describe("buildExtractToClassEdits", () => {
  it("generates a StatelessWidget class and replaces the usage site", () => {
    const target = findWrapTarget(FIXTURE, FIXTURE.indexOf("Text"))!;
    const enclosingClass = findEnclosingClass(FIXTURE, target.start)!;

    const edits = buildExtractToClassEdits(FIXTURE, target, enclosingClass, "Extracted");

    expect(edits.usageReplacement).toEqual({ start: target.start, end: target.end, text: "Extracted()" });
    expect(edits.insertion.text).toBe(
      "\nclass Extracted extends StatelessWidget {\n" +
        "  const Extracted({super.key});\n\n" +
        "  @override\n" +
        "  Widget build(BuildContext context) {\n" +
        "    return Text('hi');\n" +
        "  }\n" +
        "}\n",
    );
  });

  it("inserts right after the enclosing class, not at end of file", () => {
    const target = findWrapTarget(FIXTURE, FIXTURE.indexOf("Text"))!;
    const enclosingClass = findEnclosingClass(FIXTURE, target.start)!;
    const edits = buildExtractToClassEdits(FIXTURE, target, enclosingClass, "Extracted");

    expect(edits.insertion.at).toBe(enclosingClass.bodyEnd);

    const spliced = FIXTURE.slice(0, edits.insertion.at) + edits.insertion.text + FIXTURE.slice(edits.insertion.at);
    const otherIdx = spliced.indexOf("class Other");
    const extractedIdx = spliced.indexOf("class Extracted");
    expect(extractedIdx).toBeGreaterThan(-1);
    expect(extractedIdx).toBeLessThan(otherIdx);
  });
});

describe("suggestClassName", () => {
  it("returns the base name when unused", () => {
    expect(suggestClassName("class Foo {}")).toBe("ExtractedWidget");
  });

  it("returns a numbered suffix on collision", () => {
    expect(suggestClassName("class ExtractedWidget extends StatelessWidget {}")).toBe("ExtractedWidget2");
  });
});
