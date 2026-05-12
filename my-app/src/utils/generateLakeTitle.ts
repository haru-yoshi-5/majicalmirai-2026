import type { SelectedWord, WordCategory } from "../types/lyric.ts";

export function generateLakeTitle(words: ReadonlyArray<SelectedWord>): string {
  if (words.length === 0) {
    return "しずかな湖のソナーレ";
  }

  const counts: Record<WordCategory, number> = {
    bright: 0,
    deep: 0,
    sound: 0,
    airy: 0,
    neutral: 0,
  };
  for (const w of words) {
    counts[w.category] += 1;
  }

  const top = (Object.keys(counts) as WordCategory[]).reduce((a, b) =>
    counts[a] >= counts[b] ? a : b,
  );

  switch (top) {
    case "bright":
      return "ひかりのソナーレ";
    case "deep":
      return "静寂のソナーレ";
    case "sound":
      return "こえのソナーレ";
    case "airy":
      return "星映しのソナーレ";
    case "neutral":
    default:
      return "ことばのソナーレ";
  }
}
