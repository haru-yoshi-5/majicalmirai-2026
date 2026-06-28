// 夜の部「歌灯りの御殿屋台」の統括。
// タイトルの「夜の部」ボタンから呼び出され、屋台づくり → 演奏 → エンディングまでを自己完結で回す。
//
// 設計方針：
//  - 昼の部のファイルは一切変更しない。汎用部品（LyricDisplay / PlayerControls /
//    TextAliveController / createTextAliveLyricSource）は import で再利用する。
//  - 配色は root に data-mode="night" を付けて theme/colors.css の夜トークンへ切り替える。
//  - 終了時は data-mode を外し、options.onExit() でタイトルへ戻す。

import "./night.css";
import { createNightYataiSetup } from "./NightYataiSetup.ts";
import { createNightEndingOverlay } from "./NightEndingOverlay.ts";
import { createNightYataiScene } from "./NightYataiScene.ts";
import type { NightYataiScene } from "./NightYataiScene.ts";
import { classifyWordNight } from "./classifyWordNight.ts";
import type { NightSelectedLyric, YataiConfig } from "./yataiTypes.ts";
import { createLyricDisplay } from "../components/LyricDisplay.ts";
import { createPlayerControls } from "../components/PlayerControls.ts";
import { createTextAliveController } from "../state/TextAliveController.ts";
import type {
  ChorusOverlayBlock,
  SongPlayer,
  SongPlayerEvents,
  TextAliveBundle,
} from "../state/TextAliveController.ts";
import { createTextAliveLyricSource } from "../state/lyricSource.ts";
import type { LyricSource } from "../state/lyricSource.ts";
import { createSongSelect } from "../components/SongSelect.ts";
import { DEFAULT_SONG } from "../data/songs.ts";
import type { SongDef } from "../data/songs.ts";

// 楽曲は課題曲6曲（src/data/songs.ts）から曲選択画面で選ぶ。昼と同じカタログを共有。

interface PlayerBundle {
  player: SongPlayer;
  lyricSource: LyricSource;
}

async function createPlayerBundle(events: SongPlayerEvents, song: SongDef): Promise<PlayerBundle> {
  const bundle: TextAliveBundle = await createTextAliveController(events, {
    songUrl: song.songUrl,
    mapIds: song.mapIds,
    chorusOverlayFix: song.chorusOverlayFix,
    appName: "歌灯りの御殿屋台",
  });
  return {
    player: bundle.player,
    lyricSource: createTextAliveLyricSource({
      lyrics: bundle.lyrics,
      chorus: bundle.chorus,
      chorusOverlays: bundle.chorusOverlays,
      duration: bundle.duration,
      lastPhraseEnd: bundle.lastPhraseEnd,
    }),
  };
}

export interface NightExperienceOptions {
  /** エンディングや屋台づくりの「戻る」でタイトルへ帰るときに呼ばれる */
  onExit: () => void;
  /** 選んだ曲をクレジット表記へ反映する（昼の credit と共有） */
  setSong?: (song: SongDef) => void;
}

export interface NightExperience {
  dispose: () => void;
}

export function startNightExperience(
  root: HTMLElement,
  options: NightExperienceOptions,
): NightExperience {
  root.setAttribute("data-mode", "night");

  let yataiConfig: YataiConfig | null = null;
  let selectedSong: SongDef = DEFAULT_SONG;
  let selectedLyrics: NightSelectedLyric[] = [];

  let setupScreen: ReturnType<typeof createNightYataiSetup> | null = null;
  let songSelectScreen: ReturnType<typeof createSongSelect> | null = null;
  let stage: HTMLDivElement | null = null;
  let scene: NightYataiScene | null = null;
  let lyricDisplay: ReturnType<typeof createLyricDisplay> | null = null;
  let chorusOverlayEl: HTMLDivElement | null = null;
  let controls: ReturnType<typeof createPlayerControls> | null = null;
  let ending: ReturnType<typeof createNightEndingOverlay> | null = null;
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

  function teardownLoading() {
    if (loadingEl) {
      loadingEl.remove();
      loadingEl = null;
    }
  }

  function renderChorusOverlay(block: ChorusOverlayBlock | null) {
    if (!chorusOverlayEl) return;
    if (!block) {
      chorusOverlayEl.classList.remove("is-visible");
      return;
    }
    if (chorusOverlayEl.dataset.text !== block.text) {
      chorusOverlayEl.dataset.text = block.text;
      chorusOverlayEl.textContent = block.text;
    }
    chorusOverlayEl.classList.add("is-visible");
  }

  function teardownPlaying() {
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
    if (chorusOverlayEl) {
      chorusOverlayEl.remove();
      chorusOverlayEl = null;
    }
    if (ending) {
      ending.dispose();
      ending = null;
    }
    if (scene) {
      scene.dispose();
      scene = null;
    }
    if (stage) {
      stage.remove();
      stage = null;
    }
    if (resizeHandler) {
      window.removeEventListener("resize", resizeHandler);
      resizeHandler = null;
    }
    teardownLoading();
  }

  function teardownSetup() {
    if (setupScreen) {
      setupScreen.dispose();
      setupScreen = null;
    }
  }

  function teardownSongSelect() {
    if (songSelectScreen) {
      songSelectScreen.dispose();
      songSelectScreen = null;
    }
  }

  function disposeAll() {
    teardownPlaying();
    teardownSetup();
    teardownSongSelect();
    selectedLyrics = [];
    yataiConfig = null;
    root.removeAttribute("data-mode");
  }

  function exitToTitle() {
    disposeAll();
    options.onExit();
  }

  function goSetup() {
    teardownSongSelect();
    setupScreen = createNightYataiSetup(root, {
      onBack: () => {
        exitToTitle();
      },
      onComplete: (config) => {
        yataiConfig = config;
        goSongSelect();
      },
    });
  }

  // 屋台づくりのあと、課題曲6曲から選ぶ。「あそぶ」押下でその曲の再生へ。
  function goSongSelect() {
    teardownSetup();
    songSelectScreen = createSongSelect(root, {
      defaultSongId: selectedSong.id,
      onBack: () => {
        goSetup();
      },
      onPlay: (song) => {
        selectedSong = song;
        options.setSong?.(song);
        teardownSongSelect();
        void goPlaying();
      },
    });
  }

  async function goPlaying() {
    if (!yataiConfig) return;
    teardownSetup();
    selectedLyrics = [];

    stage = document.createElement("div");
    stage.className = "play-stage";
    root.appendChild(stage);

    chorusOverlayEl = document.createElement("div");
    chorusOverlayEl.className = "chorus-overlay";
    stage.appendChild(chorusOverlayEl);

    scene = await createNightYataiScene(stage);
    scene.setYataiConfig(yataiConfig);

    resizeHandler = () => {
      scene?.resize();
    };
    window.addEventListener("resize", resizeHandler);

    showLoading("TextAlive 楽曲を読み込み中…");

    let bundle: PlayerBundle;
    try {
      bundle = await createPlayerBundle(
        {
          onTimeUpdate: (t) => {
            scene?.setTime(t);
            if (lyricSource) {
              scene?.setSection(lyricSource.getCurrentSection(t));
              lyricDisplay?.render(lyricSource.getCurrentLyric(t));
              renderChorusOverlay(lyricSource.getChorusOverlay(t));
            }
            controls?.update(t);
          },
          onPlayStateChange: (isPlaying) => {
            controls?.setPlaying(isPlaying);
          },
          onEnded: () => {
            scene?.setSection("ended");
            if (ending && yataiConfig) {
              ending.show({ yataiConfig, selectedLyrics });
            }
          },
        },
        selectedSong,
      );
    } catch (err) {
      console.error("夜の部プレイヤー初期化に失敗しました", err);
      const message = err instanceof Error ? err.message : "プレイヤー初期化に失敗しました";
      showLoading(message);
      return;
    }

    player = bundle.player;
    lyricSource = bundle.lyricSource;

    lyricDisplay = createLyricDisplay(stage, {
      onWordClick: (text, x, y, line) => {
        const category = classifyWordNight(text);
        const lyric: NightSelectedLyric = {
          text,
          time: line.time,
          category,
          position: { x, y },
          selectedAt: performance.now() / 1000,
        };
        selectedLyrics.push(lyric);
        scene?.dropLyric(lyric);
      },
    });

    ending = createNightEndingOverlay(root, {
      onReplay: () => {
        ending?.hide();
        scene?.clearAll();
        selectedLyrics = [];
        player?.reset();
        player?.play();
      },
      onTitle: () => {
        exitToTitle();
      },
    });

    controls = createPlayerControls(stage, {
      duration: player.getDuration(),
      onPlay: () => player?.play(),
      onPause: () => player?.pause(),
      onReset: () => {
        player?.reset();
        scene?.clearAll();
        selectedLyrics = [];
        ending?.hide();
      },
    });

    controls.update(0);
    lyricDisplay.render(lyricSource.getCurrentLyric(0));

    // 「あそぶ」押下の操作直後なので、そのまま自動再生する。
    // 万一ブラウザに弾かれても、下部プレイヤーの再生ボタンから開始できる。
    teardownLoading();
    player.play();
  }

  goSetup();

  return { dispose: disposeAll };
}
