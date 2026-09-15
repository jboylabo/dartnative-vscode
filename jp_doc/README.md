# dartnative-vscode

*[English README is here](../README.md)*

[DartNative](https://github.com/DartNative/dartnative)（Dartで書くネイティブiOS/Android開発フレームワーク）向けの、VS Code Extension PoCです。DartNativeのコード補完が弱い部分（Widget名・Icon名の補完、スニペット）を補うことを目的としています。

詳しい調査結果は `docs/RESEARCH.md`、実装計画は `docs/PLAN.md` を参照してください（リポジトリ同梱のファイルです）。

## 機能

- **Snippet**: `stl`（StatelessWidget）/ `stf`（StatefulWidget）— DartNative実アプリのソースコードで確認した形のクラスを生成します（`snippets/dartnative.json`）。
- **Widget補完**: `docs/widgets.md`（DartNative公式のWidgetリファレンス）から生成した約115件のWidget名を補完し、ホバーで対応状況（✅/⚠️）と注記を表示します。
- **Icon補完**: `home` `settings` `person` `camera` `search` のような単語から、DartNativeの実際のIconクラス（`MaterialSymbolsRounded` / `MaterialSymbolsSharp` / `MaterialSymbolsOutlined` / `CupertinoIcons`）の識別子を検索して候補表示します。選択すると `Icon(CupertinoIcons.house_fill)` のような正しいコードが挿入され、`import 'package:dartnative/dartnative.dart';` が未追加なら自動で追記します。
- Widget/Icon補完は、開いているワークスペースの `pubspec.yaml` に `dartnative:` 依存がある場合のみ有効になります（プレーンなFlutterプロジェクトでの誤爆を避けるため）。`pubspec.yaml` が見つからない場合は有効のままです。スニペットは常に有効です。

DartNativeはクローズドソースのため、Icon識別子はDartNativeの公式リポジトリ内の実アプリコード（`playground/`, `tutorials/*/`, `plugins/*/example/`）から実際に使われているものだけを収録しています。全量（Material Symbols 4,229種 × 3スタイル、CupertinoIcons 約1,240種）ではありません。詳細は `docs/RESEARCH.md` を参照してください。

## セットアップ

Node.jsパッケージマネージャーには **pnpm** を使用します（npm/yarn不可）。

```bash
pnpm install
```

## ビルド

```bash
pnpm run build        # esbuildで src/extension.ts -> dist/extension.cjs にバンドル
pnpm run typecheck     # tsc --noEmit
```

## テスト

```bash
pnpm test
```

`vscode` APIに依存しない純粋ロジック（`src/core/*.ts`: アイコン検索、Widget検索、ホバー内容の解決、pubspec判定）をVitestで単体テストしています。VS Code Extension Host自体の統合テストは、軽量テスト環境という要件に合わせて対象外としています。

## APIインデックスの再生成（任意）

`resources/dartnative-api.json` は `DartNative/dartnative` の公式ドキュメント・実アプリソースから自動生成したものです。手元で最新化したい場合（ネットワークアクセスが必要）:

```bash
pnpm run generate:api-index
```

## VSIXの生成

```bash
pnpm run package
```

`dist/extension.cjs` を再ビルドしたうえで `@vscode/vsce` を使い `dartnative-vscode-<version>.vsix` をカレントディレクトリに生成します（Marketplace公開は行いません）。

## ローカルVS Codeへのインストール方法

1. 上記の `pnpm run package` で `.vsix` ファイルを生成します。
2. VS Codeで拡張機能ビュー（`Cmd+Shift+X`）を開き、右上の「…」メニューから **Install from VSIX...** を選択し、生成された `.vsix` を選択します。
3. または、コマンドラインから直接インストールできます（`code` コマンドがPATHに通っている場合）:

   ```bash
   code --install-extension dartnative-vscode-0.0.1.vsix
   ```

4. インストール後、DartNativeプロジェクト（`pubspec.yaml` に `dartnative:` 依存があるもの）で `.dart` ファイルを開き、`stl` / `stf` と入力してTabで確定するとスニペットが展開されることを確認してください。Icon補完は `Icon(` の中や単語入力中に `home` などと打つと候補に出ます。
5. 動作確認後にアンインストールする場合は、拡張機能ビューでDartNative拡張を選び「Uninstall」を選択してください。

### 前提

Dart言語のシンタックスハイライトや `dart` languageIdの提供には、別途 [Dart-Code](https://marketplace.visualstudio.com/items?itemName=Dart-Code.dart-code) 拡張機能のインストールを推奨します（本Extensionは `dart` languageIdに相乗りする設計で、Dart-Code自体を同梱・強制はしていません）。

## 今回やらないこと

`sdd/sdd.md` の方針に従い、以下は実装していません: Marketplace公開 / Language Server / Rust / Dart parserの自作 / DartNative SDKの改造 / AI補完 / 課金 / テレメトリー / 自動アップデート / CI/CD。
