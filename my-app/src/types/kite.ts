import type { WordCategory } from "./lyric.ts";

export type KiteShape = "large" | "diamond" | "swallow";
export type KiteColor = "blue" | "red" | "white" | "purple" | "gold";
export type KitePattern = "ripple" | "wind" | "star" | "sound";
export type KiteWish = "未来" | "歌" | "光" | "夢";

export interface KiteConfig {
  shape: KiteShape;
  color: KiteColor;
  pattern: KitePattern;
  wish: KiteWish;
}

export interface SelectedLyric {
  text: string;
  time: number;
  category: WordCategory;
  position: { x: number; y: number };
  selectedAt: number;
}

export interface CommunityKite {
  id: number;
  x: number;
  y: number;
  size: number;
  color: KiteColor;
  pattern: KitePattern;
  word: string;
  phase: number;
  opacity: number;
  type: "lyric" | "community";
}

export interface PastKiteRecord {
  name: string;
  kiteConfig: KiteConfig;
  selectedTexts: string[];
  savedAt: number;
}
