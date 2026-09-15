import { lineIndentAt, reindentContinuationLines } from "./textIndent";
import type { WrapTarget } from "./wrapTarget";
import type { EnclosingClass } from "./enclosingClass";

export interface ExtractEdits {
  usageReplacement: { start: number; end: number; text: string };
  insertion: { at: number; text: string };
}

const CLASS_BODY_INDENT = "    ";

/**
 * Generates a new top-level `StatelessWidget` class containing `target`'s
 * expression, inserted right after `enclosingClass`, and replaces the usage
 * site with a bare constructor call. Simple text extraction only — does not
 * analyze whether the extracted expression references local variables from
 * the enclosing scope (accepted, documented limitation; see plan).
 */
export function buildExtractToClassEdits(
  fullText: string,
  target: WrapTarget,
  enclosingClass: EnclosingClass,
  newClassName: string,
): ExtractEdits {
  const extracted = fullText.slice(target.start, target.end);
  const usageIndent = lineIndentAt(fullText, target.start);
  const reindented = reindentContinuationLines(extracted, usageIndent, CLASS_BODY_INDENT);

  const classText =
    `\nclass ${newClassName} extends StatelessWidget {\n` +
    `  const ${newClassName}({super.key});\n\n` +
    `  @override\n` +
    `  Widget build(BuildContext context) {\n` +
    `    return ${reindented};\n` +
    `  }\n` +
    `}\n`;

  return {
    usageReplacement: { start: target.start, end: target.end, text: `${newClassName}()` },
    insertion: { at: enclosingClass.bodyEnd, text: classText },
  };
}

/** First unused `${base}`, `${base}2`, `${base}3`, ... against the whole file (class names are global). */
export function suggestClassName(fullText: string, base = "ExtractedWidget"): string {
  if (!new RegExp(`\\b${base}\\b`).test(fullText)) return base;
  let i = 2;
  while (new RegExp(`\\b${base}${i}\\b`).test(fullText)) i++;
  return `${base}${i}`;
}
