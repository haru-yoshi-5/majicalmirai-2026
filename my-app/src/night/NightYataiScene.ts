// 夜の部「歌灯りの御殿屋台」の PixiJS シーン本体（NIGHT_SPEC §11–§13, §15）。
// 昼の scenes/DayKiteScene.ts と対になる夜専用シーン。昼のシーンには手を加えない。
//
// 体験の核：歌詞 → 光の粒 → 提灯 → 屋台の装飾 → 夜の街と湖面の反射。

import { Application, Container, Graphics, Text } from "pixi.js";
import type { SongSection } from "../types/lyric.ts";
import type {
  CommunityLantern,
  LanternColor,
  NightSelectedLyric,
  NightWordCategory,
  YataiConfig,
} from "./yataiTypes.ts";
import { LANTERN_COLORS, NIGHT_SCENE, YATAI_BASE_COLORS, hslToHex } from "./nightColors.ts";
import { categoryColorNight } from "./classifyWordNight.ts";
import {
  generateAmbientCommunityLantern,
  generateCommunityLanternFromLyric,
} from "./generateCommunityLantern.ts";

const FONT_FAMILY = '"Hiragino Sans","Yu Gothic UI","Segoe UI",system-ui,sans-serif';
const LANTERN_COUNT = 7;

interface LanternState {
  /** 現在の点灯度 0..1（lit へ向けて補間） */
  lit: number;
  /** 目標の点灯度 0..1 */
  target: number;
  localX: number;
  localY: number;
  color: LanternColor;
  phase: number;
}

interface LightParticleFx {
  gfx: Graphics;
  fromX: number;
  fromY: number;
  ctrlX: number;
  ctrlY: number;
  lanternIndex: number;
  life: number;
  maxLife: number;
  hue: number;
  arrived: boolean;
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
  baseY: number;
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
  const lakeLayer = new Container();
  const reflectionLayer = new Container();
  const yataiLayer = new Container(); // 自分の御殿屋台
  const lightLayer = new Container(); // 光の粒・バースト・火花
  const fallingLyricLayer = new Container();

  app.stage.addChild(skyLayer);
  app.stage.addChild(distantLayer);
  app.stage.addChild(lakeLayer);
  app.stage.addChild(reflectionLayer);
  app.stage.addChild(yataiLayer);
  app.stage.addChild(lightLayer);
  app.stage.addChild(fallingLyricLayer);

  const skyGfx = new Graphics();
  skyLayer.addChild(skyGfx);
  const lakeGfx = new Graphics();
  lakeLayer.addChild(lakeGfx);
  const reflectionGfx = new Graphics();
  reflectionLayer.addChild(reflectionGfx);

  // 屋台コンテナとそのパーツ
  const yatai = new Container();
  const shadowGfx = new Graphics();
  const wheelLeft = new Graphics();
  const wheelRight = new Graphics();
  const bodyGfx = new Graphics();
  const mukuGfx = new Graphics();
  const roofGfx = new Graphics();
  const finialGfx = new Graphics();
  const stringsGfx = new Graphics();
  const lanternsGfx = new Graphics();
  const wishText = new Text({
    text: "歌",
    style: { fontFamily: FONT_FAMILY, fontSize: 26, fill: 0xfff3df, fontWeight: "300" },
  });
  wishText.anchor.set(0.5);
  // 選んだ歌詞が屋台幕に刻まれる
  const inscribed: Text[] = [];

  yatai.addChild(shadowGfx);
  yatai.addChild(wheelLeft);
  yatai.addChild(wheelRight);
  yatai.addChild(bodyGfx);
  yatai.addChild(mukuGfx);
  yatai.addChild(wishText);
  yatai.addChild(roofGfx);
  yatai.addChild(finialGfx);
  yatai.addChild(stringsGfx);
  yatai.addChild(lanternsGfx);
  yataiLayer.addChild(yatai);

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
  let wheelSpin = 0;
  let ambientSpawnTimer = 0;
  let nextLanternToLight = 0;

  const lanterns: LanternState[] = [];
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

  // ---- 屋台の描画 ----
  function rebuildYatai() {
    const S = unit();
    const bodyW = S * 0.3;
    const bodyH = S * 0.15;
    const roofH = S * 0.1;
    const roofW = bodyW * 1.32;
    const wheelR = S * 0.045;
    const baseColor = YATAI_BASE_COLORS[yataiConfig.baseColor];

    // 影
    shadowGfx.clear();
    shadowGfx.ellipse(0, bodyH * 0.5 + wheelR * 1.4, bodyW * 0.75, S * 0.022);
    shadowGfx.fill({ color: 0x000000, alpha: 0.3 });

    // 車輪
    const wheelY = bodyH * 0.5 + wheelR * 0.6;
    drawWheel(wheelLeft, wheelR);
    drawWheel(wheelRight, wheelR);
    wheelLeft.position.set(-bodyW * 0.32, wheelY);
    wheelRight.position.set(bodyW * 0.32, wheelY);

    // 本体（幕）
    bodyGfx.clear();
    bodyGfx.roundRect(-bodyW * 0.5, -bodyH * 0.5, bodyW, bodyH, S * 0.012);
    bodyGfx.fill({ color: baseColor, alpha: 1 });
    bodyGfx.stroke({ color: 0xe7c878, width: 2, alpha: 0.9 }); // 金の縁取り
    // 内側の陰
    bodyGfx.roundRect(-bodyW * 0.5, -bodyH * 0.5, bodyW, bodyH, S * 0.012);
    bodyGfx.stroke({ color: 0x000000, width: 1, alpha: 0.15 });

    drawMuku(bodyW, bodyH);

    // 屋根（2段の唐破風風）
    roofGfx.clear();
    drawRoofTier(roofGfx, roofW, roofH, -bodyH * 0.5);
    drawRoofTier(roofGfx, roofW * 0.7, roofH * 0.8, -bodyH * 0.5 - roofH * 0.7);

    // 棟飾り（金の宝珠）
    finialGfx.clear();
    finialGfx.circle(0, -bodyH * 0.5 - roofH * 1.35, S * 0.012);
    finialGfx.fill({ color: 0xffe9a0, alpha: 0.95 });

    // 願いの文字
    wishText.style.fontSize = Math.max(14, bodyH * 0.6);
    wishText.text = yataiConfig.wish;
    wishText.position.set(0, 0);

    // 提灯の配置（軒下に横一列）
    const lanternY = -bodyH * 0.5 - roofH * 0.16;
    const spread = bodyW * 0.92;
    for (let i = 0; i < LANTERN_COUNT; i += 1) {
      const lx = -spread * 0.5 + (spread * i) / (LANTERN_COUNT - 1);
      const existing = lanterns[i];
      if (existing) {
        existing.localX = lx;
        existing.localY = lanternY;
        existing.color = yataiConfig.lanternColor;
      } else {
        lanterns[i] = {
          lit: i < 2 ? 0.35 : 0, // intro で数個だけ弱く灯る
          target: i < 2 ? 0.35 : 0,
          localX: lx,
          localY: lanternY,
          color: yataiConfig.lanternColor,
          phase: Math.random() * Math.PI * 2,
        };
      }
    }

    // 軒から提灯への吊り紐
    const eaveY = -bodyH * 0.5 - roofH * 0.45;
    stringsGfx.clear();
    for (const l of lanterns) {
      stringsGfx.moveTo(l.localX, eaveY);
      stringsGfx.lineTo(l.localX, l.localY - S * 0.012);
    }
    stringsGfx.stroke({ color: 0x2a2118, width: 1, alpha: 0.6 });
  }

  function drawWheel(g: Graphics, r: number) {
    g.clear();
    g.circle(0, 0, r);
    g.fill({ color: 0x3a2a1c, alpha: 1 });
    g.stroke({ color: 0xc9a55c, width: 2, alpha: 0.85 });
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.stroke({ color: 0xc9a55c, width: 1, alpha: 0.6 });
    g.circle(0, 0, r * 0.18);
    g.fill({ color: 0xe7c878, alpha: 0.9 });
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

  function drawMuku(bodyW: number, bodyH: number) {
    mukuGfx.clear();
    const a = 0.32;
    switch (yataiConfig.pattern) {
      case "ripple":
        for (let i = 1; i <= 3; i += 1) {
          mukuGfx.arc(0, bodyH * 0.55, bodyW * 0.16 * i, Math.PI, Math.PI * 2);
          mukuGfx.stroke({ color: 0xffffff, width: 1.2, alpha: a });
        }
        break;
      case "sound":
        for (let i = 0; i < 4; i += 1) {
          const y = -bodyH * 0.3 + i * bodyH * 0.2;
          mukuGfx.moveTo(-bodyW * 0.42, y);
          mukuGfx.lineTo(bodyW * 0.42, y);
        }
        mukuGfx.stroke({ color: 0xffffff, width: 1, alpha: a });
        break;
      case "star":
        for (let i = 0; i < 7; i += 1) {
          const sx = (Math.random() - 0.5) * bodyW * 0.8;
          const sy = (Math.random() - 0.5) * bodyH * 0.7;
          mukuGfx.circle(sx, sy, 1.8);
          mukuGfx.fill({ color: 0xffffff, alpha: a + 0.2 });
        }
        break;
      case "flower":
        for (let p = 0; p < 6; p += 1) {
          const ang = (p / 6) * Math.PI * 2;
          mukuGfx.circle(Math.cos(ang) * bodyW * 0.1, Math.sin(ang) * bodyH * 0.22, bodyH * 0.12);
          mukuGfx.stroke({ color: 0xffffff, width: 1, alpha: a });
        }
        break;
      case "wind":
        for (let i = -2; i <= 2; i += 1) {
          mukuGfx.moveTo(-bodyW * 0.42, i * bodyH * 0.16);
          mukuGfx.quadraticCurveTo(
            0,
            i * bodyH * 0.16 - bodyH * 0.18,
            bodyW * 0.42,
            i * bodyH * 0.16,
          );
        }
        mukuGfx.stroke({ color: 0xffffff, width: 1.2, alpha: a });
        break;
    }
  }

  function drawLanterns() {
    lanternsGfx.clear();
    const S = unit();
    const lw = S * 0.022;
    const lh = S * 0.032;
    for (const l of lanterns) {
      const tone = lanternTone(l.color);
      const flick = 0.92 + 0.08 * Math.sin(totalElapsedMs * 0.006 + l.phase);
      const lit = l.lit * flick;
      // グロー
      if (lit > 0.02) {
        lanternsGfx.circle(l.localX, l.localY, lh * (1.1 + lit * 1.4));
        lanternsGfx.fill({ color: tone.glow, alpha: 0.12 * lit });
        lanternsGfx.circle(l.localX, l.localY, lh * (0.7 + lit * 0.7));
        lanternsGfx.fill({ color: tone.glow, alpha: 0.2 * lit });
      }
      // 提灯本体（消灯時は暗い紙色）
      const baseAlpha = 0.5 + lit * 0.5;
      const body = lit > 0.02 ? tone.core : 0x6b5a44;
      lanternsGfx.ellipse(l.localX, l.localY, lw * 0.5, lh * 0.5);
      lanternsGfx.fill({ color: body, alpha: baseAlpha });
      lanternsGfx.ellipse(l.localX, l.localY, lw * 0.5, lh * 0.5);
      lanternsGfx.stroke({ color: 0x2a2118, width: 1, alpha: 0.5 });
      // 上下の口金
      lanternsGfx.rect(l.localX - lw * 0.18, l.localY - lh * 0.5, lw * 0.36, lh * 0.08);
      lanternsGfx.rect(l.localX - lw * 0.18, l.localY + lh * 0.42, lw * 0.36, lh * 0.08);
      lanternsGfx.fill({ color: 0x2a2118, alpha: 0.7 });
    }
  }

  // ---- 反射（湖面に映る屋台と提灯） ----
  function drawReflection() {
    reflectionGfx.clear();
    const horizonY = getHorizonY();
    const S = unit();
    const bodyW = S * 0.3;
    const bodyH = S * 0.15;
    const cx = yatai.position.x;
    const cy = yatai.position.y;
    const reflAlpha = (0.18 + brightness * 0.22) * (0.9 + Math.sin(totalElapsedMs * 0.0018) * 0.1);
    const shimmer = Math.sin(totalElapsedMs * 0.0023) * 4;

    // 本体シルエットの反射
    const bodyReflY = horizonY + (horizonY - cy) + bodyH;
    reflectionGfx.roundRect(cx - bodyW * 0.5 + shimmer, bodyReflY, bodyW, bodyH, S * 0.012);
    reflectionGfx.fill({ color: YATAI_BASE_COLORS[yataiConfig.baseColor], alpha: reflAlpha * 0.7 });

    // 提灯の灯りの反射（縦に伸びる光）
    for (const l of lanterns) {
      if (l.lit <= 0.05) continue;
      const tone = lanternTone(l.color);
      const gx = cx + l.localX + shimmer;
      const gReflY = horizonY + (horizonY - (cy + l.localY));
      for (let i = 0; i < 6; i += 1) {
        const yy = gReflY + i * (S * 0.014);
        const ww =
          S * 0.012 * (1.2 - i * 0.14) + Math.sin(totalElapsedMs * 0.004 + i + l.phase) * 2;
        reflectionGfx.ellipse(gx, yy, Math.max(1.5, ww), 1.6);
        reflectionGfx.fill({ color: tone.glow, alpha: 0.22 * l.lit * (1 - i / 6) });
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

  function spawnLightParticle(fromX: number, fromY: number, lanternIndex: number, hue: number) {
    const g = new Graphics();
    lightLayer.addChild(g);
    // 制御点：いったん上へ膨らんでから提灯へ吸い込まれる弧
    const ctrlX = (fromX + (yatai.position.x + lanterns[lanternIndex]!.localX)) * 0.5;
    const ctrlY = Math.min(fromY, getHorizonY()) - app.screen.height * 0.12;
    lightParticles.push({
      gfx: g,
      fromX,
      fromY,
      ctrlX,
      ctrlY,
      lanternIndex,
      life: 0,
      maxLife: 1.1,
      hue,
      arrived: false,
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

  function buildCommunityLantern(data: CommunityLantern): Container {
    const c = new Container();
    const g = new Graphics();
    const tone = LANTERN_COLORS[data.color];
    const r = unit() * 0.012 * (0.8 + data.size);
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
    return c;
  }

  function addCommunityLanternFromLyric(lyric: NightSelectedLyric) {
    const data = generateCommunityLanternFromLyric(lyric, {
      width: app.screen.width,
      height: app.screen.height,
    });
    const gfx = buildCommunityLantern(data);
    distantLayer.addChild(gfx);
    community.push({ data, gfx, baseY: data.y });
  }

  function addAmbientCommunityLantern() {
    const data = generateAmbientCommunityLantern({
      width: app.screen.width,
      height: app.screen.height,
    });
    const gfx = buildCommunityLantern(data);
    distantLayer.addChild(gfx);
    community.push({ data, gfx, baseY: data.y });
  }

  function inscribeLyric(text: string, category: NightWordCategory) {
    if (inscribed.length >= 5) {
      const oldest = inscribed.shift();
      if (oldest) {
        yatai.removeChild(oldest);
        oldest.destroy();
      }
    }
    const color = categoryColorNight(category);
    const S = unit();
    const bodyW = S * 0.3;
    const bodyH = S * 0.15;
    const t = new Text({
      text: text.slice(0, 3),
      style: { fontFamily: FONT_FAMILY, fontSize: Math.max(9, bodyH * 0.26), fill: color.fill },
    });
    t.anchor.set(0.5);
    t.position.set((Math.random() - 0.5) * bodyW * 0.7, (Math.random() - 0.5) * bodyH * 0.5);
    t.alpha = 0.85;
    yatai.addChildAt(t, yatai.getChildIndex(wishText));
    inscribed.push(t);
  }

  function applyMood(category: NightWordCategory) {
    const target = categoryColorNight(category).hue;
    const diff = ((target - moodHue + 540) % 360) - 180;
    moodHue = (moodHue + diff * 0.35 + 360) % 360;
    moodIntensity = Math.min(1, moodIntensity + 0.22);
  }

  function lightNextLantern(): number {
    // 未点灯の提灯を順に灯す。すべて灯っていれば一番暗いものを灯し直す。
    let idx = -1;
    for (let i = 0; i < lanterns.length; i += 1) {
      const j = (nextLanternToLight + i) % lanterns.length;
      if (lanterns[j]!.target < 0.5) {
        idx = j;
        break;
      }
    }
    if (idx < 0) {
      idx = 0;
      for (let i = 1; i < lanterns.length; i += 1) {
        if (lanterns[i]!.lit < lanterns[idx]!.lit) idx = i;
      }
    }
    nextLanternToLight = (idx + 1) % lanterns.length;
    return idx;
  }

  function dropLyric(lyric: NightSelectedLyric) {
    const { x, y } = lyric.position;
    const color = categoryColorNight(lyric.category);

    applyMood(lyric.category);

    // 1) 歌詞が光の粒になる（その場で浮かんで消える）
    spawnFallingLyric(x, y, lyric.text, lyric.category);

    // 2) 少し遅れて光の粒が提灯へ飛ぶ
    const lanternIndex = lightNextLantern();
    window.setTimeout(() => {
      spawnLightParticle(x, y, lanternIndex, color.hue);
    }, 360);

    // 3) 屋台幕に歌詞を刻む
    inscribeLyric(lyric.text, lyric.category);

    // 4) 全体を少し明るくする
    brightnessBoost = Math.min(0.3, brightnessBoost + 0.08);

    // 5) 周囲の提灯を追加（festival は出やすい）
    const spawnProb = lyric.category === "festival" ? 0.85 : 0.5;
    if (Math.random() < spawnProb) {
      addCommunityLanternFromLyric(lyric);
    }

    // 6) wish は星を増やす（増えすぎないよう上限でトリム）
    if (lyric.category === "wish") {
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
      if (stars.length > maxStars) {
        stars.splice(0, stars.length - maxStars);
      }
    }
  }

  // ---- メインループ ----
  app.ticker.add((ticker) => {
    const dt = ticker.deltaMS / 1000;
    totalElapsedMs += ticker.deltaMS;

    // 明るさ：セクション目標へ補間 + クリックの一時加算
    const targetBrightness = Math.min(1, SECTION_BRIGHTNESS[section] + brightnessBoost);
    brightness += (targetBrightness - brightness) * Math.min(1, dt * 0.8);
    brightnessBoost *= Math.exp(-dt * 1.0);
    moodIntensity *= Math.exp(-dt * 0.2);
    if (flareTimer > 0) flareTimer = Math.max(0, flareTimer - dt);

    // 提灯の点灯度を target へ補間。明るいセクションでは下限が上がる。
    const litFloor = section === "intro" ? 0 : brightness * 0.25;
    for (const l of lanterns) {
      const tgt = Math.max(l.target, litFloor);
      l.lit += (tgt - l.lit) * Math.min(1, dt * 3);
    }

    // 屋台の配置（中央付近・ゆるい揺れと前進感）
    const horizonY = getHorizonY();
    const S = unit();
    const bodyH = S * 0.15;
    const wheelR = S * 0.045;
    const sway = Math.sin(totalElapsedMs * 0.0007) * S * 0.02 * (0.5 + brightness);
    const bob = Math.sin(totalElapsedMs * 0.0013) * S * 0.006;
    yatai.position.set(app.screen.width * 0.5 + sway, horizonY - bodyH * 0.5 - wheelR * 0.6 + bob);
    yatai.rotation = Math.sin(totalElapsedMs * 0.0009) * 0.01;
    // 前進感：車輪を回す（サビで速く）
    const isChorus = section === "chorus" || section === "finalChorus";
    wheelSpin += dt * (isChorus ? 2.2 : 1.0) * (0.4 + brightness);
    wheelLeft.rotation = wheelSpin;
    wheelRight.rotation = wheelSpin;

    drawLanterns();
    drawReflection();

    // 光の粒（クリック歌詞→提灯）
    for (let i = lightParticles.length - 1; i >= 0; i -= 1) {
      const p = lightParticles[i]!;
      p.life += dt;
      const ratio = Math.min(1, p.life / p.maxLife);
      const eased = ratio * ratio;
      // 目標は移動する提灯の現在位置
      const lantern = lanterns[p.lanternIndex]!;
      const toX = yatai.position.x + lantern.localX;
      const toY = yatai.position.y + lantern.localY;
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
        // 提灯を灯す
        lantern.target = 1;
        spawnBurst(toX, toY, p.hue);
      }
      if (ratio >= 1) {
        lightLayer.removeChild(p.gfx);
        p.gfx.destroy();
        lightParticles.splice(i, 1);
      }
    }

    // バースト（提灯点灯時の光の輪）
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

    // 周囲の提灯（ゆらぎ・サビで明るく）
    const flockLift = section === "finalChorus" ? -10 : 0;
    for (const c of community) {
      const dx = Math.sin(totalElapsedMs * 0.0008 + c.data.phase) * 6;
      const dy = Math.cos(totalElapsedMs * 0.001 + c.data.phase) * 3;
      c.gfx.position.set(c.data.x + dx, c.baseY + dy + flockLift);
      const targetAlpha = c.data.opacity * (0.7 + brightness * 0.6);
      c.gfx.alpha += (Math.min(1, targetAlpha) - c.gfx.alpha) * Math.min(1, dt * 2);
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

    // 背景は間引いて更新（リサイズ・星の瞬き・月の反射のため）
    if (Math.floor(totalElapsedMs / 80) % 2 === 0) {
      drawSkyAndLake();
    }
  });

  function lightAllLanterns() {
    for (const l of lanterns) l.target = 1;
  }

  function setSection(s: SongSection) {
    if (s !== section && (s === "chorus" || s === "finalChorus")) {
      flareTimer = 1.8;
      lightAllLanterns(); // サビは提灯が一斉に灯る
    }
    section = s;
  }

  function setYataiConfig(config: YataiConfig) {
    yataiConfig = config;
    rebuildYatai();
    drawSkyAndLake();
  }

  function setTime(t: number) {
    time = t;
    void time;
  }

  function resize() {
    regenerateStars();
    rebuildYatai();
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
    for (const t of inscribed) {
      yatai.removeChild(t);
      t.destroy();
    }
    inscribed.length = 0;
    // 提灯を消灯（intro の初期状態へ）
    for (let i = 0; i < lanterns.length; i += 1) {
      const init = i < 2 ? 0.35 : 0;
      lanterns[i]!.lit = init;
      lanterns[i]!.target = init;
    }
    nextLanternToLight = 0;
    brightness = SECTION_BRIGHTNESS.intro;
    brightnessBoost = 0;
    regenerateStars();
  }

  function dispose() {
    clearAll();
    app.destroy(true, { children: true });
  }

  // 初期化
  regenerateStars();
  rebuildYatai();
  drawSkyAndLake();

  return {
    setYataiConfig,
    setSection,
    setTime,
    dropLyric,
    clearAll,
    resize,
    dispose,
  };
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
