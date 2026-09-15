export interface BracketPairs {
  /** open-bracket offset -> matching close-bracket offset */
  matchForward: Map<number, number>;
  /** close-bracket offset -> matching open-bracket offset */
  matchBackward: Map<number, number>;
}

const OPEN_OF: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

/**
 * Single forward pass producing a bracket-pair index for ()[]{}, skipping over
 * string literals and comments so a bracket inside one never corrupts matching.
 * Not a real Dart tokenizer/parser — deliberately lightweight per this project's
 * no-parser scope (see sdd/sdd.md). Known limitation: string interpolation
 * (`${...}`) that reuses the enclosing string's quote character is not handled,
 * since string contents are treated as opaque once entered.
 */
export function findBracketPairs(text: string): BracketPairs {
  const matchForward = new Map<number, number>();
  const matchBackward = new Map<number, number>();
  const stack: Array<{ ch: string; idx: number }> = [];
  const n = text.length;
  let i = 0;

  while (i < n) {
    const c = text[i];

    if (c === "/" && text[i + 1] === "/") {
      const nl = text.indexOf("\n", i + 2);
      i = nl === -1 ? n : nl;
      continue;
    }

    if (c === "/" && text[i + 1] === "*") {
      let depth = 1;
      i += 2;
      while (i < n && depth > 0) {
        if (text[i] === "/" && text[i + 1] === "*") {
          depth++;
          i += 2;
        } else if (text[i] === "*" && text[i + 1] === "/") {
          depth--;
          i += 2;
        } else {
          i++;
        }
      }
      continue;
    }

    if ((c === "r" || c === "R") && (text[i + 1] === "'" || text[i + 1] === '"')) {
      const q = text[i + 1];
      const triple = text[i + 2] === q && text[i + 3] === q;
      const delim = triple ? q.repeat(3) : q;
      const start = i + 1 + delim.length;
      const end = text.indexOf(delim, start);
      i = end === -1 ? n : end + delim.length;
      continue;
    }

    if (c === "'" || c === '"') {
      const q = c;
      const triple = text[i + 1] === q && text[i + 2] === q;
      const delim = triple ? q.repeat(3) : q;
      i += delim.length;
      while (i < n) {
        if (text[i] === "\\") {
          i += 2;
          continue;
        }
        if (text.startsWith(delim, i)) {
          i += delim.length;
          break;
        }
        i++;
      }
      continue;
    }

    if (c === "(" || c === "[" || c === "{") {
      stack.push({ ch: c, idx: i });
      i++;
      continue;
    }
    if (c === ")" || c === "]" || c === "}") {
      const top = stack[stack.length - 1];
      if (top && top.ch === OPEN_OF[c]) {
        stack.pop();
        matchForward.set(top.idx, i);
        matchBackward.set(i, top.idx);
      }
      i++;
      continue;
    }

    i++;
  }

  return { matchForward, matchBackward };
}
