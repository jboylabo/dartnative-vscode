import { describe, expect, it } from "vitest";
import { findEnclosingClass } from "../src/core/enclosingClass";

describe("findEnclosingClass", () => {
  it("resolves the correct class among multiple top-level classes", () => {
    const text = `
class MyWidget extends StatelessWidget {
  const MyWidget({super.key});

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
    expect(findEnclosingClass(text, text.indexOf("Text"))?.name).toBe("MyWidget");
    expect(findEnclosingClass(text, text.indexOf("Container"))?.name).toBe("Other");
  });

  it("resolves a State<T> subclass, not gated on the superclass name", () => {
    const text = `
class MyWidget extends StatefulWidget {
  @override
  State<MyWidget> createState() => _MyWidgetState();
}

class _MyWidgetState extends State<MyWidget> {
  @override
  Widget build(BuildContext context) {
    return Text('hi');
  }
}
`;
    expect(findEnclosingClass(text, text.indexOf("Text"))?.name).toBe("_MyWidgetState");
  });

  it("returns undefined outside any class", () => {
    const text = "void main() { runApp(MyApp()); }";
    expect(findEnclosingClass(text, text.indexOf("runApp"))).toBeUndefined();
  });
});
