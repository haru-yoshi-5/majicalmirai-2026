// 曲終了時の「称号（flightTitle）」を、到達高度・安定度・共鳴数から生成する。
// 凧揚げの駆け引きの結果に手触りを与えるためのもので、評価・優劣ではない。

export interface FlightSummary {
  /** 到達高度 0..1 */
  altitude: number;
  /** 安定度 0..1 */
  stability: number;
  /** 共鳴した周囲の凧の数 */
  resonanceCount: number;
}

/**
 * 称号を生成する。
 * - 高く＋共鳴が多い：みんなの空をひらいた歌詞凧
 * - 高いが安定が低い：荒風を越えた歌詞凧
 * - 高い：祭りの空へ届いた歌詞凧
 * - 中くらい：町を越えた歌詞凧
 * - 低い（安定）：湖畔に咲いた歌詞凧
 */
export function generateFlightTitle(summary: FlightSummary): string {
  const { altitude, stability, resonanceCount } = summary;
  const isHigh = altitude >= 0.66;
  const isMid = altitude >= 0.33;

  if (isHigh && resonanceCount >= 6) return "みんなの空をひらいた歌詞凧";
  if (isHigh && stability < 0.4) return "荒風を越えた歌詞凧";
  if (isHigh) return "祭りの空へ届いた歌詞凧";
  if (isMid) return "町を越えた歌詞凧";
  return "湖畔に咲いた歌詞凧";
}
