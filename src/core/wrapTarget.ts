import { findBracketPairs } from "./dartTokenizer";

export interface WrapTarget {
  identifier: string;
  /** offset of the first char of the identifier */
  start: number;
  /** offset one past the matching ')' */
  end: number;
}

function scanIdentifierBackward(text: string, endExclusive: number): { start: number; name: string } | undefined {
  let i = endExclusive;
  while (i > 0 && /\s/.test(text[i - 1])) i--;
  const wordEnd = i;
  while (i > 0 && /[A-Za-z0-9_]/.test(text[i - 1])) i--;
  if (i === wordEnd) return undefined;
  return { start: i, name: text.slice(i, wordEnd) };
}

/**
 * Smallest enclosing `Identifier(...)` call where `Identifier` starts with an
 * uppercase letter and `offset` falls anywhere from the identifier's first
 * character through the matching ')' inclusive.
 *
 * v1 heuristic, by design: only bare `Identifier(` — NOT `Identifier.member(`
 * named-constructor calls (e.g. `Text.rich(...)`, `EdgeInsets.all(...)`), so
 * those fall through to whatever call encloses them, if any.
 */
export function findWrapTarget(text: string, offset: number): WrapTarget | undefined {
  const { matchForward } = findBracketPairs(text);
  let best: WrapTarget | undefined;
  let bestLength = Infinity;

  for (const [openIdx, closeIdx] of matchForward) {
    if (text[openIdx] !== "(") continue;
    const id = scanIdentifierBackward(text, openIdx);
    if (!id || !/^[A-Z]/.test(id.name)) continue;

    let j = id.start - 1;
    while (j >= 0 && /\s/.test(text[j])) j--;
    if (j >= 0 && text[j] === ".") continue;

    const rangeEnd = closeIdx + 1;
    if (offset < id.start || offset > rangeEnd) continue;

    const length = rangeEnd - id.start;
    if (length < bestLength) {
      bestLength = length;
      best = { identifier: id.name, start: id.start, end: rangeEnd };
    }
  }
  return best;
}
