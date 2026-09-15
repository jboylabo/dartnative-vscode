/** Leading whitespace of the source line containing `offset`. */
export function lineIndentAt(text: string, offset: number): string {
  const lineStart = text.lastIndexOf("\n", offset - 1) + 1;
  let end = lineStart;
  while (end < text.length && (text[end] === " " || text[end] === "\t")) end++;
  return text.slice(lineStart, end);
}

/**
 * Reindents every line of `text` after the first by swapping a `fromIndent`
 * leading-whitespace prefix for `toIndent`. The first line is left untouched
 * (it continues whatever text preceded it on the same source line). A line
 * that doesn't start with the full `fromIndent` falls back to trimming its
 * own leading whitespace — a pragmatic best-effort, not a real formatter.
 */
export function reindentContinuationLines(text: string, fromIndent: string, toIndent: string): string {
  return text
    .split("\n")
    .map((line, i) => {
      if (i === 0) return line;
      const rest = line.startsWith(fromIndent) ? line.slice(fromIndent.length) : line.replace(/^[ \t]*/, "");
      return toIndent + rest;
    })
    .join("\n");
}
