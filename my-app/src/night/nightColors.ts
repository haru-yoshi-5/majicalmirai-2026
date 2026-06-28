/**
 * 夜の部「歌灯りの御殿屋台」の色トークン（TS / PixiJS 用）。
 *
 * 昼の theme/colors.ts には手を加えず、夜の部の数値 hex はこのファイルに集約する。
 * 値は theme/colors.css の Night raw palette（--indigo-*, --lantern-* 等）と対応させている。
 * （CSS 側 [data-mode="night"] が DOM の色、こちらが PixiJS の色を担当する）
 */

import type { LanternColor, NightWordCategory, YataiBaseColor } from "./yataiTypes.ts";

/** 夜空・湖面などシーン背景のセマンティック色 */
export const NIGHT_SCENE = {
  /** 夜空グラデーション上端 */
  skyTop: 0x070e27, // --indigo-950
  /** 夜空グラデーション中段 */
  skyMid: 0x0c1740, // --indigo-900
  /** 地平付近（街灯りでわずかに明るい） */
  skyHorizon: 0x18204f,
  /** 湖面／濡れた石畳のベース */
  lake: 0x0a1336,
  /** 湖面の輝き・反射ハイライト */
  lakeShine: 0xbfe9ff,
  /** 星 */
  star: 0xeaf3ff,
  /** 月 */
  moon: 0xfff3cf,
} as const;

/** 屋台の基調色（YataiBaseColor）→ 数値 hex */
export const YATAI_BASE_COLORS: Record<YataiBaseColor, number> = {
  vermilion: 0xbe3320, // 朱（--matsuri-red-deep）
  gold: 0xd9b25a, // 金（--gold）
  indigo: 0x27408b, // 藍
  purple: 0x6f4fb0, // 紫
  hinoki: 0xcdb892, // 白木
};

export interface LanternTone {
  /** 提灯本体の発光色 */
  core: number;
  /** 周囲のグロー色 */
  glow: number;
  /** HSL 着色に使う色相（rainbow は時間で巡回するため未使用） */
  hue: number;
  /** 虹色（時間で色相が巡回する特殊提灯） */
  rainbow?: boolean;
}

/** 提灯の色（LanternColor）→ 発光トーン */
export const LANTERN_COLORS: Record<LanternColor, LanternTone> = {
  warm: { core: 0xffb357, glow: 0xffd9a0, hue: 32 },
  cool: { core: 0x9fd8ff, glow: 0xd6f0ff, hue: 205 },
  pink: { core: 0xffa6c4, glow: 0xffd0e2, hue: 335 },
  gold: { core: 0xffd24a, glow: 0xffe9a0, hue: 46 },
  rainbow: { core: 0xff8fae, glow: 0xffffff, hue: 0, rainbow: true },
};

export interface NightCategoryColor {
  fill: number;
  glow: number;
  hue: number;
}

/** 歌詞分類（NightWordCategory）ごとの色（夜の暗い背景で映える発光寄り） */
export const NIGHT_CATEGORY_COLORS: Record<NightWordCategory, NightCategoryColor> = {
  bright: { fill: 0xffd24a, glow: 0xffe9a0, hue: 46 },
  sound: { fill: 0x5fe6dc, glow: 0x39c5bb, hue: 175 },
  festival: { fill: 0xff7a4d, glow: 0xffb38a, hue: 18 },
  deep: { fill: 0x6b7cff, glow: 0x3a4aa0, hue: 230 },
  wish: { fill: 0xffe6b0, glow: 0xfff3cf, hue: 44 },
  neutral: { fill: 0xc2d2f0, glow: 0x8194c4, hue: 210 },
};

export function nightCategoryColor(cat: NightWordCategory): NightCategoryColor {
  return NIGHT_CATEGORY_COLORS[cat] ?? NIGHT_CATEGORY_COLORS.neutral;
}

/** HSL(0-360, 0-1, 0-1) を PixiJS 用の数値 hex に変換する */
export function hslToHex(hue: number, sat: number, light: number): number {
  const h = (((hue % 360) + 360) % 360) / 360;
  const s = Math.max(0, Math.min(1, sat));
  const l = Math.max(0, Math.min(1, light));
  if (s === 0) {
    const v = Math.round(l * 255);
    return (v << 16) | (v << 8) | v;
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hueToRgb(p, q, h + 1 / 3);
  const g = hueToRgb(p, q, h);
  const b = hueToRgb(p, q, h - 1 / 3);
  return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
}

function hueToRgb(p: number, q: number, t: number): number {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}
