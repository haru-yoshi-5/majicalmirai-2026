// コンテスト配布の .jsonc（コーラス部分の正しいタイミング）を読み込み、
// フレーズ単位の開始/終了時刻（秒）として取り出す。
//
// 「こたえて」は3段落目が2段落目発声中のコーラスで、TextAlive はこの重なりを
// 正しく表現できず、コーラス範囲の文字に1msのダミー時刻が割り当てられる。
// このデータでコーラス・フレーズの表示タイミングを正しい値に補正する。
//
// .jsonc の構造: [ フレーズ ][ 単語 ][ 文字 ]{ startTime, endTime }（ミリ秒）。
// テキストはファイル内のコメントにのみ存在するため、フレーズ順に対応させて下に定義する。

import raw from "./6W2N_chorus_timings.jsonc?raw";

interface CharTiming {
  startTime: number;
  endTime: number;
}
type ChorusData = CharTiming[][][]; // [phrase][word][char]

// .jsonc のフレーズ順に一致するテキスト（ファイル内コメントと同一）。
const CHORUS_PHRASE_TEXTS = [
  "どれほどの苦しみも悲しみの向こうに",
  "きっと私の目指す私がいると信じ続けていた",
] as const;

export interface ChorusPhraseTiming {
  text: string;
  /** フレーズ開始（秒） */
  startTime: number;
  /** フレーズ終了（秒） */
  endTime: number;
}

function parseChorusTimings(): ChorusPhraseTiming[] {
  try {
    // JSONC（コメント・末尾カンマあり）を素の JSON に変換して解釈する。
    // ※ フォーマッタが末尾カンマを付けるため、コメント除去だけでは parse できない。
    const json = raw
      .replace(/^\s*\/\/.*$/gm, "") // 行コメントを除去
      .replace(/,(\s*[}\]])/g, "$1"); // 末尾カンマを除去
    const data = JSON.parse(json) as ChorusData;
    return data.map((words, i) => {
      const chars = words.flat();
      const startMs = chars[0]?.startTime ?? 0;
      const endMs = chars[chars.length - 1]?.endTime ?? startMs;
      return {
        text: CHORUS_PHRASE_TEXTS[i] ?? "",
        startTime: startMs / 1000,
        endTime: endMs / 1000,
      };
    });
  } catch (e) {
    // 読み込み失敗時もアプリ全体は止めない（コーラス補正だけ無効化）。
    console.warn("コーラスタイミングの読み込みに失敗しました", e);
    return [];
  }
}

export const chorusPhraseTimings: ChorusPhraseTiming[] = parseChorusTimings();
