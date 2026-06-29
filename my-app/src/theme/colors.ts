/**
 * 湖のソナーレ — Color tokens (TS / PixiJS 用)
 *
 * claude.ai/design「湖のソナーレ Design System」の tokens/colors.css と
 * 同じ色を、PixiJS が扱う数値 hex（0xRRGGBB）として提供する。
 * CSS 側は theme/colors.css、Pixi/TS 側はこのファイルが対になる。
 *
 * 現段階は Day（昼の部）基準。夜の部は今後 NIGHT_* を追加して切り替える。
 */

/** "#RRGGBB" を PixiJS 用の数値 hex に変換する */
export function hex(css: string): number {
  return Number.parseInt(css.replace("#", ""), 16);
}

/** Raw brand palette（昼夜共通） */
export const BRAND = {
  teal: 0x39c5bb,
  tealDeep: 0x128c84,
  tealGlow: 0x5fe6dc,
  tealInk: 0x0c4f4a,
} as const;

/** Day raw palette（昼） */
export const DAY = {
  sky: 0x6ec1e4,
  skyPale: 0xd5eef8,
  skyDeep: 0x2e8fbe,
  sand: 0xefe0bc,
  sandDeep: 0xd8c089,
  sunflower: 0xf6c544,
  sunflowerDeep: 0xe5a317,
} as const;

/** Ink / paper neutrals */
export const NEUTRAL = {
  ink900: 0x12303b,
  ink700: 0x355361,
  ink500: 0x5e7a86,
  ink300: 0x9db1b9,
  paper: 0xfbf7ec,
  paperCard: 0xffffff,
  paperLine: 0xe7dfc9,
} as const;

/** Festival accents */
export const FESTIVAL = {
  matsuriRed: 0xe4503a,
  matsuriRedDeep: 0xbe3320,
  pink: 0xf2879e,
  gold: 0xd9b25a,
} as const;

/**
 * Day（昼の部）のセマンティック色。
 * PixiJS シーンの空・湖・背景などはここを参照する。
 */
export const SCENE_DAY = {
  /** 背景グラデーション上端（空） */
  bgTop: 0xe8f6fc,
  /** 背景グラデーション下端（砂浜の地平） */
  bgBottom: 0xfbf1d6,
  /** 空のベース */
  sky: DAY.sky,
  /** 湖面 */
  lake: DAY.skyDeep,
  /** 湖面ハイライト／反射 */
  lakeShine: 0xffffff,
  /** 影 */
  shadow: 0x12303b,
  /** ブランド（ティール） */
  brand: BRAND.tealDeep,
  brandBright: BRAND.teal,
} as const;

/**
 * 凧の色（KiteColor）→ 昼空に映える数値 hex。
 * 明るい空を背景にするため、彩度の高い祭り色に寄せている。
 */
export const KITE_COLORS = {
  blue: DAY.skyDeep, // 0x2e8fbe
  red: FESTIVAL.matsuriRed, // 0xe4503a
  white: NEUTRAL.paper, // 0xfbf7ec（和紙白）
  purple: 0x8c6fd0,
  gold: DAY.sunflower, // 0xf6c544
} as const;

/**
 * 歌詞分類（WordCategory）ごとの色。
 * 昼の明るい湖面でも読めるよう、深めの fill に調整。
 * hue は風の流線などの HSL 着色に使う。
 */
export const CATEGORY_COLORS = {
  bright: { fill: DAY.sunflower, glow: DAY.sunflowerDeep, hue: 45 },
  sound: { fill: BRAND.teal, glow: BRAND.tealDeep, hue: 175 },
  airy: { fill: DAY.sky, glow: DAY.skyDeep, hue: 200 },
  deep: { fill: 0x243a86, glow: 0x16245c, hue: 230 },
  wish: { fill: DAY.sunflowerDeep, glow: FESTIVAL.gold, hue: 40 },
  neutral: { fill: NEUTRAL.ink500, glow: NEUTRAL.ink700, hue: 200 },
} as const;
