import * as vscode from "vscode";
import { findWrapTarget } from "../core/wrapTarget";
import { findEnclosingClass } from "../core/enclosingClass";
import { buildExtractToClassEdits, suggestClassName, type ExtractEdits } from "../core/extractToClass";
import { buildExtractToMethodEdits, suggestMethodName } from "../core/extractToMethod";

const EXTRACT_CLASS_COMMAND = "dartnative.extractToWidgetClass";
const EXTRACT_METHOD_COMMAND = "dartnative.extractToMethod";

async function applyEdits(uri: vscode.Uri, document: vscode.TextDocument, edits: ExtractEdits): Promise<void> {
  const wsEdit = new vscode.WorkspaceEdit();
  wsEdit.replace(
    uri,
    new vscode.Range(document.positionAt(edits.usageReplacement.start), document.positionAt(edits.usageReplacement.end)),
    edits.usageReplacement.text,
  );
  wsEdit.insert(uri, document.positionAt(edits.insertion.at), edits.insertion.text);
  await vscode.workspace.applyEdit(wsEdit);
}

export function registerExtractWidget(): vscode.Disposable {
  const provider: vscode.CodeActionProvider = {
    provideCodeActions(document, range, context) {
      if (context.only && !context.only.contains(vscode.CodeActionKind.RefactorExtract)) return [];

      const text = document.getText();
      const target = findWrapTarget(text, document.offsetAt(range.start));
      if (!target) return [];
      if (!findEnclosingClass(text, target.start)) return [];

      const toClass = new vscode.CodeAction("Extract to a new Widget class", vscode.CodeActionKind.RefactorExtract);
      toClass.command = {
        command: EXTRACT_CLASS_COMMAND,
        title: "Extract to a new Widget class",
        arguments: [document.uri, target.start, target.end],
      };

      const toMethod = new vscode.CodeAction("Extract to a new method", vscode.CodeActionKind.RefactorExtract);
      toMethod.command = {
        command: EXTRACT_METHOD_COMMAND,
        title: "Extract to a new method",
        arguments: [document.uri, target.start, target.end],
      };

      return [toClass, toMethod];
    },
  };

  const providerDisposable = vscode.languages.registerCodeActionsProvider(
    { language: "dart" },
    provider,
    { providedCodeActionKinds: [vscode.CodeActionKind.RefactorExtract] },
  );

  const classCmd = vscode.commands.registerCommand(
    EXTRACT_CLASS_COMMAND,
    async (uri: vscode.Uri, start: number, end: number) => {
      const document = await vscode.workspace.openTextDocument(uri);
      const text = document.getText();
      const target = findWrapTarget(text, start);
      const enclosingClass = target ? findEnclosingClass(text, target.start) : undefined;
      if (!target || !enclosingClass || target.start !== start || target.end !== end) {
        vscode.window.showErrorMessage("DartNative: the code changed — please retry Extract to Widget class.");
        return;
      }
      const name = await vscode.window.showInputBox({
        prompt: "New widget class name",
        value: suggestClassName(text),
        validateInput: (v) => (/^[A-Z][A-Za-z0-9_]*$/.test(v) ? undefined : "Must be a PascalCase class name"),
      });
      if (!name) return;
      await applyEdits(uri, document, buildExtractToClassEdits(text, target, enclosingClass, name));
    },
  );

  const methodCmd = vscode.commands.registerCommand(
    EXTRACT_METHOD_COMMAND,
    async (uri: vscode.Uri, start: number, end: number) => {
      const document = await vscode.workspace.openTextDocument(uri);
      const text = document.getText();
      const target = findWrapTarget(text, start);
      const enclosingClass = target ? findEnclosingClass(text, target.start) : undefined;
      if (!target || !enclosingClass || target.start !== start || target.end !== end) {
        vscode.window.showErrorMessage("DartNative: the code changed — please retry Extract to method.");
        return;
      }
      const classBodyText = text.slice(enclosingClass.bodyStart, enclosingClass.bodyEnd);
      const name = await vscode.window.showInputBox({
        prompt: "New method name",
        value: suggestMethodName(classBodyText),
        validateInput: (v) => (/^_?[a-zA-Z][A-Za-z0-9_]*$/.test(v) ? undefined : "Must be a valid Dart identifier"),
      });
      if (!name) return;
      await applyEdits(uri, document, buildExtractToMethodEdits(text, target, enclosingClass, name));
    },
  );

  return vscode.Disposable.from(providerDisposable, classCmd, methodCmd);
}
