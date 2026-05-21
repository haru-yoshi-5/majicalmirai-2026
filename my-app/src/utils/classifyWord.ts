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
  switch (cat) {
    case "bright":
      return { fill: 0xdcfaff, glow: 0xaae6ff, hue: 190 };
    case "sound":
      return { fill: 0xaaf0eb, glow: 0x78dce6, hue: 175 };
    case "airy":
      return { fill: 0xd2e6ff, glow: 0xb4d2ff, hue: 210 };
    case "deep":
      return { fill: 0xbeb4f0, glow: 0x8c78dc, hue: 255 };
    case "wish":
      return { fill: 0xfff0c8, glow: 0xffd278, hue: 45 };
    case "neutral":
    default:
      return { fill: 0xdcebfa, glow: 0xaac8eb, hue: 200 };
  }
}
