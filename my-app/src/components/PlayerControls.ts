export interface PlayerControlsOptions {
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onSeek: (time: number) => void;
}

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

  const progressWrap = document.createElement("div");
  progressWrap.className = "player-progress";
  const progressBar = document.createElement("div");
  progressBar.className = "player-progress-bar";
  progressWrap.appendChild(progressBar);

  root.appendChild(playButton);
  root.appendChild(progressWrap);
  root.appendChild(timeLabel);
  root.appendChild(resetButton);

  let isPlaying = false;

  function formatTime(t: number): string {
    const sec = Math.max(0, Math.floor(t));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function update(time: number) {
    const ratio = options.duration > 0 ? time / options.duration : 0;
    progressBar.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
    timeLabel.textContent = `${formatTime(time)} / ${formatTime(options.duration)}`;
  }

  function setPlaying(value: boolean) {
    isPlaying = value;
    playButton.innerHTML = isPlaying ? pauseIconSvg() : playIconSvg();
    playButton.setAttribute("aria-label", isPlaying ? "一時停止" : "再生");
  }

  function handleSeek(e: PointerEvent) {
    const rect = progressWrap.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    options.onSeek(ratio * options.duration);
  }

  playButton.addEventListener("click", () => {
    if (isPlaying) options.onPause();
    else options.onPlay();
  });
  resetButton.addEventListener("click", () => {
    options.onReset();
  });
  progressWrap.addEventListener("pointerdown", (e) => {
    handleSeek(e);
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
