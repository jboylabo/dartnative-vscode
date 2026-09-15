import * as vscode from "vscode";
import { apiIndex, type WidgetEntry } from "./apiIndex";
import { searchWidgets } from "../core/widgetSearch";

function widgetDocs(widget: WidgetEntry): vscode.MarkdownString {
  const md = new vscode.MarkdownString();
  const statusLabel =
    widget.status === "stable" ? "✅ DartNativeで完全対応" : "⚠️ DartNativeで部分対応（注意点あり）";
  md.appendMarkdown(`**${statusLabel}** — _${widget.section}_`);
  if (widget.note) {
    md.appendMarkdown(`\n\n${widget.note}`);
  }
  md.appendMarkdown(
    `\n\n---\n出典: [docs/widgets.md](${apiIndex.source.repo}/blob/${apiIndex.source.commit}/docs/widgets.md)`,
  );
  return md;
}

const WORD_RE = /[A-Za-z_][A-Za-z0-9_]*$/;

export function registerWidgetCompletion(): vscode.Disposable {
  const provider: vscode.CompletionItemProvider = {
    provideCompletionItems(document, position) {
      const linePrefix = document.lineAt(position.line).text.slice(0, position.character);
      const wordMatch = linePrefix.match(WORD_RE);
      if (!wordMatch || wordMatch[0].length < 2) return undefined;
      const query = wordMatch[0];

      const matches = searchWidgets(query);
      if (matches.length === 0) return undefined;

      return matches.map((widget) => {
        const item = new vscode.CompletionItem(widget.name, vscode.CompletionItemKind.Class);
        item.detail = `DartNative Widget — ${widget.section}`;
        item.documentation = widgetDocs(widget);
        item.sortText = widget.status === "stable" ? `0_${widget.name}` : `1_${widget.name}`;
        return item;
      });
    },
  };

  const selector: vscode.DocumentSelector = { language: "dart" };
  return vscode.languages.registerCompletionItemProvider(selector, provider);
}
