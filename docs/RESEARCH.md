# RESEARCH

調査日: 2026-09-15
調査対象コミット: `DartNative/dartnative` @ `fe39c987f13f0e6a58696f7b521773a5c5b08aae` (`main`, 2026-09-15T11:48:59Z)

この文書は、PoC実装に着手する前に行った調査結果をまとめたものです。推測でAPIを作らないという制約に従い、すべての結論はDartNativeの公式リポジトリ・公式ドキュメントの実物、または実際に動作しているソースコード（プレイグラウンド/チュートリアル/プラグイン例）から確認しています。

## 1. VS Code Extensionの現在の公式推奨構成

- Extensionのエントリポイントは `package.json` の `main` フィールドが指す単一ファイル（本PoCでは `dist/extension.js`）。
- `activationEvents` に `onLanguage:dart` を指定すると、Dartファイルを開いたときのみExtensionがアクティブ化される（不要な常時起動を避けられる）。VS Code 1.75+ では言語・コマンドをcontributesに書いておけば自動的に暗黙のactivationEventが推論されるが、明示しておくほうが意図が明確。
- 公式のExtension生成テンプレート（`yo code`のTypeScriptテンプレート、および `vscode-extension-samples`）は、`node_modules` をそのまま `.vsix` に含めず **esbuildでsingle-fileにバンドルする** 構成を推奨している。本PoCも `esbuild` で `src/extension.ts` を `dist/extension.js` にバンドルし、`vscode` モジュールのみ `external` にする。
- パッケージングは `@vscode/vsce`（旧 `vsce`）を使う。`vsce package` はデフォルトで `node_modules` を全部同梱しようとするため、バンドル方式と `.vscodeignore` の併用が推奨される。
- テストは公式には `@vscode/test-electron` を使ったExtension Host統合テストが推奨されているが、本PoCは「軽量テスト環境」の指示に従い、Extension Hostを起動しない **Vitest による純粋ロジックの単体テスト**（補完候補の絞り込み、APIインデックスのパース結果など）に留める。`vscode` APIに依存する部分（`registerCompletionItemProvider` 呼び出し自体）はテスト対象外とし、ロジックをvscode非依存の関数に分離することでテスト可能にしている。

## 2. CompletionItemProvider

- `vscode.languages.registerCompletionItemProvider(selector, provider, ...triggerCharacters)` で、指定した言語（`dart`）に対して補完プロバイダを登録できる。
- `provider.provideCompletionItems(document, position, token, context)` が呼ばれるたびに `vscode.CompletionItem[]` を返す。
- `CompletionItem.filterText` を `label` と別に設定できるため、「表示ラベルは `CupertinoIcons.house_fill` だが `home` と入力しても候補に出す」という要件（アイコンをキーワードで検索する）を実現できる。
- `CompletionItem.insertText` と `additionalTextEdits` を使うと、候補確定時に本来のコード（`Icon(CupertinoIcons.house_fill)` など）を挿入しつつ、必要な `import` 文を別位置に追加する、という複合編集が可能。

## 3. HoverProvider

- `vscode.languages.registerHoverProvider(selector, provider)` で登録。`provideHover(document, position, token)` が呼ばれ、カーソル位置の単語（`document.getWordRangeAtPosition`）を見てMarkdown形式の `vscode.Hover` を返せる。
- 本PoCでは、DartNativeのWidget名にカーソルを合わせたときに `docs/widgets.md` から抽出したステータス（✅/⚠️）と注記を表示するHoverを実装する。

## 4. Snippetの実装方法

- VS Codeのsnippetは `package.json` の `contributes.snippets` に `{ "language": "dart", "path": "./snippets/dartnative.json" }` を登録し、実体は通常のVS Code snippet JSON（`prefix`, `body`（配列 = 複数行）, `description`）として書く。
- タブストップ（`${1:name}`）を使うことで、クラス名を1箇所編集すると同名の別箇所も連動して編集できる（Flutter公式拡張の `stless`/`stful` と同じ仕組み）。
- 本PoCでは `stl`（StatelessWidget）と `stf`（StatefulWidget）の2つのprefixを実装する。

## 5. Dartファイルに対してExtensionを有効にする方法

- `package.json` の `activationEvents: ["onLanguage:dart"]` を指定する。これによりDart言語のファイル（`.dart`）を開いたときにExtensionが起動する。
- VS Code自体はDart構文をネイティブには理解しないため、[Dart-Code](https://marketplace.visualstudio.com/items?itemName=Dart-Code.dart-code) 拡張機能などが `dart` languageIdを登録していることを前提にする（本PoCは `languages` を自前定義せず、既存の `dart` languageIdに相乗りする設計とした。過剰設計を避けるため、Dart-Code拡張への依存は `extensionDependencies` では宣言せず、READMEに前提として明記するに留めている）。
- 補完・ホバーは `dart` languageId を `documentSelector` に指定するだけで有効になる。プロジェクトが実際にDartNativeを使っているかどうか（Flutter単体プロジェクトと誤爆させないか）は、ワークスペース直下の `pubspec.yaml` に `dartnative:` 依存が書かれているかを見て判定し、無ければDartNative固有の補完（Widget/Icon）は登録しない設計にした（詳細は §8）。

## 6. DartNativeの現在の公開API

### 6.1 何が公開されていて、何が非公開か（重要）

DartNativeは **クローズドソース** である。`docs/distribution.md` 相当の記述（`docs/widgets.md` 末尾）に明記されている:

> dartnative is **closed-source**, distributed as compiled artifacts — **not** a pub registry. The framework ships as compiled binaries via the `dn` CLI; plugins as prebuilt binaries via **dartpub.dev** (`dn pub get`).
> （出典: https://github.com/DartNative/dartnative/blob/main/docs/widgets.md）

つまり：

- `dartnative` パッケージ自体のDartソースコード（`MaterialSymbolsRounded` クラスの実装ファイルなど）は **pub.devにもGitHubにも公開されていない**。
- 公開されているのは `github.com/DartNative/dartnative` リポジトリの **ドキュメント** (`docs/*.md`) と、**動作する実アプリのソース**（`playground/`、`tutorials/*/`、`plugins/*/example/`＝合計307個の `.dart` ファイル）のみ。
- そのため本PoCのAPIインデックスは、(a) 公式ドキュメント `docs/widgets.md` のMarkdownテーブル、(b) 上記307ファイルに実際に書かれているAPI呼び出し、の2つだけを情報源とし、それ以外は一切推測していない。

### 6.2 パッケージ構成・importの実際

`docs/getting_started.md` および `playground/pubspec.yaml`、`starter/pubspec.yaml` より:

```yaml
dependencies:
  dartnative: ^1.0.0          # core
  dartnative_ios: ^1.0.0      # iOS bindings
  dartnative_android: ^1.0.0  # Android bindings
```

実アプリの `main.dart`（`playground/lib/main.dart`, `starter/lib/main.dart`）は例外なく

```dart
import 'package:dartnative/dartnative.dart';
```

でウィジェット一式（`StatelessWidget`, `StatefulWidget`, `Icon`, `Container` 等）をimportしている。`docs/getting_started.md` には移行者向けの別ルートとして

```dart
import 'package:dartnative/flutter_compat.dart';
```

（`package:flutter/material.dart` の置き換え）という記述もあるが、DartNativeネイティブに書く場合の一次情報は `package:dartnative/dartnative.dart` であることを307ファイルの実地確認で裏付けた（`grep -rl "import 'package:dartnative/dartnative.dart'"` で多数ヒット、`flutter_compat.dart` のimportは実アプリコードには出現しない）。

**本PoCのsnippet/補完は `import 'package:dartnative/dartnative.dart';` を前提とする。**

### 6.3 Widget定義の実際の形

`docs/widgets.md` 冒頭:

> DartNative ships a widget set designed to be source-compatible with Flutter. In most cases, replacing `package:flutter/material.dart` with `package:dartnative/flutter_compat.dart` is all you need to do.

実際のクラス定義（`playground/lib/screens/home/widgets_tab.dart:17-21`）:

```dart
class WidgetsTab extends StatelessWidget {
  const WidgetsTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      ...
```

StatefulWidgetの実例（`playground/lib/screens/morphing_icon_demo.dart:27-38`）:

```dart
class MorphingIconDemo extends StatefulWidget {
  const MorphingIconDemo({super.key});

  @override
  State<MorphingIconDemo> createState() => _MorphingIconDemoState();
}

class _MorphingIconDemoState extends State<MorphingIconDemo>
    with SingleTickerProviderStateMixin {
  ...
```

**結論**: DartNativeのWidgetクラスの「形」自体はFlutterと1:1で同一（意図的なsource互換設計）。唯一かつ本質的な違いは **importのパッケージが `flutter` ではなく `dartnative` である点**。sdd.mdの「Flutter用コードをそのままコピーしない」という要求に対し、本PoCのsnippetは「クラス形状はFlutter標準と同じにしつつ、importとdescriptionでDartNative向けであることを明示し、READMEで `flutter/material.dart` を書いてしまうミスを注意喚起する」方針を取った（形状まで無理に変えると、それこそ実際の挙動から乖離した“推測コード”になるため）。

`docs/widgets.md` はLayout / Text & Input / Scrolling / Navigation & Scaffold / Controls / Platform Services / System UI / Images / Focus & Keyboard / Animation / Styling & Painting / Theme / Custom Drawing / Icons の各セクションに、Widget名・対応状況（✅完全対応 / ⚠️部分対応・注意点あり）・注記が表という形で列挙されている（該当行 約240行）。本PoCの `scripts/generate-api-index.ts` はこの表をそのままパースしてWidget補完の情報源にしている（詳細§8）。

### 6.4 DartNativeにおけるIconの実装方法

`docs/widgets.md` の "## Icons" セクション（原文）:

```
Four icon classes are available:

| Class | Style | Source |
|---|---|---|
| `MaterialSymbolsRounded` | Rounded (default) | Google Material Symbols (4,229 icons) |
| `MaterialSymbolsSharp` | Sharp | Google Material Symbols (4,229 icons) |
| `MaterialSymbolsOutlined` | Outlined | Google Material Symbols (4,229 icons) |
| `CupertinoIcons` | Apple SF-style | ~1,240 icons |

Icon(MaterialSymbolsRounded.send)   // rounded
Icon(MaterialSymbolsSharp.send)     // sharp
Icon(CupertinoIcons.gear_alt)       // iOS-style

Browse all Material icons at <https://fonts.google.com/icons> — switch between
Rounded and Sharp styles in the top-right dropdown. The same icon name works
across `MaterialSymbolsRounded`, `MaterialSymbolsSharp` and
`MaterialSymbolsOutlined`.
```

つまりDartNativeは **Flutterの `Icons`（Material Icons）クラスも `CupertinoIcons` パッケージそのものも使っていない**。独自に用意した4つのアイコンクラス（`MaterialSymbolsRounded` / `MaterialSymbolsSharp` / `MaterialSymbolsOutlined` / `CupertinoIcons`）を経由する。`CupertinoIcons` という名前はFlutterと同じだが、収録数（~1,240）がFlutter公式の `cupertino_icons` パッケージ（数百種）より大幅に多く、**DartNative独自に拡張されたクラス**である（Flutterの `cupertino_icons` パッケージを流用しているわけではない）。本PoCが「Flutterの `Icons.home` を前提にしない」という制約を満たせているのはこのため。

### 6.5 Icon識別子の実データ（推測を避けるための実地確認）

`MaterialSymbolsRounded`/`MaterialSymbolsSharp`/`MaterialSymbolsOutlined` はクローズドソースのため4,229個の識別子一覧そのものは公開されていない。`CupertinoIcons` も約1,240個の一覧は非公開。そこで本PoCでは、**実際に動いているDartNativeアプリのソースコード内で使われているアイコン識別子だけ**を情報源として採用した（＝実在が確認できたものだけを候補にする。存在しないかもしれない識別子を予測で生成しない）。

手順:
1. `DartNative/dartnative` リポジトリの `.dart` ファイル309個（`playground/`, `tutorials/*/`, `plugins/*/example/`）を `raw.githubusercontent.com` から取得（307個成功、2個は取得エラーで除外）。
2. 正規表現 `(MaterialSymbolsRounded|MaterialSymbolsSharp|MaterialSymbolsOutlined|CupertinoIcons)\.[A-Za-z0-9_]+` で実使用箇所を抽出。
3. 重複除去、コメント内の疑似コード（例: `MaterialSymbolsRounded.X` というプレースホルダー表記）を除外。

結果（2026-09-15時点、`main` ブランチ）:

| クラス | 実使用が確認できた識別子数 | 備考 |
|---|---|---|
| `MaterialSymbolsRounded` | 46 | `home`, `settings`, `person`, `search` を含む |
| `MaterialSymbolsSharp` | 0 | デモコード内では未使用（下記の通り名前はRounded/Outlinedと共通と公式記載あり） |
| `MaterialSymbolsOutlined` | 0 | 同上 |
| `CupertinoIcons` | 111 | `camera`, `camera_fill`, `person`, `search` などを含む。Home相当は `house` / `house_fill` |

`MaterialSymbolsSharp` / `MaterialSymbolsOutlined` は実使用例が0件だったが、公式ドキュメントに明記された「同じアイコン名がRounded/Sharp/Outlinedで共通に使える」という一文を根拠に、`MaterialSymbolsRounded` で確認できた46個の名前を **Sharp/Outlinedにも機械的に複製** している。これはAPIの構造を推測しているのではなく、公式ドキュメントに明記された仕様をそのまま適用しているだけである点に注意（`resources/dartnative-api.json` 内では `verified: false, derivedFrom: "MaterialSymbolsRounded"` として、実使用未確認であることを区別してマークしている）。

sdd.mdの例示キーワード（`home settings person camera search`）との対応:

- `home` → `MaterialSymbolsRounded.home`（実使用確認済み）。`CupertinoIcons` 側は同義語として `house` / `house_fill` が存在するため、本PoCの検索ロジックでは `home ⇄ house` のみ、PoCの利便性向上のための独自シノニムとして追加した（DartNative公式が定義した対応関係ではない旨をコード内コメントと本ドキュメントに明記）。
- `settings` → `MaterialSymbolsRounded.settings`（実使用確認済み・そのまま一致）。
- `person` → `MaterialSymbolsRounded.person` / `CupertinoIcons.person` ほか `person_fill`, `person_crop_circle` 等（実使用確認済み）。
- `camera` → `CupertinoIcons.camera` / `camera_fill` / `camera_rotate`（実使用確認済み）。
- `search` → `MaterialSymbolsRounded.search` / `CupertinoIcons.search`（実使用確認済み）。

5つの例示キーワードすべてで実在するDartNative APIにヒットすることを確認できたため、**アイコン補完のPoCは実装可能と判断した**（完了条件6を「困難」ではなく「実装」で満たす）。

出典ファイル例（全リストは `resources/dartnative-api.json` の `sourceFiles` に記録）:
- `playground/lib/screens/home/widgets_tab.dart`
- `playground/lib/screens/media/camera_demo.dart`
- `playground/lib/screens/home/system_tab.dart`
- 完全な出典は `scripts/generate-api-index.ts` の実行結果（`resources/dartnative-api.json`）を参照。

### 6.6 FlutterのIcons/CupertinoIconsとの違い（まとめ）

| 観点 | Flutter | DartNative |
|---|---|---|
| Material系アイコンのクラス名 | `Icons`（`material_icons` フォント） | `MaterialSymbolsRounded` / `Sharp` / `Outlined`（Google Material **Symbols**フォント、4,229種×3スタイル） |
| Cupertino系アイコンのクラス名 | `CupertinoIcons`（`cupertino_icons` pubパッケージ、数百種） | `CupertinoIcons`（同名だが**DartNative独自実装**、約1,240種） |
| 配布形態 | 通常のpub.devパッケージ、ソース公開 | クローズドソース、`dn` CLI経由でバイナリ配布 |
| 完全な識別子一覧の入手可否 | 可能（Flutter SDK内に `icons.dart` としてソースが存在） | 不可（非公開）。実使用コードからの実地確認のみ可能 |

このためDartNativeの `Icon(...)` 補完は「Flutterの `Icons.home` をコピーして名前だけ変える」実装ではなく、DartNative独自のアイコンクラス名・識別子を実ソースから確認した上で構築している。

## 7. 完了条件6（Icon補完）についての結論

「実装可能」と判断した。理由:

1. Icon呼び出しの構文（`Icon(ClassName.identifier)`）は公式ドキュメントに明記されている。
2. 4つのアイコンクラス名は公式ドキュメントに明記されている。
3. sdd.mdが例示した5キーワード全てに対応する実在の識別子を、実際に動作するDartNativeアプリのソースコードから確認できた。
4. ただし収録数は「実際にリポジトリ内で使用が確認できた157個（Rounded 46 + Cupertino 111）＋公式仕様に基づき機械複製したSharp/Outlined各46個」に限られ、DartNativeが内部に持つ全4,229＋約1,240個のごく一部である。**これはPoCの既知の限界であり、隠さずREADME/RESEARCHに明記する。** 全量が必要な場合は、`dn` CLI（`~/zero/bin`）経由で実機/実SDKをセットアップし、生成される実際の `MaterialSymbolsRounded` 等のDart定義ファイルを直接読み取る形でしかインデックス化できない（クローズドソースであるため）。本PoCではその環境構築（数百MBのSDKダウンロード、ライセンスキーが必要な場合がある）までは行っていない。

## 8. resources/dartnative-api.json の生成方法

`scripts/generate-api-index.ts` が以下を自動生成する（手作業でのAPIコピーは行っていない）:

1. GitHub REST API で `DartNative/dartnative` リポジトリのファイルツリーを取得。
2. `docs/widgets.md` を取得し、Markdownテーブルの行（`| \`Name\` | 対応状況絵文字 | 注記 |`）を正規表現でパースしてWidget一覧を構築。
3. `playground/`, `tutorials/*/`, `plugins/*/example/` 配下の `.dart` ファイルを全て取得し、Iconクラスの実使用箇所を正規表現で抽出・重複除去。
4. `MaterialSymbolsSharp` / `MaterialSymbolsOutlined` は、公式ドキュメントの「同名が3スタイル共通で使える」という記述に基づき `MaterialSymbolsRounded` の一覧から機械的に複製（`verified: false` でマーク）。
5. 結果を `resources/dartnative-api.json` に書き出す。

ネットワークアクセスが必要なため、`pnpm run generate:api-index` は開発者が明示的に実行するスクリプトとして提供し、生成済みの `resources/dartnative-api.json` をリポジトリにコミットしておくことで、オフラインでもExtensionが動作するようにしている（Extension本体は起動時にネットワークへアクセスしない）。

## 9. 参考リンク

- https://github.com/DartNative/dartnative （公式リポジトリ / 一次情報源）
- https://github.com/DartNative/dartnative/blob/main/docs/widgets.md
- https://github.com/DartNative/dartnative/blob/main/docs/getting_started.md
- https://github.com/DartNative/dartnative/blob/main/docs/architecture.md
- https://github.com/DartNative/dartnative/blob/main/playground/lib/main.dart
- https://github.com/DartNative/dartnative/blob/main/starter/lib/main.dart
- https://dartnative.com/ （製品サイト、料金・チュートリアル等）
- https://fonts.google.com/icons （DartNativeのMaterial Symbols系アイコンの一次ソースとして公式ドキュメントが案内している先。本PoCでは個々の識別子の裏取りには使用せず、実ソースコードでの実使用確認のみを採用）
