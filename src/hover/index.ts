import * as vscode from "vscode";
import { apiIndex } from "../completion/apiIndex";
import { hoverForToken } from "../core/hoverLookup";

function toMarkdown(content: { title: string; lines: string[] }): vscode.MarkdownString {
  const md = new vscode.MarkdownString();
  md.appendMarkdown(`**${content.title}**`);
  for (const line of content.lines) {
    md.appendMarkdown(`\n\n${line}`);
  }
  md.appendMarkdown(
    `\n\n---\n出典: [DartNative/dartnative@${apiIndex.source.commit.slice(0, 7)}](${apiIndex.source.repo})`,
  );
  return md;
}

const TOKEN_RE = /[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)?/;

export function registerHover(): vscode.Disposable {
  const provider: vscode.HoverProvider = {
    provideHover(document, position) {
      const range = document.getWordRangeAtPosition(position, TOKEN_RE);
      if (!range) return undefined;
      const token = document.getText(range);
      const content = hoverForToken(token);
      if (!content) return undefined;
      return new vscode.Hover(toMarkdown(content), range);
    },
  };

  return vscode.languages.registerHoverProvider({ language: "dart" }, provider);
}
