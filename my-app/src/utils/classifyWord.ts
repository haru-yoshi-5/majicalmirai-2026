import type { WordCategory } from "../types/lyric.ts";

const BRIGHT = ["光", "ひかり", "未来", "夢", "希望", "輝", "明"];
const DEEP = ["夜", "静か", "深い", "涙", "闇", "沈", "孤"];
const SOUND = ["歌", "響", "声", "音", "ソナーレ", "唄", "鳴"];
const AIRY = ["風", "空", "星", "雲", "そら", "宙", "翼"];

export function classifyWord(text: string): WordCategory {
  if (BRIGHT.some((k) => text.includes(k))) return "bright";
  if (SOUND.some((k) => text.includes(k))) return "sound";
  if (DEEP.some((k) => text.includes(k))) return "deep";
  if (AIRY.some((k) => text.includes(k))) return "airy";
  return "neutral";
}

export function categoryColor(cat: WordCategory): {
  fill: string;
  glow: string;
  hue: number;
} {
  switch (cat) {
    case "bright":
      return { fill: "rgba(220, 250, 255, 0.92)", glow: "rgba(170, 230, 255, 0.7)", hue: 190 };
    case "deep":
      return { fill: "rgba(190, 180, 240, 0.85)", glow: "rgba(140, 120, 220, 0.6)", hue: 255 };
    case "sound":
      return { fill: "rgba(170, 240, 235, 0.9)", glow: "rgba(120, 220, 230, 0.7)", hue: 175 };
    case "airy":
      return { fill: "rgba(210, 230, 255, 0.9)", glow: "rgba(180, 210, 255, 0.65)", hue: 210 };
    case "neutral":
    default:
      return { fill: "rgba(220, 235, 250, 0.85)", glow: "rgba(170, 200, 235, 0.6)", hue: 200 };
  }
}
