import * as vscode from "vscode";
import { detectDartNativeDependency } from "./core/pubspec";

async function readPubspec(folderUri: vscode.Uri): Promise<string | undefined> {
  try {
    const bytes = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(folderUri, "pubspec.yaml"));
    return Buffer.from(bytes).toString("utf8");
  } catch {
    return undefined;
  }
}

/**
 * Widget/Icon completion is DartNative-specific and would be noise in a plain
 * Flutter project, so it only activates when a workspace folder's pubspec.yaml
 * declares a `dartnative:` dependency. With no workspace folder open, or no
 * pubspec.yaml found anywhere, we fail open (no evidence either way) — this
 * also covers running a single loose .dart file. Snippets (stl/stf) are
 * always available regardless, since they are harmless in any Dart project.
 */
export async function isDartNativeWorkspace(): Promise<boolean> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  let sawAnyPubspec = false;
  for (const folder of folders) {
    const text = await readPubspec(folder.uri);
    if (text === undefined) continue;
    sawAnyPubspec = true;
    if (detectDartNativeDependency(text)) return true;
  }
  return !sawAnyPubspec;
}
