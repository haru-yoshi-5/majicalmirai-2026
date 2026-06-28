import type { LyricLine, SongSection } from "../types/lyric.ts";
import type { ChorusOverlayBlock, ChorusRange } from "./TextAliveController.ts";

export interface LyricSource {
  getLyrics(): readonly LyricLine[];
  getCurrentLyric(time: number): LyricLine | null;
  /** 主旋律に重ねて表示するコーラス・ブロック（無ければ null）。 */
  getChorusOverlay(time: number): ChorusOverlayBlock | null;
  getCurrentSection(time: number): SongSection;
  getDuration(): number;
}

export interface TextAliveLyricInput {
  lyrics: readonly LyricLine[];
  chorus: readonly ChorusRange[];
  chorusOverlays: readonly ChorusOverlayBlock[];
  duration: number;
  lastPhraseEnd: number;
}

export function createTextAliveLyricSource(input: TextAliveLyricInput): LyricSource {
  const { lyrics, chorus, chorusOverlays, duration, lastPhraseEnd } = input;
  const introEnd = lyrics.length > 0 ? lyrics[0]!.time : 0;
  const outroStart = Math.max(lastPhraseEnd, chorus[chorus.length - 1]?.end ?? 0);

  return {
    getLyrics() {
      return lyrics;
    },
    getCurrentLyric(time) {
      if (time < 0 || lyrics.length === 0) return null;
      let current: LyricLine | null = null;
      for (const line of lyrics) {
        if (time >= line.time) {
          current = line;
        } else {
          break;
        }
      }
      return current;
    },
    getChorusOverlay(time) {
      for (const block of chorusOverlays) {
        if (time >= block.start && time < block.end) return block;
      }
      return null;
    },
    getCurrentSection(time): SongSection {
      if (duration > 0 && time >= duration) return "ended";
      if (time < introEnd) return "intro";
      for (let i = 0; i < chorus.length; i += 1) {
        const seg = chorus[i]!;
        if (time >= seg.start && time < seg.end) {
          return i === chorus.length - 1 ? "finalChorus" : "chorus";
        }
      }
      if (outroStart > 0 && time >= outroStart) return "outro";
      return "verse";
    },
    getDuration() {
      return duration;
    },
  };
}
