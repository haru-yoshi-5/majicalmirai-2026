// 周囲の提灯（遠景の灯り）を自動生成する（NIGHT_SPEC §13）。
// 昼の utils/generateCommunityKite.ts と対になる夜専用版。

import type {
  CommunityLantern,
  LanternColor,
  NightSelectedLyric,
  NightWordCategory,
} from "./yataiTypes.ts";

const COLOR_BY_CATEGORY: Record<NightWordCategory, LanternColor> = {
  bright: "gold",
  sound: "cool",
  festival: "warm",
  deep: "cool",
  wish: "gold",
  neutral: "warm",
};

let nextId = 1;

export interface BoundsLike {
  width: number;
  height: number;
}

/** 地平付近（遠景）の灯りとして配置するためのY座標を返す */
function distantLanternY(bounds: BoundsLike): number {
  const horizonY = bounds.height * 0.6;
  return horizonY - bounds.height * (0.02 + Math.random() * 0.12);
}

export function generateCommunityLanternFromLyric(
  lyric: NightSelectedLyric,
  bounds: BoundsLike,
): CommunityLantern {
  return {
    id: nextId++,
    x: bounds.width * (0.08 + Math.random() * 0.84),
    y: distantLanternY(bounds),
    size: 0.6 + Math.random() * 0.4,
    color: COLOR_BY_CATEGORY[lyric.category],
    word: lyric.text,
    phase: Math.random() * Math.PI * 2,
    opacity: 0.55 + Math.random() * 0.3,
    type: "lyric",
  };
}

export function generateAmbientCommunityLantern(bounds: BoundsLike): CommunityLantern {
  const palette: LanternColor[] = ["warm", "cool", "pink", "gold"];
  return {
    id: nextId++,
    x: bounds.width * (0.05 + Math.random() * 0.9),
    y: distantLanternY(bounds),
    size: 0.45 + Math.random() * 0.3,
    color: palette[Math.floor(Math.random() * palette.length)]!,
    word: "",
    phase: Math.random() * Math.PI * 2,
    opacity: 0.4 + Math.random() * 0.25,
    type: "community",
  };
}
