import { Player } from "textalive-app-api";
import type { IPhrase, IPlayerApp, IRepetitiveSegment, IWord } from "textalive-app-api";
import { chorusPhraseTimings } from "../data/chorusTimings.ts";
import type { LyricLine } from "../types/lyric.ts";

/**
 * TextAlive の形態素を文節くらいの塊にまとめる。
 * 自立語で新しい塊を始め、付属語（助詞 P・助動詞 M・記号 S）と接頭詞 F の続きを連結する。
 * 例: 君(N) の(P) こたえ(N) を(P) 聞か(V) せ(M) て(P) → 「君の」「こたえを」「聞かせて」
 */
function groupIntoBunsetsu(words: readonly IWord[]): string[] {
  const chunks: string[] = [];
  let prevWasPrefix = false;
  for (const w of words) {
    const text = w.text;
    if (!text) continue;
    const attachToPrev =
      chunks.length > 0 && (w.pos === "P" || w.pos === "M" || w.pos === "S" || prevWasPrefix);
    if (attachToPrev) {
      chunks[chunks.length - 1] += text;
    } else {
      chunks.push(text);
    }
    prevWasPrefix = w.pos === "F"; // 接頭詞は次の語を連結（例: お+名前）
  }
  return chunks;
}

/**
 * コーラス（3段落目）の1ms問題を配布データで補正する。
 * 主旋律（2段落目）はそのまま残し、コーラスは別レイヤーの「（…）」ブロックとして
 * 区間中まとめて重ねて表示する。壊れた時刻のコーラス各フレーズはメインから取り除く。
 * @returns 重ねて表示するコーラス・オーバーレイ（区間ごと）
 */
function buildChorusOverlays(lyrics: LyricLine[]): ChorusOverlayBlock[] {
  const texts = chorusPhraseTimings.map((c) => c.text).filter((t) => t.length > 0);
  if (texts.length === 0) return [];

  // 壊れた時刻のコーラス各フレーズ（テキスト一致）をメインの流れから取り除く。
  const chorusTextSet = new Set(texts);
  for (let i = lyrics.length - 1; i >= 0; i -= 1) {
    if (chorusTextSet.has(lyrics[i]!.text)) lyrics.splice(i, 1);
  }

  const start = Math.min(...chorusPhraseTimings.map((c) => c.startTime));
  const end = Math.max(...chorusPhraseTimings.map((c) => c.endTime));

  // 2フレーズを「（…）」で括った1ブロックにまとめる（各行を1チャンクとしてクリック可）。
  const words = texts.map((t, i) => {
    let w = t;
    if (i === 0) w = `（${w}`;
    if (i === texts.length - 1) w = `${w}）`;
    return w;
  });
  return [{ start, end, text: `（${texts.join("　")}）`, words }];
}

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

/**
 * 主旋律に重ねて表示するコーラス（3段落目）のブロック。
 * メインの歌詞表示とは別レイヤーで、区間中まとめて表示する。
 */
export interface ChorusOverlayBlock {
  start: number;
  end: number;
  text: string;
  words: readonly string[];
}

export interface TextAliveBundle {
  player: SongPlayer;
  lyrics: readonly LyricLine[];
  chorus: readonly ChorusRange[];
  chorusOverlays: readonly ChorusOverlayBlock[];
  duration: number;
  lastPhraseEnd: number;
}

/**
 * 音楽地図（歌詞・サビ・ビート等）のバージョン固定用ID。
 * 公式の課題曲ガイドラインで配布される訂正履歴IDを指定すると、
 * 歌詞タイミングやサビ範囲が固定され、再解析の影響を受けなくなる。
 * 未指定（0）のマップはそのデータを読み込まない＝解析待ちを短縮できる。
 */
export interface SongMapIds {
  beatId?: number;
  chordId?: number;
  repetitiveSegmentId?: number;
  lyricId?: number;
  lyricDiffId?: number;
}

export interface TextAliveOptions {
  songUrl: string;
  /** 音楽地図のバージョン固定ID。未指定ならビート/コードを読み込まない既定にフォールバック。 */
  mapIds?: SongMapIds;
  appToken?: string;
  appName?: string;
  /**
   * 「こたえて」専用のコーラス（3段落目）1ms問題を配布データで補正するか。
   * 補正データ（6W2N_chorus_timings.jsonc）は曲固有のため、対象曲のみ true にする。
   */
  chorusOverlayFix?: boolean;
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

    // 読み込みが進まないまま固まった場合の保険（無限ローディング防止）
    const LOAD_TIMEOUT_MS = 30_000;
    let loadTimer: ReturnType<typeof setTimeout> | null = null;
    const clearLoadTimer = () => {
      if (loadTimer !== null) {
        clearTimeout(loadTimer);
        loadTimer = null;
      }
    };
    const settleReject = (err: unknown) => {
      if (resolved) return;
      resolved = true;
      clearLoadTimer();
      reject(err instanceof Error ? err : new Error(String(err)));
    };
    loadTimer = setTimeout(() => {
      settleReject(
        new Error(
          `TextAlive の読み込みが ${LOAD_TIMEOUT_MS / 1000} 秒以内に完了しませんでした。` +
            "トークンの有効性・楽曲URL・ネットワーク接続を確認してください。",
        ),
      );
    }, LOAD_TIMEOUT_MS);

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
          // このアプリが使うのは歌詞(phrase)とサビ(getChoruses)だけ。
          // コード進行・ビートは未使用なので読み込まない(0)ことで解析待ちを短縮する。
          // lyricId / repetitiveSegmentId は未指定=最新リビジョンを取得する。
          // 音楽地図のバージョン固定。未指定のマップ(0)は読み込まない。
          const mapIds = options.mapIds ?? { beatId: 0, chordId: 0 };
          void player
            .createFromSongUrl(options.songUrl, { video: mapIds })
            .catch((err: unknown) => {
              settleReject(err);
            });
        }
      },
      onError: (e: unknown) => {
        // App 認可・楽曲読み込み・ネットワーク等で発生したエラー。
        // ここで reject しないと resolve も reject もされず無限ローディングになる。
        const message =
          e instanceof Error
            ? e.message
            : ((e as { message?: string } | null)?.message ?? String(e));
        settleReject(new Error(`TextAlive エラー: ${message}`));
      },
      onVideoReady: () => {
        if (resolved) return;
        resolved = true;
        clearLoadTimer();

        const lyrics: LyricLine[] = [];
        let lastPhraseEndMs = 0;
        let phrase: IPhrase | null = player.video?.firstPhrase ?? null;
        while (phrase) {
          // TextAlive の形態素を文節くらいの塊にまとめる（助詞などは前の語に連結）。
          const words = groupIntoBunsetsu(phrase.children);
          lyrics.push({
            time: phrase.startTime / 1000,
            text: phrase.text,
            words,
          });
          if (phrase.endTime > lastPhraseEndMs) {
            lastPhraseEndMs = phrase.endTime;
          }
          phrase = phrase.next ?? null;
        }

        // コーラス（3段落目）の1ms問題を配布データで補正する（対象曲のみ）。
        // 主旋律は残し、コーラスは別レイヤーのオーバーレイとして返す。
        const chorusOverlays = options.chorusOverlayFix ? buildChorusOverlays(lyrics) : [];

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
          chorusOverlays,
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
