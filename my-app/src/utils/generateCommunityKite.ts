import type { CommunityKite, KiteColor, KitePattern, SelectedLyric } from "../types/kite.ts";
import type { WordCategory } from "../types/lyric.ts";

const COLOR_BY_CATEGORY: Record<WordCategory, KiteColor> = {
  bright: "gold",
  sound: "white",
  airy: "blue",
  deep: "purple",
  wish: "gold",
  neutral: "white",
};

const PATTERN_BY_CATEGORY: Record<WordCategory, KitePattern> = {
  bright: "wind",
  sound: "sound",
  airy: "wind",
  deep: "ripple",
  wish: "star",
  neutral: "ripple",
};

let nextId = 1;

export interface BoundsLike {
  width: number;
  height: number;
}

export function generateCommunityKiteFromLyric(
  lyric: SelectedLyric,
  bounds: BoundsLike,
): CommunityKite {
  const angle = (Math.random() - 0.5) * Math.PI * 0.9;
  const radius = bounds.width * (0.25 + Math.random() * 0.25);
  const cx = bounds.width * 0.5;
  const cy = bounds.height * 0.42;

  return {
    id: nextId++,
    x: cx + Math.sin(angle) * radius,
    y: cy + Math.cos(angle) * radius * 0.45 - bounds.height * 0.08,
    size: 0.55 + Math.random() * 0.3,
    color: COLOR_BY_CATEGORY[lyric.category],
    pattern: PATTERN_BY_CATEGORY[lyric.category],
    word: lyric.text,
    phase: Math.random() * Math.PI * 2,
    opacity: 0.55 + Math.random() * 0.25,
    type: "lyric",
  };
}

export function generateAmbientCommunityKite(bounds: BoundsLike): CommunityKite {
  const palette: KiteColor[] = ["blue", "red", "white", "purple", "gold"];
  const patterns: KitePattern[] = ["ripple", "wind", "star", "sound"];

  const angle = (Math.random() - 0.5) * Math.PI;
  const radius = bounds.width * (0.3 + Math.random() * 0.3);
  const cx = bounds.width * 0.5;
  const cy = bounds.height * 0.38;

  return {
    id: nextId++,
    x: cx + Math.sin(angle) * radius,
    y: cy + Math.cos(angle) * radius * 0.4 - bounds.height * 0.06,
    size: 0.45 + Math.random() * 0.25,
    color: palette[Math.floor(Math.random() * palette.length)]!,
    pattern: patterns[Math.floor(Math.random() * patterns.length)]!,
    word: "",
    phase: Math.random() * Math.PI * 2,
    opacity: 0.4 + Math.random() * 0.25,
    type: "community",
  };
}
