// エンディング画面（NIGHT_SPEC §7.4）。
// レイアウトは昼と共有の .ending-* クラスを再利用し、文言だけ夜の部仕様にする。
// 背景色は night.css の [data-mode="night"] .ending-overlay で夜向けに上書きする。

import type { NightSelectedLyric, YataiConfig } from "./yataiTypes.ts";
import { generateYataiName } from "./generateYataiName.ts";

export interface NightEndingOverlayOptions {
  onReplay: () => void;
  onTitle: () => void;
}

export interface NightEndingShowParams {
  yataiConfig: YataiConfig;
  selectedLyrics: ReadonlyArray<NightSelectedLyric>;
  /** 祭りの称号（明るさ・共鳴・deep系から生成）。未指定なら称号欄を出さない。 */
  festivalTitle?: string;
  /** 灯した提灯の数（＝歌詞をクリックした回数）。 */
  lanternCount?: number;
  /** 共鳴した周囲の提灯の数。 */
  resonanceCount?: number;
}

export function createNightEndingOverlay(parent: HTMLElement, options: NightEndingOverlayOptions) {
  const root = document.createElement("div");
  root.className = "ending-overlay night-ending";
  root.setAttribute("aria-hidden", "true");

  const card = document.createElement("div");
  card.className = "ending-card";

  const headline = document.createElement("p");
  headline.className = "ending-headline";
  headline.textContent = "あなたが灯した屋台";

  const title = document.createElement("h1");
  title.className = "ending-title";
  title.textContent = "";

  // 称号（festivalTitle）
  const flightLabel = document.createElement("p");
  flightLabel.className = "ending-label";
  flightLabel.textContent = "称号";

  const flightTitleEl = document.createElement("p");
  flightTitleEl.className = "ending-flight-title";

  const lastLabel = document.createElement("p");
  lastLabel.className = "ending-label";
  lastLabel.textContent = "最後に選んだ歌詞";

  const lastLyric = document.createElement("p");
  lastLyric.className = "ending-last-lyric";

  // 灯した提灯・共鳴した灯りの記録
  const stats = document.createElement("div");
  stats.className = "ending-stats";
  const lanternStat = document.createElement("p");
  lanternStat.className = "ending-stat";
  const resoStat = document.createElement("p");
  resoStat.className = "ending-stat";
  stats.append(lanternStat, resoStat);

  const wordsLabel = document.createElement("p");
  wordsLabel.className = "ending-label";
  wordsLabel.textContent = "この屋台を灯した言葉";

  const wordList = document.createElement("p");
  wordList.className = "ending-words";

  const actions = document.createElement("div");
  actions.className = "ending-actions";

  const replayButton = document.createElement("button");
  replayButton.type = "button";
  replayButton.className = "ending-button ending-button-primary";
  replayButton.textContent = "もう一度体験する";
  replayButton.addEventListener("click", () => {
    options.onReplay();
  });

  const titleButton = document.createElement("button");
  titleButton.type = "button";
  titleButton.className = "ending-button";
  titleButton.textContent = "タイトルへ戻る";
  titleButton.addEventListener("click", () => {
    options.onTitle();
  });

  actions.appendChild(replayButton);
  actions.appendChild(titleButton);

  card.appendChild(headline);
  card.appendChild(title);
  card.appendChild(flightLabel);
  card.appendChild(flightTitleEl);
  card.appendChild(lastLabel);
  card.appendChild(lastLyric);
  card.appendChild(stats);
  card.appendChild(wordsLabel);
  card.appendChild(wordList);
  card.appendChild(actions);
  root.appendChild(card);
  parent.appendChild(root);

  function show(params: NightEndingShowParams) {
    const { yataiConfig, selectedLyrics, festivalTitle, lanternCount, resonanceCount } = params;
    const last = selectedLyrics.length > 0 ? selectedLyrics[selectedLyrics.length - 1]! : null;
    title.textContent = `「${generateYataiName(last, yataiConfig)}」`;

    // 称号（指定があるときだけ表示）
    if (festivalTitle) {
      flightTitleEl.textContent = festivalTitle;
      flightLabel.style.display = "";
      flightTitleEl.style.display = "";
    } else {
      flightLabel.style.display = "none";
      flightTitleEl.style.display = "none";
    }

    if (last) {
      lastLyric.textContent = last.text;
    } else {
      lastLyric.textContent = "（歌詞には触れなかった）";
    }

    // 灯した提灯・共鳴した灯りの記録
    const lanterns = lanternCount ?? selectedLyrics.length;
    const reso = resonanceCount ?? 0;
    lanternStat.textContent = `灯した提灯　${lanterns}個`;
    resoStat.textContent = `共鳴した灯り　${reso}つ`;

    if (selectedLyrics.length === 0) {
      wordList.textContent = yataiConfig.wish;
    } else {
      const seen = new Set<string>();
      const labels: string[] = [];
      for (const w of selectedLyrics) {
        if (seen.has(w.text)) continue;
        seen.add(w.text);
        labels.push(w.text);
      }
      // たくさん選んでも一覧が伸びすぎないよう、先頭からの一定数＋残り件数にまとめる
      const MAX_WORDS = 14;
      if (labels.length > MAX_WORDS) {
        wordList.textContent = `${labels.slice(0, MAX_WORDS).join("　")}　…ほか${labels.length - MAX_WORDS}語`;
      } else {
        wordList.textContent = labels.join("　");
      }
    }
    root.classList.add("is-visible");
    root.setAttribute("aria-hidden", "false");
  }

  function hide() {
    root.classList.remove("is-visible");
    root.setAttribute("aria-hidden", "true");
  }

  function dispose() {
    root.remove();
  }

  return {
    root,
    show,
    hide,
    dispose,
  };
}

export type NightEndingOverlay = ReturnType<typeof createNightEndingOverlay>;
