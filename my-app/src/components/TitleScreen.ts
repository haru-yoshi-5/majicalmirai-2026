export interface TitleScreenOptions {
  /** 昼の部を開始（現在のMVP） */
  onStart: () => void;
  /** 夜の部を開始。未指定なら「準備中」で無効表示にする。 */
  onStartNight?: () => void;
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

  // モード選択（昼の部／夜の部）
  const modes = document.createElement("div");
  modes.className = "title-modes";

  const dayButton = createModeButton({
    variant: "day",
    label: "昼の部",
    note: "あそぶ",
    onClick: () => options.onStart(),
  });

  const nightButton = createModeButton({
    variant: "night",
    label: "夜の部",
    note: options.onStartNight ? "あそぶ" : "準備中",
    onClick: options.onStartNight,
  });

  modes.appendChild(dayButton);
  modes.appendChild(nightButton);

  inner.appendChild(subTop);
  inner.appendChild(title);
  inner.appendChild(sub);
  inner.appendChild(modes);
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

interface ModeButtonOptions {
  variant: "day" | "night";
  label: string;
  note: string;
  /** 未指定なら無効（準備中）ボタンにする。 */
  onClick?: () => void;
}

function createModeButton(opts: ModeButtonOptions): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `title-mode title-mode-${opts.variant}`;

  const label = document.createElement("span");
  label.className = "title-mode-label";
  label.textContent = opts.label;

  const note = document.createElement("span");
  note.className = "title-mode-note";
  note.textContent = opts.note;

  button.append(label, note);

  if (opts.onClick) {
    const handler = opts.onClick;
    button.addEventListener("click", () => handler());
  } else {
    button.disabled = true;
  }

  return button;
}

export type TitleScreen = ReturnType<typeof createTitleScreen>;
