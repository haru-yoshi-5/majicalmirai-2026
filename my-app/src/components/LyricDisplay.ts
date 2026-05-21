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

  function splitToWords(text: string): string[] {
    const tokens = text.split(/(\s+)/).filter((t) => t.trim().length > 0);
    if (tokens.length >= 2) return tokens;
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
      const size = 2 + Math.floor(Math.random() * 3);
      chunks.push(text.slice(i, i + size));
      i += size;
    }
    return chunks;
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

    const tokens = splitToWords(line.text);
    tokens.forEach((token, idx) => {
      const span = document.createElement("button");
      span.type = "button";
      span.className = "lyric-word";
      span.textContent = token;
      span.style.setProperty("--i", String(idx));
      span.addEventListener("click", (e) => {
        e.stopPropagation();
        const rect = span.getBoundingClientRect();
        const parentRect = parent.getBoundingClientRect();
        const cx = rect.left + rect.width / 2 - parentRect.left;
        const cy = rect.top + rect.height / 2 - parentRect.top;
        span.classList.add("is-touched");
        window.setTimeout(() => span.classList.remove("is-touched"), 500);
        options.onWordClick(token, cx, cy, line);
      });
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
