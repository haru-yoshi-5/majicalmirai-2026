import { CATEGORY_COLORS } from "../theme/colors.ts";
import type { WordCategory } from "../types/lyric.ts";

const BRIGHT = ["未来", "夢", "光", "ひかり", "希望", "輝", "明"];
const SOUND = ["声", "歌", "響", "音", "ソナーレ", "唄", "鳴"];
const AIRY = ["空", "風", "飛", "舞", "翼", "雲", "そら", "宙"];
const DEEP = ["夜", "涙", "迷", "静か", "深", "闇", "沈"];
const WISH = ["星", "願い", "祈り", "祈"];

const KEYWORD_TABLE: ReadonlyArray<{ category: WordCategory; words: ReadonlyArray<string> }> = [
  { category: "bright", words: BRIGHT },
  { category: "sound", words: SOUND },
  { category: "airy", words: AIRY },
  { category: "deep", words: DEEP },
  { category: "wish", words: WISH },
];

export function classifyWord(text: string): WordCategory {
  for (const { category, words } of KEYWORD_TABLE) {
    if (words.some((k) => text.includes(k))) return category;
  }
  return "neutral";
}

export function extractKeyword(text: string): string | null {
  for (const { words } of KEYWORD_TABLE) {
    for (const k of words) {
      if (text.includes(k)) return k;
    }
  }
  return null;
}

export function categoryColor(cat: WordCategory): {
  fill: number;
  glow: number;
  hue: number;
} {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.neutral;
}
