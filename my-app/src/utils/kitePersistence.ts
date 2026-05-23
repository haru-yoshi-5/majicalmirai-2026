import type { PastKiteRecord } from "../types/kite.ts";

const STORAGE_KEY = "kazekiri-past-kites-v1";
const MAX_PAST_KITES = 5;

export function loadPastKites(): PastKiteRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 念のため形状を軽く検証
    return parsed.filter(
      (r): r is PastKiteRecord =>
        r != null &&
        typeof r === "object" &&
        typeof r.name === "string" &&
        r.kiteConfig != null &&
        Array.isArray(r.selectedTexts) &&
        typeof r.savedAt === "number",
    );
  } catch {
    return [];
  }
}

export function savePastKite(record: PastKiteRecord): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadPastKites();
    const next = [record, ...existing].slice(0, MAX_PAST_KITES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage が使えない環境（プライベートモードなど）では何もしない
  }
}
