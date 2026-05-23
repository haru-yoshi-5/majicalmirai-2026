import { createTitleScreen } from "../components/TitleScreen.ts";
import { createDayKiteSetup } from "../components/DayKiteSetup.ts";
import { createLyricDisplay } from "../components/LyricDisplay.ts";
import { createPlayerControls } from "../components/PlayerControls.ts";
import { createEndingOverlay } from "../components/EndingOverlay.ts";
import { createDayKiteScene } from "../scenes/DayKiteScene.ts";
import type { DayKiteScene } from "../scenes/DayKiteScene.ts";
import { createMockPlayer } from "../state/mockPlayer.ts";
import { createTextAliveController } from "../state/TextAliveController.ts";
import type {
  SongPlayer,
  SongPlayerEvents,
  TextAliveBundle,
} from "../state/TextAliveController.ts";
import { createMockLyricSource, createTextAliveLyricSource } from "../state/lyricSource.ts";
import type { LyricSource } from "../state/lyricSource.ts";
import { classifyWord } from "../utils/classifyWord.ts";
import type { KiteConfig, SelectedLyric } from "../types/kite.ts";

// 「こたえて」(imie) — マジカルミライ2026 プログラミング・コンテスト課題曲（グランプリ）
const TEXTALIVE_SONG_URL = "https://piapro.jp/t/6W2N";

function shouldUseMock(): boolean {
  if (typeof window === "undefined") return true;
  return new URLSearchParams(window.location.search).has("mock");
}

interface PlayerBundle {
  player: SongPlayer;
  lyricSource: LyricSource;
}

async function createPlayerBundle(
  events: SongPlayerEvents,
  useMock: boolean,
): Promise<PlayerBundle> {
  if (useMock) {
    return {
      player: createMockPlayer(events),
      lyricSource: createMockLyricSource(),
    };
  }
  const bundle: TextAliveBundle = await createTextAliveController(events, {
    songUrl: TEXTALIVE_SONG_URL,
  });
  return {
    player: bundle.player,
    lyricSource: createTextAliveLyricSource({
      lyrics: bundle.lyrics,
      chorus: bundle.chorus,
      duration: bundle.duration,
      lastPhraseEnd: bundle.lastPhraseEnd,
    }),
  };
}

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
  let lyricSource: LyricSource | null = null;
  let loadingEl: HTMLDivElement | null = null;
  let resizeHandler: (() => void) | null = null;

  function showLoading(message: string) {
    if (!loadingEl) {
      loadingEl = document.createElement("div");
      loadingEl.className = "loading-overlay";
      root.appendChild(loadingEl);
    }
    loadingEl.textContent = message;
    loadingEl.style.display = "flex";
  }

  function hideLoading() {
    if (loadingEl) {
      loadingEl.style.display = "none";
    }
  }

  function teardownLoading() {
    if (loadingEl) {
      loadingEl.remove();
      loadingEl = null;
    }
  }

  function teardownPlayingLayer() {
    if (player) {
      player.dispose();
      player = null;
    }
    lyricSource = null;
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
    teardownLoading();
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

    resizeHandler = () => {
      kiteScene?.resize();
    };
    window.addEventListener("resize", resizeHandler);

    const useMock = shouldUseMock();
    showLoading(useMock ? "読み込み中…" : "TextAlive 楽曲を読み込み中…");

    let bundle: PlayerBundle;
    try {
      bundle = await createPlayerBundle(
        {
          onTimeUpdate: (t) => {
            kiteScene?.setTime(t);
            if (lyricSource) {
              kiteScene?.setSection(lyricSource.getCurrentSection(t));
              lyricDisplay?.render(lyricSource.getCurrentLyric(t));
            }
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
            }
          },
        },
        useMock,
      );
    } catch (err) {
      console.error("プレイヤー初期化に失敗しました", err);
      const message = err instanceof Error ? err.message : "プレイヤー初期化に失敗しました";
      showLoading(`${message}\n（URL に ?mock=1 を付けるとモックで起動します）`);
      return;
    }

    player = bundle.player;
    lyricSource = bundle.lyricSource;
    hideLoading();

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

    controls = createPlayerControls(stage, {
      duration: player.getDuration(),
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
    lyricDisplay.render(lyricSource.getCurrentLyric(0));

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
