// 夜の部「歌灯りの御殿屋台」の PixiJS シーン本体（NIGHT_SPEC §11–§13, §15）。
// 昼の scenes/DayKiteScene.ts と対になる夜専用シーン。昼のシーンには手を加えない。
//
// 体験の核：自分が祭りの通りを歩く視点。屋台は動かず、自分が進むことで
// 奥の屋台が左へ流れていく。歌詞を押すと、いま画面にいる未点灯の屋台へ光が飛び、
// その屋台の提灯がまとめて灯る。歌詞 → 光の粒 → 屋台が灯る → 夜の街と湖面の反射。

import { Application, BlurFilter, Container, Graphics, Text } from "pixi.js";
import type { SongSection } from "../types/lyric.ts";
import type {
  CommunityLantern,
  LanternColor,
  NightSelectedLyric,
  NightWordCategory,
  YataiBaseColor,
  YataiConfig,
} from "./yataiTypes.ts";
import { LANTERN_COLORS, NIGHT_SCENE, YATAI_BASE_COLORS, hslToHex } from "./nightColors.ts";
import { categoryColorNight } from "./classifyWordNight.ts";
import {
  generateAmbientCommunityLantern,
  generateCommunityLanternFromLyric,
} from "./generateCommunityLantern.ts";
import type { FestivalSummary } from "./generateFestivalTitle.ts";

const FONT_FAMILY = '"Hiragino Sans","Yu Gothic UI","Segoe UI",system-ui,sans-serif';
const LANTERNS_PER_STALL = 5;
const MAX_INSCRIBED_PER_STALL = 3;

// 屋台の基調色の候補。YataiBaseColor の5色はいずれも祭り向けに調整済みで
// 互いに調和するため、この中から台ごとに選べば「変な色」は混ざらない。
const STALL_COLOR_PALETTE: YataiBaseColor[] = ["vermilion", "gold", "indigo", "purple", "hinoki"];

interface LanternSlot {
  localX: number;
  localY: number;
  phase: number;
}

/** 通りに並んで左へ流れる屋台1台ぶん */
interface Stall {
  /** ステージ座標の中心X（毎フレーム左へ流れる） */
  x: number;
  /** この屋台の基調色（通りに彩りを出すため台ごとに変える） */
  baseColor: YataiBaseColor;
  /** 大きさのばらつき（奥行き感） */
  scale: number;
  /** 現在の点灯度 0..1 */
  lit: number;
  /** 目標の点灯度 0..1 */
  target: number;
  /** 提灯列のローカルY（光の粒の着地点に使う） */
  lanternLocalY: number;
  lanterns: LanternSlot[];
  inscribed: Text[];
  container: Container;
  bodyGfx: Graphics;
  mukuGfx: Graphics;
  roofGfx: Graphics;
  finialGfx: Graphics;
  stringsGfx: Graphics;
  lanternsGfx: Graphics;
}

interface LightParticleFx {
  gfx: Graphics;
  fromX: number;
  fromY: number;
  ctrlX: number;
  ctrlY: number;
  stall: Stall;
  life: number;
  maxLife: number;
  hue: number;
  arrived: boolean;
  text: string;
  category: NightWordCategory;
}

interface BurstFx {
  gfx: Graphics;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  maxRadius: number;
  hue: number;
}

interface FallingLyricFx {
  gfx: Text;
  x: number;
  startY: number;
  life: number;
  maxLife: number;
}

interface SparkFx {
  gfx: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface CommunityLanternFx {
  data: CommunityLantern;
  gfx: Container;
  /** 共鳴の光（resonance に応じて alpha を上げる）。 */
  glow: Graphics;
  baseY: number;
  /** 共鳴度 0..1 */
  resonance: number;
  /** 一度でも共鳴したか（称号用カウント） */
  hasResonated: boolean;
}

interface StarSeed {
  x: number;
  y: number;
  r: number;
  phase: number;
}

export interface NightYataiScene {
  setYataiConfig: (config: YataiConfig) => void;
  setSection: (section: SongSection) => void;
  setTime: (time: number) => void;
  dropLyric: (lyric: NightSelectedLyric) => void;
  /** 曲終了時の祭りサマリー（称号生成に使う）。 */
  getFestivalSummary: () => FestivalSummary;
  clearAll: () => void;
  resize: () => void;
  dispose: () => void;
}

const SECTION_BRIGHTNESS: Record<SongSection, number> = {
  intro: 0.12,
  verse: 0.32,
  preChorus: 0.52,
  chorus: 0.85,
  bridge: 0.5,
  finalChorus: 1,
  outro: 0.7,
  ended: 0.6,
};

export async function createNightYataiScene(parent: HTMLElement): Promise<NightYataiScene> {
  const app = new Application();
  await app.init({
    resizeTo: parent,
    antialias: true,
    backgroundAlpha: 0,
    resolution: Math.max(1, window.devicePixelRatio || 1),
    autoDensity: true,
  });
  parent.appendChild(app.canvas);
  app.canvas.classList.add("night-yatai-canvas");

  // レイヤー（奥 → 手前）
  const skyLayer = new Container();
  const distantLayer = new Container(); // 周囲の提灯（遠景）
  const stallsLayer = new Container(); // 通りを流れる屋台の列（奥）
  const lakeLayer = new Container();
  const reflectionLayer = new Container();
  const lightLayer = new Container(); // 光の粒・バースト・火花
  const foregroundLayer = new Container(); // 手前を歩く影絵（初音ミク風）
  const fallingLyricLayer = new Container();

  app.stage.addChild(skyLayer);
  app.stage.addChild(distantLayer);
  app.stage.addChild(stallsLayer);
  app.stage.addChild(lakeLayer);
  app.stage.addChild(reflectionLayer);
  app.stage.addChild(lightLayer);
  app.stage.addChild(foregroundLayer);
  app.stage.addChild(fallingLyricLayer);

  const skyGfx = new Graphics();
  skyLayer.addChild(skyGfx);
  const lakeGfx = new Graphics();
  lakeLayer.addChild(lakeGfx);
  const reflectionGfx = new Graphics();
  reflectionLayer.addChild(reflectionGfx);

  // 手前の影絵（初音ミク風シルエット）。グロー（ティールのにじみ）→ 本体（黒）の順で重ねる。
  const mikuGlow = new Graphics();
  mikuGlow.filters = [new BlurFilter({ strength: 4, quality: 2 })];
  const mikuBody = new Graphics();
  foregroundLayer.addChild(mikuGlow);
  foregroundLayer.addChild(mikuBody);

  // 状態
  let yataiConfig: YataiConfig = {
    baseColor: "vermilion",
    lanternColor: "warm",
    pattern: "sound",
    wish: "歌",
  };
  let section: SongSection = "intro";
  let time = 0;
  let totalElapsedMs = 0;
  let brightness = 0.12; // 全体の明るさ（セクションで上下）
  let brightnessBoost = 0; // 歌詞クリックの一時加算
  let moodHue = 210;
  let moodIntensity = 0;
  let flareTimer = 0; // サビ突入の一斉点灯演出
  let ambientSpawnTimer = 0;
  let scrollSpeed = 0; // 自分の歩み（屋台が左へ流れる速さ, px/sec）
  let mikuPhase = 0; // 影絵の歩行サイクル位相

  // ---- ゲーム性（夜の祭りを灯す手触り）の状態 ----
  // ユーザーを評価・失敗させるためではなく、灯していく手触りを出すためのもの。
  let yataiBrightness = 0; // 0..1 屋台の明るさ（クリックで上昇、時間で微減、サビで大きく）
  let peakBrightness = 0; // 到達した最大の明るさ（称号用）
  let lightGauge = 0; // 0..1 歌灯りゲージ（提灯・装飾・反射の輝きで表現。数値は出さない）
  let lightReserve = 0; // サビ前に溜めた灯り（chorus突入で一斉点灯に解放）
  let resonanceCount = 0; // 共鳴した周囲の提灯の数（称号用）
  let deepCount = 0; // deep系（静かな）歌詞を選んだ回数（称号用）
  let festivalScrollBoost = 0; // festival: 巡行感の一時加速
  let lightHoldTimer = 0; // deep: 灯りが長持ちする残り時間

  const stalls: Stall[] = [];
  let stallSpacing = 200; // 屋台の中心間隔（resize で再計算）
  const lightParticles: LightParticleFx[] = [];
  const bursts: BurstFx[] = [];
  const fallingLyrics: FallingLyricFx[] = [];
  const sparks: SparkFx[] = [];
  const community: CommunityLanternFx[] = [];
  let stars: StarSeed[] = [];

  function getHorizonY(): number {
    return app.screen.height * 0.6;
  }

  function unit(): number {
    return Math.min(app.screen.width, app.screen.height);
  }

  function lanternTone(color: LanternColor): { core: number; glow: number; hue: number } {
    const tone = LANTERN_COLORS[color];
    if (tone.rainbow) {
      const hue = (totalElapsedMs * 0.04) % 360;
      return { core: hslToHex(hue, 0.85, 0.7), glow: hslToHex(hue, 0.8, 0.85), hue };
    }
    return { core: tone.core, glow: tone.glow, hue: tone.hue };
  }

  // ---- 星空 ----
  function regenerateStars() {
    const w = app.screen.width;
    const horizonY = getHorizonY();
    const count = Math.floor((w * horizonY) / 9000);
    stars = [];
    for (let i = 0; i < count; i += 1) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * horizonY * 0.92,
        r: 0.4 + Math.random() * 1.4,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function drawSkyAndLake() {
    const w = app.screen.width;
    const h = app.screen.height;
    const horizonY = getHorizonY();

    // 夜空グラデーション（上＝濃い藍、地平＝街灯りでわずかに明るい）
    skyGfx.clear();
    const bands = 26;
    const top = NIGHT_SCENE.skyTop;
    const mid = NIGHT_SCENE.skyMid;
    const horizonGlow = NIGHT_SCENE.skyHorizon;
    for (let i = 0; i < bands; i += 1) {
      const t = i / bands;
      // 上半分は top→mid、下半分は mid→horizonGlow
      const color =
        t < 0.5 ? lerpColor(top, mid, t / 0.5) : lerpColor(mid, horizonGlow, (t - 0.5) / 0.5);
      // 地平付近は brightness とムードで温かく持ち上げる
      const warmth = t > 0.7 ? (t - 0.7) / 0.3 : 0;
      const moodMix = moodIntensity * 0.25 + brightness * 0.18;
      const glow = lerpColor(color, hslToHex(moodHue, 0.5, 0.5), warmth * moodMix);
      skyGfx.rect(0, t * horizonY, w, horizonY / bands + 1);
      skyGfx.fill({ color: glow, alpha: 1 });
    }

    // 星（瞬き）
    for (const s of stars) {
      const tw = 0.5 + 0.5 * Math.sin(totalElapsedMs * 0.002 + s.phase);
      skyGfx.circle(s.x, s.y, s.r);
      skyGfx.fill({ color: NIGHT_SCENE.star, alpha: 0.25 + tw * 0.6 });
    }

    // 月
    const moonX = w * 0.8;
    const moonY = horizonY * 0.28;
    const moonR = unit() * 0.05;
    skyGfx.circle(moonX, moonY, moonR * 1.8);
    skyGfx.fill({ color: NIGHT_SCENE.moon, alpha: 0.08 });
    skyGfx.circle(moonX, moonY, moonR);
    skyGfx.fill({ color: NIGHT_SCENE.moon, alpha: 0.9 });

    // 遠景：街並みのシルエット
    skyGfx.moveTo(0, horizonY);
    let x = 0;
    const bw = 26; // 毎フレーム再描画のため乱数は使わず決定的に
    while (x <= w) {
      const bh = 14 + Math.sin(x * 0.05) * 10 + Math.sin(x * 0.013 + 2) * 14;
      skyGfx.rect(x, horizonY - Math.max(6, bh), bw - 3, Math.max(6, bh));
      x += bw;
    }
    skyGfx.fill({ color: 0x0a1230, alpha: 0.65 });

    // 湖面
    lakeGfx.clear();
    lakeGfx.rect(0, horizonY, w, h - horizonY);
    lakeGfx.fill({ color: NIGHT_SCENE.lake, alpha: 1 });
    // 湖面の輝き（横帯）
    const shineBands = 16;
    for (let i = 0; i < shineBands; i += 1) {
      const t = i / shineBands;
      const y = horizonY + t * (h - horizonY);
      const alpha = (1 - t) * 0.05 * (0.5 + brightness * 0.8);
      lakeGfx.rect(0, y, w, 1.5);
      lakeGfx.fill({ color: NIGHT_SCENE.lakeShine, alpha });
    }
    // 月の湖面反射
    const reflY = horizonY + (horizonY - moonY) * 0.5;
    for (let i = 0; i < 8; i += 1) {
      const yy = reflY + i * (unit() * 0.012);
      const ww = moonR * (1.6 - i * 0.12) + Math.sin(totalElapsedMs * 0.003 + i) * 3;
      lakeGfx.ellipse(moonX + Math.sin(totalElapsedMs * 0.002 + i) * 4, yy, Math.max(2, ww), 1.4);
      lakeGfx.fill({ color: NIGHT_SCENE.moon, alpha: 0.12 * (1 - i / 8) });
    }
  }

  // 設定色を少し多めに混ぜた候補から、直前の台と被らない基調色を選ぶ
  function pickStallColor(avoid?: YataiBaseColor): YataiBaseColor {
    const pool: YataiBaseColor[] = [...STALL_COLOR_PALETTE, yataiConfig.baseColor];
    const candidates = pool.filter((c) => c !== avoid);
    return candidates[Math.floor(Math.random() * candidates.length)] ?? yataiConfig.baseColor;
  }

  // 列全体へ、隣同士が同色にならないよう基調色を割り当て直す
  function assignStallColors() {
    let prev: YataiBaseColor | undefined;
    for (const stall of stalls) {
      stall.baseColor = pickStallColor(prev);
      prev = stall.baseColor;
    }
  }

  // ---- 屋台（通りに並ぶ1台）の生成と描画 ----
  function createStall(): Stall {
    const container = new Container();
    const bodyGfx = new Graphics();
    const mukuGfx = new Graphics();
    const roofGfx = new Graphics();
    const finialGfx = new Graphics();
    const stringsGfx = new Graphics();
    const lanternsGfx = new Graphics();
    // 奥 → 手前：本体・幕紋様・屋根・棟飾り・吊り紐・提灯
    container.addChild(bodyGfx, mukuGfx, roofGfx, finialGfx, stringsGfx, lanternsGfx);
    stallsLayer.addChild(container);
    return {
      x: 0,
      baseColor: yataiConfig.baseColor,
      scale: 1,
      lit: 0,
      target: 0,
      lanternLocalY: 0,
      lanterns: [],
      inscribed: [],
      container,
      bodyGfx,
      mukuGfx,
      roofGfx,
      finialGfx,
      stringsGfx,
      lanternsGfx,
    };
  }

  // 屋台の静的パーツを現在の unit・config・scale で組み直す
  function buildStall(stall: Stall) {
    const S = unit();
    const bodyW = S * 0.2;
    const bodyH = S * 0.1;
    const roofH = S * 0.065;
    const roofW = bodyW * 1.3;
    const baseColor = YATAI_BASE_COLORS[stall.baseColor];
    const bodyCY = -bodyH * 0.5; // 本体中心（接地点が container 原点 y=0）

    // 本体（幕）
    stall.bodyGfx.clear();
    stall.bodyGfx.roundRect(-bodyW * 0.5, -bodyH, bodyW, bodyH, S * 0.01);
    stall.bodyGfx.fill({ color: baseColor, alpha: 1 });
    stall.bodyGfx.stroke({ color: 0xe7c878, width: 1.5, alpha: 0.85 }); // 金の縁取り

    // 幕の紋様（本体中心へ寄せる）
    stall.mukuGfx.position.set(0, bodyCY);
    drawMuku(stall.mukuGfx, bodyW, bodyH);

    // 屋根（2段の唐破風風）
    stall.roofGfx.clear();
    drawRoofTier(stall.roofGfx, roofW, roofH, -bodyH);
    drawRoofTier(stall.roofGfx, roofW * 0.7, roofH * 0.8, -bodyH - roofH * 0.7);

    // 棟飾り（金の宝珠）
    stall.finialGfx.clear();
    stall.finialGfx.circle(0, -bodyH - roofH * 1.3, S * 0.009);
    stall.finialGfx.fill({ color: 0xffe9a0, alpha: 0.95 });

    // 提灯スロット（軒下に横一列）
    const lanternY = -bodyH - roofH * 0.12;
    stall.lanternLocalY = lanternY;
    const spread = bodyW * 0.95;
    stall.lanterns = [];
    for (let i = 0; i < LANTERNS_PER_STALL; i += 1) {
      const lx = -spread * 0.5 + (spread * i) / (LANTERNS_PER_STALL - 1);
      stall.lanterns.push({ localX: lx, localY: lanternY, phase: Math.random() * Math.PI * 2 });
    }

    // 軒から提灯への吊り紐
    const eaveY = -bodyH - roofH * 0.4;
    stall.stringsGfx.clear();
    for (const l of stall.lanterns) {
      stall.stringsGfx.moveTo(l.localX, eaveY);
      stall.stringsGfx.lineTo(l.localX, l.localY - S * 0.01);
    }
    stall.stringsGfx.stroke({ color: 0x2a2118, width: 1, alpha: 0.55 });

    // 刻まれた歌詞の位置を本体中心へ寄せ直す
    for (const t of stall.inscribed) {
      t.position.set(
        (Math.random() - 0.5) * bodyW * 0.7,
        bodyCY + (Math.random() - 0.5) * bodyH * 0.5,
      );
    }

    stall.container.scale.set(stall.scale);
  }

  function drawRoofTier(g: Graphics, w: number, h: number, baseY: number) {
    // 反り上がった軒（唐破風風）
    g.moveTo(-w * 0.5, baseY);
    g.quadraticCurveTo(-w * 0.5 - w * 0.06, baseY - h * 0.5, -w * 0.42, baseY - h * 0.6);
    g.quadraticCurveTo(0, baseY - h * 1.4, w * 0.42, baseY - h * 0.6);
    g.quadraticCurveTo(w * 0.5 + w * 0.06, baseY - h * 0.5, w * 0.5, baseY);
    g.lineTo(-w * 0.5, baseY);
    g.fill({ color: 0x241712, alpha: 1 });
    g.stroke({ color: 0xe7c878, width: 1.5, alpha: 0.8 });
  }

  function drawMuku(g: Graphics, bodyW: number, bodyH: number) {
    g.clear();
    const a = 0.32;
    switch (yataiConfig.pattern) {
      case "ripple":
        for (let i = 1; i <= 3; i += 1) {
          g.arc(0, bodyH * 0.55, bodyW * 0.16 * i, Math.PI, Math.PI * 2);
          g.stroke({ color: 0xffffff, width: 1.2, alpha: a });
        }
        break;
      case "sound":
        for (let i = 0; i < 4; i += 1) {
          const y = -bodyH * 0.3 + i * bodyH * 0.2;
          g.moveTo(-bodyW * 0.42, y);
          g.lineTo(bodyW * 0.42, y);
        }
        g.stroke({ color: 0xffffff, width: 1, alpha: a });
        break;
      case "star":
        for (let i = 0; i < 7; i += 1) {
          const sx = (Math.random() - 0.5) * bodyW * 0.8;
          const sy = (Math.random() - 0.5) * bodyH * 0.7;
          g.circle(sx, sy, 1.8);
          g.fill({ color: 0xffffff, alpha: a + 0.2 });
        }
        break;
      case "flower":
        for (let p = 0; p < 6; p += 1) {
          const ang = (p / 6) * Math.PI * 2;
          g.circle(Math.cos(ang) * bodyW * 0.1, Math.sin(ang) * bodyH * 0.22, bodyH * 0.12);
          g.stroke({ color: 0xffffff, width: 1, alpha: a });
        }
        break;
      case "wind":
        for (let i = -2; i <= 2; i += 1) {
          g.moveTo(-bodyW * 0.42, i * bodyH * 0.16);
          g.quadraticCurveTo(0, i * bodyH * 0.16 - bodyH * 0.18, bodyW * 0.42, i * bodyH * 0.16);
        }
        g.stroke({ color: 0xffffff, width: 1.2, alpha: a });
        break;
    }
  }

  function drawStallLanterns(stall: Stall) {
    const g = stall.lanternsGfx;
    g.clear();
    const S = unit();
    const lw = S * 0.018;
    const lh = S * 0.026;
    for (const l of stall.lanterns) {
      const tone = lanternTone(yataiConfig.lanternColor);
      const flick = 0.92 + 0.08 * Math.sin(totalElapsedMs * 0.006 + l.phase);
      const lit = stall.lit * flick;
      // グロー
      if (lit > 0.02) {
        g.circle(l.localX, l.localY, lh * (1.1 + lit * 1.4));
        g.fill({ color: tone.glow, alpha: 0.12 * lit });
        g.circle(l.localX, l.localY, lh * (0.7 + lit * 0.7));
        g.fill({ color: tone.glow, alpha: 0.2 * lit });
      }
      // 提灯本体（消灯時は暗い紙色）
      const baseAlpha = 0.5 + lit * 0.5;
      const body = lit > 0.02 ? tone.core : 0x6b5a44;
      g.ellipse(l.localX, l.localY, lw * 0.5, lh * 0.5);
      g.fill({ color: body, alpha: baseAlpha });
      g.ellipse(l.localX, l.localY, lw * 0.5, lh * 0.5);
      g.stroke({ color: 0x2a2118, width: 1, alpha: 0.5 });
      // 上下の口金
      g.rect(l.localX - lw * 0.18, l.localY - lh * 0.5, lw * 0.36, lh * 0.08);
      g.rect(l.localX - lw * 0.18, l.localY + lh * 0.42, lw * 0.36, lh * 0.08);
      g.fill({ color: 0x2a2118, alpha: 0.7 });
    }
  }

  // 屋台の列をプール生成・配置。resize と config 変更でジオメトリを組み直す。
  function layoutStalls() {
    const S = unit();
    const W = app.screen.width;
    const bodyW = S * 0.2;
    stallSpacing = bodyW * 2.0;
    const needed = Math.ceil(W / stallSpacing) + 3;

    while (stalls.length < needed) {
      stalls.push(createStall());
    }
    while (stalls.length > needed) {
      const extra = stalls.pop();
      if (extra) {
        for (const t of extra.inscribed) t.destroy();
        stallsLayer.removeChild(extra.container);
        extra.container.destroy({ children: true });
      }
    }

    // 隣同士が同色にならないよう色を割り当ててから、等間隔に並べる
    assignStallColors();
    for (let i = 0; i < stalls.length; i += 1) {
      const stall = stalls[i]!;
      stall.x = i * stallSpacing - stallSpacing;
      buildStall(stall);
    }
  }

  // 屋台が画面左へ抜けたら、列の右端へ回して未点灯の新しい屋台として戻す
  function recycleStall(stall: Stall) {
    let maxX = -Infinity;
    let rightmostColor: YataiBaseColor | undefined;
    for (const s of stalls) {
      if (s !== stall && s.x > maxX) {
        maxX = s.x;
        rightmostColor = s.baseColor;
      }
    }
    stall.x = maxX + stallSpacing;
    stall.baseColor = pickStallColor(rightmostColor); // 末尾の台と被らない色に
    stall.lit = 0;
    stall.target = 0;
    stall.scale = 0.9 + Math.random() * 0.2;
    for (const t of stall.inscribed) {
      stall.container.removeChild(t);
      t.destroy();
    }
    stall.inscribed.length = 0;
    buildStall(stall);
  }

  // ---- 反射（湖面に映る屋台の提灯） ----
  function drawReflection() {
    reflectionGfx.clear();
    const horizonY = getHorizonY();
    const S = unit();
    const shimmer = Math.sin(totalElapsedMs * 0.0023) * 4;

    for (const stall of stalls) {
      if (stall.lit <= 0.05) continue;
      const tone = lanternTone(yataiConfig.lanternColor);
      for (const l of stall.lanterns) {
        const gx = stall.x + l.localX * stall.scale + shimmer;
        // 軒の提灯は地平より上。地平で折り返して下へ伸ばす。
        const lanternWorldY = horizonY + l.localY * stall.scale;
        const gReflY = horizonY + (horizonY - lanternWorldY);
        for (let i = 0; i < 5; i += 1) {
          const yy = gReflY + i * (S * 0.014);
          const ww =
            S * 0.01 * (1.2 - i * 0.16) + Math.sin(totalElapsedMs * 0.004 + i + l.phase) * 2;
          reflectionGfx.ellipse(gx, yy, Math.max(1.2, ww), 1.4);
          reflectionGfx.fill({ color: tone.glow, alpha: 0.18 * stall.lit * (1 - i / 5) });
        }
      }
    }
  }

  // ---- 演出スポーン ----
  function spawnFallingLyric(x: number, y: number, text: string, category: NightWordCategory) {
    const color = categoryColorNight(category);
    const t = new Text({
      text,
      style: { fontFamily: FONT_FAMILY, fontSize: 22, fill: color.fill, fontWeight: "300" },
    });
    t.anchor.set(0.5);
    t.position.set(x, y);
    fallingLyricLayer.addChild(t);
    fallingLyrics.push({ gfx: t, x, startY: y, life: 0, maxLife: 0.9 });
  }

  function spawnLightParticle(
    fromX: number,
    fromY: number,
    stall: Stall,
    hue: number,
    text: string,
    category: NightWordCategory,
  ) {
    const g = new Graphics();
    lightLayer.addChild(g);
    // 制御点：いったん上へ膨らんでから屋台へ吸い込まれる弧
    const ctrlX = (fromX + stall.x) * 0.5;
    const ctrlY = Math.min(fromY, getHorizonY()) - app.screen.height * 0.12;
    lightParticles.push({
      gfx: g,
      fromX,
      fromY,
      ctrlX,
      ctrlY,
      stall,
      life: 0,
      maxLife: 1.0,
      hue,
      arrived: false,
      text,
      category,
    });
  }

  function spawnBurst(x: number, y: number, hue: number) {
    const g = new Graphics();
    lightLayer.addChild(g);
    bursts.push({ gfx: g, x, y, life: 0, maxLife: 0.9, maxRadius: unit() * 0.06, hue });
    spawnSparks(x, y, 8, hue);
  }

  function spawnSparks(x: number, y: number, count: number, hue: number) {
    for (let i = 0; i < count; i += 1) {
      const g = new Graphics();
      g.circle(0, 0, 1.4 + Math.random() * 1.8);
      g.fill({ color: hslToHex(hue, 0.7, 0.85), alpha: 0.9 });
      g.position.set(x, y);
      lightLayer.addChild(g);
      sparks.push({
        gfx: g,
        vx: (Math.random() - 0.5) * 90,
        vy: -30 - Math.random() * 120,
        life: 0,
        maxLife: 1.2 + Math.random() * 0.8,
      });
    }
  }

  function buildCommunityLantern(data: CommunityLantern): { container: Container; glow: Graphics } {
    const c = new Container();
    const tone = LANTERN_COLORS[data.color];
    const r = unit() * 0.012 * (0.8 + data.size);
    // 共鳴の光（背面）。resonance に応じて alpha を上げる。
    const glow = new Graphics();
    glow.circle(0, 0, r * 3.4);
    glow.fill({ color: tone.glow, alpha: 0.6 });
    glow.alpha = 0;
    c.addChild(glow);
    const g = new Graphics();
    g.circle(0, 0, r * 2.4);
    g.fill({ color: tone.glow, alpha: 0.14 });
    g.circle(0, 0, r);
    g.fill({ color: tone.core, alpha: 0.9 });
    c.addChild(g);
    if (data.word) {
      const t = new Text({
        text: data.word.slice(0, 2),
        style: { fontFamily: FONT_FAMILY, fontSize: Math.max(8, r * 1.2), fill: 0xffffff },
      });
      t.anchor.set(0.5);
      t.position.set(0, -r * 2.4);
      t.alpha = 0.6;
      c.addChild(t);
    }
    c.alpha = data.opacity;
    c.position.set(data.x, data.y);
    return { container: c, glow };
  }

  function addCommunityLanternFromLyric(lyric: NightSelectedLyric) {
    const data = generateCommunityLanternFromLyric(lyric, {
      width: app.screen.width,
      height: app.screen.height,
    });
    const { container, glow } = buildCommunityLantern(data);
    distantLayer.addChild(container);
    community.push({
      data,
      gfx: container,
      glow,
      baseY: data.y,
      resonance: 0,
      hasResonated: false,
    });
  }

  function addAmbientCommunityLantern() {
    const data = generateAmbientCommunityLantern({
      width: app.screen.width,
      height: app.screen.height,
    });
    const { container, glow } = buildCommunityLantern(data);
    distantLayer.addChild(container);
    community.push({
      data,
      gfx: container,
      glow,
      baseY: data.y,
      resonance: 0,
      hasResonated: false,
    });
  }

  // 灯った屋台の幕に歌詞を刻む
  function inscribeLyric(stall: Stall, text: string, category: NightWordCategory) {
    if (stall.inscribed.length >= MAX_INSCRIBED_PER_STALL) {
      const oldest = stall.inscribed.shift();
      if (oldest) {
        stall.container.removeChild(oldest);
        oldest.destroy();
      }
    }
    const color = categoryColorNight(category);
    const S = unit();
    const bodyW = S * 0.2;
    const bodyH = S * 0.1;
    const t = new Text({
      text: text.slice(0, 3),
      style: { fontFamily: FONT_FAMILY, fontSize: Math.max(8, bodyH * 0.26), fill: color.fill },
    });
    t.anchor.set(0.5);
    t.position.set(
      (Math.random() - 0.5) * bodyW * 0.7,
      -bodyH * 0.5 + (Math.random() - 0.5) * bodyH * 0.5,
    );
    t.alpha = 0.85;
    // 屋根より下（本体の上）に差し込む
    stall.container.addChildAt(t, stall.container.getChildIndex(stall.roofGfx));
    stall.inscribed.push(t);
  }

  function applyMood(category: NightWordCategory) {
    const target = categoryColorNight(category).hue;
    const diff = ((target - moodHue + 540) % 360) - 180;
    moodHue = (moodHue + diff * 0.35 + 360) % 360;
    moodIntensity = Math.min(1, moodIntensity + 0.22);
  }

  // 画面内で未点灯の屋台のうち、クリック位置にいちばん近いものを選ぶ。
  // すべて灯っていれば画面内で最も暗い屋台を選び直す。
  function pickTargetStall(clickX: number): Stall | null {
    const W = app.screen.width;
    let best: Stall | null = null;
    let bestDist = Infinity;
    for (const stall of stalls) {
      if (stall.x < 0 || stall.x > W) continue;
      if (stall.target >= 0.6) continue;
      const d = Math.abs(stall.x - clickX);
      if (d < bestDist) {
        bestDist = d;
        best = stall;
      }
    }
    if (best) return best;
    // 全点灯済み：画面内で最も暗い屋台へ
    for (const stall of stalls) {
      if (stall.x < 0 || stall.x > W) continue;
      if (!best || stall.lit < best.lit) best = stall;
    }
    return best;
  }

  // 周囲の提灯を共鳴させる（光らせる）。初共鳴の数を称号用にカウントする。
  function resonateCommunity(strength: number) {
    for (const c of community) {
      c.resonance = Math.min(1, c.resonance + strength);
      if (!c.hasResonated && c.resonance > 0.5) {
        c.hasResonated = true;
        resonanceCount += 1;
      }
    }
  }

  // wish: 夜空に星粒を散らす
  function addWishStars() {
    const w = app.screen.width;
    const horizonY = getHorizonY();
    for (let i = 0; i < 12; i += 1) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * horizonY * 0.8,
        r: 0.5 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2,
      });
    }
    const maxStars = 400;
    if (stars.length > maxStars) stars.splice(0, stars.length - maxStars);
  }

  function dropLyric(lyric: NightSelectedLyric) {
    const { x, y } = lyric.position;
    const cat = lyric.category;
    const color = categoryColorNight(cat);
    const inChorus = section === "chorus" || section === "finalChorus";

    applyMood(cat);

    // 1) 歌詞が光の粒になる（その場で浮かんで消える）
    spawnFallingLyric(x, y, lyric.text, cat);

    // 2) 少し遅れて光の粒が「いま画面にいる屋台」へ飛ぶ
    const target = pickTargetStall(x);
    if (target) {
      window.setTimeout(() => {
        spawnLightParticle(x, y, target, color.hue, lyric.text, cat);
      }, 300);
    }

    // 3) 歌詞タイプごとの灯り効果（明るさ・歌灯りゲージ・共鳴・巡行・持続）
    const chorusMul = inChorus ? 1.7 : 1;
    let brightGain = 0.06; // neutral 基準
    let gaugeGain = 0.1;
    switch (cat) {
      case "bright": // 明灯：提灯が強く光り、明るさが大きく上がる
        brightGain = 0.12;
        gaugeGain = 0.14;
        break;
      case "sound": // 響灯：周囲の提灯が共鳴して光る
        brightGain = 0.05;
        gaugeGain = 0.11;
        resonateCommunity(1);
        break;
      case "festival": // 巡灯：屋台の巡行が少し速くなる
        brightGain = 0.06;
        gaugeGain = 0.12;
        festivalScrollBoost = 1.4;
        break;
      case "deep": // 余灯：灯りが長持ちする
        brightGain = 0.05;
        gaugeGain = 0.08;
        deepCount += 1;
        lightHoldTimer = 6;
        break;
      case "wish": // 祝灯：夜空に星粒、横に光輪
        brightGain = 0.06;
        gaugeGain = 0.1;
        addWishStars();
        window.setTimeout(() => spawnBurst(x, Math.min(y, getHorizonY()), color.hue), 200);
        break;
      case "neutral":
      default:
        break;
    }
    yataiBrightness = Math.min(1, yataiBrightness + brightGain * chorusMul);
    lightGauge = Math.min(1, lightGauge + gaugeGain);
    brightnessBoost = Math.min(0.3, brightnessBoost + 0.08);

    // 4) サビ前は灯りを溜める（chorus 突入で一斉点灯に解放）
    if (!inChorus) lightReserve += 1;

    // 5) 周囲の提灯を追加（sound / festival は出やすい）
    const spawnProb = cat === "sound" || cat === "festival" ? 0.85 : 0.5;
    if (Math.random() < spawnProb) {
      addCommunityLanternFromLyric(lyric);
    }
  }

  // ---- 手前の影絵（初音ミク風）の歩行 ----
  function updateMiku(dt: number) {
    const w = app.screen.width;
    const h = app.screen.height;
    const H = h * 0.52; // 影絵の全高（ロングテール込みで足元近くまで）
    const groundY = h * 0.95; // 足元
    const hipX = w * 0.3; // 左寄りに立たせる（屋台の灯りを隠しすぎない）

    // 歩くテンポは流れの速さに連動（速く流れるほど速く歩いて見える）
    const cadence = (scrollSpeed / Math.max(1, unit())) * 16 + 2.2;
    mikuPhase += dt * cadence;
    const ph = mikuPhase;

    // 体の縦配置（横向き・スリムな自然体型, 約7頭身）
    const legLen = H * 0.5;
    const bob = Math.sin(ph * 2) * H * 0.01; // 上下の弾み
    const hipY = groundY - legLen + bob;
    const torsoLen = H * 0.25;
    const shoulderY = hipY - torsoLen;
    const neckLen = H * 0.028;
    const headR = H * 0.075;
    const headCX = hipX; // 頭は肩の真上（前傾＝お辞儀に見えないように）
    const headCY = shoulderY - neckLen - headR * 0.85;

    // 体の横幅（肩→くびれ→腰）
    const shoulderHalf = H * 0.07;
    const waistY = shoulderY + torsoLen * 0.58;
    const waistHalf = H * 0.044;
    const hipHalf = H * 0.062;
    const neckHalf = H * 0.018;

    // 脚（左右で半周ずらして交互に踏み出す）
    const stride = H * 0.1;
    const lift = H * 0.045;
    const footOf = (p: number) => {
      const sx = hipX + Math.sin(p) * stride;
      const up = Math.max(0, Math.cos(p)) * lift;
      return { x: sx, y: groundY - up };
    };
    const hipJointFront = hipX + H * 0.025;
    const hipJointBack = hipX - H * 0.025;
    const kneeOf = (originX: number, f: { x: number; y: number }) => ({
      x: (originX + f.x) / 2 + H * 0.022, // 前方へ膝を曲げる
      y: (hipY + f.y) / 2,
    });
    const footFront = footOf(ph);
    const footBack = footOf(ph + Math.PI);
    const kneeFront = kneeOf(hipJointFront, footFront);
    const kneeBack = kneeOf(hipJointBack, footBack);

    // 腕（脚と逆位相、肩から下げて前後に振る）
    const armOf = (shoulderJX: number, p: number) => {
      const sgn = Math.sin(p);
      const elbow = { x: shoulderJX + sgn * H * 0.04, y: shoulderY + torsoLen * 0.45 };
      const wrist = { x: elbow.x + sgn * H * 0.045, y: shoulderY + torsoLen * 0.82 };
      return { elbow, wrist };
    };
    const shoulderJFront = hipX + H * 0.018;
    const shoulderJBack = hipX - H * 0.018;
    const armFront = armOf(shoulderJFront, ph + Math.PI);
    const armBack = armOf(shoulderJBack, ph);

    // ツインテール（後頭部の結び目から後ろ＝左へ大きく流れる）
    const attX = headCX - headR * 0.7;
    const attY = headCY - headR * 0.35;
    const sway = Math.sin(ph + 1.0) * H * 0.025;

    // 手足の太さ（付け根→先へテーパー）
    const thighW = H * 0.06;
    const kneeW = H * 0.04;
    const ankleW = H * 0.026;
    const upperArmW = H * 0.038;
    const elbowW = H * 0.03;
    const wristW = H * 0.024;

    // 直線テーパーの手足を描く（上節 → 関節 → 先端の2本続き）
    const drawLimb = (
      g: Graphics,
      color: number,
      alpha: number,
      ox: number,
      oy: number,
      jx: number,
      jy: number,
      ex: number,
      ey: number,
      w0: number,
      w1: number,
      w2: number,
    ) => {
      taperedRibbon(g, ox, oy, (ox + jx) / 2, (oy + jy) / 2, jx, jy, w0, w1, color, alpha);
      taperedRibbon(g, jx, jy, (jx + ex) / 2, (jy + ey) / 2, ex, ey, w1, w2, color, alpha);
    };
    const drawFoot = (g: Graphics, color: number, alpha: number, fx: number, fy: number) => {
      // 進行方向(右)へ伸びるブーツ先端（ヒール付き）
      g.poly([
        fx - H * 0.02,
        fy - H * 0.012,
        fx + H * 0.04,
        fy - H * 0.006,
        fx + H * 0.046,
        fy + H * 0.012,
        fx - H * 0.022,
        fy + H * 0.014,
      ]);
      g.fill({ color, alpha });
      g.rect(fx - H * 0.016, fy + H * 0.012, H * 0.013, H * 0.022);
      g.fill({ color, alpha });
    };
    // ロングツインテール（後頭部 → 背後へなだらかに流れ、膝〜脛の高さで宙に尖る）
    const drawTail = (g: Graphics, color: number, alpha: number, bulge: number, w0: number) => {
      const midX = attX - H * 0.13 + bulge + sway;
      const midY = shoulderY + torsoLen * 0.55;
      taperedRibbon(
        g,
        attX,
        attY,
        attX - H * 0.1,
        attY + H * 0.12,
        midX,
        midY,
        w0,
        w0 * 0.82,
        color,
        alpha,
      );
      const endX = attX - H * 0.2 + bulge * 1.3 + sway * 1.5;
      const endY = hipY + legLen * 0.5;
      taperedRibbon(
        g,
        midX,
        midY,
        midX - H * 0.06,
        midY + H * 0.16,
        endX,
        endY,
        w0 * 0.82,
        H * 0.01,
        color,
        alpha,
      );
    };

    const paint = (g: Graphics, color: number, alpha: number) => {
      g.clear();
      // ① 最奥：ロングツインテール2本（膨らみを変えて2本に見せる）
      drawTail(g, color, alpha, -H * 0.03, H * 0.088);
      drawTail(g, color, alpha, H * 0.035, H * 0.072);

      // ② 奥側（後ろ）の腕・脚（付け根は体内から始めて繋ぎ目を作らない）
      drawLimb(
        g,
        color,
        alpha,
        shoulderJBack,
        shoulderY + H * 0.03,
        armBack.elbow.x,
        armBack.elbow.y,
        armBack.wrist.x,
        armBack.wrist.y,
        upperArmW,
        elbowW,
        wristW,
      );
      g.circle(armBack.wrist.x, armBack.wrist.y, wristW * 0.7); // 手
      g.fill({ color, alpha });
      drawLimb(
        g,
        color,
        alpha,
        hipJointBack,
        hipY - H * 0.03,
        kneeBack.x,
        kneeBack.y,
        footBack.x,
        footBack.y,
        thighW,
        kneeW,
        ankleW,
      );
      drawFoot(g, color, alpha, footBack.x, footBack.y);

      // ③ 首 → 胴（肩 → くびれ → 腰）をひと続きの曲線で
      g.poly([
        headCX - neckHalf,
        headCY + headR * 0.55,
        headCX + neckHalf,
        headCY + headR * 0.55,
        hipX + neckHalf,
        shoulderY,
        hipX - neckHalf,
        shoulderY,
      ]);
      g.fill({ color, alpha });
      g.moveTo(hipX - shoulderHalf, shoulderY);
      g.quadraticCurveTo(
        hipX - shoulderHalf * 1.02,
        (shoulderY + waistY) / 2,
        hipX - waistHalf,
        waistY,
      );
      g.quadraticCurveTo(hipX - hipHalf * 1.05, (waistY + hipY) / 2, hipX - hipHalf, hipY);
      g.lineTo(hipX + hipHalf, hipY);
      g.quadraticCurveTo(hipX + hipHalf * 1.05, (waistY + hipY) / 2, hipX + waistHalf, waistY);
      g.quadraticCurveTo(
        hipX + shoulderHalf * 1.02,
        (shoulderY + waistY) / 2,
        hipX + shoulderHalf,
        shoulderY,
      );
      g.quadraticCurveTo(hipX, shoulderY - H * 0.018, hipX - shoulderHalf, shoulderY); // なで肩の上辺
      g.fill({ color, alpha });

      // ④ スカート（フレア）
      g.poly([
        hipX - hipHalf * 0.95,
        hipY - H * 0.01,
        hipX + hipHalf * 0.95,
        hipY - H * 0.01,
        hipX + hipHalf * 1.6,
        hipY + H * 0.13,
        hipX - hipHalf * 1.6,
        hipY + H * 0.13,
      ]);
      g.fill({ color, alpha });

      // ⑤ 手前の腕・脚
      drawLimb(
        g,
        color,
        alpha,
        shoulderJFront,
        shoulderY + H * 0.03,
        armFront.elbow.x,
        armFront.elbow.y,
        armFront.wrist.x,
        armFront.wrist.y,
        upperArmW,
        elbowW,
        wristW,
      );
      g.circle(armFront.wrist.x, armFront.wrist.y, wristW * 0.7); // 手
      g.fill({ color, alpha });
      drawLimb(
        g,
        color,
        alpha,
        hipJointFront,
        hipY - H * 0.03,
        kneeFront.x,
        kneeFront.y,
        footFront.x,
        footFront.y,
        thighW,
        kneeW,
        ankleW,
      );
      drawFoot(g, color, alpha, footFront.x, footFront.y);

      // ⑥ 頭（横顔）
      g.circle(headCX, headCY, headR);
      g.fill({ color, alpha });
      // 結び目（ツインテールの付け根。頭の輪郭に沿わせる小さめ）
      g.circle(attX + headR * 0.1, attY, headR * 0.3);
      g.fill({ color, alpha });
      // 前髪（頭頂を左右対称ぎみに覆い、顔側=右に毛先。輪郭内に収めてトゲを作らない）
      g.poly([
        headCX - headR * 0.95,
        headCY - headR * 0.3,
        headCX - headR * 0.55,
        headCY - headR * 1.05,
        headCX - headR * 0.15,
        headCY - headR * 0.6,
        headCX + headR * 0.25,
        headCY - headR * 1.05,
        headCX + headR * 0.7,
        headCY - headR * 0.55,
        headCX + headR * 0.98,
        headCY - headR * 0.05,
        headCX + headR * 0.78,
        headCY + headR * 0.32, // 顔側の毛先
        headCX + headR * 0.4,
        headCY,
        headCX - headR * 0.5,
        headCY,
      ]);
      g.fill({ color, alpha });
      // アホ毛（控えめな跳ね毛）
      taperedRibbon(
        g,
        headCX - headR * 0.05,
        headCY - headR * 0.98,
        headCX + headR * 0.3,
        headCY - headR * 1.45,
        headCX + headR * 0.8,
        headCY - headR * 1.2,
        H * 0.007,
        H * 0.003,
        color,
        alpha,
      );
    };

    paint(mikuGlow, 0x33b8ae, 0.4); // ミクのティールでにじむ控えめな縁取り光
    paint(mikuBody, 0x070b16, 1); // ほぼ黒の影絵本体
  }

  // ---- メインループ ----
  app.ticker.add((ticker) => {
    const dt = ticker.deltaMS / 1000;
    totalElapsedMs += ticker.deltaMS;

    // 明るさ：セクション目標 + クリックの一時加算 + 屋台の明るさ/歌灯りゲージ
    const targetBrightness = Math.min(
      1,
      SECTION_BRIGHTNESS[section] + brightnessBoost + yataiBrightness * 0.5 + lightGauge * 0.2,
    );
    brightness += (targetBrightness - brightness) * Math.min(1, dt * 0.8);
    brightnessBoost *= Math.exp(-dt * 1.0);
    moodIntensity *= Math.exp(-dt * 0.2);
    if (flareTimer > 0) flareTimer = Math.max(0, flareTimer - dt);

    // ---- ゲーム性の状態更新（時間経過で穏やかに戻す） ----
    yataiBrightness = Math.max(0, yataiBrightness - dt * 0.03); // 明るさは少しずつ下がる
    lightGauge = Math.max(0, lightGauge - dt * 0.12); // 歌灯りゲージも自然減衰
    peakBrightness = Math.max(peakBrightness, yataiBrightness);
    if (festivalScrollBoost > 0) festivalScrollBoost = Math.max(0, festivalScrollBoost - dt);
    if (lightHoldTimer > 0) lightHoldTimer = Math.max(0, lightHoldTimer - dt);

    const horizonY = getHorizonY();
    const S = unit();

    // 自分の歩み：屋台の列を左へ流す（サビで歩が速くなる。festival は一時加速）
    const isChorus = section === "chorus" || section === "finalChorus";
    const targetSpeed =
      S * (isChorus ? 0.09 : 0.05) * (0.55 + brightness * 0.45) + festivalScrollBoost * S * 0.05;
    scrollSpeed += (targetSpeed - scrollSpeed) * Math.min(1, dt * 1.5);

    // 提灯の点灯下限（サビ突入時は flareTimer、明るさが高いほど底上げ）
    const litFloor =
      section === "intro" ? 0 : brightness * 0.15 + flareTimer * 0.15 + yataiBrightness * 0.25;

    for (const stall of stalls) {
      stall.x -= scrollSpeed * dt;
      if (stall.x < -stallSpacing) {
        recycleStall(stall);
      }
      // 提灯の灯りの持続：点灯はゆっくり弱まり（deep中は長持ち）、歌詞で再点灯する
      const decay = lightHoldTimer > 0 ? 0.02 : 0.05;
      stall.target = Math.max(litFloor, stall.target - dt * decay);
      const tgt = stall.target;
      stall.lit += (tgt - stall.lit) * Math.min(1, dt * 3);
      stall.container.position.set(stall.x, horizonY);
      // 奥行き感：小さい屋台はやや淡く
      stall.container.alpha = 0.8 + (stall.scale - 0.9) * 1.0;
      drawStallLanterns(stall);
    }

    drawReflection();

    // 光の粒（クリック歌詞 → 屋台）
    for (let i = lightParticles.length - 1; i >= 0; i -= 1) {
      const p = lightParticles[i]!;
      p.life += dt;
      const ratio = Math.min(1, p.life / p.maxLife);
      const eased = ratio * ratio;
      // 目標は流れている屋台の現在位置（提灯列の中央）
      const toX = p.stall.x;
      const toY = horizonY + p.stall.lanternLocalY * p.stall.scale;
      // 二次ベジェ
      const mt = 1 - eased;
      const px = mt * mt * p.fromX + 2 * mt * eased * p.ctrlX + eased * eased * toX;
      const py = mt * mt * p.fromY + 2 * mt * eased * p.ctrlY + eased * eased * toY;
      p.gfx.clear();
      const r = 3 + (1 - ratio) * 3;
      p.gfx.circle(px, py, r * 2.2);
      p.gfx.fill({ color: hslToHex(p.hue, 0.7, 0.85), alpha: 0.25 });
      p.gfx.circle(px, py, r);
      p.gfx.fill({ color: hslToHex(p.hue, 0.8, 0.92), alpha: 0.95 });

      if (!p.arrived && ratio >= 1) {
        p.arrived = true;
        // 屋台に灯をともす
        p.stall.target = 1;
        inscribeLyric(p.stall, p.text, p.category);
        spawnBurst(toX, toY, p.hue);
      }
      if (ratio >= 1) {
        lightLayer.removeChild(p.gfx);
        p.gfx.destroy();
        lightParticles.splice(i, 1);
      }
    }

    // バースト（屋台点灯時の光の輪）
    for (let i = bursts.length - 1; i >= 0; i -= 1) {
      const b = bursts[i]!;
      b.life += dt;
      if (b.life >= b.maxLife) {
        lightLayer.removeChild(b.gfx);
        b.gfx.destroy();
        bursts.splice(i, 1);
        continue;
      }
      const ratio = b.life / b.maxLife;
      const radius = ratio * b.maxRadius;
      const alpha = (1 - ratio) * 0.7;
      b.gfx.clear();
      b.gfx.circle(b.x, b.y, radius);
      b.gfx.stroke({ color: hslToHex(b.hue, 0.7, 0.85), alpha, width: 2 });
    }

    // 火花
    for (let i = sparks.length - 1; i >= 0; i -= 1) {
      const sp = sparks[i]!;
      sp.life += dt;
      if (sp.life >= sp.maxLife) {
        lightLayer.removeChild(sp.gfx);
        sp.gfx.destroy();
        sparks.splice(i, 1);
        continue;
      }
      const ratio = sp.life / sp.maxLife;
      sp.gfx.x += sp.vx * dt;
      sp.gfx.y += sp.vy * dt;
      sp.vy *= Math.exp(-dt * 0.7);
      sp.gfx.alpha = (1 - ratio) * 0.9;
    }

    // 落ちる歌詞（その場で浮かんで消える）
    for (let i = fallingLyrics.length - 1; i >= 0; i -= 1) {
      const f = fallingLyrics[i]!;
      f.life += dt;
      const ratio = Math.min(1, f.life / f.maxLife);
      f.gfx.position.set(f.x, f.startY - ratio * app.screen.height * 0.04);
      f.gfx.alpha = 1 - ratio;
      f.gfx.scale.set(1 - ratio * 0.4);
      if (f.life >= f.maxLife) {
        fallingLyricLayer.removeChild(f.gfx);
        f.gfx.destroy();
        fallingLyrics.splice(i, 1);
      }
    }

    // 周囲の提灯（ゆらぎ・サビで明るく・共鳴で光る）
    const flockLift = section === "finalChorus" ? -10 : 0;
    for (const c of community) {
      const dx = Math.sin(totalElapsedMs * 0.0008 + c.data.phase) * 6;
      const dy = Math.cos(totalElapsedMs * 0.001 + c.data.phase) * 3;
      c.gfx.position.set(c.data.x + dx, c.baseY + dy + flockLift);
      const targetAlpha = c.data.opacity * (0.7 + brightness * 0.6);
      c.gfx.alpha += (Math.min(1, targetAlpha) - c.gfx.alpha) * Math.min(1, dt * 2);

      // 共鳴：サビ中は徐々に光り、それ以外は減衰する
      if (isChorus) {
        c.resonance = Math.min(1, c.resonance + dt * 0.4);
        if (!c.hasResonated && c.resonance > 0.5) {
          c.hasResonated = true;
          resonanceCount += 1;
        }
      } else {
        c.resonance = Math.max(0, c.resonance - dt * 0.35);
      }
      const glowPulse = 0.4 + 0.3 * Math.sin(totalElapsedMs * 0.004 + c.data.phase);
      c.glow.alpha = c.resonance * glowPulse;
    }

    // 周囲の提灯の自動出現
    ambientSpawnTimer += dt;
    const interval =
      section === "intro"
        ? 100
        : section === "finalChorus"
          ? 0.9
          : section === "chorus"
            ? 1.6
            : 3.2;
    const cap = section === "finalChorus" ? 60 : 32;
    if (ambientSpawnTimer > interval && community.length < cap) {
      ambientSpawnTimer = 0;
      addAmbientCommunityLantern();
    }

    // 手前の影絵（初音ミク風）を歩かせる
    updateMiku(dt);

    // 背景は間引いて更新（リサイズ・星の瞬き・月の反射のため）
    if (Math.floor(totalElapsedMs / 80) % 2 === 0) {
      drawSkyAndLake();
    }
  });

  // 画面内の屋台を一斉に灯す（サビ）
  function lightVisibleStalls() {
    const W = app.screen.width;
    for (const stall of stalls) {
      if (stall.x >= -stallSpacing && stall.x <= W + stallSpacing) {
        stall.target = 1;
      }
    }
  }

  // chorus 突入時：溜めた灯り＋共鳴で大きな一斉点灯を出す。
  function releaseLightReserve() {
    const reserveBoost = Math.min(0.4, lightReserve * 0.03);
    // 周囲の提灯が多いほど明るさ上昇が少し増える（共鳴ボーナス）
    const resonanceBonus = community.length >= 6 ? 0.12 : community.length >= 3 ? 0.06 : 0;
    yataiBrightness = Math.min(1, yataiBrightness + reserveBoost + resonanceBonus);
    lightGauge = Math.min(1, lightGauge + 0.5);
    brightnessBoost = Math.min(0.4, brightnessBoost + reserveBoost + 0.12);
    lightReserve = 0;
    lightVisibleStalls(); // 通りの屋台が一斉に灯る
    resonateCommunity(1); // 周囲の提灯も一斉に光る

    // 一斉点灯の光：画面内の屋台の提灯位置でバーストをずらして出す
    const horizonY = getHorizonY();
    const W = app.screen.width;
    const hue = lanternTone(yataiConfig.lanternColor).hue;
    let k = 0;
    for (const stall of stalls) {
      if (stall.x < 0 || stall.x > W) continue;
      const sx = stall.x;
      const sy = horizonY + stall.lanternLocalY * stall.scale;
      window.setTimeout(() => spawnBurst(sx, sy, hue), k * 60);
      k += 1;
    }
  }

  function setSection(s: SongSection) {
    if (s !== section && (s === "chorus" || s === "finalChorus")) {
      flareTimer = 1.8;
      releaseLightReserve(); // サビは溜めた灯りを一斉点灯
    }
    section = s;
  }

  function getFestivalSummary(): FestivalSummary {
    return { brightness: peakBrightness, resonanceCount, deepCount };
  }

  function setYataiConfig(config: YataiConfig) {
    yataiConfig = config;
    // 設定色を少し多めに混ぜつつ、通りの屋台へ彩りを割り当て直す
    assignStallColors();
    for (const stall of stalls) buildStall(stall);
    drawSkyAndLake();
  }

  function setTime(t: number) {
    time = t;
    void time;
  }

  function resize() {
    regenerateStars();
    layoutStalls();
    drawSkyAndLake();
  }

  function clearAll() {
    for (const p of lightParticles) {
      lightLayer.removeChild(p.gfx);
      p.gfx.destroy();
    }
    lightParticles.length = 0;
    for (const b of bursts) {
      lightLayer.removeChild(b.gfx);
      b.gfx.destroy();
    }
    bursts.length = 0;
    for (const sp of sparks) {
      lightLayer.removeChild(sp.gfx);
      sp.gfx.destroy();
    }
    sparks.length = 0;
    for (const f of fallingLyrics) {
      fallingLyricLayer.removeChild(f.gfx);
      f.gfx.destroy();
    }
    fallingLyrics.length = 0;
    for (const c of community) {
      distantLayer.removeChild(c.gfx);
      c.gfx.destroy({ children: true });
    }
    community.length = 0;
    // 屋台を初期状態（すべて消灯）へ戻し、刻まれた歌詞も消す
    for (const stall of stalls) {
      stall.lit = 0;
      stall.target = 0;
      for (const t of stall.inscribed) {
        stall.container.removeChild(t);
        t.destroy();
      }
      stall.inscribed.length = 0;
    }
    brightness = SECTION_BRIGHTNESS.intro;
    brightnessBoost = 0;
    // ゲーム性の状態も初期化
    yataiBrightness = 0;
    peakBrightness = 0;
    lightGauge = 0;
    lightReserve = 0;
    resonanceCount = 0;
    deepCount = 0;
    festivalScrollBoost = 0;
    lightHoldTimer = 0;
    regenerateStars();
  }

  function dispose() {
    clearAll();
    app.destroy(true, { children: true });
  }

  // 初期化
  regenerateStars();
  layoutStalls();
  drawSkyAndLake();

  return {
    setYataiConfig,
    setSection,
    setTime,
    dropLyric,
    getFestivalSummary,
    clearAll,
    resize,
    dispose,
  };
}

// 始点→制御点→終点の二次ベジェに沿って、幅が w0→w1 へテーパーする帯を塗る。
// ツインテールのような流れる形に使う。
function taperedRibbon(
  g: Graphics,
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  w0: number,
  w1: number,
  color: number,
  alpha: number,
) {
  const N = 12;
  const top: Array<[number, number]> = [];
  const bot: Array<[number, number]> = [];
  for (let i = 0; i <= N; i += 1) {
    const t = i / N;
    const mt = 1 - t;
    const x = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
    const y = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
    // 接線から法線を求めて左右へ半幅ぶん広げる
    const dx = 2 * mt * (cx - x0) + 2 * t * (x1 - cx);
    const dy = 2 * mt * (cy - y0) + 2 * t * (y1 - cy);
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const wd = (w0 + (w1 - w0) * t) * 0.5;
    top.push([x + nx * wd, y + ny * wd]);
    bot.push([x - nx * wd, y - ny * wd]);
  }
  const pts: number[] = [];
  for (const p of top) pts.push(p[0], p[1]);
  for (let i = bot.length - 1; i >= 0; i -= 1) pts.push(bot[i]![0], bot[i]![1]);
  g.poly(pts);
  g.fill({ color, alpha });
}

function lerpColor(a: number, b: number, t: number): number {
  const tt = Math.max(0, Math.min(1, t));
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * tt);
  const g = Math.round(ag + (bg - ag) * tt);
  const bl = Math.round(ab + (bb - ab) * tt);
  return (r << 16) | (g << 8) | bl;
}
