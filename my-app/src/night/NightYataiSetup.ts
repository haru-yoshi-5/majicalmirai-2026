// 屋台づくり画面（NIGHT_SPEC §7.2 / §8）。
// レイアウト・テーマは昼と共有の .setup-* クラスを再利用（[data-mode="night"] で夜配色になる）。
// 夜専用のプレビュー（御殿屋台）だけ night.css の .yatai-preview を使う。

import type {
  LanternColor,
  YataiBaseColor,
  YataiConfig,
  YataiPattern,
  YataiWish,
} from "./yataiTypes.ts";

interface OptionDef<T extends string> {
  value: T;
  label: string;
}

const BASE_COLORS: ReadonlyArray<OptionDef<YataiBaseColor>> = [
  { value: "vermilion", label: "朱" },
  { value: "gold", label: "金" },
  { value: "indigo", label: "藍" },
  { value: "purple", label: "紫" },
  { value: "hinoki", label: "白木" },
];

const LANTERN_COLORS: ReadonlyArray<OptionDef<LanternColor>> = [
  { value: "warm", label: "暖色" },
  { value: "cool", label: "青白" },
  { value: "pink", label: "桃色" },
  { value: "gold", label: "金色" },
  { value: "rainbow", label: "虹色" },
];

const PATTERNS: ReadonlyArray<OptionDef<YataiPattern>> = [
  { value: "ripple", label: "波紋" },
  { value: "sound", label: "音" },
  { value: "star", label: "星" },
  { value: "flower", label: "花" },
  { value: "wind", label: "風" },
];

const WISHES: ReadonlyArray<OptionDef<YataiWish>> = [
  { value: "歌", label: "歌" },
  { value: "光", label: "光" },
  { value: "夢", label: "夢" },
  { value: "未来", label: "未来" },
  { value: "響", label: "響" },
];

const BASE_COLOR_CSS: Record<YataiBaseColor, string> = {
  vermilion: "#be3320",
  gold: "#d9b25a",
  indigo: "#27408b",
  purple: "#6f4fb0",
  hinoki: "#cdb892",
};

const LANTERN_COLOR_CSS: Record<LanternColor, string> = {
  warm: "#ffb357",
  cool: "#9fd8ff",
  pink: "#ffa6c4",
  gold: "#ffd24a",
  rainbow: "conic-gradient(#ff8fae,#ffd24a,#9fd8ff,#a6ffb3,#ffa6c4,#ff8fae)",
};

export interface NightYataiSetupOptions {
  onComplete: (config: YataiConfig) => void;
  onBack?: () => void;
}

export function createNightYataiSetup(parent: HTMLElement, options: NightYataiSetupOptions) {
  const root = document.createElement("div");
  root.className = "setup-screen night-setup";

  const card = document.createElement("div");
  card.className = "setup-card";

  const heading = document.createElement("h2");
  heading.className = "setup-heading";
  heading.textContent = "屋台をつくる";

  const lead = document.createElement("p");
  lead.className = "setup-lead";
  lead.textContent = "基調色・提灯・幕の紋様・願いの文字を選んで、自分だけの御殿屋台を仕立てる。";

  const preview = document.createElement("div");
  preview.className = "setup-preview";

  const state: YataiConfig = {
    baseColor: "vermilion",
    lanternColor: "warm",
    pattern: "sound",
    wish: "歌",
  };

  function renderPreview() {
    preview.innerHTML = "";
    const yatai = document.createElement("div");
    yatai.className = `yatai-preview yatai-pattern-${state.pattern}`;
    yatai.style.setProperty("--yatai-color", BASE_COLOR_CSS[state.baseColor]);
    yatai.style.setProperty("--lantern-color", LANTERN_COLOR_CSS[state.lanternColor]);

    const roof = document.createElement("div");
    roof.className = "yatai-preview-roof";

    const lanterns = document.createElement("div");
    lanterns.className = "yatai-preview-lanterns";
    for (let i = 0; i < 5; i += 1) {
      const lantern = document.createElement("span");
      lantern.className = "yatai-preview-lantern";
      lanterns.appendChild(lantern);
    }

    const body = document.createElement("div");
    body.className = "yatai-preview-body";
    const wish = document.createElement("span");
    wish.className = "yatai-preview-wish";
    wish.textContent = state.wish;
    body.appendChild(wish);

    yatai.appendChild(roof);
    yatai.appendChild(lanterns);
    yatai.appendChild(body);
    preview.appendChild(yatai);
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
      "屋台の基調色",
      BASE_COLORS,
      () => state.baseColor,
      (v) => {
        state.baseColor = v;
      },
    ),
  );
  card.appendChild(
    makeGroup(
      "提灯の色",
      LANTERN_COLORS,
      () => state.lanternColor,
      (v) => {
        state.lanternColor = v;
      },
    ),
  );
  card.appendChild(
    makeGroup(
      "幕の紋様",
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
  goButton.textContent = "この屋台で夜へ";
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

export type NightYataiSetup = ReturnType<typeof createNightYataiSetup>;
