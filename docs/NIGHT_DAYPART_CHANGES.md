# 夜の部を有効化するために「昼の部ファイル」へ必要な変更（推奨事項）＋ 質問

このファイルは、**昼の部の関係ファイルを私が勝手に変更しないため**に、
必要な変更を「推奨事項」としてまとめたものです。

> ✅ **【更新】§2 の App.ts への配線はユーザー承認のうえ適用済みです。**
> 「夜の部」ボタンは「あそぶ」表示になり、押下で夜の部が起動します。
> 以下は適用内容の記録として残します。残る確認事項は §3 を参照。

夜の部本体（`src/night/` 配下）は完成・検査合格済みですが、
タイトルの「夜の部」ボタンから起動させるには、**唯一 `app/App.ts` への小さな追記** が必要です。

---

## 1. 必要な変更は `my-app/src/app/App.ts` の1ファイルだけ

理由:
- タイトル画面 `components/TitleScreen.ts` は **既に `onStartNight` スロットを持つ**。
  ただし呼び出し元 `App.ts` がそれを渡していないため、現状は「準備中」で無効。
- 夜の部は `startNightExperience(root, { onExit })` という自己完結関数として作ってあるので、
  App.ts から呼ぶだけで動きます（夜の起動・終了・data-mode の付与解除は夜側が処理）。

> ※ `TitleScreen.ts` / `style.css` / `theme/colors.css` などは **変更不要** です（夜は既存の仕組みに乗ります）。

---

## 2. 適用するコピペ用スニペット（App.ts）

### (a) import を追加（ファイル先頭の import 群の末尾あたり）

```ts
import { startNightExperience } from "../night/NightApp.ts";
```

### (b) セッション保持用の変数を1つ追加（`mountApp` 内、他の `let xxx = null;` の並びに）

```ts
  let nightSession: { dispose: () => void } | null = null;
```

### (c) `goTitle()` の `createTitleScreen` に `onStartNight` を渡す

現状:

```ts
    titleScreen = createTitleScreen(root, {
      onStart: () => {
        goSetup();
      },
    });
```

変更後:

```ts
    titleScreen = createTitleScreen(root, {
      onStart: () => {
        goSetup();
      },
      onStartNight: () => {
        teardownTitle();
        nightSession = startNightExperience(root, {
          onExit: () => {
            nightSession = null;
            goTitle();
          },
        });
      },
    });
```

### (d) `dispose()` で夜セッションも破棄（任意・安全のため）

現状:

```ts
  function dispose() {
    teardownPlayingLayer();
    teardownSetup();
    teardownTitle();
  }
```

変更後:

```ts
  function dispose() {
    if (nightSession) {
      nightSession.dispose();
      nightSession = null;
    }
    teardownPlayingLayer();
    teardownSetup();
    teardownTitle();
  }
```

これだけで「夜の部」ボタンが「あそぶ」に変わり、押下で夜の部が起動します。

### 補足（動作の流れ）
- `onStartNight` → タイトルを片付けて夜を起動（root に `data-mode="night"` が付く）。
- 夜のエンディング「タイトルへ戻る」/ 屋台づくりの「戻る」→ 夜側が自分を破棄して
  `data-mode` を外し、`onExit`（= `goTitle()`）で昼テーマのタイトルへ戻る。

---

## 3. 確認したいこと（質問）

仕様で迷った点・判断が要る点をまとめます。回答に合わせて調整します。

1. **タイトル画面のブランディング**
   現在は共有タイトル（主見出し「湖風の歌詞凧」＋「昼の部／夜の部」ボタン）の構成です。
   NIGHT_SPEC §7.1 の夜タイトル「歌灯りの御殿屋台」は、
   (A) 今のまま共有タイトルに2モードボタン / (B) 夜専用のタイトル画面を別途用意、
   どちらにしますか？（現状は A。B が必要なら夜用タイトルを追加します）

2. **楽曲**
   夜も昼と同じ課題曲「こたえて」を TextAlive で再生します。
   夜だけ別の曲にしたい場合は教えてください。
   （※ かつての `?mock=1` モック起動は不要のため昼夜とも削除済み。動作には
   `my-app/.env.local` の TextAlive トークンが必須になりました。）

3. **App.ts への配線の適用** → ✅ 適用済み（§2）。

4. **localStorage の「過去の屋台」表示（Phase 2）**
   昼の `kitePersistence` 相当（過去プレイの屋台を遠景に出す）は今回未実装です。
   夜にも入れますか？

5. **御殿屋台の描画の作り込み度**
   現在は MVP のシルエット表現（屋根・車輪・幕・提灯・金縁）です。
   さらにリッチに（多段屋根・彫刻風装飾・囃子方など）したい場合は方向性を教えてください。
