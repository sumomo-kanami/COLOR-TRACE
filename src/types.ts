/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Song {
  id: string;
  title: string;
  artist: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  theme: string;
  description: string;
  bpm: number;
  lyrics: LyricItem[];
  primaryColor: string; // Tailwind hex or class equivalents
  secondaryColor: string;
  piaproUrl?: string;
  textAliveConfig?: {
    beatId: number;
    chordId: number;
    repetitiveSegmentId: number;
    lyricId: number;
    lyricDiffId: number;
  };
}

export interface LyricItem {
  text: string;
  isFake?: boolean; // Used for "トリツクロジー" (True vs Fake lyrics)
}

export interface CapturedLyric {
  text: string;
  timestamp: number; // millisecond in the song
  x: number; // x position when captured
  y: number; // y position when captured
  partAssigned: string; // 'hair-l' | 'hair-r' | 'ribbon' | 'sleeve-l' | 'sleeve-r' | 'skirt' | 'boots' | 'headset'
  color: string; // color assigned at capture time
  scrollOffset?: number; // accumulated scroll offset at capture time
}

export interface MousePoint {
  x: number;
  y: number;
  time: number; // timestamp
  scrollOffset?: number; // accumulated scroll offset at trace time
}

export interface GalleryItem {
  id: string;
  songId: string;
  songTitle: string;
  artist: string;
  theme: string;
  capturedCount: number;
  totalLyricsCount: number;
  capturedLyrics: CapturedLyric[];
  mouseTrace: MousePoint[];
  creationDate: string;
  customName: string; // The user-defined masterpiece name
  clothesColorTheme: string; // The computed color theme style
}
