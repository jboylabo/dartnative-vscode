# PLAN

`sdd/sdd.md` の指示に沿ったPoC実装計画。詳細な調査結果は `docs/RESEARCH.md` を参照。

## スコープ

- VS Code Extension（TypeScript, pnpm, `@vscode/vsce`）
- 対象言語: `dart`（`languageId: dart`。Dart-Code拡張などが登録しているものに相乗り）
- Language Server・Rust・Dart parser自作・Marketplace公開・CI/CDは行わない

## 実装順序

1. `docs/RESEARCH.md` — DartNative公式ドキュメント・実ソースの調査（完了）
2. `resources/dartnative-api.json` — `scripts/generate-api-index.ts` で生成するWidget/Icon APIインデックス
3. `snippets/dartnative.json` — `stl` (StatelessWidget) / `stf` (StatefulWidget)
4. `src/completion/apiIndex.ts` — `resources/dartnative-api.json` のロード・型定義（vscode非依存、テスト可能）
5. `src/completion/widgets.ts` — Widget名補完のロジック（vscode非依存部分）＋vscode配線
6. `src/completion/icons.ts` — Iconキーワード検索・補完ロジック（vscode非依存部分）＋vscode配線
7. `src/hover/index.ts` — Widget/IconにホバーしたときのMarkdown説明
8. `src/extension.ts` — `activate()` で上記を登録。`pubspec.yaml` にDartNative依存があるワークスペースでのみWidget/Icon補完を有効化
9. `test/*.test.ts` — Vitestによる単体テスト（vscode APIを使わないロジック部分）
10. ビルド設定（`tsconfig.json`, `esbuild.js`）、`package.json` のscripts整備
11. 検証: `pnpm install` → `pnpm build` → `pnpm test` → `pnpm exec vsce package` → ローカルVS Codeへインストールして動作確認
12. `.gitignore` にpnpm/ビルド成果物関連の除外を追記（ブランチ切り替え時の不要な差分防止）

## 非対応・既知の制限

- DartNativeはクローズドソースのため、Icon識別子は実際に動作するDartNativeアプリのソースコードから実地確認できたものに限定（全4,229＋約1,240種の完全な網羅ではない）。詳細は `docs/RESEARCH.md` §7。
- Widget補完はスニペットではなく識別子＋ホバー説明のみ（引数のプレースホルダー補完までは行わない）。
