import type { LyricLine, SectionRange } from "../types/lyric.ts";

export const SONG_DURATION = 64;

export const mockLyrics: ReadonlyArray<LyricLine> = [
  { time: 0, text: "静かな湖に" },
  { time: 4, text: "ひとつの声が落ちる" },
  { time: 8, text: "波紋は未来へ広がって" },
  { time: 12, text: "きみの言葉を光に変える" },
  { time: 16, text: "空へ向かう風になる" },
  { time: 20, text: "まだ知らない歌が揺れる" },
  { time: 24, text: "響け ひかりのソナーレ" },
  { time: 28, text: "この湖から未来へ" },
  { time: 32, text: "選んだ言葉が凧になる" },
  { time: 36, text: "重なる風が道を描く" },
  { time: 40, text: "もう一度 声を届けて" },
  { time: 44, text: "きみだけの凧が光る" },
  { time: 48, text: "響け 祭りの空へ" },
  { time: 52, text: "未来の風に舞い上がれ" },
  { time: 56, text: "この歌が空に残る" },
  { time: 60, text: "湖風の歌詞凧" },
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
