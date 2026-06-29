import type { KiteColor, KiteConfig, KitePattern, KiteShape, KiteWish } from "../types/kite.ts";

interface OptionDef<T extends string> {
  value: T;
  label: string;
}

const SHAPES: ReadonlyArray<OptionDef<KiteShape>> = [
  { value: "large", label: "大凧" },
  { value: "diamond", label: "菱形" },
  { value: "swallow", label: "風切り" },
];

const COLORS: ReadonlyArray<OptionDef<KiteColor>> = [
  { value: "blue", label: "青" },
  { value: "red", label: "赤" },
  { value: "white", label: "白" },
  { value: "purple", label: "紫" },
  { value: "gold", label: "金" },
];

const PATTERNS: ReadonlyArray<OptionDef<KitePattern>> = [
  { value: "ripple", label: "波紋" },
  { value: "wind", label: "風" },
  { value: "star", label: "星" },
  { value: "sound", label: "音" },
];

const WISHES: ReadonlyArray<OptionDef<KiteWish>> = [
  { value: "未来", label: "未来" },
  { value: "歌", label: "歌" },
  { value: "光", label: "光" },
  { value: "夢", label: "夢" },
];

const COLOR_HEX: Record<KiteColor, string> = {
  blue: "#5fa8ff",
  red: "#ff6f6a",
  white: "#f0f4ff",
  purple: "#b78bff",
  gold: "#ffd66a",
};

export interface DayKiteSetupOptions {
  onComplete: (config: KiteConfig) => void;
  onBack?: () => void;
}

export function createDayKiteSetup(parent: HTMLElement, options: DayKiteSetupOptions) {
  const root = document.createElement("div");
  root.className = "setup-screen";

  const card = document.createElement("div");
  card.className = "setup-card";

  const heading = document.createElement("h2");
  heading.className = "setup-heading";
  heading.textContent = "凧をつくる";

  const lead = document.createElement("p");
  lead.className = "setup-lead";
  lead.textContent = "形・色・紋様・願いの文字を選んで、自分だけの凧を仕立てる。";

  const preview = document.createElement("div");
  preview.className = "setup-preview";

  const state: KiteConfig = {
    shape: "large",
    color: "blue",
    pattern: "wind",
    wish: "未来",
  };

  function renderPreview() {
    preview.innerHTML = "";
    const kite = document.createElement("div");
    kite.className = `kite-preview kite-shape-${state.shape} kite-pattern-${state.pattern}`;
    kite.style.setProperty("--kite-color", COLOR_HEX[state.color]);
    const wish = document.createElement("span");
    wish.className = "kite-preview-wish";
    wish.textContent = state.wish;
    kite.appendChild(wish);
    preview.appendChild(kite);
  }

  function makeGroup<T extends string>(
    title: string,
    items: ReadonlyArray<OptionDef<T>>,
    current: () => T,
    onSelect: (v: T) => void,
  ) {
    const group = document.createElement("div");
    group.className = "setup-group";

    const label = document.createElement("p");
    label.className = "setup-group-label";
    label.textContent = title;
    group.appendChild(label);

    const optionsWrap = document.createElement("div");
    optionsWrap.className = "setup-options";

    const buttons: HTMLButtonElement[] = [];
    for (const item of items) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "setup-option";
      btn.textContent = item.label;
      btn.dataset.value = item.value;
      btn.addEventListener("click", () => {
        onSelect(item.value);
        for (const b of buttons) {
          b.classList.toggle("is-active", b.dataset.value === current());
        }
        renderPreview();
      });
      buttons.push(btn);
      optionsWrap.appendChild(btn);
    }
    // 初期ハイライト
    for (const b of buttons) {
      b.classList.toggle("is-active", b.dataset.value === current());
    }
    group.appendChild(optionsWrap);
    return group;
  }

  card.appendChild(heading);
  card.appendChild(lead);
  card.appendChild(preview);

  card.appendChild(
    makeGroup(
      "凧の形",
      SHAPES,
      () => state.shape,
      (v) => {
        state.shape = v;
      },
    ),
  );
  card.appendChild(
    makeGroup(
      "メインカラー",
      COLORS,
      () => state.color,
      (v) => {
        state.color = v;
      },
    ),
  );
  card.appendChild(
    makeGroup(
      "紋様",
      PATTERNS,
      () => state.pattern,
      (v) => {
        state.pattern = v;
      },
    ),
  );
  card.appendChild(
    makeGroup(
      "願いの文字",
      WISHES,
      () => state.wish,
      (v) => {
        state.wish = v;
      },
    ),
  );

  const actions = document.createElement("div");
  actions.className = "setup-actions";

  if (options.onBack) {
    const backBtn = document.createElement("button");
    backBtn.type = "button";
    backBtn.className = "setup-back";
    backBtn.textContent = "戻る";
    backBtn.addEventListener("click", () => {
      options.onBack?.();
    });
    actions.appendChild(backBtn);
  }

  const goButton = document.createElement("button");
  goButton.type = "button";
  goButton.className = "setup-go";
  goButton.textContent = "この凧で空へ";
  goButton.addEventListener("click", () => {
    options.onComplete({ ...state });
  });
  actions.appendChild(goButton);

  card.appendChild(actions);
  root.appendChild(card);
  parent.appendChild(root);
  renderPreview();

  function show() {
    root.classList.add("is-visible");
  }

  function hide() {
    root.classList.remove("is-visible");
  }

  function dispose() {
    root.remove();
  }

  requestAnimationFrame(() => show());

  return { root, show, hide, dispose };
}

export type DayKiteSetup = ReturnType<typeof createDayKiteSetup>;

export { COLOR_HEX };
