import { Player } from "textalive-app-api";
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

// TextAlive App API の開発者トークン。Phase 3 で本物に差し替える前提のプレースホルダ。
// 本番では環境変数や外部設定から注入する想定で、コミット用のリポジトリに本物の値を直書きしない。
const TEXTALIVE_APP_TOKEN = "test";

export function createTextAliveController(_events: SongPlayerEvents): SongPlayer {
  // Phase 3 で TextAlive App API と接続する。
  // 現状は Player の初期化だけ済ませたスケルトン実装で、まだ実楽曲は再生しない。
  // app/App.ts では createMockPlayer の代わりにこれを差し替えるだけで切り替えられる。
  let currentTime = 0;

  const player = new Player({
    app: { token: TEXTALIVE_APP_TOKEN },
  });

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
    dispose() {
      player.dispose();
    },
  };
}
