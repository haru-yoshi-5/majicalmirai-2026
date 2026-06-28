# 夜の部「歌灯りの御殿屋台」実装まとめ

このファイルは、夜の部の作成で **追加した変更内容を1か所にまとめた確認用ドキュメント** です。
（昼の部ファイルへの変更は一切していません。昼の部に必要な配線だけ別途
`docs/NIGHT_DAYPART_CHANGES.md` に「推奨事項」として記載しています。）

- 仕様: `docs/NIGHT_SPEC.md`
- 検査結果: `vp check` → **34ファイルで型・lint・整形エラーなし（合格）**

---

## 1. 方針（どうやって昼の部に触れずに作ったか）

| 課題 | 採った方法 |
| --- | --- |
| 配色（夜の藍・提灯色） | `theme/colors.css` に**既に存在する** `[data-mode="night"]` トークンを利用。夜の起動時に root へ `data-mode="night"` を付与するだけで、共有CSS（タイトル/プレイヤーUI等）が夜配色に切り替わる。CSSファイルは変更していない。 |
| タイトルの「夜の部」ボタン | `components/TitleScreen.ts` に**既に存在する** `onStartNight` スロットを使う。未指定だと「準備中」表示。**ボタンを有効化する配線（App.ts へ1か所追記）だけ**が必要で、それは別md（推奨事項）に記載。 |
| 汎用UI部品 | `LyricDisplay.ts` / `PlayerControls.ts` は曲・凧に依存しない汎用部品なので **import で再利用**（ファイルは未変更）。 |
| 楽曲再生（TextAlive） | `state/TextAliveController.ts` / `state/lyricSource.ts` の関数を **import で再利用**（未変更）。 |
| それ以外（屋台・提灯・光・反射・分類・名前生成・モック） | すべて **`src/night/` 配下に新規作成**（昼の対応ファイルには触れない）。 |

夜の部はタイトルの「夜の部」ボタン押下で `startNightExperience(root, { onExit })` が走り、
**屋台づくり → 演奏 → エンディング** を自己完結で回し、終了時に `data-mode` を外してタイトルへ戻る。

---

## 2. 新規追加ファイル（すべて新規・既存は未変更）

すべて `my-app/src/night/` 配下。

| ファイル | 役割 | 昼の対応物 |
| --- | --- | --- |
| `NightApp.ts` | 夜の部の統括。`startNightExperience()` で屋台づくり→演奏→エンディングを回す。data-mode の付与/解除もここ。 | `app/App.ts`（の演奏フロー部分） |
| `yataiTypes.ts` | 型定義（`YataiConfig` / `NightWordCategory` / `NightSelectedLyric` / `CommunityLantern` / `CommunityYatai`）。 | `types/kite.ts` |
| `nightColors.ts` | PixiJS 用の夜の色トークン（夜空・湖・屋台基調色・提灯色・分類色）と `hslToHex`。値は `colors.css` の Night raw palette と対応。 | `theme/colors.ts` |
| `classifyWordNight.ts` | 歌詞分類（bright / sound / **festival** / deep / wish / neutral）。昼の "airy" を "festival" に置換。 | `utils/classifyWord.ts` |
| `generateYataiName.ts` | 最後の歌詞＋紋様から屋台名を生成（§14のテンプレート）。 | `utils/generateKiteName.ts` |
| `generateCommunityLantern.ts` | 周囲の提灯（遠景の灯り）の自動生成。 | `utils/generateCommunityKite.ts` |
| `NightYataiSetup.ts` | 屋台づくり画面（基調色・提灯色・幕の紋様・願いの文字）。`.setup-*` を再利用＋夜専用プレビュー。 | `components/DayKiteSetup.ts` |
| `NightEndingOverlay.ts` | エンディング画面（灯した屋台・屋台名・最後の歌詞・灯した言葉）。`.ending-*` を再利用。 | `components/EndingOverlay.ts` |
| `NightYataiScene.ts` | **PixiJS シーン本体**。夜空/星/月・湖面・御殿屋台・提灯点灯・光の粒・湖面反射・周囲の灯り。 | `scenes/DayKiteScene.ts` |
| `night.css` | 夜専用スタイル（屋台プレビュー＋明色固定箇所の夜向け上書き）。`style.css` は未変更。 | `style.css`（の差分） |

## 3. import で再利用した既存ファイル（変更なし）

- `src/components/LyricDisplay.ts`
- `src/components/PlayerControls.ts`
- `src/state/TextAliveController.ts`（型と `createTextAliveController`）
- `src/state/lyricSource.ts`（`createTextAliveLyricSource` と `LyricSource` 型）
- `src/types/lyric.ts`（`LyricLine` / `SongSection` / `SectionRange`）

---

## 4. 実装した機能（NIGHT_SPEC 対応）

### Phase 1（MVP）= 完了
1. タイトルの「夜の部」ボタン起動（App.ts 配線 適用済み）
2. 屋台づくり画面（屋台の基調色／提灯の色／幕の紋様／願いの文字）＋プレビュー
3. `yataiConfig` の保持と演出への反映
4. プレイヤー操作（再生/一時停止/リセット/進行バー/曲終了）＝昼の `PlayerControls` を再利用
5. 歌詞の時間同期表示（昼の `LyricDisplay` を再利用、文節クリック可）
6. 歌詞クリック → 光の粒 → 提灯へ飛ぶ → 提灯点灯 → 屋台が明るくなる
7. 湖面（または濡れた石畳イメージ）への提灯の光の反射
8. 周囲の提灯が歌詞選択・時間経過で少しずつ出現
9. 曲終了でエンディング表示
10. 最後にクリックした歌詞＋紋様から屋台名を自動生成

### Phase 2 の先行採用（一部）
- 歌詞分類ごとの色味・夜空ムードの変化（`moodHue`）
- サビ/finalChorus で提灯が一斉点灯（`flareTimer` / `lightAllLanterns`）
- 周囲の提灯の群舞・finalChorus で増加
- 月・星空・月の湖面反射、wish で星が増える
- 御殿屋台の前進感（車輪回転＋ゆるい揺れ）

### 紋様・提灯色・分類の対応（抜粋）
- 紋様: 波紋=ripple / 音=sound / 星=star / 花=flower / 風=wind（幕の絵柄に反映）
- 提灯色: 暖色 / 青白 / 桃色 / 金色 / 虹色（虹色は時間で色相が巡回）
- 分類: bright（光・未来・夢）/ sound（声・歌・響・ソナーレ）/ festival（祭・灯・夜・街・進）/ deep（涙・迷・静・闇）/ wish（星・願・祈）/ neutral

---

## 5. 起動方法

`my-app/` で:

```bash
vp dev          # 開発サーバー（http://localhost:5173）
vp check        # 型・lint・整形（--fix で自動修正）
```

- タイトルの「夜の部」ボタンを押すと夜の部が起動します（App.ts の配線は適用済み）
- 楽曲は昼と同じ課題曲「こたえて」を TextAlive で再生します（`my-app/.env.local` の
  `VITE_TEXTALIVE_APP_TOKEN` が必要）

> ℹ️ かつて存在した `?mock=1`（モック歌詞・モックプレイヤーでの起動）は不要になったため
> **昼夜とも削除済み**です。モック関連ファイル（昼 `mockPlayer.ts` / `lyricTiming.ts` /
> `data/mockLyrics.ts`、夜 `nightMockPlayer.ts` / `nightLyricSource.ts` /
> `nightMockLyrics.ts`）も削除しました。動作には TextAlive トークンが必須です。

---

## 6. 既知の制限・今後

- localStorage による「過去の屋台」表示（Phase 2）は未実装（昼の `kitePersistence` 相当）。
- 御殿屋台の描画は MVP 水準のシルエット表現（屋根・車輪・幕・提灯・金縁）。
- TextAlive 実曲は課題曲「こたえて」を流用（歌詞は夜テーマと完全一致はしない）。
