import type { LyricLine } from "../types/lyric.ts";

export interface LyricDisplayOptions {
  onWordClick: (text: string, clickX: number, clickY: number, line: LyricLine) => void;
}

export function createLyricDisplay(parent: HTMLElement, options: LyricDisplayOptions) {
  const root = document.createElement("div");
  root.className = "lyric-display";
  parent.appendChild(root);

  let currentText = "";
  let currentLine: LyricLine | null = null;

  function clearChildren(el: HTMLElement) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  // TextAlive の単語区切り（line.words）が無い場合のフォールバック。
  // 空白があれば空白で分割し、無ければ勝手に刻まず行全体を1つの塊として扱う。
  function splitToWords(text: string): string[] {
    const tokens = text.split(/(\s+)/).filter((t) => t.trim().length > 0);
    return tokens.length > 0 ? tokens : [text];
  }

  function render(line: LyricLine | null) {
    if (line === currentLine) return;
    currentLine = line;
    if (!line) {
      root.classList.remove("is-visible");
      clearChildren(root);
      currentText = "";
      return;
    }
    if (line.text === currentText) return;
    currentText = line.text;

    clearChildren(root);
    root.classList.remove("is-visible");

    const lineEl = document.createElement("div");
    lineEl.className = "lyric-line";

    const tokens = line.words && line.words.length > 0 ? [...line.words] : splitToWords(line.text);
    tokens.forEach((token, idx) => {
      const span = document.createElement("button");
      span.type = "button";
      span.className = "lyric-word";
      span.textContent = token;
      span.style.setProperty("--i", String(idx));
      span.addEventListener(
        "click",
        (e) => {
          e.stopPropagation();
          const rect = span.getBoundingClientRect();
          const parentRect = parent.getBoundingClientRect();
          const cx = rect.left + rect.width / 2 - parentRect.left;
          const cy = rect.top + rect.height / 2 - parentRect.top;
          span.classList.add("is-touched");
          window.setTimeout(() => span.classList.remove("is-touched"), 500);
          // 各単語は1回だけ。クリック後は無効化して再クリックできないようにする。
          span.disabled = true;
          span.classList.add("is-used");
          options.onWordClick(token, cx, cy, line);
        },
        { once: true },
      );
      lineEl.appendChild(span);
    });

    root.appendChild(lineEl);
    requestAnimationFrame(() => {
      root.classList.add("is-visible");
    });
  }

  function dispose() {
    root.remove();
  }

  return {
    root,
    render,
    dispose,
  };
}

export type LyricDisplay = ReturnType<typeof createLyricDisplay>;
