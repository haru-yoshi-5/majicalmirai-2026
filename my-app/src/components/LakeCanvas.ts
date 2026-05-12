import type { Particle, Ripple, SelectedWord, SongSection, WordCategory } from "../types/lyric.ts";
import { categoryColor } from "../utils/classifyWord.ts";

const MAX_SELECTED = 28;
const AMBIENT_PARTICLE_COUNT = 40;

export interface LakeCanvasOptions {
  onLakeClick: (x: number, y: number) => void;
}

export function createLakeCanvas(parent: HTMLElement, options: LakeCanvasOptions) {
  const canvas = document.createElement("canvas");
  canvas.className = "lake-canvas";
  parent.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas context is not available");
  }

  let width = 0;
  let height = 0;
  let dpr = Math.max(1, window.devicePixelRatio || 1);

  const ripples: Ripple[] = [];
  const particles: Particle[] = [];
  const selected: SelectedWord[] = [];

  let section: SongSection = "intro";
  let songTime = 0;
  let rippleId = 0;
  let wordId = 0;
  let rafId = 0;
  let startedAt = performance.now();

  for (let i = 0; i < AMBIENT_PARTICLE_COUNT; i += 1) {
    particles.push(spawnAmbientParticle());
  }

  function spawnAmbientParticle(): Particle {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.08,
      vy: -0.05 - Math.random() * 0.08,
      life: 0,
      maxLife: 8 + Math.random() * 10,
      size: 0.6 + Math.random() * 1.6,
      hue: 195 + Math.random() * 40,
      drift: "ambient",
    };
  }

  function spawnBurstParticle(x: number, y: number, hue: number): Particle {
    return {
      x,
      y,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -0.2 - Math.random() * 0.6,
      life: 0,
      maxLife: 2 + Math.random() * 2.5,
      size: 0.8 + Math.random() * 1.8,
      hue,
      drift: "rise",
    };
  }

  function resize() {
    dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = parent.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function handleClick(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    options.onLakeClick(x, y);
  }

  function sectionIntensity(s: SongSection): number {
    switch (s) {
      case "intro":
        return 0.25;
      case "verse":
        return 0.45;
      case "preChorus":
        return 0.65;
      case "chorus":
        return 0.9;
      case "bridge":
        return 0.55;
      case "finalChorus":
        return 1;
      case "outro":
      case "ended":
        return 0.75;
      default:
        return 0.5;
    }
  }

  function drawBackground(t: number) {
    if (!ctx) return;
    const intensity = sectionIntensity(section);
    const topR = 6 + intensity * 8;
    const topG = 10 + intensity * 16;
    const topB = 30 + intensity * 30;
    const midR = 8 + intensity * 12;
    const midG = 18 + intensity * 24;
    const midB = 50 + intensity * 60;
    const horizonR = 20 + intensity * 35;
    const horizonG = 40 + intensity * 60;
    const horizonB = 80 + intensity * 90;

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, `rgb(${topR}, ${topG}, ${topB})`);
    grad.addColorStop(0.45, `rgb(${midR}, ${midG}, ${midB})`);
    grad.addColorStop(0.55, `rgb(${horizonR}, ${horizonG}, ${horizonB})`);
    grad.addColorStop(0.62, `rgb(${midR}, ${midG}, ${midB})`);
    grad.addColorStop(
      1,
      `rgb(${Math.floor(topR * 0.6)}, ${Math.floor(topG * 0.6)}, ${Math.floor(topB * 0.6)})`,
    );
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const horizonY = height * 0.55;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 14; i += 1) {
      const ry = horizonY + i * (height * 0.04) + Math.sin(t * 0.6 + i) * 1.5;
      const alpha = 0.04 + 0.05 * Math.sin(t * 0.4 + i * 0.7) * intensity;
      ctx.strokeStyle = `rgba(180, 220, 255, ${Math.max(0, alpha)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const phase = t * 0.5 + i * 0.4;
      const amp = 4 + i * 1.2;
      ctx.moveTo(0, ry);
      for (let x = 0; x <= width; x += 18) {
        const wave = Math.sin(x * 0.012 + phase) * amp * 0.4;
        ctx.lineTo(x, ry + wave);
      }
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.025)";
    for (let i = 0; i < 3; i += 1) {
      const y = horizonY - 20 - i * 18;
      ctx.beginPath();
      ctx.ellipse(width * 0.5, y, width * (0.4 - i * 0.08), 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawParticles(dt: number) {
    if (!ctx) return;
    const intensity = sectionIntensity(section);
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i]!;
      p.life += dt;
      p.x += p.vx;
      p.y += p.vy;
      if (p.drift === "ambient") {
        p.x += Math.sin(p.life * 0.6 + p.hue) * 0.08;
      }

      const lifeRatio = p.life / p.maxLife;
      if (lifeRatio >= 1 || p.y < -10 || p.x < -10 || p.x > width + 10) {
        if (p.drift === "ambient") {
          particles[i] = spawnAmbientParticle();
          particles[i]!.y = height + 10;
        } else {
          particles.splice(i, 1);
        }
        continue;
      }

      const alpha = (1 - lifeRatio) * (0.45 + intensity * 0.35);
      const size = p.size * (1 + intensity * 0.3);
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 6);
      glow.addColorStop(0, `hsla(${p.hue}, 90%, 85%, ${alpha})`);
      glow.addColorStop(1, `hsla(${p.hue}, 90%, 70%, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawRipples(now: number) {
    if (!ctx) return;
    const intensity = sectionIntensity(section);
    for (let i = ripples.length - 1; i >= 0; i -= 1) {
      const r = ripples[i]!;
      const age = (now - r.bornAt) / 1000;
      const lifetime = 3.2;
      if (age > lifetime) {
        ripples.splice(i, 1);
        continue;
      }
      const ratio = age / lifetime;
      const radius = ratio * r.maxRadius * (1 + intensity * 0.2);
      const alpha = (1 - ratio) * 0.5 * r.strength;
      const color = categoryColor(r.category);
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.strokeStyle = `hsla(${color.hue}, 80%, 78%, ${alpha})`;
      ctx.lineWidth = 1.5 + intensity * 0.8;
      ctx.beginPath();
      ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `hsla(${color.hue}, 80%, 88%, ${alpha * 0.5})`;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(r.x, r.y, radius * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawConstellation(now: number) {
    if (!ctx) return;
    if (selected.length < 3) return;
    const intensity = sectionIntensity(section);
    let baseAlpha = 0.08 + intensity * 0.18;
    if (section === "finalChorus") baseAlpha += 0.1;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < selected.length; i += 1) {
      const a = selected[i]!;
      const next = selected[(i + 1) % selected.length];
      if (!next || next === a) continue;
      const wob = Math.sin(now * 0.0006 + i) * 8;
      ctx.strokeStyle = `hsla(200, 90%, 86%, ${baseAlpha})`;
      ctx.lineWidth = 0.6 + intensity * 0.5;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      const cx = (a.x + next.x) / 2 + wob;
      const cy = (a.y + next.y) / 2 - 12 + wob * 0.3;
      ctx.quadraticCurveTo(cx, cy, next.x, next.y);
      ctx.stroke();
    }
    if (selected.length >= 5) {
      for (let i = 0; i < selected.length; i += 2) {
        const a = selected[i]!;
        const b = selected[(i + 2) % selected.length];
        if (!b || a === b) continue;
        ctx.strokeStyle = `hsla(220, 90%, 88%, ${baseAlpha * 0.6})`;
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawSelectedWords(now: number) {
    if (!ctx) return;
    const intensity = sectionIntensity(section);
    const isChorus = section === "chorus" || section === "finalChorus";
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < selected.length; i += 1) {
      const w = selected[i]!;
      const age = (now - w.bornAt) / 1000;
      const sway = Math.sin(now * 0.0008 + w.phase) * 4;
      const fade = Math.max(0.35, 1 - age / 90);
      const pulse = isChorus ? 0.15 + 0.15 * Math.sin(now * 0.004 + i) : 0;
      const alpha = (0.55 + intensity * 0.3) * fade + pulse;
      const color = categoryColor(w.category);

      const size = 16 + Math.min(8, w.text.length * 0.3) + intensity * 4;
      ctx.font = `300 ${size}px "Hiragino Sans", "Yu Gothic UI", "Segoe UI", system-ui, sans-serif`;

      ctx.save();
      ctx.translate(w.x, w.y + sway);
      ctx.scale(1, -0.5);
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillStyle = color.fill;
      ctx.shadowBlur = 12 + intensity * 8;
      ctx.shadowColor = color.glow;
      ctx.fillText(w.text, 0, size * 0.9);
      ctx.restore();

      ctx.save();
      ctx.translate(w.x, w.y - sway * 0.3);
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.fillStyle = color.fill;
      ctx.shadowBlur = 16 + intensity * 10;
      ctx.shadowColor = color.glow;
      ctx.fillText(w.text, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  function frame(now: number) {
    if (!ctx) return;
    const t = (now - startedAt) / 1000;
    const dt = 1 / 60;

    ctx.clearRect(0, 0, width, height);
    drawBackground(t);
    drawParticles(dt);
    drawConstellation(now);
    drawRipples(now);
    drawSelectedWords(now);

    rafId = requestAnimationFrame(frame);
  }

  function addRipple(x: number, y: number, category: WordCategory, strength: number): void {
    const intensity = sectionIntensity(section);
    const baseRadius = 160 + Math.random() * 100;
    const radius = category === "deep" || category === "sound" ? baseRadius * 1.35 : baseRadius;
    ripples.push({
      id: ++rippleId,
      x,
      y,
      bornAt: performance.now(),
      maxRadius: radius * (0.9 + intensity * 0.3),
      category,
      strength,
    });
  }

  function addSelectedWord(text: string, x: number, y: number, category: WordCategory) {
    selected.push({
      id: ++wordId,
      text,
      x,
      y,
      category,
      bornAt: performance.now(),
      phase: Math.random() * Math.PI * 2,
    });
    if (selected.length > MAX_SELECTED) {
      selected.shift();
    }
  }

  function spawnBurst(x: number, y: number, category: WordCategory) {
    const hue = categoryColor(category).hue;
    const extra = category === "bright" || category === "airy" ? 14 : 8;
    for (let i = 0; i < extra; i += 1) {
      particles.push(spawnBurstParticle(x, y, hue));
    }
  }

  function setSection(s: SongSection) {
    section = s;
  }

  function setTime(t: number) {
    songTime = t;
  }

  function getSelected(): ReadonlyArray<SelectedWord> {
    return selected;
  }

  function clearAll() {
    ripples.length = 0;
    selected.length = 0;
    particles.length = 0;
    for (let i = 0; i < AMBIENT_PARTICLE_COUNT; i += 1) {
      particles.push(spawnAmbientParticle());
    }
  }

  function getTime() {
    return songTime;
  }

  resize();
  startedAt = performance.now();
  rafId = requestAnimationFrame(frame);

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(parent);
  canvas.addEventListener("click", handleClick);

  function dispose() {
    cancelAnimationFrame(rafId);
    resizeObserver.disconnect();
    canvas.removeEventListener("click", handleClick);
    canvas.remove();
  }

  return {
    canvas,
    addRipple,
    addSelectedWord,
    spawnBurst,
    setSection,
    setTime,
    getTime,
    getSelected,
    clearAll,
    dispose,
  };
}

export type LakeCanvas = ReturnType<typeof createLakeCanvas>;
