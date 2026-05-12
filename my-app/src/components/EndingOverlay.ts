import type { SelectedWord } from "../types/lyric.ts";
import { generateLakeTitle } from "../utils/generateLakeTitle.ts";

export interface EndingOverlayOptions {
  onReset: () => void;
}

export function createEndingOverlay(parent: HTMLElement, options: EndingOverlayOptions) {
  const root = document.createElement("div");
  root.className = "ending-overlay";
  root.setAttribute("aria-hidden", "true");

  const card = document.createElement("div");
  card.className = "ending-card";

  const headline = document.createElement("p");
  headline.className = "ending-headline";
  headline.textContent = "あなたが描いた湖";

  const title = document.createElement("h1");
  title.className = "ending-title";
  title.textContent = "ことばのソナーレ";

  const label = document.createElement("p");
  label.className = "ending-label";
  label.textContent = "選ばれた言葉";

  const wordList = document.createElement("p");
  wordList.className = "ending-words";

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "ending-reset";
  resetButton.textContent = "もう一度、湖に触れる";
  resetButton.addEventListener("click", () => {
    options.onReset();
  });

  card.appendChild(headline);
  card.appendChild(title);
  card.appendChild(label);
  card.appendChild(wordList);
  card.appendChild(resetButton);
  root.appendChild(card);
  parent.appendChild(root);

  function show(words: ReadonlyArray<SelectedWord>) {
    title.textContent = generateLakeTitle(words);
    if (words.length === 0) {
      wordList.textContent = "（湖はまだ静かなままです）";
    } else {
      const seen = new Set<string>();
      const labels: string[] = [];
      for (const w of words) {
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
