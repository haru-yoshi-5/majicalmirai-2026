import { Player } from "textalive-app-api";
import type { IPhrase, IPlayerApp, IRepetitiveSegment } from "textalive-app-api";
import type { LyricLine } from "../types/lyric.ts";

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

export interface ChorusRange {
  start: number;
  end: number;
}

export interface TextAliveBundle {
  player: SongPlayer;
  lyrics: readonly LyricLine[];
  chorus: readonly ChorusRange[];
  duration: number;
  lastPhraseEnd: number;
}

export interface TextAliveOptions {
  songUrl: string;
  appToken?: string;
  appName?: string;
}

const DEFAULT_APP_NAME = "湖風の歌詞凧";

export function createTextAliveController(
  events: SongPlayerEvents,
  options: TextAliveOptions,
): Promise<TextAliveBundle> {
  const envToken = import.meta.env.VITE_TEXTALIVE_APP_TOKEN as string | undefined;
  const token = options.appToken ?? envToken;
  if (!token || token === "YOUR_TOKEN_HERE") {
    return Promise.reject(
      new Error(
        "TextAlive App Token が設定されていません。my-app/.env.local に VITE_TEXTALIVE_APP_TOKEN を設定してください。",
      ),
    );
  }

  return new Promise<TextAliveBundle>((resolve, reject) => {
    const player = new Player({
      app: { token, appName: options.appName ?? DEFAULT_APP_NAME },
    });

    let currentTime = 0;
    let lastTimeSec = 0;
    let resolved = false;
    let endedFired = false;

    const durationSec = (): number => {
      const ms = player.video?.duration ?? 0;
      return ms > 0 ? ms / 1000 : 0;
    };

    const songPlayer: SongPlayer = {
      play() {
        endedFired = false;
        const dur = durationSec();
        if (dur > 0 && currentTime >= dur - 0.05) {
          player.requestMediaSeek(0);
        }
        player.requestPlay();
      },
      pause() {
        player.requestPause();
      },
      reset() {
        endedFired = false;
        currentTime = 0;
        lastTimeSec = 0;
        player.requestStop();
        player.requestMediaSeek(0);
        events.onTimeUpdate(0);
        events.onPlayStateChange(false);
      },
      seek(time) {
        const dur = durationSec();
        const clamped = dur > 0 ? Math.max(0, Math.min(dur, time)) : Math.max(0, time);
        player.requestMediaSeek(clamped * 1000);
      },
      getTime() {
        return currentTime;
      },
      getDuration() {
        return durationSec();
      },
      isPlaying() {
        return player.isPlaying;
      },
      dispose() {
        try {
          player.dispose();
        } catch {
          // dispose 時の例外は無視（プレイヤー破棄中の二重 dispose 等）
        }
      },
    };

    player.addListener({
      onAppReady: (app: IPlayerApp) => {
        // TextAlive App Host に管理されていない場合は自前で楽曲を読み込む
        if (!app.managed) {
          void player.createFromSongUrl(options.songUrl).catch((err: unknown) => {
            if (!resolved) {
              resolved = true;
              reject(err instanceof Error ? err : new Error(String(err)));
            }
          });
        }
      },
      onVideoReady: () => {
        if (resolved) return;
        resolved = true;

        const lyrics: LyricLine[] = [];
        let lastPhraseEndMs = 0;
        let phrase: IPhrase | null = player.video?.firstPhrase ?? null;
        while (phrase) {
          lyrics.push({
            time: phrase.startTime / 1000,
            text: phrase.text,
          });
          if (phrase.endTime > lastPhraseEndMs) {
            lastPhraseEndMs = phrase.endTime;
          }
          phrase = phrase.next ?? null;
        }

        const chorus: ChorusRange[] = [];
        const choruses: IRepetitiveSegment[] = player.getChoruses() ?? [];
        for (const seg of choruses) {
          chorus.push({
            start: seg.startTime / 1000,
            end: seg.endTime / 1000,
          });
        }

        resolve({
          player: songPlayer,
          lyrics,
          chorus,
          duration: durationSec(),
          lastPhraseEnd: lastPhraseEndMs / 1000,
        });
      },
      onTimeUpdate: (positionMs: number) => {
        currentTime = positionMs / 1000;
        lastTimeSec = currentTime;
        events.onTimeUpdate(currentTime);
      },
      onPlay: () => {
        endedFired = false;
        events.onPlayStateChange(true);
      },
      onPause: () => {
        events.onPlayStateChange(false);
      },
      onStop: () => {
        events.onPlayStateChange(false);
        const dur = durationSec();
        if (!endedFired && dur > 0 && lastTimeSec >= dur - 0.25) {
          endedFired = true;
          events.onEnded();
        }
      },
    });
  });
}
