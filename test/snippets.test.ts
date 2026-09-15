import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const snippets = JSON.parse(
  readFileSync(path.join(__dirname, "..", "snippets", "dartnative.json"), "utf8"),
);

describe("snippets/dartnative.json", () => {
  it("defines stl and stf prefixes", () => {
    const prefixes = Object.values(snippets).map((s: any) => s.prefix);
    expect(prefixes).toContain("stl");
    expect(prefixes).toContain("stf");
  });

  it("every snippet body extends a DartNative widget base class, not Flutter's", () => {
    for (const snippet of Object.values(snippets) as any[]) {
      const body = snippet.body.join("\n");
      expect(body).toMatch(/extends (StatelessWidget|State<)/);
      expect(body).not.toMatch(/package:flutter\//);
    }
  });

  it("stf snippet's build class matches the State<T> generic it declares", () => {
    const stf = Object.values(snippets).find((s: any) => s.prefix === "stf") as any;
    const body = stf.body.join("\n");
    expect(body).toContain("createState() => _${1:MyWidget}State();");
    expect(body).toContain("class _${1:MyWidget}State extends State<${1:MyWidget}>");
  });
});
