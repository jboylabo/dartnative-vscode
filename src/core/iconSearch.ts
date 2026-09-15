import { apiIndex, ICON_CLASSES, type DartNativeApiIndex, type IconClassName } from "../completion/apiIndex";

/**
 * PoC-only convenience aliases (NOT part of DartNative's API). DartNative's own
 * `CupertinoIcons` names the home glyph `house`/`house_fill`, while
 * `MaterialSymbolsRounded` names it `home` — see docs/RESEARCH.md §6.5.
 */
const SEARCH_SYNONYMS: Record<string, string[]> = {
  home: ["house"],
  house: ["home"],
};

export interface IconMatch {
  className: IconClassName;
  name: string;
  /** e.g. "CupertinoIcons.house_fill" */
  expression: string;
  verified: boolean;
  derivedFrom?: IconClassName;
}

/** Pure, vscode-independent search — unit tested directly. */
export function searchIcons(
  rawQuery: string,
  index: DartNativeApiIndex = apiIndex,
  limit = 50,
): IconMatch[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];
  const keywords = [query, ...(SEARCH_SYNONYMS[query] ?? [])];

  const results: IconMatch[] = [];
  for (const className of ICON_CLASSES) {
    for (const entry of index.icons[className]) {
      const haystack = entry.name.toLowerCase();
      const spaced = haystack.replace(/_/g, " ");
      const isMatch = keywords.some((k) => haystack.includes(k) || spaced.includes(k));
      if (!isMatch) continue;
      results.push({
        className,
        name: entry.name,
        expression: `${className}.${entry.name}`,
        verified: entry.verified,
        derivedFrom: entry.derivedFrom,
      });
    }
  }

  results.sort((a, b) => {
    if (a.verified !== b.verified) return a.verified ? -1 : 1;
    const aPrefix = a.name.toLowerCase().startsWith(query) ? 0 : 1;
    const bPrefix = b.name.toLowerCase().startsWith(query) ? 0 : 1;
    if (aPrefix !== bPrefix) return aPrefix - bPrefix;
    return a.name.localeCompare(b.name);
  });

  return results.slice(0, limit);
}

/** Members of a single icon class — used for `CupertinoIcons.` style completion. */
export function membersOf(className: IconClassName, index: DartNativeApiIndex = apiIndex) {
  return index.icons[className];
}

/** Is the cursor sitting right after an unclosed `Icon(` on the current line? */
export function isInsideIconCallParen(linePrefixBeforeWord: string): boolean {
  return /Icon\(\s*[A-Za-z0-9_.]*$/.test(linePrefixBeforeWord);
}
