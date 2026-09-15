import * as vscode from "vscode";
import { registerWidgetCompletion } from "./completion/widgets";
import { registerIconCompletion } from "./completion/icons";
import { registerHover } from "./hover/index";
import { isDartNativeWorkspace } from "./workspace";

const OUTPUT_CHANNEL_NAME = "DartNative";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const output = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  context.subscriptions.push(output);

  const enabled = await isDartNativeWorkspace();
  if (!enabled) {
    output.appendLine(
      "pubspec.yaml was found but does not declare a `dartnative:` dependency — " +
        "Widget/Icon IntelliSense is disabled for this workspace (stl/stf snippets remain available).",
    );
    return;
  }

  context.subscriptions.push(registerWidgetCompletion());
  context.subscriptions.push(registerIconCompletion());
  context.subscriptions.push(registerHover());
  output.appendLine("DartNative Widget/Icon IntelliSense activated.");
}

export function deactivate(): void {}
