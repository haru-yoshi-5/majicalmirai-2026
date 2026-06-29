// 曲終了時の「称号（festivalTitle）」を、屋台の明るさ・共鳴数・deep系の多さから生成する。
// 夜の祭りを灯していく手触りを残すためのもので、評価・優劣ではない。

export interface FestivalSummary {
  /** 到達した屋台の明るさ 0..1 */
  brightness: number;
  /** 共鳴した周囲の提灯の数 */
  resonanceCount: number;
  /** deep系（静かな）歌詞を選んだ回数 */
  deepCount: number;
}

/**
 * 称号を生成する。
 * - 明るく＋共鳴が多い：みんなの夜を灯した屋台
 * - deep系が多い：静かな夜に響いた歌灯り
 * - 明るい：夜を照らした御殿屋台
 * - 中くらい：街を進んだ歌屋台
 * - 低め：湖畔にともる歌灯り
 */
export function generateFestivalTitle(summary: FestivalSummary): string {
  const { brightness, resonanceCount, deepCount } = summary;
  const isHigh = brightness >= 0.66;
  const isMid = brightness >= 0.33;

  if (isHigh && resonanceCount >= 6) return "みんなの夜を灯した屋台";
  if (deepCount >= 4) return "静かな夜に響いた歌灯り";
  if (isHigh) return "夜を照らした御殿屋台";
  if (isMid) return "街を進んだ歌屋台";
  return "湖畔にともる歌灯り";
}
