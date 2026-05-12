<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, but it invokes Vite through `vp dev` and `vp build`.

## Vite+ Workflow

`vp` is a global binary that handles the full development lifecycle. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

### Start

- create - Create a new project from a template
- migrate - Migrate an existing project to Vite+
- config - Configure hooks and agent integration
- staged - Run linters on staged files
- install (`i`) - Install dependencies
- env - Manage Node.js versions

### Develop

- dev - Run the development server
- check - Run format, lint, and TypeScript type checks
- lint - Lint code
- fmt - Format code
- test - Run tests

### Execute

- run - Run monorepo tasks
- exec - Execute a command from local `node_modules/.bin`
- dlx - Execute a package binary without installing it as a dependency
- cache - Manage the task cache

### Build

- build - Build for production
- pack - Build libraries
- preview - Preview production build

### Manage Dependencies

Vite+ automatically detects and wraps the underlying package manager such as pnpm, npm, or Yarn through the `packageManager` field in `package.json` or package manager-specific lockfiles.

- add - Add packages to dependencies
- remove (`rm`, `un`, `uninstall`) - Remove packages from dependencies
- update (`up`) - Update packages to latest versions
- dedupe - Deduplicate dependencies
- outdated - Check for outdated packages
- list (`ls`) - List installed packages
- why (`explain`) - Show why a package is installed
- info (`view`, `show`) - View package information from the registry
- link (`ln`) / unlink - Manage local package links
- pm - Forward a command to the package manager

### Maintain

- upgrade - Update `vp` itself to the latest version

These commands map to their corresponding tools. For example, `vp dev --port 3000` runs Vite's dev server and works the same as Vite. `vp test` runs JavaScript tests through the bundled Vitest. The version of all tools can be checked using `vp --version`. This is useful when researching documentation, features, and bugs.

## Common Pitfalls

- **Using the package manager directly:** Do not use pnpm, npm, or Yarn directly. Vite+ can handle all package manager operations.
- **Always use Vite commands to run tools:** Don't attempt to run `vp vitest` or `vp oxlint`. They do not exist. Use `vp test` and `vp lint` instead.
- **Running scripts:** Vite+ built-in commands (`vp dev`, `vp build`, `vp test`, etc.) always run the Vite+ built-in tool, not any `package.json` script of the same name. To run a custom script that shares a name with a built-in command, use `vp run <script>`. For example, if you have a custom `dev` script that runs multiple services concurrently, run it with `vp run dev`, not `vp dev` (which always starts Vite's dev server).
- **Do not install Vitest, Oxlint, Oxfmt, or tsdown directly:** Vite+ wraps these tools. They must not be installed directly. You cannot upgrade these tools by installing their latest versions. Always use Vite+ commands.
- **Use Vite+ wrappers for one-off binaries:** Use `vp dlx` instead of package-manager-specific `dlx`/`npx` commands.
- **Import JavaScript modules from `vite-plus`:** Instead of importing from `vite` or `vitest`, all modules should be imported from the project's `vite-plus` dependency. For example, `import { defineConfig } from 'vite-plus';` or `import { expect, test, vi } from 'vite-plus/test';`. You must not install `vitest` to import test utilities.
- **Type-Aware Linting:** There is no need to install `oxlint-tsgolint`, `vp lint --type-aware` works out of the box.

## CI Integration

For GitHub Actions, consider using [`voidzero-dev/setup-vp`](https://github.com/voidzero-dev/setup-vp) to replace separate `actions/setup-node`, package-manager setup, cache, and install steps with a single action.

```yaml
- uses: voidzero-dev/setup-vp@v1
  with:
    cache: true
- run: vp check
- run: vp test
```

## Review Checklist for Agents

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to validate changes.
<!--VITE PLUS END-->

# プロジェクト：ことばの湖、ひびく未来

マジカルミライ2026 プログラミングコンテスト向けの Web リリックアプリ。
テーマ「湖のソナーレ」をもとに、ユーザーが歌詞に触れると湖に波紋が広がり、1曲の最後に自分だけの湖面アートが完成する作品。

## 重要

- **仕様書を必ず先に読む**：[`../docs/PROJECT_SPEC.md`](../docs/PROJECT_SPEC.md) がこの作品の唯一の仕様の源。実装で迷ったらここに戻る。
- **アート寄りのリリック体験**：スコア、コンボ、判定、失敗演出、ゲーム的UIは入れない。クリックは「歌詞を湖に響かせる」ためのもので、勝ち負けではない。
- **テーマ「湖のソナーレ」との接続を最優先**：派手さよりも、湖・水面・反射・波紋・光・透明感を大切にする。
- **TextAlive App API は Phase 3**：まずモックデータで美しく動く MVP を維持する。差し替えやすい設計を崩さない。

## 技術構成

- Vite+（vp CLI）+ TypeScript の **Vanilla** 構成（React/Vue 等は使わない）
- 描画は Canvas 2D。アニメーションは `requestAnimationFrame`
- 外部ライブラリは必要最小限

## ディレクトリ構成

```
src/
  main.ts                  // エントリーポイント
  style.css                // 全体スタイル
  app/App.ts               // アプリ全体の組み立て
  components/
    LakeCanvas.ts          // 湖面Canvas（背景・粒子・波紋・湖面文字・星座）
    LyricDisplay.ts        // 中央の歌詞表示とクリックハンドラ
    PlayerControls.ts      // 再生・停止・リセット・進行バー
    EndingOverlay.ts       // 曲終了時のエンディング画面
  data/mockLyrics.ts       // モック歌詞とセクション境界
  state/
    mockPlayer.ts          // モック再生時間の管理（TextAlive差し替え対象）
    lyricTiming.ts         // 現在歌詞・セクションの算出
  types/lyric.ts           // 共通型
  utils/
    classifyWord.ts        // 単語分類（bright/deep/sound/airy/neutral）と色
    generateLakeTitle.ts   // 湖タイトル生成
```

新規ファイルを足すときも、Canvas描画は `LakeCanvas.ts` に集約し、UI/HTML側のクリック・表示は `components/*` 側に置く責務分離を守る。

## 開発フロー

- 起動: `vp dev`（このディレクトリで）
- 検査: `vp check`（format + lint + 型 をまとめて。`--fix` で自動修正）
- ビルド: `vp build`
- 依存追加が必要なら `vp add <pkg>`（pnpm/npm/yarn を直接呼ばない）

## コーディング規約

- `tsconfig.json` で `verbatimModuleSyntax: true` のため、型のみの import は `import type` で書く
- 同じく `allowImportingTsExtensions: true` なので相対 import は `.ts` 拡張子付きで書く（既存に倣う）
- `noUnusedLocals` / `noUnusedParameters` が有効。未使用は消すか、export してインタフェースの一部として残す
- ファイルは **UTF-8 (BOMなし)** で保存する

## 演出を足すときの指針

仕様書 §11 の Phase 順で進める。MVP（Phase 1）は完成済み。
次は Phase 2 の演出強化：

- bridge での「過去に選んだ言葉が浮上」演出
- chorus / finalChorus での文字発光の強化
- 反射文字・粒子のクオリティアップ
- レスポンシブ最適化

Phase 3 で TextAlive を導入するとき、`state/mockPlayer.ts` と同じインタフェースで `state/textAlivePlayer.ts` を作り、`app/App.ts` の生成箇所だけを差し替える設計を保つ。歌詞も同じ `LyricLine` 型に揃える。
