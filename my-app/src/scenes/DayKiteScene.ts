import { Application, Container, Graphics, Text } from "pixi.js";
import type {
  CommunityKite,
  KiteColor,
  KiteConfig,
  PastKiteRecord,
  SelectedLyric,
} from "../types/kite.ts";
import type { SongSection, WordCategory } from "../types/lyric.ts";
import { categoryColor } from "../utils/classifyWord.ts";
import {
  generateAmbientCommunityKite,
  generateCommunityKiteFromLyric,
} from "../utils/generateCommunityKite.ts";

const KITE_COLOR_HEX: Record<KiteColor, number> = {
  blue: 0x5fa8ff,
  red: 0xff6f6a,
  white: 0xf0f4ff,
  purple: 0xb78bff,
  gold: 0xffd66a,
};

interface RippleFx {
  gfx: Graphics;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  maxRadius: number;
  category: WordCategory;
  strength: number;
}

interface WindStreakFx {
  gfx: Graphics;
  x: number;
  baseY: number;
  life: number;
  maxLife: number;
  speed: number;
  amp: number;
  hue: number;
  width: number;
}

interface FallingLyricFx {
  gfx: Text;
  x: number;
  startY: number;
  targetY: number;
  life: number;
  maxLife: number;
  category: WordCategory;
}

interface ParticleFx {
  gfx: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface CommunityKiteFx {
  data: CommunityKite;
  gfx: Container;
  baseY: number;
}

interface VortexFx {
  gfx: Graphics;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  maxRadius: number;
  hue: number;
  rotation: number;
  rotSpeed: number;
  turns: number;
}

interface PastKiteFx {
  gfx: Container;
  baseX: number;
  baseY: number;
  phase: number;
  sway: number;
}

export interface DayKiteScene {
  setKiteConfig: (config: KiteConfig) => void;
  setSection: (section: SongSection) => void;
  setTime: (time: number) => void;
  dropLyric: (lyric: SelectedLyric) => void;
  addPastKites: (records: ReadonlyArray<PastKiteRecord>) => void;
  clearAll: () => void;
  resize: () => void;
  dispose: () => void;
}

const SECTION_INTENSITY: Record<SongSection, number> = {
  intro: 0.2,
  verse: 0.4,
  preChorus: 0.6,
  chorus: 0.9,
  bridge: 0.55,
  finalChorus: 1,
  outro: 0.7,
  ended: 0.6,
};

export async function createDayKiteScene(parent: HTMLElement): Promise<DayKiteScene> {
  const app = new Application();
  await app.init({
    resizeTo: parent,
    antialias: true,
    backgroundAlpha: 0,
    resolution: Math.max(1, window.devicePixelRatio || 1),
    autoDensity: true,
  });
  parent.appendChild(app.canvas);
  app.canvas.classList.add("day-kite-canvas");

  // レイヤー
  const skyLayer = new Container();
  const lakeLayer = new Container();
  const pastKiteLayer = new Container();
  const reflectionLayer = new Container();
  const rippleLayer = new Container();
  const vortexLayer = new Container();
  const windLayer = new Container();
  const communityLayer = new Container();
  const fallingLyricLayer = new Container();
  const playerKiteLayer = new Container();
  const particleLayer = new Container();

  app.stage.addChild(skyLayer);
  app.stage.addChild(lakeLayer);
  app.stage.addChild(pastKiteLayer);
  app.stage.addChild(reflectionLayer);
  app.stage.addChild(rippleLayer);
  app.stage.addChild(vortexLayer);
  app.stage.addChild(windLayer);
  app.stage.addChild(communityLayer);
  app.stage.addChild(fallingLyricLayer);
  app.stage.addChild(playerKiteLayer);
  app.stage.addChild(particleLayer);

  // 背景（空と湖の塗り）
  const skyGfx = new Graphics();
  skyLayer.addChild(skyGfx);
  const lakeGfx = new Graphics();
  lakeLayer.addChild(lakeGfx);

  // 状態
  let kiteConfig: KiteConfig = {
    shape: "large",
    color: "blue",
    pattern: "wind",
    wish: "未来",
  };
  let section: SongSection = "intro";
  let time = 0;
  let kiteLift = 0; // 0..1
  let kiteLiftBoost = 0;
  let totalElapsedMs = 0;
  let ambientSpawnTimer = 0;
  // 歌詞分類による空・湖・風のムード（直近のクリック傾向で hue が動く）
  let moodHue = 200;
  let moodIntensity = 0;
  // サビ突入時のフレア演出タイマー（一時的な舞い上がり強調）
  let kiteFlareTimer = 0;

  const ripples: RippleFx[] = [];
  const winds: WindStreakFx[] = [];
  const fallingLyrics: FallingLyricFx[] = [];
  const particles: ParticleFx[] = [];
  const community: CommunityKiteFx[] = [];
  const vortices: VortexFx[] = [];
  let vortexSpawnTimer = 0;
  const pastKites: PastKiteFx[] = [];

  // 自分の凧 Container
  const playerKite = new Container();
  const playerKiteShadow = new Graphics();
  const playerKiteBody = new Graphics();
  const playerKitePattern = new Graphics();
  const playerKiteString = new Graphics();
  const playerKiteWish = new Text({
    text: kiteConfig.wish,
    style: {
      fontFamily: '"Hiragino Sans","Yu Gothic UI","Segoe UI",system-ui,sans-serif',
      fontSize: 28,
      fill: 0xffffff,
      fontWeight: "300",
      align: "center",
    },
  });
  playerKiteWish.anchor.set(0.5);

  playerKite.addChild(playerKiteShadow);
  playerKite.addChild(playerKiteBody);
  playerKite.addChild(playerKitePattern);
  playerKite.addChild(playerKiteWish);
  playerKiteLayer.addChild(playerKiteString);
  playerKiteLayer.addChild(playerKite);

  // 湖面に映る凧の反射（本体と模様のみ、Y軸反転で表現）
  const playerReflection = new Container();
  const playerReflectionBody = new Graphics();
  const playerReflectionPattern = new Graphics();
  playerReflection.addChild(playerReflectionBody);
  playerReflection.addChild(playerReflectionPattern);
  playerReflection.scale.set(1, -1);
  playerReflection.alpha = 0.32;
  reflectionLayer.addChild(playerReflection);

  // 選んだ歌詞が凧に刻まれていく（テキスト群）
  const inscribedLyrics: Text[] = [];

  function getHorizonY(): number {
    return app.screen.height * 0.62;
  }

  function getKiteAnchor(): { x: number; y: number } {
    const horizonY = getHorizonY();
    const baseY = horizonY - 30; // 湖面少し上
    const topY = app.screen.height * 0.18;
    const lift = Math.min(1, kiteLift + kiteLiftBoost);
    // サビ系セクションでは sway 幅を広げて派手に舞わせる
    const swayMul = section === "chorus" || section === "finalChorus" ? 1.75 : 1.0;
    // フレア中は更に大きく舞う
    const flareMul = 1 + kiteFlareTimer * 0.45;
    const swayX = Math.sin(totalElapsedMs * 0.0008) * 18 * (0.4 + lift * 0.6) * swayMul * flareMul;
    // 縦方向の浮遊（サビ中は呼吸するように上下する）
    const verticalBob =
      (section === "chorus" || section === "finalChorus" ? 1 : 0) *
      Math.sin(totalElapsedMs * 0.0011) *
      8 *
      (0.6 + kiteFlareTimer * 0.5);
    return {
      x: app.screen.width * 0.5 + swayX,
      y: baseY + (topY - baseY) * lift + verticalBob,
    };
  }

  function drawSkyAndLake() {
    const w = app.screen.width;
    const h = app.screen.height;
    const horizonY = getHorizonY();
    const intensity = SECTION_INTENSITY[section];

    // 色合いを kiteConfig.color と section から
    const baseColor = kiteConfig.color;
    let topR = 30;
    let topG = 60;
    let topB = 110;
    let midR = 100;
    let midG = 160;
    let midB = 220;

    if (baseColor === "blue") {
      topR = 80 + intensity * 40;
      topG = 150 + intensity * 50;
      topB = 220;
    } else if (baseColor === "red") {
      topR = 200 + intensity * 30;
      topG = 130 + intensity * 40;
      topB = 130;
    } else if (baseColor === "white") {
      topR = 200;
      topG = 220;
      topB = 240 + intensity * 10;
    } else if (baseColor === "purple") {
      topR = 140 + intensity * 30;
      topG = 110;
      topB = 200;
    } else if (baseColor === "gold") {
      topR = 240;
      topG = 200 + intensity * 30;
      topB = 140;
    }

    // 歌詞分類で hue が動くムード色をミックス（基調を残しつつ気分を寄せる）
    const moodWeight = moodIntensity * 0.4;
    if (moodWeight > 0.001) {
      const moodColor = hslToHex(moodHue, 0.55, 0.6);
      const mR = (moodColor >> 16) & 0xff;
      const mG = (moodColor >> 8) & 0xff;
      const mB = moodColor & 0xff;
      topR = topR * (1 - moodWeight) + mR * moodWeight;
      topG = topG * (1 - moodWeight) + mG * moodWeight;
      topB = topB * (1 - moodWeight) + mB * moodWeight;
    }

    midR = Math.min(255, topR * 0.7 + 80);
    midG = Math.min(255, topG * 0.7 + 90);
    midB = Math.min(255, topB * 0.7 + 60);

    skyGfx.clear();
    // 上空（濃い青）
    skyGfx.rect(0, 0, w, horizonY);
    skyGfx.fill({
      color:
        (Math.floor(topR * 0.45) << 16) | (Math.floor(topG * 0.55) << 8) | Math.floor(topB * 0.75),
      alpha: 1,
    });
    // 中空グラデーション（簡易：複数横帯）
    const bands = 24;
    for (let i = 0; i < bands; i += 1) {
      const t = i / bands;
      const y = t * horizonY;
      const r = topR * 0.45 + (topR - topR * 0.45) * t;
      const g = topG * 0.55 + (topG - topG * 0.55) * t;
      const b = topB * 0.75 + (topB - topB * 0.75) * t;
      const color = (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
      skyGfx.rect(0, y, w, horizonY / bands + 1);
      skyGfx.fill({ color, alpha: 0.55 });
    }

    // 遠景：山並み
    skyGfx.moveTo(0, horizonY);
    skyGfx.lineTo(0, horizonY - 30);
    let x = 0;
    while (x <= w) {
      const hill = 18 + Math.sin(x * 0.01) * 14 + Math.sin(x * 0.04 + 1.3) * 10;
      skyGfx.lineTo(x, horizonY - hill);
      x += 24;
    }
    skyGfx.lineTo(w, horizonY);
    skyGfx.lineTo(0, horizonY);
    skyGfx.fill({ color: 0x2a3a5a, alpha: 0.55 });

    // 湖
    lakeGfx.clear();
    lakeGfx.rect(0, horizonY, w, h - horizonY);
    lakeGfx.fill({
      color: (Math.floor(midR * 0.5) << 16) | (Math.floor(midG * 0.55) << 8) | Math.floor(midB),
      alpha: 1,
    });
    // 湖の輝き
    const shineBands = 14;
    for (let i = 0; i < shineBands; i += 1) {
      const t = i / shineBands;
      const y = horizonY + t * (h - horizonY);
      const alpha = (1 - t) * 0.06 * (0.6 + intensity * 0.6);
      lakeGfx.rect(0, y, w, 1.5);
      lakeGfx.fill({ color: 0xffffff, alpha });
    }
  }

  function buildKiteBody(target: Graphics, config: KiteConfig, size: number, alpha = 1) {
    target.clear();
    const fill = KITE_COLOR_HEX[config.color];
    if (config.shape === "large") {
      target.poly([-size, -size, size, -size, size * 0.9, size * 1.05, -size * 0.9, size * 1.05]);
    } else if (config.shape === "diamond") {
      target.poly([0, -size * 1.25, size * 0.85, 0, 0, size * 1.25, -size * 0.85, 0]);
    } else {
      // swallow
      target.poly([
        0,
        -size * 1.35,
        size * 1.05,
        size * 0.1,
        size * 0.3,
        size * 0.55,
        0,
        size * 1.15,
        -size * 0.3,
        size * 0.55,
        -size * 1.05,
        size * 0.1,
      ]);
    }
    target.fill({ color: fill, alpha });
    target.stroke({ color: 0xffffff, alpha: 0.5 * alpha, width: 1.5 });

    // 骨組み
    target.moveTo(-size, 0).lineTo(size, 0);
    target.moveTo(0, -size * 1.25).lineTo(0, size * 1.15);
    target.stroke({ color: 0xffffff, alpha: 0.18 * alpha, width: 1 });
  }

  function buildKitePattern(target: Graphics, config: KiteConfig, size: number, alpha = 1) {
    target.clear();
    switch (config.pattern) {
      case "ripple":
        for (let i = 1; i <= 3; i += 1) {
          target.circle(0, 0, size * 0.25 * i);
          target.stroke({ color: 0xffffff, alpha: 0.3 * alpha, width: 1.2 });
        }
        break;
      case "wind":
        for (let i = -2; i <= 2; i += 1) {
          target.moveTo(-size * 0.8, i * size * 0.18);
          target
            .quadraticCurveTo(0, i * size * 0.18 - size * 0.2, size * 0.8, i * size * 0.18)
            .stroke({ color: 0xffffff, alpha: 0.28 * alpha, width: 1.2 });
        }
        break;
      case "star":
        for (let i = 0; i < 6; i += 1) {
          const a = (i / 6) * Math.PI * 2;
          const r1 = size * 0.4;
          target.circle(Math.cos(a) * r1, Math.sin(a) * r1, 2.4);
          target.fill({ color: 0xffffff, alpha: 0.6 * alpha });
        }
        target.circle(0, 0, 3.4);
        target.fill({ color: 0xffffff, alpha: 0.85 * alpha });
        break;
      case "sound":
        for (let i = 0; i < 4; i += 1) {
          target.moveTo(-size * 0.8, -size * 0.4 + i * size * 0.27);
          target.lineTo(size * 0.8, -size * 0.4 + i * size * 0.27);
          target.stroke({ color: 0xffffff, alpha: 0.25 * alpha, width: 1 });
        }
        break;
    }
  }

  function rebuildPlayerKite() {
    const size = Math.min(app.screen.width, app.screen.height) * 0.075;
    buildKiteBody(playerKiteBody, kiteConfig, size);
    buildKitePattern(playerKitePattern, kiteConfig, size);

    // 反射用も同じ形を描き直す（透明度はContainer側で持たせる）
    buildKiteBody(playerReflectionBody, kiteConfig, size, 0.85);
    buildKitePattern(playerReflectionPattern, kiteConfig, size, 0.7);

    playerKiteShadow.clear();
    playerKiteShadow.ellipse(0, size * 1.4, size * 0.9, size * 0.18);
    playerKiteShadow.fill({ color: 0x000000, alpha: 0.18 });

    playerKiteWish.style.fontSize = Math.max(14, size * 0.55);
    playerKiteWish.text = kiteConfig.wish;
    playerKiteWish.position.set(0, 0);
  }

  function spawnRipple(x: number, y: number, category: WordCategory, strength = 1) {
    const g = new Graphics();
    rippleLayer.addChild(g);
    const isRippleKite = kiteConfig.pattern === "ripple";
    const maxRadius =
      Math.min(app.screen.width, app.screen.height) * (0.18 + (isRippleKite ? 0.06 : 0));
    ripples.push({
      gfx: g,
      x,
      y,
      life: 0,
      maxLife: 2.6,
      maxRadius,
      category,
      strength,
    });
  }

  function spawnWindStreak(x: number, baseY: number, category: WordCategory) {
    const g = new Graphics();
    windLayer.addChild(g);
    const color = categoryColor(category);
    const isWindKite = kiteConfig.pattern === "wind";
    winds.push({
      gfx: g,
      x,
      baseY,
      life: 0,
      maxLife: 2.4,
      speed: (isWindKite ? 140 : 100) + Math.random() * 80,
      amp: 14 + Math.random() * 14,
      hue: color.hue,
      width: 1.4 + Math.random() * 1.2,
    });
  }

  function spawnFallingLyric(x: number, startY: number, text: string, category: WordCategory) {
    const color = categoryColor(category);
    const t = new Text({
      text,
      style: {
        fontFamily: '"Hiragino Sans","Yu Gothic UI","Segoe UI",system-ui,sans-serif',
        fontSize: 22,
        fill: color.fill,
        fontWeight: "300",
      },
    });
    t.anchor.set(0.5);
    t.position.set(x, startY);
    fallingLyricLayer.addChild(t);
    fallingLyrics.push({
      gfx: t,
      x,
      startY,
      targetY: getHorizonY() + 8,
      life: 0,
      maxLife: 1.0,
      category,
    });
  }

  function spawnVortex(x: number, y: number, hue: number, scale = 1) {
    const g = new Graphics();
    vortexLayer.addChild(g);
    const maxRadius = Math.min(app.screen.width, app.screen.height) * 0.13 * scale;
    vortices.push({
      gfx: g,
      x,
      y,
      life: 0,
      maxLife: 1.6,
      maxRadius,
      hue,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() > 0.5 ? 1 : -1) * (1.4 + Math.random() * 0.8),
      turns: 2.4 + Math.random() * 1.2,
    });
  }

  function spawnParticles(x: number, y: number, count: number, hue: number) {
    for (let i = 0; i < count; i += 1) {
      const g = new Graphics();
      const size = 1.6 + Math.random() * 2.2;
      g.circle(0, 0, size);
      g.fill({
        color: hslToHex(hue, 0.85, 0.85),
        alpha: 0.85,
      });
      g.position.set(x, y);
      particleLayer.addChild(g);
      particles.push({
        gfx: g,
        vx: (Math.random() - 0.5) * 80,
        vy: -40 - Math.random() * 160,
        life: 0,
        maxLife: 1.6 + Math.random() * 1.0,
      });
    }
  }

  function buildCommunityKite(data: CommunityKite): Container {
    const c = new Container();
    const body = new Graphics();
    const pattern = new Graphics();
    const size = Math.min(app.screen.width, app.screen.height) * 0.07 * data.size;
    buildKiteBody(
      body,
      { ...kiteConfig, shape: "diamond", color: data.color, pattern: data.pattern },
      size,
      1,
    );
    buildKitePattern(pattern, { ...kiteConfig, color: data.color, pattern: data.pattern }, size, 1);
    c.addChild(body);
    c.addChild(pattern);
    if (data.word) {
      const t = new Text({
        text: data.word.slice(0, 2),
        style: {
          fontFamily: '"Hiragino Sans","Yu Gothic UI",sans-serif',
          fontSize: Math.max(10, size * 0.45),
          fill: 0xffffff,
          fontWeight: "300",
        },
      });
      t.anchor.set(0.5);
      c.addChild(t);
    }
    c.alpha = data.opacity;
    c.position.set(data.x, data.y);
    return c;
  }

  function addCommunityKiteFromLyric(lyric: SelectedLyric) {
    const data = generateCommunityKiteFromLyric(lyric, {
      width: app.screen.width,
      height: app.screen.height,
    });
    const gfx = buildCommunityKite(data);
    communityLayer.addChild(gfx);
    community.push({ data, gfx, baseY: data.y });
  }

  function addPastKites(records: ReadonlyArray<PastKiteRecord>) {
    for (const r of records) {
      const c = new Container();
      const body = new Graphics();
      const pattern = new Graphics();
      const size = Math.min(app.screen.width, app.screen.height) * 0.052;
      buildKiteBody(body, r.kiteConfig, size, 0.85);
      buildKitePattern(pattern, r.kiteConfig, size, 0.7);
      c.addChild(body);
      c.addChild(pattern);

      const label = r.selectedTexts[r.selectedTexts.length - 1] ?? r.kiteConfig.wish;
      if (label) {
        const t = new Text({
          text: label.slice(0, 3),
          style: {
            fontFamily: '"Hiragino Sans","Yu Gothic UI",sans-serif',
            fontSize: Math.max(9, size * 0.42),
            fill: 0xffffff,
            fontWeight: "300",
          },
        });
        t.anchor.set(0.5);
        t.alpha = 0.75;
        c.addChild(t);
      }

      // 遠景にうっすら配置する
      c.alpha = 0.38;
      const baseX = app.screen.width * (0.1 + Math.random() * 0.8);
      const baseY = app.screen.height * (0.13 + Math.random() * 0.22);
      c.position.set(baseX, baseY);
      pastKiteLayer.addChild(c);
      pastKites.push({
        gfx: c,
        baseX,
        baseY,
        phase: Math.random() * Math.PI * 2,
        sway: 12 + Math.random() * 14,
      });
    }
  }

  function addAmbientCommunityKite() {
    const data = generateAmbientCommunityKite({
      width: app.screen.width,
      height: app.screen.height,
    });
    const gfx = buildCommunityKite(data);
    communityLayer.addChild(gfx);
    community.push({ data, gfx, baseY: data.y });
  }

  function inscribeLyricOnKite(text: string, category: WordCategory) {
    if (inscribedLyrics.length >= 6) {
      const oldest = inscribedLyrics.shift();
      if (oldest) {
        playerKite.removeChild(oldest);
        oldest.destroy();
      }
    }
    const color = categoryColor(category);
    const size = Math.min(app.screen.width, app.screen.height) * 0.075;
    const t = new Text({
      text: text.slice(0, 4),
      style: {
        fontFamily: '"Hiragino Sans","Yu Gothic UI",sans-serif',
        fontSize: Math.max(10, size * 0.32),
        fill: color.fill,
        fontWeight: "300",
      },
    });
    t.anchor.set(0.5);
    const angle = Math.random() * Math.PI * 2;
    const r = size * (0.45 + Math.random() * 0.25);
    t.position.set(Math.cos(angle) * r, Math.sin(angle) * r * 0.9);
    t.alpha = 0.85;
    playerKite.addChild(t);
    inscribedLyrics.push(t);
  }

  function applyLyricMood(category: WordCategory) {
    const target = categoryColor(category).hue;
    // hue は循環なので最短経路で寄せる
    const diff = ((target - moodHue + 540) % 360) - 180;
    moodHue = (moodHue + diff * 0.35 + 360) % 360;
    moodIntensity = Math.min(1, moodIntensity + 0.22);
  }

  function dropLyric(lyric: SelectedLyric) {
    const { x, y } = lyric.position;
    const horizonY = getHorizonY();

    // ムード（空・湖の雰囲気）を歌詞カテゴリに寄せる
    applyLyricMood(lyric.category);

    // 1) 歌詞が湖に向かって落ちる
    spawnFallingLyric(x, y, lyric.text, lyric.category);

    // 2) 湖面の波紋（少し遅延で発生させたい → setTimeoutで簡易表現）
    const lakeX = x;
    const lakeY = horizonY + Math.max(20, app.screen.height * 0.05);
    window.setTimeout(() => {
      spawnRipple(lakeX, lakeY, lyric.category, 1);
      const color = categoryColor(lyric.category);
      spawnParticles(lakeX, lakeY, kiteConfig.pattern === "star" ? 16 : 10, color.hue);
    }, 700);

    // 3) 風の流線を発生（少し遅れ）
    window.setTimeout(() => {
      for (let i = 0; i < 3; i += 1) {
        spawnWindStreak(lakeX + (Math.random() - 0.5) * 60, lakeY - 8, lyric.category);
      }
    }, 1100);

    // 4) 自分の凧をブースト
    kiteLiftBoost = Math.min(0.25, kiteLiftBoost + 0.06);
    kiteLift = Math.min(0.95, kiteLift + 0.04);

    // 5) 凧に歌詞を刻む
    inscribeLyricOnKite(lyric.text, lyric.category);

    // 6) 周囲の凧を追加（30%確率）
    if (Math.random() < 0.45) {
      addCommunityKiteFromLyric(lyric);
    }

    // 7) wish カテゴリは特別に湖面に渦を起こす
    if (lyric.category === "wish") {
      const wishColor = categoryColor(lyric.category);
      window.setTimeout(() => {
        spawnVortex(lakeX, lakeY, wishColor.hue, 1.2);
      }, 900);
    }
  }

  // メインループ
  app.ticker.add((ticker) => {
    const dt = ticker.deltaMS / 1000;
    totalElapsedMs += ticker.deltaMS;
    const intensity = SECTION_INTENSITY[section];

    // セクション進行で凧の基本上昇高度を緩やかに上げる
    const targetBaseLift = (() => {
      switch (section) {
        case "intro":
          return 0.0;
        case "verse":
          return 0.15;
        case "preChorus":
          return 0.3;
        case "chorus":
          return 0.55;
        case "bridge":
          return 0.4;
        case "finalChorus":
          return 0.85;
        case "outro":
        case "ended":
          return 0.7;
      }
    })();
    kiteLift += (targetBaseLift - kiteLift) * Math.min(1, dt * 0.4);
    kiteLiftBoost *= Math.exp(-dt * 1.2);

    // ムードの減衰（時間とともに基調色に戻る）
    moodIntensity *= Math.exp(-dt * 0.18);

    // フレア（サビ突入の一時的な強調演出）の減衰
    if (kiteFlareTimer > 0) {
      kiteFlareTimer = Math.max(0, kiteFlareTimer - dt);
    }

    // 自分の凧のレイアウト
    const anchor = getKiteAnchor();
    // サビ系・フレア中は回転振幅を拡大
    const isChorusSection = section === "chorus" || section === "finalChorus";
    const rotAmplitude =
      0.05 * (0.5 + intensity * 0.6) * (isChorusSection ? 2.6 : 1) + kiteFlareTimer * 0.06;
    const rotSpeed = isChorusSection ? 0.0024 : 0.0014;
    const rot = Math.sin(totalElapsedMs * rotSpeed) * rotAmplitude;
    playerKite.position.set(anchor.x, anchor.y);
    playerKite.rotation = rot;
    // サビでは凧が呼吸するように脈動、フレア中はピーク強調
    const pulse =
      1 +
      (isChorusSection ? 0.06 : 0.02) * Math.sin(totalElapsedMs * 0.0035) +
      kiteFlareTimer * 0.05;
    playerKite.scale.set(pulse);

    // 湖面の反射（Y軸対称位置に配置し、湖面の揺らぎを微小に表現）
    const horizonY = getHorizonY();
    const reflectionY = horizonY + (horizonY - anchor.y);
    const waterShimmerX = Math.sin(totalElapsedMs * 0.0023) * 4;
    const waterShimmerY = Math.cos(totalElapsedMs * 0.0019) * 1.6;
    playerReflection.position.set(anchor.x + waterShimmerX, reflectionY + waterShimmerY);
    // 反射は元の凧と反対方向に微小に回転（水面のゆらぎ感）
    playerReflection.rotation = -rot * 0.85;
    // 湖面の輝きでわずかに alpha 変化
    playerReflection.alpha = 0.28 + Math.sin(totalElapsedMs * 0.0017) * 0.05;

    // 凧糸（五線譜風：5本の平行な曲線として描く）
    playerKiteString.clear();
    const stringStartX = app.screen.width * 0.5;
    const stringStartY = app.screen.height + 20;
    const isChorusLike = section === "chorus" || section === "finalChorus";
    const phaseSpeed = isChorusLike ? 0.0028 : 0.0014;
    const stringSegments = 26;
    const stringSpacing = 4.6;
    for (let lineIdx = 0; lineIdx < 5; lineIdx += 1) {
      const offset = (lineIdx - 2) * stringSpacing;
      // 中央2本ほど太く・はっきり、外側に行くほど薄く
      const distFromCenter = Math.abs(lineIdx - 2);
      const lineAlpha = 0.32 - distFromCenter * 0.07;
      const lineWidth = 1.0 - distFromCenter * 0.15;
      playerKiteString.moveTo(stringStartX + offset, stringStartY);
      for (let s = 1; s <= stringSegments; s += 1) {
        const t = s / stringSegments;
        const baseX = stringStartX + (anchor.x - stringStartX) * t;
        const baseY = stringStartY + (anchor.y - stringStartY) * t;
        // 糸全体としての揺らぎ（横方向にゆっくり波打つ）
        const sway = Math.sin(totalElapsedMs * 0.001 + t * Math.PI * 0.8) * 18 * (1 - t * 0.4);
        // 五線譜の上を音符が走るような細かい波（サビで加速）
        const ripple =
          Math.sin(t * Math.PI * 4 + totalElapsedMs * phaseSpeed + lineIdx * 0.6) *
          (isChorusLike ? 4.5 : 2.4);
        // 5本を垂直方向に少しずらして平行に走らせる
        const perpFactor = 1 - t * 0.65; // 凧側に近づくほど線が集約する
        const px = baseX + sway + offset * perpFactor;
        const py = baseY + ripple;
        playerKiteString.lineTo(px, py);
      }
      playerKiteString.stroke({
        color: 0xffffff,
        alpha: lineAlpha,
        width: Math.max(0.6, lineWidth),
      });
    }

    // 波紋
    for (let i = ripples.length - 1; i >= 0; i -= 1) {
      const r = ripples[i]!;
      r.life += dt;
      if (r.life >= r.maxLife) {
        rippleLayer.removeChild(r.gfx);
        r.gfx.destroy();
        ripples.splice(i, 1);
        continue;
      }
      const ratio = r.life / r.maxLife;
      const radius = ratio * r.maxRadius;
      const alpha = (1 - ratio) * 0.7 * r.strength;
      const color = categoryColor(r.category);
      r.gfx.clear();
      r.gfx.circle(r.x, r.y, radius);
      r.gfx.stroke({ color: hslToHex(color.hue, 0.7, 0.78), alpha, width: 1.6 });
      r.gfx.circle(r.x, r.y, radius * 0.6);
      r.gfx.stroke({ color: hslToHex(color.hue, 0.7, 0.88), alpha: alpha * 0.45, width: 1 });
    }

    // 風の流線
    for (let i = winds.length - 1; i >= 0; i -= 1) {
      const wnd = winds[i]!;
      wnd.life += dt;
      if (wnd.life >= wnd.maxLife) {
        windLayer.removeChild(wnd.gfx);
        wnd.gfx.destroy();
        winds.splice(i, 1);
        continue;
      }
      const ratio = wnd.life / wnd.maxLife;
      const alpha = (1 - ratio) * 0.55;
      const len = wnd.speed * wnd.life;
      const startY = wnd.baseY;
      const endY = wnd.baseY - len;
      wnd.gfx.clear();
      wnd.gfx.moveTo(wnd.x, startY);
      const steps = 10;
      for (let s = 1; s <= steps; s += 1) {
        const t = s / steps;
        const py = startY + (endY - startY) * t;
        const px = wnd.x + Math.sin(t * Math.PI * 2 + wnd.life * 2) * wnd.amp * (1 - t * 0.6);
        wnd.gfx.lineTo(px, py);
      }
      wnd.gfx.stroke({
        color: hslToHex(wnd.hue, 0.7, 0.85),
        alpha,
        width: wnd.width,
      });
    }

    // 落下する歌詞
    for (let i = fallingLyrics.length - 1; i >= 0; i -= 1) {
      const f = fallingLyrics[i]!;
      f.life += dt;
      const ratio = Math.min(1, f.life / f.maxLife);
      const eased = ratio * ratio;
      const y = f.startY + (f.targetY - f.startY) * eased;
      f.gfx.position.set(f.x, y);
      f.gfx.alpha = 1 - ratio * 0.85;
      f.gfx.scale.set(1 - ratio * 0.3);
      if (f.life >= f.maxLife) {
        fallingLyricLayer.removeChild(f.gfx);
        f.gfx.destroy();
        fallingLyrics.splice(i, 1);
      }
    }

    // 風の渦（螺旋）
    for (let i = vortices.length - 1; i >= 0; i -= 1) {
      const v = vortices[i]!;
      v.life += dt;
      if (v.life >= v.maxLife) {
        vortexLayer.removeChild(v.gfx);
        v.gfx.destroy();
        vortices.splice(i, 1);
        continue;
      }
      const ratio = v.life / v.maxLife;
      // フェードイン → フェードアウト
      const fade = ratio < 0.3 ? ratio / 0.3 : 1 - (ratio - 0.3) / 0.7;
      const alpha = Math.max(0, fade) * 0.7;
      const radius = v.maxRadius * (0.4 + ratio * 0.6);
      v.rotation += v.rotSpeed * dt;

      v.gfx.clear();
      const points = 80;
      const color = hslToHex(v.hue, 0.65, 0.78);
      for (let s = 0; s < points; s += 1) {
        const t = s / points;
        const theta = t * Math.PI * 2 * v.turns + v.rotation;
        const r = radius * t;
        const px = v.x + Math.cos(theta) * r;
        const py = v.y + Math.sin(theta) * r * 0.55; // 湖面なので縦に圧縮
        if (s === 0) v.gfx.moveTo(px, py);
        else v.gfx.lineTo(px, py);
      }
      v.gfx.stroke({ color, alpha, width: 1.6 });
      // 内側にもうひとつ細い螺旋
      for (let s = 0; s < points; s += 1) {
        const t = s / points;
        const theta = t * Math.PI * 2 * v.turns + v.rotation + Math.PI;
        const r = radius * t * 0.6;
        const px = v.x + Math.cos(theta) * r;
        const py = v.y + Math.sin(theta) * r * 0.55;
        if (s === 0) v.gfx.moveTo(px, py);
        else v.gfx.lineTo(px, py);
      }
      v.gfx.stroke({ color: hslToHex(v.hue, 0.55, 0.9), alpha: alpha * 0.6, width: 1 });
    }

    // finalChorus 中はランダムに渦が湧く
    if (section === "finalChorus") {
      vortexSpawnTimer += dt;
      const interval = 3.4 + Math.random() * 1.5;
      if (vortexSpawnTimer > interval) {
        vortexSpawnTimer = 0;
        const horizonY = getHorizonY();
        const x = app.screen.width * (0.18 + Math.random() * 0.64);
        const y = horizonY + app.screen.height * (0.05 + Math.random() * 0.18);
        spawnVortex(x, y, moodHue, 0.7 + Math.random() * 0.4);
      }
    } else {
      vortexSpawnTimer = 0;
    }

    // 粒子
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i]!;
      p.life += dt;
      if (p.life >= p.maxLife) {
        particleLayer.removeChild(p.gfx);
        p.gfx.destroy();
        particles.splice(i, 1);
        continue;
      }
      const ratio = p.life / p.maxLife;
      p.gfx.x += p.vx * dt;
      p.gfx.y += p.vy * dt;
      p.vy *= Math.exp(-dt * 0.6);
      p.gfx.alpha = (1 - ratio) * 0.9;
    }

    // 周囲の凧（漂い・サビでは群舞として一斉に揺れる）
    const isChorusForFlock = section === "chorus" || section === "finalChorus";
    const flockPhase = totalElapsedMs * 0.0007;
    const flockSwayAmp = isChorusForFlock ? 16 : 0;
    const flockLiftAmp = section === "finalChorus" ? 20 : section === "chorus" ? 9 : 0;
    for (const c of community) {
      // 個体の独立な揺らぎ
      const individualSway = Math.sin(totalElapsedMs * 0.0009 + c.data.phase) * 8;
      // 群舞：すべての凧が同じ位相で横揺れする（サビ中だけ振幅が出る）
      const flockSway = Math.sin(flockPhase + c.data.phase * 0.3) * flockSwayAmp;
      // finalChorus での舞い上がり
      const baseLift =
        section === "finalChorus" ? -34 - Math.sin(totalElapsedMs * 0.001 + c.data.phase) * 12 : 0;
      // 群れ全体が縦に呼吸するように上下する
      const flockLift = Math.cos(flockPhase * 0.7) * flockLiftAmp;

      c.gfx.position.set(
        c.data.x + individualSway + flockSway,
        c.baseY - intensity * 14 + baseLift + flockLift,
      );
      const indivRot = Math.sin(totalElapsedMs * 0.0011 + c.data.phase) * 0.1;
      const flockRot = isChorusForFlock ? Math.sin(flockPhase * 1.1) * 0.07 : 0;
      c.gfx.rotation = indivRot + flockRot;
    }

    // 過去の自分の凧（遠景でゆったり漂う）
    for (const p of pastKites) {
      const dx = Math.sin(totalElapsedMs * 0.0005 + p.phase) * p.sway;
      const dy = Math.cos(totalElapsedMs * 0.0006 + p.phase) * 6;
      p.gfx.position.set(p.baseX + dx, p.baseY + dy);
      p.gfx.rotation = Math.sin(totalElapsedMs * 0.0008 + p.phase) * 0.08;
    }

    // アンビエントな周囲の凧の自動出現（少しずつ）
    ambientSpawnTimer += dt;
    const spawnInterval =
      section === "intro" ? 100 : section === "finalChorus" ? 1.4 : section === "chorus" ? 2.2 : 4;
    if (ambientSpawnTimer > spawnInterval && community.length < 28) {
      ambientSpawnTimer = 0;
      addAmbientCommunityKite();
    }

    // 背景は毎フレーム更新する必要はないが、リサイズ対応のため間引いて更新
    if (Math.floor(totalElapsedMs / 100) % 2 === 0) {
      drawSkyAndLake();
    }
  });

  function resize() {
    rebuildPlayerKite();
    drawSkyAndLake();
  }

  function setKiteConfig(config: KiteConfig) {
    kiteConfig = config;
    rebuildPlayerKite();
    drawSkyAndLake();
  }

  function setSection(s: SongSection) {
    // サビ系セクションに新しく入った瞬間にフレアタイマーを起こす
    if (s !== section && (s === "chorus" || s === "finalChorus")) {
      kiteFlareTimer = 1.8;
    }
    section = s;
  }

  function setTime(t: number) {
    time = t;
    void time;
  }

  function clearAll() {
    for (const r of ripples) {
      rippleLayer.removeChild(r.gfx);
      r.gfx.destroy();
    }
    ripples.length = 0;
    for (const w of winds) {
      windLayer.removeChild(w.gfx);
      w.gfx.destroy();
    }
    winds.length = 0;
    for (const f of fallingLyrics) {
      fallingLyricLayer.removeChild(f.gfx);
      f.gfx.destroy();
    }
    fallingLyrics.length = 0;
    for (const p of particles) {
      particleLayer.removeChild(p.gfx);
      p.gfx.destroy();
    }
    particles.length = 0;
    for (const v of vortices) {
      vortexLayer.removeChild(v.gfx);
      v.gfx.destroy();
    }
    vortices.length = 0;
    vortexSpawnTimer = 0;
    for (const c of community) {
      communityLayer.removeChild(c.gfx);
      c.gfx.destroy({ children: true });
    }
    community.length = 0;
    for (const t of inscribedLyrics) {
      playerKite.removeChild(t);
      t.destroy();
    }
    inscribedLyrics.length = 0;
    kiteLift = 0;
    kiteLiftBoost = 0;
  }

  function dispose() {
    clearAll();
    app.destroy(true, { children: true });
  }

  // 初期描画
  rebuildPlayerKite();
  drawSkyAndLake();

  return {
    setKiteConfig,
    setSection,
    setTime,
    dropLyric,
    addPastKites,
    clearAll,
    resize,
    dispose,
  };
}

function hslToHex(hue: number, sat: number, light: number): number {
  const h = (((hue % 360) + 360) % 360) / 360;
  const s = Math.max(0, Math.min(1, sat));
  const l = Math.max(0, Math.min(1, light));
  if (s === 0) {
    const v = Math.round(l * 255);
    return (v << 16) | (v << 8) | v;
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hueToRgb(p, q, h + 1 / 3);
  const g = hueToRgb(p, q, h);
  const b = hueToRgb(p, q, h - 1 / 3);
  return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
}

function hueToRgb(p: number, q: number, t: number): number {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}
