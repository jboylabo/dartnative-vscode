DartNative開発を支援するVS Code ExtensionのPoCを作成してください。

目的は、DartNativeのコード補完が弱い部分をVS Code Extensionによって補うことです。

まずは小規模なPoCとして実装し、SpecKitは使用しません。

## 1. プロジェクト作成

現在のディレクトリから以下を実行してください。

```bash
mkdir dartnative-vscode
cd dartnative-vscode
pnpm init
```

Gitリポジトリも初期化してください。

```bash
git init
```

Node.jsのパッケージマネージャーにはpnpmを使用してください。
npm/yarnは使用しないでください。

## 2. 技術構成

- TypeScript
- pnpm
- VS Code Extension API
- @vscode/vsce
- Vitestまたは適切な軽量テスト環境
- Rustは使用しない
- Language Serverは現時点では作らない
- Dart/Flutter本体を改造しない

必要な依存関係を調査してpnpmで追加してください。

## 3. 最初に調査

実装前に以下を調査してください。

- VS Code Extensionの現在の公式推奨構成
- CompletionItemProvider
- HoverProvider
- Snippetの実装方法
- Dartファイルに対してExtensionを有効にする方法
- DartNativeの現在の公開API
- DartNativeにおけるWidgetの定義
- DartNativeにおけるIconの実装方法
- FlutterのIcons/CupertinoIconsとの違い

DartNativeについては必ず公式ドキュメントまたはDartNativeの実際のソースコードを確認してください。

推測でAPIを作らないでください。

調査結果を

`docs/RESEARCH.md`

にまとめてください。

この段階では、DartNative APIの構造が不明な場合に無理に実装を開始しないでください。

## 4. PoC

調査後、実装可能であることを確認できたらPoCを作ってください。

### Snippet

最低限、

- stl
- stf

を実装してください。

DartNativeで実際に正しいコードを生成してください。

Flutter用コードをそのままコピーしないでください。

### DartNative API補完

DartNativeの公開APIから取得・生成できる情報を調査してください。

可能であれば、

`resources/dartnative-api.json`

のようなAPIインデックスを生成してください。

手作業で大量のAPIをJSONにコピーする設計は避けてください。

### Icon補完

今回の重要なPoCです。

DartNativeで利用可能なIcon APIを調査してください。

Iconの名前・識別子を取得できる場合、

```text
home
settings
person
camera
search
```

などの文字からVS CodeのCompletion候補を検索できるようにしてください。

候補を選択するとDartNativeで正しいコードが挿入されるようにしてください。

Flutterの `Icons.home` を前提にしないでください。

DartNativeが使用している実際のIcon APIを解析してください。

## 5. ディレクトリ

概ね以下の責務分離にしてください。

```text
dartnative-vscode/
├── src/
│   ├── extension.ts
│   ├── completion/
│   │   ├── widgets.ts
│   │   └── icons.ts
│   └── hover/
├── scripts/
│   └── generate-api-index.ts
├── resources/
├── snippets/
│   └── dartnative.json
├── docs/
│   ├── PLAN.md
│   └── RESEARCH.md
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
└── README.md
```

実際の構成上もっと単純にできる場合は簡略化して構いません。

過剰設計しないでください。

## 6. 検証

実装後、

```bash
pnpm build
pnpm test
```

相当の検証を実行してください。

さらに、

```bash
pnpm exec vsce package
```

でVSIXを生成できるところまで確認してください。

生成したVSIXをローカルVS Codeへインストールして検証する方法をREADMEに記載してください。

## 7. 今回やらないこと

以下は実装しません。

- Marketplace公開
- Language Server
- Rust
- Dart parserの自作
- DartNative SDKの改造
- AI補完
- 課金
- テレメトリー
- 自動アップデート
- CI/CD

まずローカルでPoCとして使えることを最優先してください。

## 完了条件

以下を満たしたらPoC完了です。

1. pnpm installが成功する
2. TypeScript buildが成功する
3. VS Code Extensionとして起動できる
4. DartNativeプロジェクトでstl/stf補完が出る
5. DartNative APIに基づいた補完が最低1種類動く
6. DartNative Iconの補完が動く、または現在のDartNative API上それが困難な理由をRESEARCH.mdに明確に記載する
7. VSIXを生成できる
8. READMEにローカルインストール方法がある

実装量より、DartNativeの実際のAPIを正しく理解して補完することを優先してください。