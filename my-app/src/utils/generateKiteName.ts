import type { KiteConfig, KitePattern, SelectedLyric } from "../types/kite.ts";
import type { WordCategory } from "../types/lyric.ts";
import { classifyWord, extractKeyword } from "./classifyWord.ts";

const PATTERN_NAME: Record<KitePattern, string> = {
  ripple: "波紋凧",
  wind: "風凧",
  star: "星凧",
  sound: "音凧",
};

export function generateKiteName(
  lastSelected: SelectedLyric | null,
  kiteConfig: KiteConfig,
): string {
  const patternName = PATTERN_NAME[kiteConfig.pattern];

  if (!lastSelected) {
    return `${kiteConfig.wish}を運ぶ${patternName}`;
  }

  const keyword = extractKeyword(lastSelected.text) ?? lastSelected.text;
  const category: WordCategory = lastSelected.category ?? classifyWord(lastSelected.text);

  switch (category) {
    case "bright":
      return `${keyword}を運ぶ${patternName}`;
    case "sound":
      return `${keyword}ひびく${patternName}`;
    case "airy":
      return `${keyword}へ舞う${patternName}`;
    case "deep":
      return `${keyword}を抱く${patternName}`;
    case "wish":
      return `${keyword}を結ぶ${patternName}`;
    case "neutral":
    default:
      return `ことばを乗せる${patternName}`;
  }
}
