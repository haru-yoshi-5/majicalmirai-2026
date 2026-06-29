import type { KiteConfig, SelectedLyric } from "../types/kite.ts";
import { generateKiteName } from "../utils/generateKiteName.ts";

export interface EndingOverlayOptions {
  onReplay: () => void;
  onTitle: () => void;
}

export interface EndingShowParams {
  kiteConfig: KiteConfig;
  selectedLyrics: ReadonlyArray<SelectedLyric>;
  /** 飛行の称号（高度・安定度・共鳴から生成）。未指定なら称号欄を出さない。 */
  flightTitle?: string;
  /** 湖風の回数（＝歌詞をクリックした回数）。 */
  windCount?: number;
  /** 共鳴した周囲の凧の数。 */
  resonanceCount?: number;
}

export function createEndingOverlay(parent: HTMLElement, options: EndingOverlayOptions) {
  const root = document.createElement("div");
  root.className = "ending-overlay";
  root.setAttribute("aria-hidden", "true");

  const card = document.createElement("div");
  card.className = "ending-card";

  const headline = document.createElement("p");
  headline.className = "ending-headline";
  headline.textContent = "あなたが揚げた凧";

  const title = document.createElement("h1");
  title.className = "ending-title";
  title.textContent = "";

  // 称号（flightTitle）
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

  // 駆け引きの記録（湖風の回数・共鳴した凧の数）
  const stats = document.createElement("div");
  stats.className = "ending-stats";
  const windStat = document.createElement("p");
  windStat.className = "ending-stat";
  const resoStat = document.createElement("p");
  resoStat.className = "ending-stat";
  stats.append(windStat, resoStat);

  const windLabel = document.createElement("p");
  windLabel.className = "ending-label";
  windLabel.textContent = "この凧を起こした風";

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
  card.appendChild(windLabel);
  card.appendChild(wordList);
  card.appendChild(actions);
  root.appendChild(card);
  parent.appendChild(root);

  function show(params: EndingShowParams) {
    const { kiteConfig, selectedLyrics, flightTitle, windCount, resonanceCount } = params;
    const last = selectedLyrics.length > 0 ? selectedLyrics[selectedLyrics.length - 1]! : null;
    title.textContent = `「${generateKiteName(last, kiteConfig)}」`;

    // 称号（指定があるときだけ表示）
    if (flightTitle) {
      flightTitleEl.textContent = flightTitle;
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

    // 駆け引きの記録（湖風の回数・共鳴した凧の数）
    const wind = windCount ?? selectedLyrics.length;
    const reso = resonanceCount ?? 0;
    windStat.textContent = `湖風　${wind}回`;
    resoStat.textContent = `共鳴した凧　${reso}枚`;

    if (selectedLyrics.length === 0) {
      wordList.textContent = kiteConfig.wish;
    } else {
      const seen = new Set<string>();
      const labels: string[] = [];
      for (const w of selectedLyrics) {
        if (seen.has(w.text)) continue;
        seen.add(w.text);
        labels.push(w.text);
      }
      wordList.textContent = labels.join("　");
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

export type EndingOverlay = ReturnType<typeof createEndingOverlay>;
