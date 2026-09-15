/** Pure, vscode-independent check — unit tested directly. */
export function detectDartNativeDependency(pubspecYaml: string): boolean {
  return /^\s*dartnative\s*:/m.test(pubspecYaml);
}
