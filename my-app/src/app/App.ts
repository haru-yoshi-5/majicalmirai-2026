import { createTitleScreen } from "../components/TitleScreen.ts";
import { createDayKiteSetup } from "../components/DayKiteSetup.ts";
import { createLyricDisplay } from "../components/LyricDisplay.ts";
import { createPlayerControls } from "../components/PlayerControls.ts";
import { createEndingOverlay } from "../components/EndingOverlay.ts";
import { createDayKiteScene } from "../scenes/DayKiteScene.ts";
import type { DayKiteScene } from "../scenes/DayKiteScene.ts";
import { createTextAliveController } from "../state/TextAliveController.ts";
import type {
  ChorusOverlayBlock,
  SongPlayer,
  SongPlayerEvents,
  TextAliveBundle,
} from "../state/TextAliveController.ts";
import { createTextAliveLyricSource } from "../state/lyricSource.ts";
import type { LyricSource } from "../state/lyricSource.ts";
import { classifyWord } from "../utils/classifyWord.ts";
import { generateKiteName } from "../utils/generateKiteName.ts";
import { loadPastKites, savePastKite } from "../utils/kitePersistence.ts";
import type { KiteConfig, PastKiteRecord, SelectedLyric } from "../types/kite.ts";
import { startNightExperience } from "../night/NightApp.ts";
import { createSongSelect } from "../components/SongSelect.ts";
import { DEFAULT_SONG } from "../data/songs.ts";
import type { SongDef } from "../data/songs.ts";

// 楽曲は課題曲6曲（src/data/songs.ts）から曲選択画面で選ぶ。
// 楽曲URLはリビジョン付き必須（未リビジョンだと Songle が302でCORSに弾かれ無限ローディング）。

interface PlayerBundle {
  player: SongPlayer;
  lyricSource: LyricSource;
}

async function createPlayerBundle(events: SongPlayerEvents, song: SongDef): Promise<PlayerBundle> {
  const bundle: TextAliveBundle = await createTextAliveController(events, {
    songUrl: song.songUrl,
    mapIds: song.mapIds,
    chorusOverlayFix: song.chorusOverlayFix,
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

// TextAlive App API のライセンス表記（必須）。
// 利用している旨を、楽曲ページ または developer.textalive.jp へのリンク付きで常時表示する。
// 楽曲リンクは再生中の曲に合わせて setSong() で更新する。
function createCredit(root: HTMLElement) {
  const credit = document.createElement("div");
  credit.className = "credit";

  const songLink = document.createElement("a");
  songLink.target = "_blank";
  songLink.rel = "noopener noreferrer";

  const sep = document.createElement("span");
  sep.className = "credit-sep";
  sep.textContent = "・";

  const apiLink = document.createElement("a");
  apiLink.href = "https://developer.textalive.jp/";
  apiLink.target = "_blank";
  apiLink.rel = "noopener noreferrer";
  apiLink.textContent = "Powered by TextAlive";

  credit.append(songLink, sep, apiLink);
  root.appendChild(credit);

  function setSong(song: SongDef) {
    songLink.href = song.pageUrl;
    songLink.textContent = `楽曲「${song.title}」/ ${song.artist}`;
  }
  setSong(DEFAULT_SONG);

  return { setSong };
}

export function mountApp(root: HTMLElement) {
  root.classList.add("kite-app");
  const credit = createCredit(root);

  let kiteConfig: KiteConfig | null = null;
  let selectedSong: SongDef = DEFAULT_SONG;
  let selectedLyrics: SelectedLyric[] = [];

  let titleScreen: ReturnType<typeof createTitleScreen> | null = null;
  let setupScreen: ReturnType<typeof createDayKiteSetup> | null = null;
  let songSelectScreen: ReturnType<typeof createSongSelect> | null = null;
  let kiteScene: DayKiteScene | null = null;
  let kiteSceneContainer: HTMLDivElement | null = null;
  let lyricDisplay: ReturnType<typeof createLyricDisplay> | null = null;
  let chorusOverlayEl: HTMLDivElement | null = null;
  let controls: ReturnType<typeof createPlayerControls> | null = null;
  let ending: ReturnType<typeof createEndingOverlay> | null = null;
  let player: SongPlayer | null = null;
  let lyricSource: LyricSource | null = null;
  let loadingEl: HTMLDivElement | null = null;
  let resizeHandler: (() => void) | null = null;
  let nightSession: { dispose: () => void } | null = null;

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

  // 主旋律に重ねて表示するコーラス（3段落目）のブロックを描画する。
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
    if (chorusOverlayEl) {
      chorusOverlayEl.remove();
      chorusOverlayEl = null;
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

  function teardownSongSelect() {
    if (songSelectScreen) {
      songSelectScreen.dispose();
      songSelectScreen = null;
    }
  }

  function goTitle() {
    teardownPlayingLayer();
    teardownSetup();
    teardownSongSelect();
    selectedLyrics = [];
    kiteConfig = null;
    titleScreen = createTitleScreen(root, {
      onStart: () => {
        goSetup();
      },
      onStartNight: () => {
        teardownTitle();
        nightSession = startNightExperience(root, {
          setSong: credit.setSong,
          onExit: () => {
            nightSession = null;
            goTitle();
          },
        });
      },
    });
  }

  function goSetup() {
    teardownTitle();
    teardownSongSelect();
    setupScreen = createDayKiteSetup(root, {
      onBack: () => {
        goTitle();
      },
      onComplete: (config) => {
        kiteConfig = config;
        goSongSelect();
      },
    });
  }

  // 凧づくりのあと、課題曲6曲から選ぶ。「あそぶ」押下でその曲の再生へ。
  function goSongSelect() {
    teardownSetup();
    songSelectScreen = createSongSelect(root, {
      defaultSongId: selectedSong.id,
      onBack: () => {
        goSetup();
      },
      onPlay: (song) => {
        selectedSong = song;
        credit.setSong(song);
        teardownSongSelect();
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

    // 主旋律に重ねるコーラス（3段落目）の表示レイヤー
    chorusOverlayEl = document.createElement("div");
    chorusOverlayEl.className = "chorus-overlay";
    stage.appendChild(chorusOverlayEl);

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

    showLoading("TextAlive 楽曲を読み込み中…");

    let bundle: PlayerBundle;
    try {
      bundle = await createPlayerBundle(
        {
          onTimeUpdate: (t) => {
            kiteScene?.setTime(t);
            if (lyricSource) {
              kiteScene?.setSection(lyricSource.getCurrentSection(t));
              lyricDisplay?.render(lyricSource.getCurrentLyric(t));
              renderChorusOverlay(lyricSource.getChorusOverlay(t));
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
              // 完成した凧を localStorage に保存し、次回以降の遠景（過去凧）に残す
              // TODO(のちに検討): 「もう一度」で再生し直すたびに保存され過去凧が重複登録される。
              //   1プレイにつき1回だけ保存するガード（保存済みフラグ等）を入れるか検討する。
              const lastSelected = selectedLyrics[selectedLyrics.length - 1] ?? null;
              const record: PastKiteRecord = {
                name: generateKiteName(lastSelected, kiteConfig),
                kiteConfig,
                selectedTexts: selectedLyrics.map((lyric) => lyric.text),
                savedAt: Date.now(),
              };
              savePastKite(record);
            }
          },
        },
        selectedSong,
      );
    } catch (err) {
      console.error("プレイヤー初期化に失敗しました", err);
      const message = err instanceof Error ? err.message : "プレイヤー初期化に失敗しました";
      showLoading(message);
      return;
    }

    player = bundle.player;
    lyricSource = bundle.lyricSource;

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
    });

    controls.update(0);
    lyricDisplay.render(lyricSource.getCurrentLyric(0));

    // 「あそぶ」押下の操作直後なので、そのまま自動再生する。
    // 万一ブラウザに弾かれても、下部プレイヤーの再生ボタンから開始できる。
    teardownLoading();
    player.play();
  }

  function dispose() {
    if (nightSession) {
      nightSession.dispose();
      nightSession = null;
    }
    teardownPlayingLayer();
    teardownSetup();
    teardownSongSelect();
    teardownTitle();
  }

  goTitle();

  return { dispose };
}
