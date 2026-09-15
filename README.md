# dartnative-vscode

*[日本語 README はこちら](jp_doc/README.md)*

A VS Code Extension PoC for [DartNative](https://github.com/DartNative/dartnative) (a native iOS/Android development framework written in Dart). It aims to fill the gaps in DartNative's code completion (widget/icon name completion, snippets).

See `docs/RESEARCH.md` for detailed research findings and `docs/PLAN.md` for the implementation plan (both bundled in this repository).

## Features

- **Snippets**: `stl` (StatelessWidget) / `stf` (StatefulWidget) — generates classes in the shape confirmed in real DartNative app source code (`snippets/dartnative.json`).
- **Widget completion**: Completes around 115 widget names generated from `docs/widgets.md` (DartNative's official widget reference), and shows support status (✅/⚠️) and notes on hover.
- **Icon completion**: Search for the actual DartNative icon class identifiers (`MaterialSymbolsRounded` / `MaterialSymbolsSharp` / `MaterialSymbolsOutlined` / `CupertinoIcons`) from words like `home`, `settings`, `person`, `camera`, `search`. Selecting a candidate inserts the correct code, e.g. `Icon(CupertinoIcons.house_fill)`, and automatically adds `import 'package:dartnative/dartnative.dart';` if it isn't already present.
- Widget/icon completion is only enabled when the open workspace's `pubspec.yaml` has a `dartnative:` dependency (to avoid false positives in plain Flutter projects). If `pubspec.yaml` isn't found, completion stays enabled. Snippets are always enabled.

Since DartNative is closed-source, icon identifiers only include ones actually confirmed to be used in real app code within DartNative's official repository (`playground/`, `tutorials/*/`, `plugins/*/example/`). This is not the full set (4,229 Material Symbols types × 3 styles, and about 1,240 CupertinoIcons types). See `docs/RESEARCH.md` for details.

## Setup

Use **pnpm** as the Node.js package manager (npm/yarn are not supported).

```bash
pnpm install
```

## Build

```bash
pnpm run build        # bundles src/extension.ts -> dist/extension.cjs with esbuild
pnpm run typecheck     # tsc --noEmit
```

## Testing

```bash
pnpm test
```

Pure logic that doesn't depend on the `vscode` API (`src/core/*.ts`: icon search, widget search, hover content resolution, pubspec detection) is unit-tested with Vitest. Integration tests against the VS Code Extension Host itself are out of scope, in line with the lightweight test environment requirement.

## Regenerating the API index (optional)

`resources/dartnative-api.json` is auto-generated from `DartNative/dartnative`'s official documentation and real app sources. To regenerate it locally (requires network access):

```bash
pnpm run generate:api-index
```

## Building the VSIX

```bash
pnpm run package
```

Rebuilds `dist/extension.cjs`, then uses `@vscode/vsce` to generate `dartnative-vscode-<version>.vsix` in the current directory (this does not publish to the Marketplace).

## Installing locally in VS Code

1. Generate the `.vsix` file with `pnpm run package` above.
2. Open the Extensions view in VS Code (`Cmd+Shift+X`), choose **Install from VSIX...** from the "…" menu in the top right, and select the generated `.vsix`.
3. Alternatively, install directly from the command line (if the `code` command is on your PATH):

   ```bash
   code --install-extension dartnative-vscode-0.0.1.vsix
   ```

4. After installing, open a `.dart` file in a DartNative project (one with a `dartnative:` dependency in `pubspec.yaml`) and confirm that typing `stl` / `stf` and pressing Tab expands the snippet. For icon completion, type a word like `home` inside `Icon(` or while typing a word, and check that it appears in the suggestions.
5. After verifying it works, uninstall by selecting the DartNative extension in the Extensions view and choosing "Uninstall".

### Prerequisites

For Dart syntax highlighting and providing the `dart` languageId, installing the [Dart-Code](https://marketplace.visualstudio.com/items?itemName=Dart-Code.dart-code) extension separately is recommended (this extension is designed to piggyback on the `dart` languageId, and does not bundle or require Dart-Code itself).

## Out of scope for now

Per the policy in `sdd/sdd.md`, the following are not implemented: Marketplace publishing / Language Server / Rust / a custom Dart parser / modifying the DartNative SDK / AI completion / billing / telemetry / auto-update / CI/CD.
