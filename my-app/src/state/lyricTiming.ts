import type { LyricLine, SectionRange, SongSection } from "../types/lyric.ts";
import { mockLyrics, sectionRanges, SONG_DURATION } from "../data/mockLyrics.ts";

export function getCurrentLyric(time: number): LyricLine | null {
  if (time < 0) return null;
  let current: LyricLine | null = null;
  for (const line of mockLyrics) {
    if (time >= line.time) {
      current = line;
    } else {
      break;
    }
  }
  return current;
}

export function getCurrentLyricIndex(time: number): number {
  let idx = -1;
  for (let i = 0; i < mockLyrics.length; i += 1) {
    if (time >= mockLyrics[i]!.time) {
      idx = i;
    } else {
      break;
    }
  }
  return idx;
}

export function getCurrentSection(time: number): SongSection {
  if (time >= SONG_DURATION) return "ended";
  for (const range of sectionRanges) {
    if (time >= range.start && time < range.end) {
      return range.section;
    }
  }
  return "intro";
}

export function getSectionInfo(time: number): SectionRange | null {
  for (const range of sectionRanges) {
    if (time >= range.start && time < range.end) {
      return range;
    }
  }
  return null;
}
