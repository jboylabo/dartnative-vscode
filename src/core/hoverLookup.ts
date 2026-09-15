import { apiIndex, isIconClassName, type DartNativeApiIndex } from "../completion/apiIndex";

export interface HoverContent {
  title: string;
  lines: string[];
}

function splitLastDot(token: string): [string, string] | undefined {
  const i = token.lastIndexOf(".");
  if (i < 0) return undefined;
  return [token.slice(0, i), token.slice(i + 1)];
}

/** Pure, vscode-independent lookup — unit tested directly. */
export function hoverForToken(
  token: string,
  index: DartNativeApiIndex = apiIndex,
): HoverContent | undefined {
  const dotted = splitLastDot(token);
  if (dotted) {
    const [className, member] = dotted;
    if (!isIconClassName(className)) return undefined;
    const entry = index.icons[className].find((e) => e.name === member);
    if (!entry) return undefined;
    return {
      title: `Icon(${className}.${member})`,
      lines: [
        entry.verified
          ? "DartNative公式リポジトリの実使用コードで確認済みのアイコンです。"
          : `公式ドキュメントの仕様（同名がRounded/Sharp/Outlinedで共通）に基づき \`${entry.derivedFrom}\` から複製した名前です。実使用箇所は未確認です。`,
        entry.sourceFiles.length > 0 ? `参照: ${entry.sourceFiles.slice(0, 3).join(", ")}` : "",
      ].filter((l) => l.length > 0),
    };
  }

  const widget = index.widgets.find((w) => w.name === token);
  if (widget) {
    return {
      title: widget.name,
      lines: [
        `${widget.status === "stable" ? "✅ DartNativeで完全対応" : "⚠️ DartNativeで部分対応（注意点あり）"} — ${widget.section}`,
        widget.note,
      ].filter((l) => l.length > 0),
    };
  }

  return undefined;
}
