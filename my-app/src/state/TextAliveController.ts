import { SONG_DURATION } from "../data/mockLyrics.ts";

export interface SongPlayerEvents {
  onTimeUpdate: (time: number) => void;
  onPlayStateChange: (isPlaying: boolean) => void;
  onEnded: () => void;
}

export interface SongPlayer {
  play: () => void;
  pause: () => void;
  reset: () => void;
  seek: (time: number) => void;
  getTime: () => number;
  getDuration: () => number;
  isPlaying: () => boolean;
  dispose: () => void;
}

export function createTextAliveController(_events: SongPlayerEvents): SongPlayer {
  // Phase 3 で TextAlive App API と接続する。
  // 現状はインタフェース合わせのスケルトン実装で、何も再生しない。
  // app/App.ts では createMockPlayer の代わりにこれを差し替えるだけで切り替えられる。
  let currentTime = 0;

  return {
    play() {},
    pause() {},
    reset() {
      currentTime = 0;
    },
    seek(time: number) {
      currentTime = Math.max(0, Math.min(SONG_DURATION, time));
    },
    getTime() {
      return currentTime;
    },
    getDuration() {
      return SONG_DURATION;
    },
    isPlaying() {
      return false;
    },
    dispose() {},
  };
}
