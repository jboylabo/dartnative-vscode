import * as vscode from "vscode";

const EXISTING_IMPORT_RE = /package:dartnative\/(dartnative|flutter_compat)\.dart/;

/**
 * DartNative widgets/icons require `import 'package:dartnative/dartnative.dart';`
 * (see docs/RESEARCH.md §6.2) — not `package:flutter/material.dart`. When a
 * completion inserts DartNative code into a file that doesn't import it yet,
 * this adds the import so the inserted code actually compiles.
 */
export function ensureDartNativeImport(document: vscode.TextDocument): vscode.TextEdit[] {
  if (EXISTING_IMPORT_RE.test(document.getText())) return [];
  return [
    vscode.TextEdit.insert(
      new vscode.Position(0, 0),
      "import 'package:dartnative/dartnative.dart';\n",
    ),
  ];
}
