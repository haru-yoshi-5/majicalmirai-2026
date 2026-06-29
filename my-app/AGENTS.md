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

# プロジェクト：湖風の歌詞凧

マジカルミライ2026 プログラミングコンテスト向けの Web リリックアプリ。
浜松まつりの凧揚げ文化 × 2026 テーマ「湖のソナーレ」。
ユーザーは曲開始前に自分の凧を作り、曲中に歌詞をクリックすると湖に波紋が広がり、
波紋が湖風になって凧を空へ揚げる。最後にクリックした歌詞から凧の名前が生成される。

## 重要

- **仕様書を必ず先に読む**：[`../docs/PROJECT_SPEC.md`](../docs/PROJECT_SPEC.md) がこの作品の唯一の仕様の源。実装で迷ったらここに戻る。
- **アート寄りのリリック体験**：スコア、コンボ、判定、失敗演出、ゲーム的UIは入れない。クリックは「湖風を起こして凧を揚げる」ためのもので、勝ち負けではない。
- **歌詞 → 湖の波紋 → 湖風 → 凧上昇** の変換体験を必ず作る。「クリックしたら凧に文字が出る」だけにしない。
- **自分の凧が主役**：周囲の凧（communityKite）は背景演出として扱い、自分の凧を邪魔しない。
- **TextAlive App API は Phase 3**：まずモックデータで美しく動く MVP を作る。差し替えやすい設計を崩さない。

## 技術構成

- Vite+（`vp` CLI）+ TypeScript の **Vanilla** 構成（React/Vue は使わない）
- 2D リアルタイム描画は **PixiJS**（湖・波紋・風の流線・自分の凧・周囲の凧・粒子）
- DOM はタイトル画面・凧づくりUI・歌詞表示・プレイヤーUI・エンディングUI など最小限
- 画面状態管理：`scene = "title" | "setup" | "playing" | "ending"`
- アニメーションは PixiJS の ticker（必要に応じて `requestAnimationFrame`）
- TextAlive 連携は `state/TextAliveController.ts` として分離し Phase 3 で実装

## 現在の状態（2026-05-22 時点）

- **`../docs/PROJECT_SPEC.md` は新作品「湖風の歌詞凧」で更新済み**
- **Phase 1 (MVP) §21 の 15 項目はすべて実装完了**
  - タイトル → 凧づくり → 演奏 → エンディングまでひと通り動く
  - 旧作品「ことばの湖、ひびく未来」の `LakeCanvas.ts` / `generateLakeTitle.ts` は削除済み
  - `index.html` の `<title>` も「湖風の歌詞凧 | Magical Mirai 2026」に更新済み
- **PixiJS 8.18.1 導入済み**（`vp add pixi.js`）
- `state/TextAliveController.ts` はスケルトンのみ。Phase 3 で実装する想定
- `vp check` / `vp build` ともに通る状態

## ディレクトリ構成（現状）

```
src/
  main.ts                       // エントリーポイント
  style.css                     // 全体スタイル
  app/
    App.ts                      // シーン管理・全体組み立て
  components/
    TitleScreen.ts              // タイトル画面 DOM
    DayKiteSetup.ts             // 凧づくり画面 DOM
    LyricDisplay.ts             // 現在歌詞表示とクリックハンドラ
    PlayerControls.ts           // 再生・停止・リセット・進行バー
    EndingOverlay.ts            // エンディング画面 DOM
  scenes/
    DayKiteScene.ts             // PixiJS シーン本体（湖・凧・風・周囲の凧）
  data/
    mockLyrics.ts               // モック歌詞とセクション境界
  state/
    mockPlayer.ts               // モック再生時間（TextAlive 差し替え対象）
    lyricTiming.ts              // 現在歌詞・セクションの算出
    TextAliveController.ts      // TextAlive 連携スケルトン（Phase 3）
  types/
    kite.ts                     // KiteConfig / CommunityKite / SelectedLyric
    lyric.ts                    // LyricLine / SongSection / WordCategory
  utils/
    classifyWord.ts             // 歌詞分類（bright/sound/airy/deep/wish/neutral）
    generateKiteName.ts         // 最後の歌詞 + kiteConfig.pattern から凧名生成
    generateCommunityKite.ts    // 周囲の凧の自動生成
```

新規ファイルを足すときも、PixiJS 描画は `scenes/DayKiteScene.ts` に集約し、
DOM/HTML 側のクリック・表示は `components/*` 側に置く責務分離を守る。

## 開発フロー

- 起動: `vp dev`（このディレクトリで）
- 検査: `vp check`（format + lint + 型 をまとめて。`--fix` で自動修正）
- ビルド: `vp build`
- 依存追加: `vp add <pkg>`（pnpm/npm/yarn を直接呼ばない）

## コーディング規約

- `tsconfig.json` で `verbatimModuleSyntax: true` のため、型のみの import は `import type` で書く
- 同じく `allowImportingTsExtensions: true` なので相対 import は `.ts` 拡張子付きで書く（既存に倣う）
- `noUnusedLocals` / `noUnusedParameters` が有効。未使用は消すか、export してインタフェースの一部として残す
- ファイルは **UTF-8（BOMなし）** で保存する
- 回答・コミットメッセージ・コードコメントは原則 **日本語**

## エージェント間の同期（重要）

このディレクトリには Codex 用の `AGENTS.md` と Claude Code 用の `CLAUDE.md` が
**同じ内容で**置かれている。プロジェクト固有方針を更新するときは
**両方を同時に**更新し、ずれを残さないこと。
Vite+ 自動生成ブロック（`<!--VITE PLUS START-->` 〜 `<!--VITE PLUS END-->`）は
`vp config` 管理なので手動編集しない。

## 実装の進め方

仕様書 §21 の Phase 順で進める。

- **Phase 1: MVP（完了）**
  タイトル / 凧づくり / モックプレイヤー / モック歌詞同期 /
  歌詞クリック → 湖に落ちる → 波紋 → 風の流線 → 自分の凧上昇 → 凧に模様・文字が増える /
  周囲の凧の出現 / エンディング表示 / 最後の歌詞から凧名生成
- **Phase 2: 演出強化（次の作業対象）** — 分類別の空・湖・風変化、サビでの群舞、湖面反射、
  五線譜風凧糸、風の渦、localStorage による過去凧表示
- **Phase 3: TextAlive 連携** — `state/mockPlayer.ts` と同じインタフェース
  （`state/TextAliveController.ts` の `SongPlayer` / `SongPlayerEvents`）で
  TextAlive 版を実装し、`app/App.ts` の `createMockPlayer` 呼び出し箇所だけ差し替える設計を保つ。
  歌詞も同じ `LyricLine` 型に揃える。
