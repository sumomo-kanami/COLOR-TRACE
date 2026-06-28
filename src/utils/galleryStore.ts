/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GalleryItem, CapturedLyric, MousePoint } from "../types";

const GALLERY_KEY = "color_trace_gallery_v1";

export const getGalleryItems = (): GalleryItem[] => {
  try {
    const data = localStorage.getItem(GALLERY_KEY);
    if (!data) return getSeedGalleryItems();
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to load gallery items", e);
    return getSeedGalleryItems();
  }
};

export const saveGalleryItem = (
  songId: string,
  songTitle: string,
  artist: string,
  theme: string,
  capturedCount: number,
  totalLyricsCount: number,
  capturedLyrics: CapturedLyric[],
  mouseTrace: MousePoint[],
  customName: string,
  clothesColorTheme: string
): GalleryItem => {
  const newItem: GalleryItem = {
    id: "artwork_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    songId,
    songTitle,
    artist,
    theme,
    capturedCount,
    totalLyricsCount,
    capturedLyrics,
    mouseTrace,
    creationDate: new Date().toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }),
    customName: customName.trim() || `${songTitle} #` + Math.floor(Math.random() * 900 + 100),
    clothesColorTheme
  };

  const current = getGalleryItems();
  const updated = [newItem, ...current];
  localStorage.setItem(GALLERY_KEY, JSON.stringify(updated));

  return newItem;
};

export const deleteGalleryItem = (id: string): GalleryItem[] => {
  const current = getGalleryItems();
  const filtered = current.filter(item => item.id !== id);
  localStorage.setItem(GALLERY_KEY, JSON.stringify(filtered));
  return filtered;
};

// Generates beautiful pre-seeded gallery submissions for Miku fans to admire right when opening the app
const getSeedGalleryItems = (): GalleryItem[] => {
  const nowStr = new Date().toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });

  return [
    {
      id: "seed_1",
      songId: "kotaete",
      songTitle: "こたえて",
      artist: "シャノン",
      theme: "色 (Color)",
      capturedCount: 11,
      totalLyricsCount: 13,
      customName: "レインボー・メロディー",
      clothesColorTheme: "Vibrant Cyan & Pink Burst",
      creationDate: nowStr,
      capturedLyrics: [
        { text: "モノクロの街", timestamp: 1000, x: 100, y: 150, partAssigned: "ribbon", color: "#38bdf8" },
        { text: "言葉も無く", timestamp: 2500, x: 250, y: 80, partAssigned: "headset", color: "#ec4899" },
        { text: "歩いていた", timestamp: 5000, x: 300, y: 300, partAssigned: "sleeves", color: "#a855f7" },
        { text: "君の声が", timestamp: 7500, x: 120, y: 280, partAssigned: "skirt", color: "#06b6d4" },
        { text: "世界は色づく", timestamp: 10000, x: 200, y: 200, partAssigned: "boots", color: "#fbbf24" }
      ],
      mouseTrace: [
        { x: 100, y: 150, time: 1000 },
        { x: 150, y: 120, time: 2000 },
        { x: 250, y: 80, time: 2500 },
        { x: 280, y: 200, time: 4000 },
        { x: 300, y: 300, time: 5000 },
        { x: 200, y: 280, time: 6500 },
        { x: 120, y: 280, time: 7500 },
        { x: 160, y: 240, time: 9000 },
        { x: 200, y: 200, time: 10000 }
      ]
    },
    {
      id: "seed_2",
      songId: "after_curtain",
      songTitle: "アフター・ザ・カーテン",
      artist: "Treow (Electrocute)",
      theme: "余韻 (Linger)",
      capturedCount: 13,
      totalLyricsCount: 14,
      customName: "静寂のパウダーブルー",
      clothesColorTheme: "Deep Purple Twilight Overlay",
      creationDate: nowStr,
      capturedLyrics: [
        { text: "鳴り響く拍手", timestamp: 1200, x: 80, y: 100, partAssigned: "ribbon", color: "#8b5cf6" },
        { text: "幕は下りて", timestamp: 4000, x: 320, y: 140, partAssigned: "headset", color: "#3b82f6" },
        { text: "残されたメロディ", timestamp: 7200, x: 200, y: 250, partAssigned: "skirt", color: "#a78bfa" }
      ],
      mouseTrace: [
        { x: 80, y: 100, time: 1200 },
        { x: 200, y: 120, time: 2500 },
        { x: 320, y: 140, time: 4000 },
        { x: 260, y: 200, time: 5500 },
        { x: 200, y: 250, time: 7200 }
      ]
    }
  ];
};
