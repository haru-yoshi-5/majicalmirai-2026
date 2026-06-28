// 最後にクリックした歌詞から屋台名を生成する（NIGHT_SPEC §14）。
// 昼の utils/generateKiteName.ts と対になる夜専用版。

import type {
  NightSelectedLyric,
  NightWordCategory,
  YataiConfig,
  YataiPattern,
} from "./yataiTypes.ts";
import { classifyWordNight, extractKeywordNight } from "./classifyWordNight.ts";

const PATTERN_NAME: Record<YataiPattern, string> = {
  ripple: "波紋屋台",
  sound: "音灯り屋台",
  star: "星灯り屋台",
  flower: "花灯り屋台",
  wind: "風灯り屋台",
};

export function generateYataiName(
  lastSelected: NightSelectedLyric | null,
  yataiConfig: YataiConfig,
): string {
  const patternName = PATTERN_NAME[yataiConfig.pattern];

  // 歌詞を一度もクリックしていない場合は願いの文字を使う。
  if (!lastSelected) {
    return `${yataiConfig.wish}を灯す${patternName}`;
  }

  const keyword = extractKeywordNight(lastSelected.text) ?? lastSelected.text;
  const category: NightWordCategory = lastSelected.category ?? classifyWordNight(lastSelected.text);

  switch (category) {
    case "bright":
      return `${keyword}を灯す${patternName}`;
    case "sound":
      return `${keyword}ひびく${patternName}`;
    case "festival":
      return `${keyword}を運ぶ${patternName}`;
    case "deep":
      return `${keyword}を抱く${patternName}`;
    case "wish":
      return `${keyword}を結ぶ${patternName}`;
    case "neutral":
    default:
      return `ことばを灯す${patternName}`;
  }
}
