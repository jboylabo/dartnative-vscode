import { findBracketPairs } from "./dartTokenizer";

export interface EnclosingClass {
  name: string;
  headerStart: number;
  bodyStart: number;
  bodyEnd: number;
}

const CLASS_HEADER_RE = /\bclass\s+([A-Za-z_][A-Za-z0-9_]*)\b[^{]*\{/g;

/**
 * Smallest enclosing `class Name ... { ... }` containing `offset` — not
 * restricted to `extends StatelessWidget`/`StatefulWidget`, since a cursor
 * inside a `State<T>` subclass's `build()` method must also resolve to its
 * own class. Each regex-found class header's `{` is cross-checked against the
 * tokenizer's brace index, so a `{` appearing inside a string/comment before
 * the real class body can never be mistaken for it.
 */
export function findEnclosingClass(text: string, offset: number): EnclosingClass | undefined {
  const { matchForward } = findBracketPairs(text);
  let best: EnclosingClass | undefined;
  let bestLength = Infinity;

  CLASS_HEADER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CLASS_HEADER_RE.exec(text))) {
    const openBrace = m.index + m[0].length - 1;
    const closeBrace = matchForward.get(openBrace);
    if (closeBrace === undefined) continue;
    if (offset < openBrace || offset > closeBrace) continue;

    const length = closeBrace - openBrace;
    if (length < bestLength) {
      bestLength = length;
      best = { name: m[1], headerStart: m.index, bodyStart: openBrace, bodyEnd: closeBrace + 1 };
    }
  }
  return best;
}
