// マジカルミライ2026 プログラミング・コンテストの課題曲（楽曲コンテスト受賞6曲）。
// 昼の部・夜の部の両方で共有し、曲選択画面で選んだ曲を再生する。
//
// 楽曲URLは必ずリビジョン付き（https://piapro.jp/t/曲ID/数字）にする。
// 未リビジョンだと Songle が302リダイレクトし、その応答にCORSヘッダが無いため
// ブラウザに弾かれて読み込みが永遠に終わらない（App.ts 冒頭コメント参照）。
//
// 音楽地図ID（repetitiveSegmentId / lyricId / lyricDiffId）は公式配布のバージョン固定値。
// このアプリはビート/コードを使わないため beatId/chordId は読み込まない(0)。
// 値の出典: developer.textalive.jp/events/magicalmirai2026/

import type { SongMapIds } from "../state/TextAliveController.ts";

export interface SongDef {
  /** 内部ID（安定キー） */
  id: string;
  /** 曲名 */
  title: string;
  /** アーティスト名 */
  artist: string;
  /** リビジョン付き楽曲URL（TextAliveに渡す） */
  songUrl: string;
  /** クレジット表示用の楽曲ページURL（リビジョンなし） */
  pageUrl: string;
  /** 音楽地図のバージョン固定ID */
  mapIds: SongMapIds;
  /**
   * 「こたえて」専用のコーラス（3段落目）1ms問題の補正を有効にするか。
   * 他曲では補正データが合わないため無効（既定）。
   */
  chorusOverlayFix?: boolean;
}

export const SONG_CATALOG: readonly SongDef[] = [
  {
    id: "kotaete",
    title: "こたえて",
    artist: "imie",
    songUrl: "https://piapro.jp/t/6W2N/20251215164617",
    pageUrl: "https://piapro.jp/t/6W2N",
    mapIds: {
      beatId: 0,
      chordId: 0,
      repetitiveSegmentId: 3086261,
      lyricId: 126519,
      lyricDiffId: 28645,
    },
    chorusOverlayFix: true,
  },
  {
    id: "after-the-curtain",
    title: "アフター・ザ・カーテン",
    artist: "Rulmry",
    songUrl: "https://piapro.jp/t/zoqO/20251214200738",
    pageUrl: "https://piapro.jp/t/zoqO",
    mapIds: {
      beatId: 0,
      chordId: 0,
      repetitiveSegmentId: 3086262,
      lyricId: 126591,
      lyricDiffId: 28627,
    },
  },
  {
    id: "shutter-chance",
    title: "シャッターチャンス",
    artist: "夜未アガリ",
    songUrl: "https://piapro.jp/t/PNpQ/20251209170719",
    pageUrl: "https://piapro.jp/t/PNpQ",
    mapIds: {
      beatId: 0,
      chordId: 0,
      repetitiveSegmentId: 3086263,
      lyricId: 126542,
      lyricDiffId: 28628,
    },
  },
  {
    id: "sekai-saigo-no-ongakutai",
    title: "世界最後の音楽隊",
    artist: "夏山よつぎ×ど〜ぱみん",
    songUrl: "https://piapro.jp/t/B3yJ/20251215061727",
    pageUrl: "https://piapro.jp/t/B3yJ",
    mapIds: {
      beatId: 0,
      chordId: 0,
      repetitiveSegmentId: 3086264,
      lyricId: 126594,
      lyricDiffId: 28629,
    },
  },
  {
    id: "trickology",
    title: "トリツクロジー",
    artist: "鶴三",
    songUrl: "https://piapro.jp/t/QBdL/20251215094303",
    pageUrl: "https://piapro.jp/t/QBdL",
    mapIds: {
      beatId: 0,
      chordId: 0,
      repetitiveSegmentId: 3086265,
      lyricId: 126593,
      lyricDiffId: 28630,
    },
  },
  {
    id: "takeover",
    title: "TAKEOVER",
    artist: "Twinfield",
    songUrl: "https://piapro.jp/t/E2i3/20251215092113",
    pageUrl: "https://piapro.jp/t/E2i3",
    mapIds: {
      beatId: 0,
      chordId: 0,
      repetitiveSegmentId: 3086266,
      lyricId: 126533,
      lyricDiffId: 28631,
    },
  },
];

/** 既定の曲（グランプリ作品「こたえて」）。 */
export const DEFAULT_SONG: SongDef = SONG_CATALOG[0]!;
