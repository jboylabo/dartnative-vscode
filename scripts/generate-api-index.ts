/**
 * Generates resources/dartnative-api.json from DartNative's *public* sources:
 *  - docs/widgets.md (official widget reference table) -> widget completion/hover data
 *  - actual usage of Icon classes inside playground/tutorials/plugin examples -> icon completion data
 *
 * DartNative itself is closed-source (see docs/RESEARCH.md §6.1), so nothing here is
 * invented: every entry is either parsed straight out of the official docs, or an
 * identifier that was observed being used in real, runnable DartNative source code.
 *
 * Usage: pnpm run generate:api-index
 * Requires network access to github.com / raw.githubusercontent.com.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = "DartNative/dartnative";
const BRANCH = "main";
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;
const API_BASE = `https://api.github.com/repos/${REPO}`;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.join(__dirname, "..", "resources", "dartnative-api.json");

const ICON_CLASSES = [
  "MaterialSymbolsRounded",
  "MaterialSymbolsSharp",
  "MaterialSymbolsOutlined",
  "CupertinoIcons",
] as const;
type IconClassName = (typeof ICON_CLASSES)[number];

interface WidgetEntry {
  name: string;
  status: "stable" | "partial";
  note: string;
  section: string;
}

interface IconEntry {
  name: string;
  verified: boolean;
  sourceFiles: string[];
  derivedFrom?: IconClassName;
}

interface ApiIndex {
  generatedAt: string;
  source: {
    repo: string;
    commit: string;
    branch: string;
    docs: string[];
    scannedDartFileCount: number;
  };
  widgets: WidgetEntry[];
  icons: Record<IconClassName, IconEntry[]>;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "dartnative-vscode-poc" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "dartnative-vscode-poc",
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

/**
 * Parses `| \`Name\` | ✅|⚠️ | notes... |` rows out of docs/widgets.md.
 * Section headers are markdown `## Heading` lines above each table.
 */
function parseWidgetsMd(markdown: string): WidgetEntry[] {
  const widgets: WidgetEntry[] = [];
  let section = "General";
  const rowRe = /^\|\s*(.+?)\s*\|\s*(✅|⚠️|❌)\s*\|(.*)\|\s*$/;

  for (const line of markdown.split("\n")) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      section = heading[1].trim();
      continue;
    }
    const match = line.match(rowRe);
    if (!match) continue;
    const [, nameCell, statusEmoji, notesCell] = match;
    if (nameCell.toLowerCase().includes("widget") && nameCell.includes("Status")) {
      continue; // header row
    }
    if (statusEmoji === "❌") continue; // unsupported widgets are not useful completions

    // A name cell can list more than one widget, e.g. "`Align` / `Center`".
    const names = [...nameCell.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    if (names.length === 0) continue;

    const status: WidgetEntry["status"] = statusEmoji === "✅" ? "stable" : "partial";
    const note = notesCell.trim();
    for (const name of names) {
      // Skip API references that aren't widget class names (e.g. `findRenderObject()`).
      if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) continue;
      widgets.push({ name, status, note, section });
    }
  }

  // De-duplicate (a widget can legitimately appear in more than one table row).
  const seen = new Set<string>();
  return widgets.filter((w) => {
    const key = `${w.name}|${w.section}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function listDartFiles(): Promise<string[]> {
  const tree = await fetchJson<{ tree: { path: string; type: string }[] }>(
    `${API_BASE}/git/trees/${BRANCH}?recursive=true`,
  );
  return tree.tree
    .filter((entry) => entry.type === "blob" && entry.path.endsWith(".dart"))
    .filter(
      (entry) =>
        entry.path.startsWith("playground/") ||
        entry.path.startsWith("tutorials/") ||
        entry.path.startsWith("plugins/"),
    )
    .map((entry) => entry.path);
}

async function collectIconUsages(
  dartFiles: string[],
): Promise<{ icons: Record<IconClassName, Map<string, Set<string>>>; scanned: number }> {
  const icons: Record<IconClassName, Map<string, Set<string>>> = {
    MaterialSymbolsRounded: new Map(),
    MaterialSymbolsSharp: new Map(),
    MaterialSymbolsOutlined: new Map(),
    CupertinoIcons: new Map(),
  };
  const usageRe = new RegExp(`(${ICON_CLASSES.join("|")})\\.([A-Za-z_][A-Za-z0-9_]*)`, "g");

  let scanned = 0;
  const concurrency = 8;
  let cursor = 0;

  async function worker() {
    while (cursor < dartFiles.length) {
      const filePath = dartFiles[cursor++];
      let content: string;
      try {
        content = await fetchText(`${RAW_BASE}/${filePath}`);
      } catch {
        continue; // file may have moved/been removed between tree listing and fetch
      }
      scanned++;
      for (const match of content.matchAll(usageRe)) {
        const [, className, identifier] = match as unknown as [string, IconClassName, string];
        // Filters out placeholder text like `MaterialSymbolsRounded.X` used in prose comments.
        if (identifier.length < 2) continue;
        const perClass = icons[className];
        if (!perClass.has(identifier)) perClass.set(identifier, new Set());
        perClass.get(identifier)!.add(filePath);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return { icons, scanned };
}

function buildIconIndex(
  usages: Record<IconClassName, Map<string, Set<string>>>,
): Record<IconClassName, IconEntry[]> {
  const result: Record<IconClassName, IconEntry[]> = {
    MaterialSymbolsRounded: [],
    MaterialSymbolsSharp: [],
    MaterialSymbolsOutlined: [],
    CupertinoIcons: [],
  };

  for (const className of ICON_CLASSES) {
    for (const [name, files] of usages[className]) {
      result[className].push({ name, verified: true, sourceFiles: [...files].sort() });
    }
    result[className].sort((a, b) => a.name.localeCompare(b.name));
  }

  // Per docs/widgets.md: "The same icon name works across MaterialSymbolsRounded,
  // MaterialSymbolsSharp and MaterialSymbolsOutlined." Names actually observed only
  // under Rounded are mirrored to Sharp/Outlined, but marked unverified + derived so
  // consumers can tell the difference from an identifier seen firsthand.
  for (const target of ["MaterialSymbolsSharp", "MaterialSymbolsOutlined"] as const) {
    const existingNames = new Set(result[target].map((e) => e.name));
    for (const entry of result.MaterialSymbolsRounded) {
      if (existingNames.has(entry.name)) continue;
      result[target].push({
        name: entry.name,
        verified: false,
        sourceFiles: [],
        derivedFrom: "MaterialSymbolsRounded",
      });
    }
    result[target].sort((a, b) => a.name.localeCompare(b.name));
  }

  return result;
}

async function main() {
  console.log(`Fetching docs/widgets.md from ${REPO}@${BRANCH}...`);
  const widgetsMd = await fetchText(`${RAW_BASE}/docs/widgets.md`);
  const widgets = parseWidgetsMd(widgetsMd);
  console.log(`Parsed ${widgets.length} widget entries.`);

  console.log("Listing .dart files under playground/, tutorials/, plugins/...");
  const dartFiles = await listDartFiles();
  console.log(`Found ${dartFiles.length} candidate files. Scanning for icon usage...`);
  const { icons: usages, scanned } = await collectIconUsages(dartFiles);
  const icons = buildIconIndex(usages);
  for (const className of ICON_CLASSES) {
    const verifiedCount = icons[className].filter((e) => e.verified).length;
    console.log(`  ${className}: ${verifiedCount} verified, ${icons[className].length} total`);
  }

  const commit = await fetchJson<{ sha: string }>(`${API_BASE}/commits/${BRANCH}`);

  const index: ApiIndex = {
    generatedAt: new Date().toISOString(),
    source: {
      repo: `https://github.com/${REPO}`,
      commit: commit.sha,
      branch: BRANCH,
      docs: ["docs/widgets.md"],
      scannedDartFileCount: scanned,
    },
    widgets,
    icons,
  };

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(index, null, 2) + "\n", "utf8");
  console.log(`Wrote ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
