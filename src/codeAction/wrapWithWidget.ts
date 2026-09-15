import * as vscode from "vscode";
import { findWrapTarget } from "../core/wrapTarget";
import { buildWrapReplacement, WRAP_WIDGET_NAMES } from "../core/wrapEdit";

export function registerWrapWithWidget(): vscode.Disposable {
  const provider: vscode.CodeActionProvider = {
    provideCodeActions(document, range, context) {
      if (context.only && !context.only.contains(vscode.CodeActionKind.RefactorRewrite)) return [];

      const text = document.getText();
      const target = findWrapTarget(text, document.offsetAt(range.start));
      if (!target) return [];

      const vsRange = new vscode.Range(document.positionAt(target.start), document.positionAt(target.end));

      return WRAP_WIDGET_NAMES.map((name) => {
        const action = new vscode.CodeAction(`Wrap with ${name}`, vscode.CodeActionKind.RefactorRewrite);
        action.edit = new vscode.WorkspaceEdit();
        action.edit.replace(document.uri, vsRange, buildWrapReplacement(text, target, name));
        return action;
      });
    },
  };

  return vscode.languages.registerCodeActionsProvider(
    { language: "dart" },
    provider,
    { providedCodeActionKinds: [vscode.CodeActionKind.RefactorRewrite] },
  );
}
