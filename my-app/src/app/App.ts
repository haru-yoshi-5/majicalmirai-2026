import { createLakeCanvas } from "../components/LakeCanvas.ts";
import { createLyricDisplay } from "../components/LyricDisplay.ts";
import { createPlayerControls } from "../components/PlayerControls.ts";
import { createEndingOverlay } from "../components/EndingOverlay.ts";
import { createMockPlayer } from "../state/mockPlayer.ts";
import { getCurrentLyric, getCurrentSection } from "../state/lyricTiming.ts";
import { SONG_DURATION } from "../data/mockLyrics.ts";
import { classifyWord } from "../utils/classifyWord.ts";

export function mountApp(root: HTMLElement) {
  root.classList.add("lake-app");

  const stage = document.createElement("div");
  stage.className = "stage";
  root.appendChild(stage);

  const title = document.createElement("p");
  title.className = "app-title";
  title.textContent = "ことばの湖、ひびく未来";
  stage.appendChild(title);

  const hint = document.createElement("p");
  hint.className = "app-hint";
  hint.textContent = "歌詞に触れると、湖に波紋が広がります。";
  stage.appendChild(hint);

  const lake = createLakeCanvas(stage, {
    onLakeClick: (x, y) => {
      lake.addRipple(x, y, "neutral", 0.6);
    },
  });

  const lyrics = createLyricDisplay(stage, {
    onWordClick: (text, x, y) => {
      const category = classifyWord(text);
      lake.addRipple(x, y, category, 1);
      lake.addSelectedWord(text, x, y, category);
      lake.spawnBurst(x, y, category);
    },
  });

  const ending = createEndingOverlay(root, {
    onReset: () => {
      player.reset();
      lake.clearAll();
      ending.hide();
      hint.classList.remove("is-hidden");
    },
  });

  const player = createMockPlayer({
    onTimeUpdate: (time) => {
      lake.setTime(time);
      lake.setSection(getCurrentSection(time));
      lyrics.render(getCurrentLyric(time));
      controls.update(time);
    },
    onPlayStateChange: (isPlaying) => {
      controls.setPlaying(isPlaying);
      if (isPlaying) {
        hint.classList.add("is-hidden");
      }
    },
    onEnded: () => {
      lake.setSection("ended");
      ending.show(lake.getSelected());
    },
  });

  const controls = createPlayerControls(root, {
    duration: SONG_DURATION,
    onPlay: () => player.play(),
    onPause: () => player.pause(),
    onReset: () => {
      player.reset();
      lake.clearAll();
      ending.hide();
      hint.classList.remove("is-hidden");
    },
    onSeek: (time) => {
      player.seek(time);
    },
  });

  controls.update(0);
  lyrics.render(getCurrentLyric(0));

  function dispose() {
    player.dispose();
    lake.dispose();
    lyrics.dispose();
    controls.dispose();
    ending.dispose();
  }

  return { dispose };
}
