import { lineIndentAt, reindentContinuationLines } from "./textIndent";
import type { WrapTarget } from "./wrapTarget";

export type WrapWidgetName = "Column" | "Row" | "Center" | "Expanded" | "Padding" | "SizedBox" | "Container";

export const WRAP_WIDGET_NAMES: readonly WrapWidgetName[] = [
  "Column",
  "Row",
  "Center",
  "Expanded",
  "Padding",
  "SizedBox",
  "Container",
];

interface WrapSpec {
  style: "child" | "children";
  extraArgLines?: string[];
}

const WRAP_SPECS: Record<WrapWidgetName, WrapSpec> = {
  Column: { style: "children" },
  Row: { style: "children" },
  Center: { style: "child" },
  Expanded: { style: "child" },
  Padding: { style: "child", extraArgLines: ["padding: const EdgeInsets.all(8.0),"] },
  SizedBox: { style: "child" },
  Container: { style: "child" },
};

/**
 * Builds the replacement text for wrapping `target` with `wrapper`, correctly
 * reindented (2-space, Dart's canonical `dartfmt` width) relative to the
 * target's own source line — independent of the target's absolute nesting depth.
 */
export function buildWrapReplacement(fullText: string, target: WrapTarget, wrapper: WrapWidgetName): string {
  const spec = WRAP_SPECS[wrapper];
  const originalText = fullText.slice(target.start, target.end);
  const lineIndent = lineIndentAt(fullText, target.start);
  const bodyIndent = lineIndent + "  ";
  const closeIndent = lineIndent;
  const extraLines = (spec.extraArgLines ?? []).map((l) => bodyIndent + l);

  if (spec.style === "child") {
    const reindented = reindentContinuationLines(originalText, lineIndent, bodyIndent);
    return [`${wrapper}(`, ...extraLines, `${bodyIndent}child: ${reindented},`, `${closeIndent})`].join("\n");
  }

  const itemIndent = bodyIndent + "  ";
  const reindented = reindentContinuationLines(originalText, lineIndent, itemIndent);
  return [
    `${wrapper}(`,
    ...extraLines,
    `${bodyIndent}children: [`,
    `${itemIndent}${reindented},`,
    `${bodyIndent}],`,
    `${closeIndent})`,
  ].join("\n");
}
