import { createTitleScreen } from "../components/TitleScreen.ts";
import { createDayKiteSetup } from "../components/DayKiteSetup.ts";
import { createLyricDisplay } from "../components/LyricDisplay.ts";
import { createPlayerControls } from "../components/PlayerControls.ts";
import { createEndingOverlay } from "../components/EndingOverlay.ts";
import { createDayKiteScene } from "../scenes/DayKiteScene.ts";
import type { DayKiteScene } from "../scenes/DayKiteScene.ts";
import { createMockPlayer } from "../state/mockPlayer.ts";
import type { SongPlayer } from "../state/TextAliveController.ts";
import { getCurrentLyric, getCurrentSection } from "../state/lyricTiming.ts";
import { SONG_DURATION } from "../data/mockLyrics.ts";
import { classifyWord } from "../utils/classifyWord.ts";
import { generateKiteName } from "../utils/generateKiteName.ts";
import { loadPastKites, savePastKite } from "../utils/kitePersistence.ts";
import type { KiteConfig, SelectedLyric } from "../types/kite.ts";

export function mountApp(root: HTMLElement) {
  root.classList.add("kite-app");

  let kiteConfig: KiteConfig | null = null;
  let selectedLyrics: SelectedLyric[] = [];

  let titleScreen: ReturnType<typeof createTitleScreen> | null = null;
  let setupScreen: ReturnType<typeof createDayKiteSetup> | null = null;
  let kiteScene: DayKiteScene | null = null;
  let kiteSceneContainer: HTMLDivElement | null = null;
  let lyricDisplay: ReturnType<typeof createLyricDisplay> | null = null;
  let controls: ReturnType<typeof createPlayerControls> | null = null;
  let ending: ReturnType<typeof createEndingOverlay> | null = null;
  let player: SongPlayer | null = null;
  let resizeHandler: (() => void) | null = null;

  function teardownPlayingLayer() {
    if (player) {
      player.dispose();
      player = null;
    }
    if (controls) {
      controls.dispose();
      controls = null;
    }
    if (lyricDisplay) {
      lyricDisplay.dispose();
      lyricDisplay = null;
    }
    if (ending) {
      ending.dispose();
      ending = null;
    }
    if (kiteScene) {
      kiteScene.dispose();
      kiteScene = null;
    }
    if (kiteSceneContainer) {
      kiteSceneContainer.remove();
      kiteSceneContainer = null;
    }
    if (resizeHandler) {
      window.removeEventListener("resize", resizeHandler);
      resizeHandler = null;
    }
  }

  function teardownTitle() {
    if (titleScreen) {
      titleScreen.dispose();
      titleScreen = null;
    }
  }

  function teardownSetup() {
    if (setupScreen) {
      setupScreen.dispose();
      setupScreen = null;
    }
  }

  function goTitle() {
    teardownPlayingLayer();
    teardownSetup();
    selectedLyrics = [];
    kiteConfig = null;
    titleScreen = createTitleScreen(root, {
      onStart: () => {
        goSetup();
      },
    });
  }

  function goSetup() {
    teardownTitle();
    setupScreen = createDayKiteSetup(root, {
      onBack: () => {
        goTitle();
      },
      onComplete: (config) => {
        kiteConfig = config;
        void goPlaying();
      },
    });
  }

  async function goPlaying() {
    if (!kiteConfig) return;
    teardownSetup();
    selectedLyrics = [];

    const stage = document.createElement("div");
    stage.className = "play-stage";
    root.appendChild(stage);
    kiteSceneContainer = stage;

    kiteScene = await createDayKiteScene(stage);
    kiteScene.setKiteConfig(kiteConfig);
    // 過去にこの端末で揚げた凧を遠景に並べる
    const pastKites = loadPastKites();
    if (pastKites.length > 0) {
      kiteScene.addPastKites(pastKites);
    }

    resizeHandler = () => {
      kiteScene?.resize();
    };
    window.addEventListener("resize", resizeHandler);

    lyricDisplay = createLyricDisplay(stage, {
      onWordClick: (text, x, y, line) => {
        const category = classifyWord(text);
        const lyric: SelectedLyric = {
          text,
          time: line.time,
          category,
          position: { x, y },
          selectedAt: performance.now() / 1000,
        };
        selectedLyrics.push(lyric);
        kiteScene?.dropLyric(lyric);
      },
    });

    ending = createEndingOverlay(root, {
      onReplay: () => {
        ending?.hide();
        kiteScene?.clearAll();
        selectedLyrics = [];
        player?.reset();
        player?.play();
      },
      onTitle: () => {
        goTitle();
      },
    });

    player = createMockPlayer({
      onTimeUpdate: (t) => {
        kiteScene?.setTime(t);
        kiteScene?.setSection(getCurrentSection(t));
        lyricDisplay?.render(getCurrentLyric(t));
        controls?.update(t);
      },
      onPlayStateChange: (isPlaying) => {
        controls?.setPlaying(isPlaying);
      },
      onEnded: () => {
        kiteScene?.setSection("ended");
        if (ending && kiteConfig) {
          ending.show({
            kiteConfig,
            selectedLyrics,
          });
          // 完成した凧を次回プレイの遠景に残すため localStorage に保存する
          const last =
            selectedLyrics.length > 0 ? selectedLyrics[selectedLyrics.length - 1]! : null;
          const seen = new Set<string>();
          const uniqueTexts: string[] = [];
          for (const w of selectedLyrics) {
            if (seen.has(w.text)) continue;
            seen.add(w.text);
            uniqueTexts.push(w.text);
          }
          savePastKite({
            name: generateKiteName(last, kiteConfig),
            kiteConfig,
            selectedTexts: uniqueTexts,
            savedAt: Date.now(),
          });
        }
      },
    });

    controls = createPlayerControls(stage, {
      duration: SONG_DURATION,
      onPlay: () => player?.play(),
      onPause: () => player?.pause(),
      onReset: () => {
        player?.reset();
        kiteScene?.clearAll();
        selectedLyrics = [];
        ending?.hide();
      },
      onSeek: (t) => player?.seek(t),
    });

    controls.update(0);
    lyricDisplay.render(getCurrentLyric(0));

    // 自動再生
    player.play();
  }

  function dispose() {
    teardownPlayingLayer();
    teardownSetup();
    teardownTitle();
  }

  goTitle();

  return { dispose };
}
