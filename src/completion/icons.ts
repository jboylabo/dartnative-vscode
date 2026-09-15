import * as vscode from "vscode";
import { ICON_CLASSES, type IconClassName } from "./apiIndex";
import { searchIcons, membersOf, isInsideIconCallParen, type IconMatch } from "../core/iconSearch";
import { ensureDartNativeImport } from "../dartnativeImport";

const CLASS_DOT_WORD_RE = new RegExp(`(${ICON_CLASSES.join("|")})\\.([A-Za-z0-9_]*)$`);
const BARE_WORD_RE = /[A-Za-z_][A-Za-z0-9_]*$/;

function iconDocs(match: IconMatch): vscode.MarkdownString {
  const md = new vscode.MarkdownString();
  md.appendCodeblock(`Icon(${match.expression})`, "dart");
  if (match.verified) {
    md.appendMarkdown("DartNative公式リポジトリの実使用コードで確認済みのアイコンです。");
  } else {
    md.appendMarkdown(
      `公式ドキュメントの仕様（同名がRounded/Sharp/Outlinedで共通）に基づき \`${match.derivedFrom}\` から複製した名前です。実使用箇所は未確認です。`,
    );
  }
  return md;
}

export function registerIconCompletion(): vscode.Disposable {
  const memberProvider: vscode.CompletionItemProvider = {
    provideCompletionItems(document, position) {
      const linePrefix = document.lineAt(position.line).text.slice(0, position.character);
      const classDotMatch = linePrefix.match(CLASS_DOT_WORD_RE);
      if (!classDotMatch) return undefined;
      const className = classDotMatch[1] as IconClassName;
      return membersOf(className).map((entry) => {
        const item = new vscode.CompletionItem(entry.name, vscode.CompletionItemKind.EnumMember);
        item.detail = entry.verified ? "DartNative Icon (verified)" : "DartNative Icon (derived)";
        item.documentation = iconDocs({
          className,
          name: entry.name,
          expression: `${className}.${entry.name}`,
          verified: entry.verified,
          derivedFrom: entry.derivedFrom,
        });
        return item;
      });
    },
  };

  const keywordProvider: vscode.CompletionItemProvider = {
    provideCompletionItems(document, position) {
      const linePrefix = document.lineAt(position.line).text.slice(0, position.character);
      // Let the more specific member provider (triggered by ".") own `ClassName.<word>`.
      if (CLASS_DOT_WORD_RE.test(linePrefix)) return undefined;

      const wordMatch = linePrefix.match(BARE_WORD_RE);
      if (!wordMatch || wordMatch[0].length < 2) return undefined;
      const query = wordMatch[0];
      const wordStart = position.character - query.length;
      const range = new vscode.Range(position.line, wordStart, position.line, position.character);

      const matches = searchIcons(query);
      if (matches.length === 0) return undefined;

      const insideIconCall = isInsideIconCallParen(linePrefix.slice(0, wordStart));

      return matches.map((match) => {
        const insertText = insideIconCall ? match.expression : `Icon(${match.expression})`;
        const item = new vscode.CompletionItem(
          `Icon(${match.expression})`,
          vscode.CompletionItemKind.Constant,
        );
        item.filterText = `${query} ${match.name}`;
        item.sortText = match.verified ? `0_${match.name}` : `1_${match.name}`;
        item.detail = match.className;
        item.documentation = iconDocs(match);
        item.range = range;
        item.insertText = insertText;
        item.additionalTextEdits = ensureDartNativeImport(document);
        return item;
      });
    },
  };

  const selector: vscode.DocumentSelector = { language: "dart" };
  return vscode.Disposable.from(
    vscode.languages.registerCompletionItemProvider(selector, memberProvider, "."),
    // No explicit trigger characters: VS Code already calls providers as the
    // user continues typing a word, which is when we want keyword search
    // (e.g. "home", "camera") to kick in.
    vscode.languages.registerCompletionItemProvider(selector, keywordProvider),
  );
}
