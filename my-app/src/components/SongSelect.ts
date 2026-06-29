// 課題曲6曲から1曲を選んで再生する画面（昼・夜の両方で共有）。
// 「あそぶ」ボタン押下で onPlay(song) を呼ぶ。配色は data-mode により自動で昼/夜へ切り替わる。

import { SONG_CATALOG } from "../data/songs.ts";
import type { SongDef } from "../data/songs.ts";

export interface SongSelectOptions {
  /** 「戻る」押下 */
  onBack: () => void;
  /** 「あそぶ」押下。選択中の曲を渡す。 */
  onPlay: (song: SongDef) => void;
  /** 既定で選択しておく曲ID（未指定なら先頭） */
  defaultSongId?: string;
  /** 表示する曲（既定は課題曲6曲） */
  songs?: readonly SongDef[];
}

export function createSongSelect(parent: HTMLElement, options: SongSelectOptions) {
  const songs = options.songs ?? SONG_CATALOG;

  const root = document.createElement("div");
  root.className = "song-select";

  const inner = document.createElement("div");
  inner.className = "song-select-inner";

  const title = document.createElement("h2");
  title.className = "song-select-title";
  title.textContent = "曲をえらぶ";

  const sub = document.createElement("p");
  sub.className = "song-select-sub";
  sub.textContent = "マジカルミライ2026 課題曲から1曲";

  const list = document.createElement("div");
  list.className = "song-list";

  let selected: SongDef =
    songs.find((s) => s.id === options.defaultSongId) ?? songs[0] ?? SONG_CATALOG[0]!;

  const cards = new Map<string, HTMLButtonElement>();

  function refreshSelection() {
    for (const [id, card] of cards) {
      const isSel = id === selected.id;
      card.classList.toggle("is-selected", isSel);
      card.setAttribute("aria-pressed", isSel ? "true" : "false");
    }
  }

  for (const song of songs) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "song-card";
    card.setAttribute("aria-pressed", "false");

    const name = document.createElement("span");
    name.className = "song-card-title";
    name.textContent = song.title;

    const artist = document.createElement("span");
    artist.className = "song-card-artist";
    artist.textContent = song.artist;

    card.append(name, artist);
    card.addEventListener("click", () => {
      selected = song;
      refreshSelection();
    });
    cards.set(song.id, card);
    list.appendChild(card);
  }

  const actions = document.createElement("div");
  actions.className = "song-select-actions";

  const backButton = document.createElement("button");
  backButton.type = "button";
  backButton.className = "song-back";
  backButton.textContent = "戻る";
  backButton.addEventListener("click", () => options.onBack());

  const playButton = document.createElement("button");
  playButton.type = "button";
  playButton.className = "song-play";
  playButton.textContent = "▶  あそぶ";
  playButton.addEventListener("click", () => options.onPlay(selected));

  actions.append(backButton, playButton);

  inner.append(title, sub, list, actions);
  root.appendChild(inner);
  parent.appendChild(root);

  refreshSelection();
  requestAnimationFrame(() => root.classList.add("is-visible"));

  function dispose() {
    root.remove();
  }

  return { root, dispose };
}

export type SongSelect = ReturnType<typeof createSongSelect>;
