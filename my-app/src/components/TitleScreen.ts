export interface TitleScreenOptions {
  onStart: () => void;
}

export function createTitleScreen(parent: HTMLElement, options: TitleScreenOptions) {
  const root = document.createElement("div");
  root.className = "title-screen";

  const inner = document.createElement("div");
  inner.className = "title-inner";

  const subTop = document.createElement("p");
  subTop.className = "title-sub-top";
  subTop.textContent = "Magical Mirai 2026 × 浜松まつり";

  const title = document.createElement("h1");
  title.className = "title-main";
  title.textContent = "湖風の歌詞凧";

  const sub = document.createElement("p");
  sub.className = "title-sub";
  sub.textContent = "歌詞の風で、祭りの空が広がっていく。";

  const startButton = document.createElement("button");
  startButton.type = "button";
  startButton.className = "title-start";
  startButton.textContent = "凧をつくる";
  startButton.addEventListener("click", () => {
    options.onStart();
  });

  inner.appendChild(subTop);
  inner.appendChild(title);
  inner.appendChild(sub);
  inner.appendChild(startButton);
  root.appendChild(inner);
  parent.appendChild(root);

  function show() {
    root.classList.add("is-visible");
  }

  function hide() {
    root.classList.remove("is-visible");
  }

  function dispose() {
    root.remove();
  }

  // 初期は表示状態
  requestAnimationFrame(() => show());

  return { root, show, hide, dispose };
}

export type TitleScreen = ReturnType<typeof createTitleScreen>;
