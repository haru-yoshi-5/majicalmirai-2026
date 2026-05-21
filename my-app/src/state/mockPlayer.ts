import { SONG_DURATION } from "../data/mockLyrics.ts";
import type { SongPlayer, SongPlayerEvents } from "./TextAliveController.ts";

export function createMockPlayer(events: SongPlayerEvents): SongPlayer {
  let currentTime = 0;
  let isPlaying = false;
  let lastTick = 0;
  let rafId = 0;

  const tick = (now: number) => {
    if (!isPlaying) return;
    const dt = (now - lastTick) / 1000;
    lastTick = now;
    currentTime = Math.min(SONG_DURATION, currentTime + dt);
    events.onTimeUpdate(currentTime);
    if (currentTime >= SONG_DURATION) {
      isPlaying = false;
      events.onPlayStateChange(false);
      events.onEnded();
      return;
    }
    rafId = requestAnimationFrame(tick);
  };

  return {
    play() {
      if (isPlaying) return;
      if (currentTime >= SONG_DURATION) {
        currentTime = 0;
        events.onTimeUpdate(currentTime);
      }
      isPlaying = true;
      lastTick = performance.now();
      events.onPlayStateChange(true);
      rafId = requestAnimationFrame(tick);
    },
    pause() {
      if (!isPlaying) return;
      isPlaying = false;
      cancelAnimationFrame(rafId);
      events.onPlayStateChange(false);
    },
    reset() {
      isPlaying = false;
      cancelAnimationFrame(rafId);
      currentTime = 0;
      events.onPlayStateChange(false);
      events.onTimeUpdate(currentTime);
    },
    seek(time: number) {
      currentTime = Math.max(0, Math.min(SONG_DURATION, time));
      events.onTimeUpdate(currentTime);
    },
    getTime() {
      return currentTime;
    },
    getDuration() {
      return SONG_DURATION;
    },
    isPlaying() {
      return isPlaying;
    },
    dispose() {
      cancelAnimationFrame(rafId);
    },
  };
}

export type MockPlayer = SongPlayer;
