export type WordCategory = "bright" | "sound" | "airy" | "deep" | "wish" | "neutral";

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
