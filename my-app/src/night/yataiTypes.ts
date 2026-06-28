// 夜の部「歌灯りの御殿屋台」の型定義。
// 昼の部 types/kite.ts と対になる、夜の部専用の型。昼の型には一切手を加えない。

/** 屋台の基調色（朱・金・藍・紫・白木） */
export type YataiBaseColor = "vermilion" | "gold" | "indigo" | "purple" | "hinoki";

/** 提灯の色（暖色・青白・桃色・金色・虹色） */
export type LanternColor = "warm" | "cool" | "pink" | "gold" | "rainbow";

/** 屋台幕の紋様（波紋・音・星・花・風） */
export type YataiPattern = "ripple" | "sound" | "star" | "flower" | "wind";

/** 願いの文字 */
export type YataiWish = "歌" | "光" | "夢" | "未来" | "響";

export interface YataiConfig {
  baseColor: YataiBaseColor;
  lanternColor: LanternColor;
  pattern: YataiPattern;
  wish: YataiWish;
}

/**
 * 夜の部の歌詞分類。昼の "airy" を "festival"（祭り・灯り・夜・街）に置き換えている。
 * 昼の WordCategory とは別物として扱う。
 */
export type NightWordCategory = "bright" | "sound" | "festival" | "deep" | "wish" | "neutral";

export interface NightSelectedLyric {
  text: string;
  time: number;
  category: NightWordCategory;
  position: { x: number; y: number };
  selectedAt: number;
}

/** 周囲の提灯（遠景の灯り） */
export interface CommunityLantern {
  id: number;
  x: number;
  y: number;
  size: number;
  color: LanternColor;
  word: string;
  phase: number;
  opacity: number;
  type: "lyric" | "community";
}

/** 周囲の屋台シルエット（Phase 2 想定。MVPでは未使用でもよい） */
export interface CommunityYatai {
  id: number;
  x: number;
  y: number;
  scale: number;
  color: YataiBaseColor;
  lanternCount: number;
  opacity: number;
  phase: number;
}
