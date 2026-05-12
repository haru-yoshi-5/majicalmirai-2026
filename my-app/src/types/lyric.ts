export type WordCategory = "bright" | "deep" | "sound" | "airy" | "neutral";

export interface LyricLine {
  time: number;
  text: string;
}

export type SongSection =
  | "intro"
  | "verse"
  | "preChorus"
  | "chorus"
  | "bridge"
  | "finalChorus"
  | "outro"
  | "ended";

export interface SectionRange {
  section: SongSection;
  start: number;
  end: number;
}

export interface SelectedWord {
  id: number;
  text: string;
  category: WordCategory;
  x: number;
  y: number;
  bornAt: number;
  phase: number;
}

export interface Ripple {
  id: number;
  x: number;
  y: number;
  bornAt: number;
  maxRadius: number;
  category: WordCategory;
  strength: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  drift: "ambient" | "rise";
}
