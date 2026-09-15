import { lineIndentAt, reindentContinuationLines } from "./textIndent";
import type { WrapTarget } from "./wrapTarget";
import type { EnclosingClass } from "./enclosingClass";
import type { ExtractEdits } from "./extractToClass";

const METHOD_BODY_INDENT = "    ";

/**
 * Generates a new private `Widget` method containing `target`'s expression,
 * inserted as the last member of `enclosingClass`, and replaces the usage
 * site with a call to it. Simple text extraction only — see extractToClass.ts
 * for the same documented no-capture-analysis limitation.
 */
export function buildExtractToMethodEdits(
  fullText: string,
  target: WrapTarget,
  enclosingClass: EnclosingClass,
  methodName: string,
): ExtractEdits {
  const extracted = fullText.slice(target.start, target.end);
  const usageIndent = lineIndentAt(fullText, target.start);
  const reindented = reindentContinuationLines(extracted, usageIndent, METHOD_BODY_INDENT);

  const methodText =
    `\n  Widget ${methodName}(BuildContext context) {\n` + `    return ${reindented};\n` + `  }\n`;

  return {
    usageReplacement: { start: target.start, end: target.end, text: `${methodName}(context)` },
    insertion: { at: enclosingClass.bodyEnd - 1, text: methodText },
  };
}

/** First unused `_buildWidget`, `_buildWidget2`, ... within the enclosing class's own body text. */
export function suggestMethodName(classBodyText: string, base = "_buildWidget"): string {
  if (!new RegExp(`\\b${base}\\b`).test(classBodyText)) return base;
  let i = 2;
  while (new RegExp(`\\b${base}${i}\\b`).test(classBodyText)) i++;
  return `${base}${i}`;
}
