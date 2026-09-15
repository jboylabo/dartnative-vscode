import { describe, expect, it } from "vitest";
import { findWrapTarget } from "../src/core/wrapTarget";
import { findEnclosingClass } from "../src/core/enclosingClass";
import { buildExtractToMethodEdits, suggestMethodName } from "../src/core/extractToMethod";

const FIXTURE = `class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Text('hi');
  }
}

class Other extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container();
  }
}
`;

describe("buildExtractToMethodEdits", () => {
  it("generates a private build method and replaces the usage site", () => {
    const target = findWrapTarget(FIXTURE, FIXTURE.indexOf("Text"))!;
    const enclosingClass = findEnclosingClass(FIXTURE, target.start)!;

    const edits = buildExtractToMethodEdits(FIXTURE, target, enclosingClass, "_buildHeader");

    expect(edits.usageReplacement).toEqual({ start: target.start, end: target.end, text: "_buildHeader(context)" });
    expect(edits.insertion.text).toBe(
      "\n  Widget _buildHeader(BuildContext context) {\n    return Text('hi');\n  }\n",
    );
  });

  it("inserts as the last member of the correct enclosing class, not the other one", () => {
    const targetInMyWidget = findWrapTarget(FIXTURE, FIXTURE.indexOf("Text"))!;
    const myWidgetClass = findEnclosingClass(FIXTURE, targetInMyWidget.start)!;
    const editsForMyWidget = buildExtractToMethodEdits(FIXTURE, targetInMyWidget, myWidgetClass, "_buildHeader");
    expect(editsForMyWidget.insertion.at).toBe(myWidgetClass.bodyEnd - 1);

    const targetInOther = findWrapTarget(FIXTURE, FIXTURE.indexOf("Container"))!;
    const otherClass = findEnclosingClass(FIXTURE, targetInOther.start)!;
    expect(otherClass.name).toBe("Other");
    const editsForOther = buildExtractToMethodEdits(FIXTURE, targetInOther, otherClass, "_buildBody");
    expect(editsForOther.insertion.at).toBe(otherClass.bodyEnd - 1);
    expect(editsForOther.insertion.at).not.toBe(editsForMyWidget.insertion.at);
  });
});

describe("suggestMethodName", () => {
  it("returns the base name when unused", () => {
    expect(suggestMethodName("{ }")).toBe("_buildWidget");
  });

  it("returns a numbered suffix on collision within the same class body only", () => {
    const classBody = "{ Widget _buildWidget(BuildContext context) => Text('x'); }";
    expect(suggestMethodName(classBody)).toBe("_buildWidget2");
  });
});
