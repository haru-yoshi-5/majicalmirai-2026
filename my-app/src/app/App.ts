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
  ChorusOverlayBlock,
  SongPlayer,
  SongPlayerEvents,
  TextAliveBundle,
} from "../state/TextAliveController.ts";
import { createMockLyricSource, createTextAliveLyricSource } from "../state/lyricSource.ts";
import type { LyricSource } from "../state/lyricSource.ts";
import { classifyWord } from "../utils/classifyWord.ts";
import { generateKiteName } from "../utils/generateKiteName.ts";
import { loadPastKites, savePastKite } from "../utils/kitePersistence.ts";
import type { KiteConfig, PastKiteRecord, SelectedLyric } from "../types/kite.ts";

// 「こたえて」(imie) — マジカルミライ2026 プログラミング・コンテスト課題曲（グランプリ）
//
// 末尾にSongleのリビジョン(20251215164617)を付与している。これは必須の指定:
//   公式ガイドラインの通り、楽曲URLは https://piapro.jp/t/曲ID/数字 の形式でないと
//   正しく読み込めない。また未リビジョンの "piapro.jp/t/6W2N" を指定すると、TextAliveが
//   内部で叩く songle.jp/songs/... がリビジョン付きURLへ302リダイレクトし、その302応答に
//   Access-Control-Allow-Origin が無いためブラウザのCORSで弾かれ、読み込みが永遠に終わらない。
// ※ 楽曲がSongleで再解析されるとリビジョン/各IDが変わる可能性あり。その際は公式配布値で更新する。
const TEXTALIVE_SONG_URL = "https://piapro.jp/t/6W2N/20251215164617";

// 音楽地図（歌詞・サビ等）のバージョン固定ID（公式ガイドライン配布値）。
// 歌詞タイミングとサビ範囲を固定し、再解析の影響を受けないようにする。
// このアプリはビート/コードを使わないため beatId/chordId は読み込まない(0)。
//   ※ 公式の指定値に戻す場合は beatId:4827293, chordId:2963754 を設定する。
const TEXTALIVE_SONG_MAP_IDS = {
  beatId: 0,
  chordId: 0,
  repetitiveSegmentId: 3086261,
  lyricId: 126519,
  lyricDiffId: 28645,
} as const;

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
    mapIds: TEXTALIVE_SONG_MAP_IDS,
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
function createCredit(root: HTMLElement) {
  const credit = document.createElement("div");
  credit.className = "credit";

  const songLink = document.createElement("a");
  songLink.href = "https://piapro.jp/t/6W2N";
  songLink.target = "_blank";
  songLink.rel = "noopener noreferrer";
  songLink.textContent = "楽曲「こたえて」/ imie";

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
  return credit;
}

export function mountApp(root: HTMLElement) {
  root.classList.add("kite-app");
  createCredit(root);

  let kiteConfig: KiteConfig | null = null;
  let selectedLyrics: SelectedLyric[] = [];

  let titleScreen: ReturnType<typeof createTitleScreen> | null = null;
  let setupScreen: ReturnType<typeof createDayKiteSetup> | null = null;
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

  function showLoading(message: string) {
    if (!loadingEl) {
      loadingEl = document.createElement("div");
      loadingEl.className = "loading-overlay";
      root.appendChild(loadingEl);
    }
    loadingEl.textContent = message;
    loadingEl.style.display = "flex";
  }

  // 読み込み完了後の「再生開始」表示。
  // 音声付き再生はブラウザの自動再生ポリシーでユーザー操作直後しか許可されないため、
  // 読み込み中オーバーレイをクリック可能なスタートボタンに変えて、押下時に再生する。
  function showStartPrompt(onStart: () => void) {
    if (!loadingEl) {
      loadingEl = document.createElement("div");
      loadingEl.className = "loading-overlay";
      root.appendChild(loadingEl);
    }
    loadingEl.textContent = "";
    loadingEl.style.pointerEvents = "auto";
    loadingEl.style.display = "flex";

    const startButton = document.createElement("button");
    startButton.type = "button";
    startButton.className = "start-prompt";
    startButton.textContent = "▶  タップして再生";
    startButton.addEventListener(
      "click",
      () => {
        onStart();
        teardownLoading();
      },
      { once: true },
    );
    loadingEl.appendChild(startButton);
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

    // 自動再生はブラウザのポリシーで弾かれるため、ユーザー操作（タップ）で再生開始する
    showStartPrompt(() => {
      player?.play();
    });
  }

  function dispose() {
    teardownPlayingLayer();
    teardownSetup();
    teardownTitle();
  }

  goTitle();

  return { dispose };
}
