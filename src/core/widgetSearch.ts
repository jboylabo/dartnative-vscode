import { apiIndex, type DartNativeApiIndex, type WidgetEntry } from "../completion/apiIndex";

/** Pure, vscode-independent search — unit tested directly. */
export function searchWidgets(
  rawQuery: string,
  index: DartNativeApiIndex = apiIndex,
  limit = 50,
): WidgetEntry[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];

  const matches = index.widgets.filter((w) => w.name.toLowerCase().includes(query));
  matches.sort((a, b) => {
    const aPrefix = a.name.toLowerCase().startsWith(query) ? 0 : 1;
    const bPrefix = b.name.toLowerCase().startsWith(query) ? 0 : 1;
    if (aPrefix !== bPrefix) return aPrefix - bPrefix;
    return a.name.localeCompare(b.name);
  });
  return matches.slice(0, limit);
}
