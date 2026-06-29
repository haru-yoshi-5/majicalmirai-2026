export type WordCategory = "bright" | "sound" | "airy" | "deep" | "wish" | "neutral";

export interface LyricLine {
  time: number;
  text: string;
  /** TextAlive の単語区切り（IWord 単位）。無い場合は表示側で text から推定分割する。 */
  words?: readonly string[];
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
