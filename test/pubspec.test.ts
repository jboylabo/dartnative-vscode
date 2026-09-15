import { describe, expect, it } from "vitest";
import { detectDartNativeDependency } from "../src/core/pubspec";

describe("detectDartNativeDependency", () => {
  it("detects a top-level dartnative dependency", () => {
    const yaml = `
name: my_app
dependencies:
  dartnative: ^1.0.0
  dartnative_ios: ^1.0.0
`;
    expect(detectDartNativeDependency(yaml)).toBe(true);
  });

  it("does not false-positive on a plain Flutter project", () => {
    const yaml = `
name: my_app
dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.2
`;
    expect(detectDartNativeDependency(yaml)).toBe(false);
  });

  it("does not false-positive on a package that merely mentions dartnative in a comment", () => {
    const yaml = `
# migrating away from dartnative eventually
dependencies:
  flutter:
    sdk: flutter
`;
    expect(detectDartNativeDependency(yaml)).toBe(false);
  });
});
