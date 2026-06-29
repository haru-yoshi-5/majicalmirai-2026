// 夜の部の歌詞分類。昼の utils/classifyWord.ts と対になる夜専用版。
// 分類は bright / sound / festival / deep / wish / neutral（NIGHT_SPEC §10）。

import type { NightWordCategory } from "./yataiTypes.ts";
import { nightCategoryColor } from "./nightColors.ts";
import type { NightCategoryColor } from "./nightColors.ts";

const BRIGHT = ["光", "ひかり", "未来", "夢", "希望", "輝", "明"];
const SOUND = ["声", "歌", "うた", "響", "音", "ソナーレ", "唄", "鳴"];
const FESTIVAL = ["祭", "灯", "あかり", "夜", "街", "進", "賑", "提灯", "屋台", "道"];
const DEEP = ["涙", "迷", "静", "闇", "沈", "深"];
const WISH = ["星", "願", "祈"];

const KEYWORD_TABLE: ReadonlyArray<{
  category: NightWordCategory;
  words: ReadonlyArray<string>;
}> = [
  { category: "bright", words: BRIGHT },
  { category: "sound", words: SOUND },
  { category: "festival", words: FESTIVAL },
  { category: "deep", words: DEEP },
  { category: "wish", words: WISH },
];

export function classifyWordNight(text: string): NightWordCategory {
  for (const { category, words } of KEYWORD_TABLE) {
    if (words.some((k) => text.includes(k))) return category;
  }
  return "neutral";
}

export function extractKeywordNight(text: string): string | null {
  for (const { words } of KEYWORD_TABLE) {
    for (const k of words) {
      if (text.includes(k)) return k;
    }
  }
  return null;
}

export function categoryColorNight(cat: NightWordCategory): NightCategoryColor {
  return nightCategoryColor(cat);
}
