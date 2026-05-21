# Magical Mirai 2026 — 湖風の歌詞凧

マジカルミライ2026 プログラミングコンテスト向けの Web リリックアプリ。
浜松まつりの凧揚げ × 2026 テーマ「湖のソナーレ」。

## このリポジトリで作業するエージェントへ

実装本体は **`my-app/` 配下** にある（Vite+ + TypeScript + PixiJS 構成）。
作業を始める前に、必ず以下の順で読むこと：

1. **`docs/PROJECT_SPEC.md`** — 作品の唯一の仕様の源
2. **`my-app/AGENTS.md`**（Codex 用）または **`my-app/CLAUDE.md`**（Claude Code 用）
   — 技術構成・ディレクトリ構成・開発フロー・実装方針
   - 両者は同じ内容のミラー。更新時は両方同時に編集する

## ディレクトリ概要

```
.
├── docs/
│   └── PROJECT_SPEC.md   # 作品仕様（最新：湖風の歌詞凧）
├── my-app/               # 実装本体（Vite+ プロジェクト）
│   ├── AGENTS.md         # Codex 用のプロジェクト指針
│   ├── CLAUDE.md         # Claude Code 用（AGENTS.md と同内容）
│   ├── src/              # ソース
│   ├── package.json
│   └── vite.config.ts
└── idea.txt              # 元アイデアメモ
```

## よく使うコマンド

`my-app/` ディレクトリで実行する：

```bash
vp dev      # 開発サーバー起動
vp check    # format + lint + 型チェック（--fix で自動修正）
vp build    # 本番ビルド
vp add <pkg> # 依存追加（pnpm/npm/yarn を直接呼ばない）
```

## 現在の状態（2026-05-21 時点）

- 仕様書は新作品「湖風の歌詞凧」で更新済み
- 実装は **旧作品「ことばの湖、ひびく未来」の MVP がそのまま残っている**
  → 仕様書 §21 Phase 1 に従って `my-app/src/` を全面置換するのが次のステップ
- PixiJS は未導入（`vp add pixi.js` で追加予定）

## 方針

- 回答・コミットメッセージ・コードコメントは原則 **日本語**
- ファイルは **UTF-8（BOMなし）**
- ゲーム化しない（スコア・コンボ・判定・失敗演出は入れない）
- アート寄りのリリック体験を最優先
