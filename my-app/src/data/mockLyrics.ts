import type { LyricLine, SectionRange } from "../types/lyric.ts";

export const SONG_DURATION = 64;

export const mockLyrics: ReadonlyArray<LyricLine> = [
  { time: 0, text: "静かな湖に" },
  { time: 4, text: "ひとつの声が落ちる" },
  { time: 8, text: "波紋は未来へ広がって" },
  { time: 12, text: "きみの言葉を光に変える" },
  { time: 16, text: "夜空を映した水面に" },
  { time: 20, text: "まだ知らない歌が揺れる" },
  { time: 24, text: "響け ひかりのソナーレ" },
  { time: 28, text: "この湖から未来へ" },
  { time: 32, text: "選んだ言葉が星になる" },
  { time: 36, text: "重なる波が道を描く" },
  { time: 40, text: "もう一度 声を届けて" },
  { time: 44, text: "きみだけの湖が光る" },
  { time: 48, text: "響け ひかりのソナーレ" },
  { time: 52, text: "未来の空へ広がって" },
  { time: 56, text: "この歌が水面に残る" },
  { time: 60, text: "ことばの湖、ひびく未来" },
];

export const sectionRanges: ReadonlyArray<SectionRange> = [
  { section: "intro", start: 0, end: 4 },
  { section: "verse", start: 4, end: 16 },
  { section: "preChorus", start: 16, end: 24 },
  { section: "chorus", start: 24, end: 32 },
  { section: "bridge", start: 32, end: 40 },
  { section: "finalChorus", start: 40, end: 56 },
  { section: "outro", start: 56, end: SONG_DURATION },
];
