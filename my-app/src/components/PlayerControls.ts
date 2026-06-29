export interface PlayerControlsOptions {
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
}

/** 灯りゲージの灯数（曲全体を等分する光の数）。 */
const GAUGE_LIGHTS = 24;

export function createPlayerControls(parent: HTMLElement, options: PlayerControlsOptions) {
  const root = document.createElement("div");
  root.className = "player-controls";
  parent.appendChild(root);

  const playButton = document.createElement("button");
  playButton.type = "button";
  playButton.className = "player-button player-play";
  playButton.setAttribute("aria-label", "再生");
  playButton.innerHTML = playIconSvg();

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "player-button player-reset";
  resetButton.setAttribute("aria-label", "リセット");
  resetButton.innerHTML = resetIconSvg();

  const timeLabel = document.createElement("span");
  timeLabel.className = "player-time";
  timeLabel.textContent = "0:00 / 0:00";

  // シークバーの代わりに「灯りゲージ」。曲の進行に合わせて灯がともっていく（シーク不可）。
  const gauge = document.createElement("div");
  gauge.className = "player-gauge";
  gauge.setAttribute("role", "progressbar");
  gauge.setAttribute("aria-label", "再生の進行");
  const lights: HTMLSpanElement[] = [];
  for (let i = 0; i < GAUGE_LIGHTS; i += 1) {
    const dot = document.createElement("span");
    dot.className = "player-gauge-light";
    gauge.appendChild(dot);
    lights.push(dot);
  }

  root.appendChild(playButton);
  root.appendChild(gauge);
  root.appendChild(timeLabel);
  root.appendChild(resetButton);

  let isPlaying = false;
  let litCount = -1;

  function formatTime(t: number): string {
    const sec = Math.max(0, Math.floor(t));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function update(time: number) {
    const ratio = options.duration > 0 ? Math.min(1, Math.max(0, time / options.duration)) : 0;
    // 進行に応じて先頭から灯をともす。最前列は「いま灯っている」ものとして強調。
    const nextLit = Math.round(ratio * GAUGE_LIGHTS);
    if (nextLit !== litCount) {
      for (let i = 0; i < GAUGE_LIGHTS; i += 1) {
        lights[i]!.classList.toggle("is-lit", i < nextLit);
        lights[i]!.classList.toggle("is-head", i === nextLit - 1);
      }
      litCount = nextLit;
    }
    gauge.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
    timeLabel.textContent = `${formatTime(time)} / ${formatTime(options.duration)}`;
  }

  function setPlaying(value: boolean) {
    isPlaying = value;
    playButton.innerHTML = isPlaying ? pauseIconSvg() : playIconSvg();
    playButton.setAttribute("aria-label", isPlaying ? "一時停止" : "再生");
    root.classList.toggle("is-playing", isPlaying);
  }

  playButton.addEventListener("click", () => {
    if (isPlaying) options.onPause();
    else options.onPlay();
  });
  resetButton.addEventListener("click", () => {
    options.onReset();
  });

  update(0);

  function dispose() {
    root.remove();
  }

  return {
    root,
    update,
    setPlaying,
    dispose,
  };
}

export type PlayerControls = ReturnType<typeof createPlayerControls>;

function playIconSvg(): string {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';
}

function pauseIconSvg(): string {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5.5" width="3.5" height="13" rx="1" fill="currentColor"/><rect x="14" y="5.5" width="3.5" height="13" rx="1" fill="currentColor"/></svg>';
}

function resetIconSvg(): string {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5a7 7 0 1 0 6.93 6h-2.02A5 5 0 1 1 12 7V4l4 4-4 4V9.0Z" fill="currentColor"/></svg>';
}
