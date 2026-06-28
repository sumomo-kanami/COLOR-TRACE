/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Song, CapturedLyric, MousePoint } from "../types";
import { MikuRenderer } from "./MikuRenderer";
import { GlobalAudio } from "../utils/AudioEngine";
import { playSongInPlayer, stopSongInPlayer, player, registerTimerReadyCallback } from "../utils/textalive";
import { HelpCircle, Star, Sparkles, Camera, Zap, ShieldAlert, Award, Volume2 } from "lucide-react";

interface GamePlayScreenProps {
  song: Song;
  onQuit: () => void;
  onFinishStage: (data: {
    capturedLyrics: CapturedLyric[];
    mouseTrace: MousePoint[];
    score: number;
  }) => void;
  onBackToTitle?: () => void;
}

interface FlyingLyric {
  id: string;
  text: string;
  isFake: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  isCaptured: boolean;
  isMissed: boolean;
  glowColor: string;
}

const getIntroDelay = (songId: string): number => {
  switch (songId) {
    case "kotaete": return 11000; // 11s intro
    case "after_curtain": return 0; // No intro delay for After the Curtain
    case "shutter_chance": return 2000; // 2s intro for Shutter Chance
    case "band_of_world": return 14000; // 14s intro
    case "trichology": return 0; // No intro delay for trichology
    case "takeover": return 0; // No intro delay for takeover
    default: return 8000;
  }
};

interface WordInfo {
  text: string;
  pos: string;
  startTime: number;
  endTime: number;
}

const chunkPhraseWords = (words: WordInfo[]): { text: string; startTime: number; endTime: number }[] => {
  if (words.length === 0) return [];

  // Check if English or mostly non-Japanese (latin-based)
  const isEnglish = words.some(w => /^[A-Za-z\s]+$/.test(w.text || ""));
  if (isEnglish) {
    const chunks: { text: string; startTime: number; endTime: number }[] = [];
    let currentChunk: { text: string; startTime: number; endTime: number; count: number } | null = null;
    for (const w of words) {
      if (!w.text || !w.text.trim()) continue;
      if (!currentChunk) {
        currentChunk = { text: w.text, startTime: w.startTime, endTime: w.endTime, count: 1 };
      } else {
        currentChunk.text += " " + w.text;
        currentChunk.endTime = w.endTime;
        currentChunk.count++;
        if (currentChunk.count >= 3 || currentChunk.text.length >= 15) {
          chunks.push({ text: currentChunk.text, startTime: currentChunk.startTime, endTime: currentChunk.endTime });
          currentChunk = null;
        }
      }
    }
    if (currentChunk) {
      chunks.push({ text: currentChunk.text, startTime: currentChunk.startTime, endTime: currentChunk.endTime });
    }
    return chunks;
  }

  // Japanese Bunsetsu Grouping based on Parts of Speech (POS)
  const chunks: { text: string; startTime: number; endTime: number; wordCount: number; hasContent: boolean; containsVerb: boolean }[] = [];
  let currentChunk: { text: string; startTime: number; endTime: number; wordCount: number; hasContent: boolean; containsVerb: boolean } | null = null;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const text = w.text || "";
    if (!text.trim()) continue;

    const pos = w.pos || "X";
    const startTime = w.startTime || 0;
    const endTime = w.endTime || 0;

    // Content words: Noun (N), Pronoun (PN), Verb (V), Adverb (R), Adjective (J), Adnominal (A), Conjunction (I), Interjection (U), Wh-word (W), Prefix (F)
    const isContentWord = ["N", "PN", "V", "R", "J", "A", "I", "U", "W", "F"].includes(pos);
    const isVerb = pos === "V";

    let shouldStartNew = false;
    if (!currentChunk) {
      shouldStartNew = true;
    } else {
      // Start a new chunk if the word is a content word and the current chunk already contains a content word
      if (isContentWord && currentChunk.hasContent) {
        shouldStartNew = true;
      }
    }

    if (shouldStartNew) {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = {
        text,
        startTime,
        endTime,
        wordCount: 1,
        hasContent: isContentWord,
        containsVerb: isVerb
      };
    } else {
      if (currentChunk) {
        currentChunk.text += text;
        currentChunk.endTime = endTime;
        currentChunk.wordCount += 1;
        if (isContentWord) {
          currentChunk.hasContent = true;
        }
        if (isVerb) {
          currentChunk.containsVerb = true;
        }
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  // Second pass: Smart merge to avoid chunks that are too long or too short.
  // Goal: chunks of comfortable reading length (around 3 to 11 characters)
  const mergedChunks: typeof chunks = [];
  let i = 0;
  while (i < chunks.length) {
    let curr = { ...chunks[i] };

    while (i + 1 < chunks.length) {
      const next = chunks[i + 1];
      const combinedText = curr.text + next.text;

      let shouldMerge = false;

      // Rule 1: If current is extremely short (1-2 chars), merge unless it contains a verb (clause ending/pause marker)
      if (curr.text.length <= 2 && !curr.containsVerb) {
        shouldMerge = true;
      }

      // Rule 2: Short modifiers like adverbs (R), conjunctions (I), prefixes (F), or adnominals (A)
      // should merge into the next chunk if length is reasonable (e.g. 「一際」 + 「輝きを」 -> 「一際輝きを」)
      const originalFirstWord = words.find(wd => wd.text && curr.text.startsWith(wd.text));
      if (originalFirstWord && ["R", "I", "F", "A"].includes(originalFirstWord.pos || "")) {
        if (combinedText.length <= 11) {
          shouldMerge = true;
        }
      }

      // Rule 3: If the next chunk is extremely short and has no main content (e.g., just punctuation or a tiny particle)
      if (next.text.length <= 2 && !next.hasContent) {
        shouldMerge = true;
      }

      // Rule 4: If both chunks are quite short and combined they fit comfortably (<= 7 characters)
      if (curr.text.length <= 4 && next.text.length <= 4 && combinedText.length <= 7) {
        shouldMerge = true;
      }

      if (shouldMerge) {
        curr.text = combinedText;
        curr.endTime = next.endTime;
        curr.wordCount += next.wordCount;
        curr.hasContent = curr.hasContent || next.hasContent;
        curr.containsVerb = curr.containsVerb || next.containsVerb;
        i++; // Consume next chunk
      } else {
        break;
      }
    }

    mergedChunks.push(curr);
    i++;
  }

  return mergedChunks.map(c => ({
    text: c.text,
    startTime: c.startTime,
    endTime: c.endTime
  }));
};

const mapLyricsToRealTimes = (
  songLyrics: any[],
  realWords: { text: string; startTime: number; endTime: number }[],
  songId: string
) => {
  // If the song is "after_curtain", map the exact timings requested by the user
  if (songId === "after_curtain") {
    const mapped: { text: string; isFake: boolean; startTime: number }[] = [];
    
    // Group structures
    // Group 1: 0 to 12s (2 lyrics)
    // Group 2: 28s to 101s (11 lyrics)
    // Group 3: 112s to 139s (4 lyrics)
    // Group 4: 143s to 184s (9 lyrics)
    // Group 5: 190s to 230s (8 lyrics)
    
    const timePoints: number[] = [
      // Group 1 (2 lyrics):
      300, 6000,
      
      // Group 2 (11 lyrics):
      28000, 34636, 41272, 47908, 54544, 61180, 67816, 74452, 81088, 87724, 94360,
      
      // Group 3 (4 lyrics):
      112000, 118750, 125500, 132250,
      
      // Group 4 (9 lyrics):
      143000, 147555, 152110, 156665, 161220, 165775, 170330, 174885, 179440,
      
      // Group 5 (8 lyrics):
      190000, 195000, 200000, 205000, 210000, 215000, 220000, 225000
    ];

    const genericFakes = [
      "ねぎ", "みくみく", "メロディ★", "ちがうよ", "ニセモノ", 
      "ダミー", "★FAKE★", "オトナシ", "コトバノ", "ウソツキ", "ちがうメロディ", "カラフルノイズ"
    ];

    for (let i = 0; i < songLyrics.length; i++) {
      const lyric = songLyrics[i];
      const startTime = i < timePoints.length ? timePoints[i] : (timePoints[timePoints.length - 1] + (i - timePoints.length + 1) * 6000);

      mapped.push({
        text: lyric.text,
        isFake: false,
        startTime: startTime
      });

      // Spawn a fake/distractor word with some probability
      const fakeChance = 0.35;
      if (Math.random() < fakeChance) {
        let fakeText = "";
        if (Math.random() < 0.5 && lyric.text.length >= 2) {
          const chars = lyric.text.split("");
          if (chars.length === 2) {
            fakeText = chars[1] + chars[0];
          } else {
            const idx = Math.floor(Math.random() * (chars.length - 1));
            const temp = chars[idx];
            chars[idx] = chars[idx + 1];
            chars[idx + 1] = temp;
            fakeText = chars.join("").substring(0, 5) + "？";
          }
        } else {
          fakeText = genericFakes[Math.floor(Math.random() * genericFakes.length)];
        }

        mapped.push({
          text: fakeText,
          isFake: true,
          startTime: startTime + 2000
        });
      }
    }

    mapped.sort((a, b) => a.startTime - b.startTime);
    return mapped;
  }

  // If the song is "shutter_chance", map the exact timings requested by the user
  if (songId === "shutter_chance") {
    const mapped: { text: string; isFake: boolean; startTime: number }[] = [];
    const genericFakes = [
      "ねぎ", "みくみく", "メロディ★", "ちがうよ", "ニセモノ", 
      "ダミー", "★FAKE★", "オトナシ", "コトバノ", "ウソツキ", "ちがうメロディ", "カラフルノイズ"
    ];

    for (let i = 0; i < songLyrics.length; i++) {
      const lyric = songLyrics[i];
      let startTime = 0;

      if (i === 0) {
        startTime = 3000;
      } else if (i === 1) {
        startTime = 11000;
      } else if (i >= 2 && i <= 30) {
        startTime = Math.round(20000 + (i - 2) * (99000 / 29));
      } else if (i === 31) {
        startTime = 136000;
      } else {
        startTime = Math.round(145000 + (i - 32) * 4000);
      }

      mapped.push({
        text: lyric.text,
        isFake: false,
        startTime: startTime
      });

      // Spawn a fake/distractor word with some probability
      const fakeChance = 0.35;
      if (Math.random() < fakeChance) {
        let fakeText = "";
        if (Math.random() < 0.5 && lyric.text.length >= 2) {
          const chars = lyric.text.split("");
          if (chars.length === 2) {
            fakeText = chars[1] + chars[0];
          } else {
            const idx = Math.floor(Math.random() * (chars.length - 1));
            const temp = chars[idx];
            chars[idx] = chars[idx + 1];
            chars[idx + 1] = temp;
            fakeText = chars.join("").substring(0, 5) + "？";
          }
        } else {
          fakeText = genericFakes[Math.floor(Math.random() * genericFakes.length)];
        }

        mapped.push({
          text: fakeText,
          isFake: true,
          startTime: startTime + 1800
        });
      }
    }

    mapped.sort((a, b) => a.startTime - b.startTime);
    return mapped;
  }

  // If the song is "band_of_world", map the exact timings requested by the user
  if (songId === "band_of_world") {
    const mapped: { text: string; isFake: boolean; startTime: number }[] = [];
    const genericFakes = [
      "ねぎ", "みくみく", "メロディ★", "ちがうよ", "ニセモノ", 
      "ダミー", "★FAKE★", "オトナシ", "コトバノ", "ウソツキ", "ちがうメロディ", "カラフルノイズ"
    ];

    for (let i = 0; i < songLyrics.length; i++) {
      const lyric = songLyrics[i];
      let startTime = 0;

      if (i >= 0 && i <= 19) {
        // Group 1: 0 to 19 (20 lyrics)
        // 14s to 1m 34s (14,000 to 94,000 ms)
        startTime = Math.round(14000 + i * (80000 / 20));
      } else if (i >= 20 && i <= 25) {
        // Group 2: 20 to 25 (6 lyrics)
        // 1m 34s + 13s interlude = 1m 47s (107,000 ms) to 2m 9s (129,000 ms)
        startTime = Math.round(107000 + (i - 20) * (22000 / 6));
      } else if (i >= 26 && i <= 32) {
        // Group 3: 26 to 32 (7 lyrics)
        // 2m 9s + 26s interlude = 2m 35s (155,000 ms) to 3m 00s (180,000 ms)
        startTime = Math.round(155000 + (i - 26) * (25000 / 7));
      } else if (i >= 33 && i <= 37) {
        // Group 4: 33 to 37 (5 lyrics)
        // 3m 00s + 5s interlude = 3m 5s (185,000 ms) to 3m 32s (212,000 ms)
        startTime = Math.round(185000 + (i - 33) * (27000 / 5));
      } else {
        // Group 5: 38 to 45 (8 lyrics)
        // 3m 32s + 4s interlude = 3m 36s (216,000 ms) to end (e.g., spaced out 4500ms each)
        startTime = Math.round(216000 + (i - 38) * 4500);
      }

      mapped.push({
        text: lyric.text,
        isFake: false,
        startTime: startTime
      });

      // Spawn a fake/distractor word with some probability
      const fakeChance = 0.35;
      if (Math.random() < fakeChance) {
        let fakeText = "";
        if (Math.random() < 0.5 && lyric.text.length >= 2) {
          const chars = lyric.text.split("");
          if (chars.length === 2) {
            fakeText = chars[1] + chars[0];
          } else {
            const idx = Math.floor(Math.random() * (chars.length - 1));
            const temp = chars[idx];
            chars[idx] = chars[idx + 1];
            chars[idx + 1] = temp;
            fakeText = chars.join("").substring(0, 5) + "？";
          }
        } else {
          fakeText = genericFakes[Math.floor(Math.random() * genericFakes.length)];
        }

        mapped.push({
          text: fakeText,
          isFake: true,
          startTime: startTime + 1800
        });
      }
    }

    mapped.sort((a, b) => a.startTime - b.startTime);
    return mapped;
  }

  // If the song is "trichology", map the exact timings requested by the user
  if (songId === "trichology") {
    const mapped: { text: string; isFake: boolean; startTime: number }[] = [];
    const genericFakes = [
      "ねぎ", "みくみく", "メロディ★", "ちがうよ", "ニセモノ", 
      "ダミー", "★FAKE★", "オトナシ", "コトバノ", "ウソツキ", "ちがうメロディ", "カラフルノイズ"
    ];

    for (let i = 0; i < songLyrics.length; i++) {
      const lyric = songLyrics[i];
      let startTime = 0;

      if (i >= 0 && i <= 15) {
        // Group 1: 0 to 15 (16 lyrics)
        // 0 to 1m 00s (300 to 60000 ms)
        startTime = Math.round(300 + i * (59700 / 16));
      } else if (i >= 16 && i <= 31) {
        // Group 2: 16 to 31 (16 lyrics)
        // 1m 00s + 3s interlude = 1m 03s (63000 ms) to 2m 03s (123000 ms)
        startTime = Math.round(63000 + (i - 16) * (60000 / 16));
      } else {
        // Group 3: 32 (1 lyric)
        // 2m 03s + 9s interlude = 2m 12s (132000 ms)
        startTime = 132000;
      }

      mapped.push({
        text: lyric.text,
        isFake: false,
        startTime: startTime
      });

      // Spawn a fake/distractor word with some probability
      const fakeChance = 0.35;
      if (Math.random() < fakeChance) {
        let fakeText = "";
        if (Math.random() < 0.5 && lyric.text.length >= 2) {
          const chars = lyric.text.split("");
          if (chars.length === 2) {
            fakeText = chars[1] + chars[0];
          } else {
            const idx = Math.floor(Math.random() * (chars.length - 1));
            const temp = chars[idx];
            chars[idx] = chars[idx + 1];
            chars[idx + 1] = temp;
            fakeText = chars.join("").substring(0, 5) + "？";
          }
        } else {
          fakeText = genericFakes[Math.floor(Math.random() * genericFakes.length)];
        }

        mapped.push({
          text: fakeText,
          isFake: true,
          startTime: startTime + 1800
        });
      }
    }

    mapped.sort((a, b) => a.startTime - b.startTime);
    return mapped;
  }

  // If the song is "takeover", map the exact timings requested by the user
  if (songId === "takeover") {
    const mapped: { text: string; isFake: boolean; startTime: number }[] = [];
    const genericFakes = [
      "ねぎ", "みくみく", "メロディ★", "ちがうよ", "ニセモノ", 
      "ダミー", "★FAKE★", "オトナシ", "コトバノ", "ウソツキ", "ちがうメロディ", "カラフルノイズ"
    ];

    for (let i = 0; i < songLyrics.length; i++) {
      const lyric = songLyrics[i];
      let startTime = 0;

      if (i >= 0 && i <= 17) {
        // Group 1: 0 to 17 (18 lyrics)
        // 0 to 35s (300 to 35000 ms)
        startTime = Math.round(300 + i * (34700 / 17));
      } else if (i >= 18 && i <= 36) {
        // Group 2: 18 to 36 (19 lyrics)
        // 35s + 11s interlude = 46s (46000 ms) to 1m 28s (88000 ms)
        startTime = Math.round(46000 + (i - 18) * (42000 / 18));
      } else if (i >= 37 && i <= 48) {
        // Group 3: 37 to 48 (12 lyrics)
        // 1m 28s + 1s interlude = 1m 29s (89000 ms) to 1m 51s (111000 ms)
        startTime = Math.round(89000 + (i - 37) * (22000 / 11));
      } else if (i >= 49 && i <= 67) {
        // Group 4: 49 to 67 (19 lyrics)
        // 1m 51s + 11s interlude = 2m 2s (122000 ms) to 2m 45s (165000 ms)
        startTime = Math.round(122000 + (i - 49) * (43000 / 18));
      } else if (i >= 68 && i <= 84) {
        // Group 5: 68 to 84 (17 lyrics)
        // 2m 45s + 1s interlude = 2m 46s (166000 ms) to 3m 19s (199000 ms)
        startTime = Math.round(166000 + (i - 68) * (33000 / 16));
      } else if (i === 85) {
        // Group 6: 85 (1 lyric)
        // 3m 19s + 11s interlude = 3m 30s (210000 ms)
        startTime = 210000;
      } else {
        // Group 7: 86 to 90 (5 lyrics)
        // 3m 30s + 11s interlude = 3m 41s (221000 ms) to end
        startTime = Math.round(221000 + (i - 86) * 4500);
      }

      mapped.push({
        text: lyric.text,
        isFake: false,
        startTime: startTime
      });

      // Spawn a fake/distractor word with some probability
      const fakeChance = 0.35;
      if (Math.random() < fakeChance) {
        let fakeText = "";
        if (Math.random() < 0.5 && lyric.text.length >= 2) {
          const chars = lyric.text.split("");
          if (chars.length === 2) {
            fakeText = chars[1] + chars[0];
          } else {
            const idx = Math.floor(Math.random() * (chars.length - 1));
            const temp = chars[idx];
            chars[idx] = chars[idx + 1];
            chars[idx + 1] = temp;
            fakeText = chars.join("").substring(0, 5) + "？";
          }
        } else {
          fakeText = genericFakes[Math.floor(Math.random() * genericFakes.length)];
        }

        mapped.push({
          text: fakeText,
          isFake: true,
          startTime: startTime + 1800
        });
      }
    }

    mapped.sort((a, b) => a.startTime - b.startTime);
    return mapped;
  }

  if (realWords.length === 0) {
    const mapped: { text: string; isFake: boolean; startTime: number }[] = [];
    const bpm = 120;
    const beatDurationMs = (60 / bpm) * 1000;
    let currentTime = 10000; // start after 10s intro
    // Loop multiple times to cover the full duration of a song in fallback mode
    for (let loop = 0; loop < 6; loop++) {
      for (let i = 0; i < songLyrics.length; i++) {
        const lyric = songLyrics[i];
        mapped.push({
          text: lyric.text,
          isFake: lyric.isFake || false,
          startTime: currentTime
        });
        currentTime += beatDurationMs * 3.5;
      }
    }
    mapped.sort((a, b) => a.startTime - b.startTime);
    return mapped;
  }

  const mapped: { text: string; isFake: boolean; startTime: number }[] = [];
  const explicitFakes = songLyrics.filter(l => l.isFake).map(l => l.text);
  const genericFakes = [
    "ねぎ", "みくみく", "メロディ★", "ちがうよ", "ニセモノ", 
    "ダミー", "★FAKE★", "オトナシ", "コトバノ", "ウソツキ", "ちがうメロディ", "カラフルノイズ"
  ];

  for (let i = 0; i < realWords.length; i++) {
    const word = realWords[i];
    
    // Add the real word
    mapped.push({
      text: word.text,
      isFake: false,
      startTime: word.startTime
    });

    // Spawn a fake/distractor word with some probability
    const fakeChance = 0.35;
    if (Math.random() < fakeChance) {
      let fakeText = "";
      if (explicitFakes.length > 0) {
        fakeText = explicitFakes[Math.floor(Math.random() * explicitFakes.length)];
      } else {
        if (Math.random() < 0.5 && word.text.length >= 2) {
          // Scramble/modify the real word text slightly to create a fun distraction
          const chars = word.text.split("");
          if (chars.length === 2) {
            fakeText = chars[1] + chars[0];
          } else {
            const idx = Math.floor(Math.random() * (chars.length - 1));
            const temp = chars[idx];
            chars[idx] = chars[idx + 1];
            chars[idx + 1] = temp;
            fakeText = chars.join("") + "？";
          }
        } else {
          fakeText = genericFakes[Math.floor(Math.random() * genericFakes.length)];
        }
      }

      // Schedule the fake in the middle of this word and the next one
      const nextWord = realWords[i + 1];
      const fakeTime = nextWord 
        ? Math.round((word.startTime + nextWord.startTime) / 2)
        : word.startTime + 1000;

      mapped.push({
        text: fakeText,
        isFake: true,
        startTime: fakeTime
      });
    }
  }

  // Sort chronologically so they spawn in correct timing sequence
  mapped.sort((a, b) => a.startTime - b.startTime);
  return mapped;
};

export const GamePlayScreen: React.FC<GamePlayScreenProps> = ({
  song,
  onQuit,
  onFinishStage,
  onBackToTitle
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Score & Metrics
  const [score, setScore] = useState(0);
  const [captured, setCaptured] = useState<CapturedLyric[]>([]);
  const [totalRealLyrics, setTotalRealLyrics] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentBpm, setCurrentBpm] = useState(song.bpm);

  // HP & Damage System States
  const [hp, setHp] = useState(100);
  const [isMikuDamaged, setIsMikuDamaged] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  // Syncing and Loading States
  const [isSongLoaded, setIsSongLoaded] = useState(false);
  const [hasStartedConcert, setHasStartedConcert] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Helper to check for chorus/special lyrics (deals -20 instead of -10)
  const isSpecialLyric = (text: string) => {
    return text.length >= 6 || text.includes("★") || text.includes("！") || text.includes("!") || text.includes("♥");
  };

  // Refs to prevent stale closures during the concert timer
  const scoreRef = useRef(0);
  const capturedRef = useRef<CapturedLyric[]>([]);

  // Sync state to refs for use in stale-closure environments
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    capturedRef.current = captured;
  }, [captured]);

  // Interactive flash state (for Shutter Chance)
  const [cameraFlash, setCameraFlash] = useState(false);
  // Glitch flash state (for Trichology)
  const [glitchActive, setGlitchActive] = useState(false);

  // Flying lyrics collection
  const [flyingLyrics, setFlyingLyrics] = useState<FlyingLyric[]>([]);
  // Tracking mouse trail coordinates
  const storedTrace = useRef<MousePoint[]>([]);
  const liveMousePos = useRef({ x: 200, y: 200 });
  // Scroll distance for Miku walking forward
  const scrollX = useRef(0);

  // Game clock setup
  const timeElapsed = useRef(0);
  const [totalDuration, setTotalDuration] = useState(180000); // Dynamic song duration (defaults to 180s)
  const totalDurationRef = useRef(180000);
  const spawnTimer = useRef<any>(null);
  const lyricPoolPointer = useRef(0);
  const lastFallbackSpawnTime = useRef<number>(0);
  const mappedLyricsRef = useRef<{ text: string; isFake: boolean; startTime: number }[] | null>(null);
  const mappedLyricIndex = useRef(0);

  // Sync isGameOver state to ref to avoid stale closures in browser tick intervals
  const isGameOverRef = useRef(false);
  useEffect(() => {
    isGameOverRef.current = isGameOver;
  }, [isGameOver]);

  // Synchronize TextAlive player ready state with safety fallback
  useEffect(() => {
    setIsSongLoaded(false);
    setHasStartedConcert(false);
    setCountdown(null);

    const fallbackTimer = setTimeout(() => {
      console.log("[GamePlayScreen] Fallback ready triggered: Song loading took too long.");
      setIsSongLoaded(true);
    }, 3200);

    const unsubscribe = registerTimerReadyCallback(() => {
      console.log("[GamePlayScreen] TextAlive Player loaded and ready.");
      setIsSongLoaded(true);
      clearTimeout(fallbackTimer);
    });

    return () => {
      unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, [song]);

  // Handle countdown interval decrement
  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setCountdown(null);
        setHasStartedConcert(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Map hardcoded lyrics to actual TextAlive player vocal timings once the song finishes loading
  useEffect(() => {
    if (!isSongLoaded) return;

    const realWords: { text: string; startTime: number; endTime: number }[] = [];
    if (player && player.video) {
      let p = player.video.firstPhrase;
      while (p) {
        const phraseWords: WordInfo[] = [];
        // Extract words of this phrase
        if (p.children && p.children.length > 0) {
          for (const child of p.children) {
            if (child && child.text && child.text.trim()) {
              phraseWords.push({
                text: child.text.trim(),
                pos: child.pos || "X",
                startTime: child.startTime || 0,
                endTime: child.endTime || 0
              });
            }
          }
        } else {
          let w = p.firstWord;
          while (w) {
            if (w.text && w.text.trim()) {
              phraseWords.push({
                text: w.text.trim(),
                pos: w.pos || "X",
                startTime: w.startTime || 0,
                endTime: w.endTime || 0
              });
            }
            if (w === p.lastWord) break;
            w = w.next;
          }
        }

        // Segment the phrase's words into natural chunks
        const chunks = chunkPhraseWords(phraseWords);
        realWords.push(...chunks);

        p = p.next;
      }
    }

    console.log(`[GamePlayScreen] Extracted ${realWords.length} custom-chunked phrase segments from TextAlive for "${song.title}"`);
    const mapped = mapLyricsToRealTimes(song.lyrics, realWords, song.id);
    mappedLyricsRef.current = mapped;
    mappedLyricIndex.current = 0;

    if (mapped) {
      const realCount = mapped.filter(l => !l.isFake).length;
      setTotalRealLyrics(realCount);
      console.log(`[GamePlayScreen] Set total real lyrics count: ${realCount}`);
    } else {
      setTotalRealLyrics(song.lyrics.filter(l => !l.isFake).length);
    }

    let songDuration = 180000; // default 3 minutes (180000 ms)
    if (player && player.video && typeof player.video.duration === "number" && player.video.duration > 0) {
      songDuration = player.video.duration;
    } else if (player && typeof (player as any).duration === "number" && (player as any).duration > 0) {
      songDuration = (player as any).duration;
    }
    console.log(`[GamePlayScreen] Dynamic song duration updated: ${songDuration} ms`);
    setTotalDuration(songDuration);
    totalDurationRef.current = songDuration;
  }, [isSongLoaded, song]);

  // Start concert audio directly
  const handleStartConcert = () => {
    GlobalAudio.init();
    GlobalAudio.resume();
    GlobalAudio.startSong(song.id, song.bpm);
    playSongInPlayer();
    setCountdown(null);
    setHasStartedConcert(true);
  };

  // Automatically start concert once song has loaded successfully
  useEffect(() => {
    if (isSongLoaded && !hasStartedConcert) {
      handleStartConcert();
    }
  }, [isSongLoaded, hasStartedConcert]);

  // Run gameplay timers and spawner once the concert has officially started
  useEffect(() => {
    if (!hasStartedConcert) return;

    // Setup track progress bar
    const startTimestamp = Date.now();
    let lastPosition = -1;
    let stuckCount = 0;

    const progressTimer = setInterval(() => {
      if (isGameOverRef.current) return;

      let elapsed = Date.now() - startTimestamp;
      if (player && player.timer && typeof player.timer.position === "number") {
        // Synchronize with TextAlive frame position
        const currentPos = player.timer.position;
        elapsed = currentPos;

        // Check if stuck during active playback (excluding the very start/end buffers)
        if (currentPos === lastPosition && currentPos > 0 && currentPos < totalDurationRef.current - 1000) {
          stuckCount++;
          // If stuck for 15 ticks (1.5 seconds) while gameplay is active, request play again to recover!
          if (stuckCount >= 15) {
            console.log("[GamePlayScreen] Detected stuck playback position. Requesting play recovery...");
            try {
              player.requestPlay();
            } catch (_) {}
            stuckCount = 0;
          }
        } else {
          stuckCount = 0;
        }
        lastPosition = currentPos;
      }
      
      timeElapsed.current = elapsed;
      const progress = Math.min((elapsed / totalDurationRef.current) * 100, 100);
      setProgressPercent(progress);

      const isPlaybackFinished = elapsed >= totalDurationRef.current - 1500 || 
        (player && !player.isPlaying && elapsed >= totalDurationRef.current - 5000);

      if (isPlaybackFinished) {
        clearInterval(progressTimer);
        handleEndStage();
      }
    }, 100);

    // Dynamic Lyrics Spawner loop
    const spawnerCleanup = startSpawner();

    return () => {
      clearInterval(progressTimer);
      if (spawnTimer.current) clearInterval(spawnTimer.current);
      if (spawnerCleanup) spawnerCleanup();
    };
  }, [hasStartedConcert]);

  // Clean up all audio/video instances when leaving gameplay screen
  useEffect(() => {
    return () => {
      GlobalAudio.stopSong();
      stopSongInPlayer();
    };
  }, []);

  // Track coordinates and canvas repaint
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Scroll speed is proportional to BPM
    const scrollSpeed = (song.bpm / 120) * 1.5;

    // Fluid responsive canvas sizing
    const handleResize = () => {
      if (containerRef.current && canvas) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    // Particle Splatters representing colors or stars
    interface SplatParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      life: number;
      maxLife: number;
      size: number;
    }
    let particles: SplatParticle[] = [];

    // Animation Loop inside canvas
    let animationFrameId: number;

    const render = () => {
      // Advance scroll offset as long as the level is active and not game over
      if (timeElapsed.current < totalDurationRef.current && !isGameOverRef.current) {
        scrollX.current += scrollSpeed;
      }

      // Background clears according to song presets
      // Linger (アフター・ザ・カーテン): slow fades to represent extremely long-lasting beautiful traces!
      const fadeCoefficient = song.id === "after_curtain" ? 0.012 : 0.08;
      ctx.fillStyle = `rgba(3, 7, 18, ${fadeCoefficient})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // --- Draw Scrolling Background (Grid lines & Moving Cyber Starfield) ---
      ctx.strokeStyle = "rgba(56, 189, 248, 0.07)";
      ctx.lineWidth = 1;
      const gridSize = 80;
      const bgOffsetX = -(scrollX.current % gridSize);
      
      // Vertical grid lines scrolling right-to-left
      for (let x = bgOffsetX; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      
      // Horizontal grid lines
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Scrolling space dust stars
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      const starCount = 30;
      for (let i = 0; i < starCount; i++) {
        const starX = ((i * 12347 + 500) - scrollX.current * (0.4 + (i % 3) * 0.2)) % (canvas.width + 100);
        const starY = (i * 9871 + 100) % canvas.height;
        const finalX = starX < 0 ? starX + canvas.width + 100 : starX;
        ctx.fillRect(finalX, starY, (i % 2) + 1, (i % 2) + 1);
      }

      // --- 1. Paint Mouse Coordinate Footprints ---
      const trace = storedTrace.current;
      if (trace.length > 1) {
        ctx.beginPath();
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        // TAKEOVER (エネルギー): Lightning-style spiky spattered traces
        if (song.id === "takeover") {
          ctx.strokeStyle = "rgba(234, 179, 8, 0.7)"; // lightning yellow
          ctx.lineWidth = 3.5;
          // Jagged deviation drawer
          for (let i = Math.max(1, trace.length - 25); i < trace.length; i++) {
            const p1 = trace[i - 1];
            const p2 = trace[i];
            const p1X = p1.x - scrollX.current;
            const p2X = p2.x - scrollX.current;
            const midX = (p1X + p2X) / 2;
            const midY = (p1.y + p2.y) / 2;
            const jagX = midX + (Math.random() * 12 - 6);
            const jagY = midY + (Math.random() * 12 - 6);
            ctx.beginPath();
            ctx.moveTo(p1X, p1.y);
            ctx.lineTo(jagX, jagY);
            ctx.lineTo(p2X, p2.y);
            ctx.stroke();
          }
        }
        // 世界最後の音楽隊 (Cosmic): Star-connecting lines
        else if (song.id === "band_of_world") {
          ctx.strokeStyle = "rgba(6, 182, 212, 0.5)"; // deep cyan starry connections
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 6]);
          ctx.beginPath();
          const startIdx = Math.max(0, trace.length - 40);
          ctx.moveTo(trace[startIdx].x - scrollX.current, trace[startIdx].y);
          for (let i = startIdx + 1; i < trace.length; i++) {
            ctx.lineTo(trace[i].x - scrollX.current, trace[i].y);
          }
          ctx.stroke();
          ctx.setLineDash([]); // reset
        }
        // General smooth glowing curve
        else {
          ctx.strokeStyle = song.primaryColor;
          ctx.lineWidth = 5;
          ctx.shadowColor = song.secondaryColor;
          ctx.shadowBlur = 10;

          const startIdx = Math.max(0, trace.length - 35);
          ctx.beginPath();
          ctx.moveTo(trace[startIdx].x - scrollX.current, trace[startIdx].y);
          for (let i = startIdx + 1; i < trace.length; i++) {
            ctx.lineTo(trace[i].x - scrollX.current, trace[i].y);
          }
          ctx.stroke();
          ctx.shadowBlur = 0; // reset
        }
      }

      // --- 2. Live Particles Splatter System ---
      // Update and Draw
      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;
        const radius = Math.max(0, p.size * (p.life / p.maxLife));
        if (radius > 0) {
          ctx.beginPath();
          ctx.arc(p.x - scrollX.current, p.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 4;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
      particles = particles.filter(p => p.life > 0);

      // Expose emitter to window scope to allow lyric capture to inject particles dynamically!
      (window as any).triggerSplatter = (cx: number, cy: number, color: string, isBig = false) => {
        const count = isBig ? 24 : 10;
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const mag = Math.random() * (isBig ? 6 : 3) + 1;
          particles.push({
            // Save in scrolling world-space to let particles drift with ground assets
            x: cx + scrollX.current,
            y: cy,
            vx: Math.cos(angle) * mag,
            vy: Math.sin(angle) * mag,
            color: color,
            life: Math.random() * 30 + 15,
            maxLife: 45,
            size: Math.random() * (isBig ? 6 : 3) + 1.5
          });
        }
      };

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [song]);

  // Damage side-effects trigger
  const triggerDamage = (amt: number) => {
    setHp(prev => {
      if (prev <= 0) return 0;
      const nextHp = Math.max(0, prev - amt);
      if (nextHp <= 0) {
        setIsGameOver(true);
        GlobalAudio.stopSong();
        stopSongInPlayer();
      }
      return nextHp;
    });

    // Play synthesized thud damage sound
    GlobalAudio.playDamage();

    // Trigger Miku vector red flash
    setIsMikuDamaged(true);
    setTimeout(() => {
      setIsMikuDamaged(false);
    }, 500);
  };

  // Spawns flying text bubbles depending on active beats
  const startSpawner = () => {
    // 1. Calculate dynamic leadTime based on screen width & BPM speed
    const containerVal = containerRef.current;
    const cwVal = containerVal?.clientWidth || 800;
    const padPercent = cwVal < 640 ? 0.10 : cwVal < 768 ? 0.14 : 0.18;
    const mikuCenterX = cwVal * padPercent + 180;
    const travelDistance = (cwVal + 80) - mikuCenterX; // travel distance in pixels
    
    const baseSpeed = (song.bpm / 120) * 3.8;
    const absoluteSpeed = song.id === "takeover" ? baseSpeed * 1.3 : song.id === "after_curtain" ? baseSpeed * 0.75 : baseSpeed;
    const speedInPixelsPerSec = absoluteSpeed * 60; // 60fps tick rate
    
    // Lead time is travel time plus a small safety margin of 200ms
    const leadTime = Math.round((travelDistance / speedInPixelsPerSec) * 1000) + 200;
    console.log(`[GamePlayScreen] Spawner initialized. Speed: ${absoluteSpeed}px/frame, LeadTime: ${leadTime}ms, Distance: ${travelDistance}px`);

    spawnTimer.current = setInterval(() => {
      if (isGameOverRef.current) return;

      const container = containerRef.current;
      if (!container) return;

      const cw = container.clientWidth || 600;
      const ch = container.clientHeight || 500;
      const currentElapsed = timeElapsed.current;

      // Select lyric to spawn
      let lyricToSpawn: { text: string; isFake: boolean } | null = null;

      if (mappedLyricsRef.current && mappedLyricsRef.current.length > 0) {
        // --- LAYER 1: TEXTALIVE SYNCHRONIZED TIMELINE ---
        const index = mappedLyricIndex.current;
        if (index < mappedLyricsRef.current.length) {
          const nextLyric = mappedLyricsRef.current[index];
          // Spawn when current time crosses the calculated spawn window
          if (currentElapsed >= nextLyric.startTime - leadTime) {
            lyricToSpawn = nextLyric;
            mappedLyricIndex.current++;
          }
        }
      } else {
        // --- LAYER 2: BPM-BASED FALLBACK INTERVAL ---
        const introDelay = getIntroDelay(song.id);
        if (currentElapsed < introDelay) return;

        // Determine fallback interval rate
        const beatDurationMs = (60 / song.bpm) * 1000;
        let beatsPerLyric = 3;
        if (song.id === "takeover") {
          beatsPerLyric = 2;
        } else if (song.id === "after_curtain") {
          beatsPerLyric = 4;
        }
        const intervalMs = Math.round(beatDurationMs * beatsPerLyric);

        // Track last fallback spawn time
        if (lastFallbackSpawnTime.current === 0) {
          lastFallbackSpawnTime.current = currentElapsed;
        }

        if (currentElapsed - lastFallbackSpawnTime.current >= intervalMs) {
          const lyricItem = song.lyrics[lyricPoolPointer.current % song.lyrics.length];
          lyricPoolPointer.current += 1;
          lyricToSpawn = {
            text: lyricItem.text,
            isFake: lyricItem.isFake || false
          };
          lastFallbackSpawnTime.current = currentElapsed;
        }
      }

      if (lyricToSpawn) {
        // Spawns from the right edge, slightly off-screen
        const sx = cw + 80;
        // Stagger vertically within safe bounds
        const sy = 100 + Math.random() * (ch - 200);

        // Velocity vectors flow right-to-left
        const vx = -absoluteSpeed;
        const vy = 0;

        const newBubble: FlyingLyric = {
          id: "bubble_" + Date.now() + "_" + Math.random().toString(36).slice(2, 5),
          text: lyricToSpawn.text,
          isFake: lyricToSpawn.isFake,
          x: sx,
          y: sy,
          vx,
          vy,
          size: lyricToSpawn.text.length * 11 + 24, // responsive bubble box
          isCaptured: false,
          isMissed: false,
          glowColor: lyricToSpawn.isFake ? "rgba(244, 63, 94, 0.7)" : song.primaryColor
        };

        setFlyingLyrics(prev => [...prev, newBubble]);
      }
    }, 50); // High-frequency check for frame-accurate timing

    // Floating text kinetics update ticker (60fps)
    const updatePhysicsTimer = setInterval(() => {
      const container = containerRef.current;
      if (!container) return;

      setFlyingLyrics(prev => {
        if (prev.length === 0) return prev;

        let capturedBubble: FlyingLyric | null = null;
        let damageToTake = 0;
        let hitBubbleX = 0;
        let hitBubbleY = 0;

        const updated = prev.map(bubble => {
          if (bubble.isCaptured || bubble.isMissed) return bubble;

          // Freeze position updates on Game Over
          if (isGameOverRef.current) return bubble;

          // Push position along velocity vector
          const nextX = bubble.x + bubble.vx;
          const nextY = bubble.y + bubble.vy;

          // 1. Capsule check collision for cursor tracing
          const halfW = bubble.size / 2;
          const dx = Math.abs(nextX - liveMousePos.current.x);
          const dy = Math.abs(nextY - liveMousePos.current.y);
          const isColliding = dx < halfW + 14 && dy < 18;

          if (isColliding && !bubble.isCaptured && !capturedBubble) {
            capturedBubble = { ...bubble, x: nextX, y: nextY, isCaptured: true };
            return capturedBubble;
          }

          // 2. Check protective shield around Hatsune Miku
          const cwVal = container.clientWidth || 600;
          const chVal = container.clientHeight || 500;
          const padPercent = cwVal < 640 ? 0.10 : cwVal < 768 ? 0.14 : 0.18;
          const mikuCenterX = cwVal * padPercent + 180;
          const mikuCenterY = chVal / 2;
          const shieldRadius = 150; // centered radius 150px

          const distToMiku = Math.hypot(nextX - mikuCenterX, nextY - mikuCenterY);

          if (distToMiku <= shieldRadius && !bubble.isCaptured) {
            if (!bubble.isFake) {
              damageToTake = isSpecialLyric(bubble.text) ? 20 : 10;
              hitBubbleX = nextX;
              hitBubbleY = nextY;
            }
            // Dissolve bubble on impact with shield
            return { ...bubble, isMissed: true, x: nextX, y: nextY };
          }

          // 3. Fallback screen boundary miss
          if (nextX < -bubble.size - 25) {
            return { ...bubble, isMissed: true, x: nextX, y: nextY };
          }

          return { ...bubble, x: nextX, y: nextY };
        }).filter(b => !b.isMissed);

        // Apply hit damage sideeffects
        if (damageToTake > 0) {
          setTimeout(() => {
            triggerDamage(damageToTake);
            if ((window as any).triggerSplatter) {
              (window as any).triggerSplatter(hitBubbleX, hitBubbleY, "rgba(239, 68, 68, 0.95)", true);
            }
          }, 0);
        }

        if (capturedBubble) {
          const bubbleToCapture = capturedBubble;
          setTimeout(() => {
            handleCaptureLyric(bubbleToCapture);
          }, 0);
        }

        return updated;
      });
    }, 16);

    return () => clearInterval(updatePhysicsTimer);
  };

  // Triggers when cursor crosses a floating bubble
  const handleCaptureLyric = (bubble: FlyingLyric) => {
    // 1. Play thematic SFX
    GlobalAudio.playHit(song.theme, bubble.isFake);

    // 2. Generate physics splatters on canvas
    if ((window as any).triggerSplatter) {
      const paintColor = bubble.isFake ? "rgba(244, 63, 94, 0.9)" : song.primaryColor;
      (window as any).triggerSplatter(bubble.x, bubble.y, paintColor, true);
    }

    // 3. Handle Trichology Duplicity Penalty
    if (bubble.isFake) {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 350);
      setScore(prev => Math.max(0, prev - 150)); // deduct score for fakes
      return;
    }

    // 4. Handle Snapshot Flash for Shutter Chance
    if (song.id === "shutter_chance") {
      setCameraFlash(true);
      setTimeout(() => setCameraFlash(false), 200);
    }

    // 5. Update game stats
    setScore(prev => prev + 300);

    // 6. Map Captured Syllables to Miku's Wardrobe using functional state update to prevent stale index closures
    setCaptured(prev => {
      const bodyParts = ["ribbon", "headset", "sleeves", "skirt", "boots"];
      const partAssigned = bodyParts[prev.length % bodyParts.length];

      const capturedItem: CapturedLyric = {
        text: bubble.text,
        timestamp: timeElapsed.current,
        x: bubble.x + scrollX.current, // stored in scrolling world coordinate space
        y: bubble.y,
        partAssigned,
        color: song.primaryColor,
        scrollOffset: scrollX.current
      };

      return [...prev, capturedItem];
    });
  };

  // Handle Mouse movement traces inside sandbox
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    liveMousePos.current = { x, y };

    const point: MousePoint = {
      x: x + scrollX.current, // store in scrolling world space coordinates
      y,
      time: timeElapsed.current,
      scrollOffset: scrollX.current
    };

    storedTrace.current.push(point);
  };

  // Touch triggers support for mobile players
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current || e.touches.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    liveMousePos.current = { x, y };

    const point: MousePoint = {
      x: x + scrollX.current, // store in scrolling world space coordinates
      y,
      time: timeElapsed.current,
      scrollOffset: scrollX.current
    };

    storedTrace.current.push(point);
  };

  // Helper to determine clothing assembly descriptive labels on Game Over
  const getOutfitStatus = (count: number) => {
    if (count === 0) return "衣装未完成 (No accessories)";
    if (count < 5) return "リボン・ヘッドセットのみ完成 (Ribbons & Headsets only)";
    if (count < 10) return "衣装パーツ一部完成 (Partial costume threads)";
    if (count < 15) return "衣装パネルほぼ完成 (Almost finished)";
    return "フルセット完成！ (Full Concert Ensemble!)";
  };

  // Restarts the stage from scratch, resetting score, hp, timers, and music loops
  const handleRetry = () => {
    // 1. Reset metrics & states
    setScore(0);
    setCaptured([]);
    setProgressPercent(0);
    setHp(100);
    setIsMikuDamaged(false);
    setIsGameOver(false);
    setFlyingLyrics([]);
    setHasStartedConcert(false);

    // 2. Clear out elapsed timers & world coords
    timeElapsed.current = 0;
    scrollX.current = 0;
    lyricPoolPointer.current = 0;
    storedTrace.current = [];
    lastFallbackSpawnTime.current = 0;
    mappedLyricIndex.current = 0;

    // 3. Re-initialize and trigger the audio song with user-gesture starting flow
    GlobalAudio.stopSong();
    stopSongInPlayer();
    handleStartConcert();
  };

  // Compile final trace and trigger results
  const handleEndStage = () => {
    GlobalAudio.stopSong();
    stopSongInPlayer();
    onFinishStage({
      capturedLyrics: capturedRef.current,
      mouseTrace: storedTrace.current,
      score: scoreRef.current
    });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      className={`relative w-full h-full min-h-[580px] bg-[#030712] overflow-hidden select-none cursor-crosshair flex flex-col justify-between ${
        glitchActive ? "animate-[shake_0.15s_infinite] border-2 border-red-500/80" : ""
      }`}
    >
      {/* 1. HTML5 Canvas Paint Layer */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />

      {/* Camera Flasher Cover */}
      <AnimatePresence>
        {cameraFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white z-50 pointer-events-none mix-blend-difference"
          />
        )}
      </AnimatePresence>

      {/* Cyber/Glitch Static Noise indicator on Fake caught */}
      <AnimatePresence>
        {glitchActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-red-600/20 z-40 pointer-events-none flex items-center justify-center font-mono font-bold text-red-400 text-3xl italic tracking-wider shadow-[inset_0_0_80px_rgba(239,68,68,0.5)]"
          >
            ! GLITCH / FALSE LYRIC !
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Top-bar Dashboard */}
      <div className="relative z-20 flex items-center justify-between p-4 bg-slate-950/60 border-b border-slate-900 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onQuit}
            className="text-[10px] uppercase font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 px-2.5 py-1.5 rounded transition-all cursor-pointer"
          >
            QUIT LIVE
          </button>
          <div className="text-left font-sans leading-none">
            <span className="text-xs font-bold text-slate-250 block">{song.title}</span>
            <span className="text-[10px] text-slate-500 font-mono">by {song.artist}</span>
          </div>
        </div>

        {/* Central HP Health HUD system */}
        <div className="flex-1 max-w-xs mx-6 font-mono flex flex-col items-center">
          <div className="flex items-center space-x-1 mb-1">
            {[1, 2, 3, 4, 5].map((idx) => {
              const currentThreshold = idx * 20;
              const hasHeart = hp >= currentThreshold;
              const isHalf = !hasHeart && hp >= currentThreshold - 10;
              return (
                <span
                  key={idx}
                  className={`text-xs transition-transform duration-300 ${
                    hasHeart 
                      ? "text-rose-500 scale-110 drop-shadow-[0_0_5px_rgba(244,63,94,0.7)]" 
                      : isHalf
                        ? "text-rose-400 opacity-80"
                        : "text-slate-800 opacity-30"
                  }`}
                >
                  ❤️
                </span>
              );
            })}
            <span className={`text-[10px] font-bold ml-1.5 tracking-wider ${
              hp <= 20 
                ? "text-red-400 animate-pulse" 
                : hp <= 50 
                  ? "text-amber-400" 
                  : "text-slate-300"
            }`}>
              HP: {hp} / 100
            </span>
          </div>
          {/* Custom responsive health bar */}
          <div className="w-full h-2 bg-slate-950 border border-slate-800/85 rounded-full overflow-hidden p-[1px]">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                hp <= 20
                  ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)] animate-pulse"
                  : hp <= 50
                    ? "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]"
                    : "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
              }`}
              style={{ width: `${hp}%` }}
            />
          </div>
        </div>

        {/* Real-time score meter */}
        <div className="text-right font-mono">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Total Artwork Score</div>
          <div className="text-xl font-bold text-cyan-400 [text-shadow:_0_0_6px_rgba(34,211,238,0.4)]">
            {score.toLocaleString()} PTS
          </div>
        </div>

        {/* Target collected count */}
        <div className="text-right leading-none hidden sm:block">
          <div className="text-[9px] text-slate-500 font-mono uppercase tracking-widest font-bold">Captured Lyrics</div>
          <div className="mt-1 font-semibold text-white text-sm flex items-center justify-end space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-spin" />
            <span>
              {captured.length} / {totalRealLyrics || song.lyrics.filter(l => !l.isFake).length}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Empty Layout spacer for vertical layout distribution */}
      <div className="relative flex-grow w-full pointer-events-none" />

      {/* POSITIONED VECTOR HATSUNE MIKU (Placed slightly to the left) */}
      <div className="absolute inset-y-0 left-0 w-full flex items-center justify-start pointer-events-none z-10 overflow-hidden pl-[10%] sm:pl-[14%] md:pl-[18%]">
        <div className="w-[360px] h-[360px] flex items-center justify-center pointer-events-none relative">
          {/* Concentric Protection Shield Circle */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none animate-[spin_45s_linear_infinite] z-20">
            <circle
              cx="180"
              cy="180"
              r="150"
              fill={hp <= 20 ? "rgba(239, 68, 68, 0.03)" : "rgba(34, 211, 238, 0.03)"}
              stroke={hp <= 20 ? "rgba(239, 68, 68, 0.85)" : hp <= 50 ? "rgba(234, 179, 8, 0.7)" : "rgba(34, 211, 238, 0.65)"}
              strokeWidth="3.5"
              strokeDasharray="8 12"
              className={`transition-all duration-300 ${hp <= 20 ? "animate-pulse" : ""}`}
              style={{
                filter: hp <= 20 
                  ? "drop-shadow(0 0 12px rgba(239, 68, 68, 0.8))" 
                  : hp <= 50 
                    ? "drop-shadow(0 0 8px rgba(234, 179, 8, 0.5))"
                    : "drop-shadow(0 0 6px rgba(34, 211, 238, 0.4))"
              }}
            />
            {/* Outer dotted shield border */}
            <circle
              cx="180"
              cy="180"
              r="154"
              fill="none"
              stroke={hp <= 20 ? "rgba(239, 68, 68, 0.5)" : hp <= 50 ? "rgba(234, 179, 8, 0.35)" : "rgba(34, 211, 238, 0.3)"}
              strokeWidth="1.5"
              strokeDasharray="3 6"
            />
          </svg>

          <MikuRenderer
            capturedLyrics={captured}
            theme={song.theme}
            isWalking={!isGameOver && progressPercent < 100}
            isDancing={!isGameOver && progressPercent >= 100 && captured.length > 0}
            bpm={song.bpm}
            hp={hp}
            isDamaged={isMikuDamaged}
          />
        </div>
      </div>

      {/* 4. Full-screen Floating Lyrics and Prompts Overlays (Pixel-synchronized with container coordinates) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-hidden">
        {/* Floating lyric bubbles */}
        {flyingLyrics.map(bubble => {
          if (bubble.isCaptured) return null;
          return (
            <div
              key={bubble.id}
              className="absolute pointer-events-auto transition-transform duration-75 select-none"
              style={{
                left: bubble.x - bubble.size / 2,
                top: bubble.y - 20,
                width: bubble.size,
                transform: `scale(${bubble.isCaptured ? 0 : 1})`
              }}
            >
              {/* Bubble body */}
              <div
                className={`px-3.5 py-2 font-semibold text-center select-none text-xs rounded-full border shadow-xl backdrop-blur-md cursor-pointer transition-all ${
                  bubble.isFake
                    ? "bg-slate-900/90 border-rose-500/80 text-rose-300 shadow-rose-950/40"
                    : "bg-slate-950/80 border-cyan-400/80 text-cyan-200 shadow-cyan-950/40"
                }`}
                style={{
                  boxShadow: `0 0 15px ${bubble.glowColor}`
                }}
              >
                {bubble.text}

                {/* Glitch subindicator if Fake */}
                {bubble.isFake && (
                  <span className="block text-[8px] font-mono tracking-widest mt-0.5 uppercase opacity-60">
                    Falsehood
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Instructional floating prompt when concert starts empty */}
        {captured.length === 0 && (
          <div className="absolute inset-x-0 bottom-[110px] flex justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="bg-slate-900/90 border border-cyan-500/30 text-cyan-300 text-[11px] px-4 py-2.5 rounded-xl font-sans text-center max-w-xs leading-relaxed shadow-lg flex items-center space-x-2 backdrop-blur pointer-events-auto"
            >
              <HelpCircle className="w-4 h-4 text-cyan-400 flex-shrink-0 animate-bounce" />
              <span>右側の前方からミクへ流れてくる歌詞にカーソルを合わせ、衣装を紡ぎましょう！</span>
            </motion.div>
          </div>
        )}
      </div>

      {/* 4. Bottom Concert State Controls */}
      <div className="relative z-20 p-4 bg-slate-950/60 border-t border-slate-900 backdrop-blur-md flex flex-col space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          <span>PROGRESS</span>
          <span>
            {Math.floor(timeElapsed.current / 1000)}s / {Math.floor(totalDuration / 1000)}s
          </span>
        </div>

        {/* Glowing Progress bar */}
        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 rounded-full transition-all duration-100 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
          <span className="flex items-center space-x-1">
            <Volume2 className="w-3 h-3 text-cyan-400" />
            <span>BACKING BEAT ACTIVE ({currentBpm} BPM)</span>
          </span>
          <span className="text-right">
            COLOR TRACE ACTIVE LIVE CONCERT
          </span>
        </div>
      </div>

      {/* 5. Game Over Full-screen Overlay */}
      <AnimatePresence>
        {isGameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
          >
            <motion.div
              initial={{ scale: 0.92, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 border-2 border-red-500/50 rounded-2xl p-8 max-w-sm w-full shadow-2xl shadow-red-950/40 space-y-6 relative overflow-hidden pointer-events-auto"
            >
              {/* Scanline tech filter texture overlay */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.3)_50%)] bg-[size:100%_4px]" />

              <div className="space-y-1">
                <ShieldAlert className="w-10 h-10 text-red-500 mx-auto animate-bounce mt-1" />
                <h2 className="text-2xl font-black text-red-500 tracking-wider font-sans uppercase [text-shadow:_0_0_10px_rgba(239,68,68,0.5)]">
                  GAME OVER
                </h2>
                <p className="text-[10px] text-slate-400 font-mono">
                  Miku took too much lyric impact damage!
                </p>
              </div>

              {/* Statistics Panel */}
              <div className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-4 text-left space-y-2.5 font-mono">
                <div className="flex justify-between items-center text-xs border-b border-slate-900/80 pb-1.5">
                  <span className="text-slate-500 uppercase tracking-tight">Captured Lyrics</span>
                  <span className="text-cyan-400 font-bold">{captured.length} lines</span>
                </div>
                
                <div className="flex justify-between items-center text-xs border-b border-slate-900/80 pb-1.5">
                  <span className="text-slate-500 uppercase tracking-tight">Costume Status</span>
                  <span className="text-emerald-400 font-medium text-right">{getOutfitStatus(captured.length)}</span>
                </div>

                <div className="flex justify-between items-center text-xs border-b border-slate-900/80 pb-1.5">
                  <span className="text-slate-500 uppercase tracking-tight">Concert Reach</span>
                  <span className="text-amber-400 font-bold">{Math.floor(progressPercent)}%</span>
                </div>

                <div className="flex justify-between items-center text-xs pb-0.5">
                  <span className="text-slate-500 uppercase tracking-tight">Play Duration</span>
                  <span className="text-indigo-400 font-bold">{Math.floor(timeElapsed.current / 1000)}s</span>
                </div>
              </div>

              {/* Operation Selection */}
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-500 border border-red-500/65 text-white rounded-xl font-bold transition-all text-xs uppercase tracking-wider flex items-center justify-center space-x-2 active:scale-95 cursor-pointer shadow-md shadow-red-950/20"
                >
                  <Award className="w-4 h-4" />
                  <span>RETRY STAGE</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onBackToTitle) {
                      onBackToTitle();
                    } else {
                      onQuit();
                    }
                  }}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 text-slate-300 rounded-xl font-bold transition-all text-xs uppercase tracking-wider flex items-center justify-center space-x-2 active:scale-95 cursor-pointer"
                >
                  <span>BACK TO TITLE</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Live Feed Loading & Gesture Start Overlays */}
      <AnimatePresence>
        {!isSongLoaded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center z-50 p-6 backdrop-blur-sm"
          >
            <div className="max-w-md w-full bg-slate-900 border border-cyan-500/30 rounded-xl p-8 text-center shadow-[0_0_30px_rgba(34,211,238,0.15)] flex flex-col items-center space-y-6">
              <div className="relative">
                <Sparkles className="w-12 h-12 text-cyan-400 animate-pulse" />
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-sky-500"></span>
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-wider text-cyan-300 font-mono uppercase mb-2">
                  Syncing Live Feed
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Downloading vocal matrices & lyric timings from TextAlive...
                </p>
              </div>
              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden p-[1px] border border-slate-800">
                <div className="h-full bg-cyan-500 animate-[pulse_1s_infinite] rounded-full w-2/3" />
              </div>
            </div>
          </motion.div>
        )}

        {isSongLoaded && !hasStartedConcert && countdown === null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center z-50 p-6 backdrop-blur-sm"
          >
            <div className="max-w-md w-full bg-slate-900/95 border-2 border-cyan-500/40 rounded-xl p-8 text-center shadow-[0_0_40px_rgba(6,182,212,0.25)] flex flex-col items-center space-y-6">
              <div className="w-14 h-14 bg-cyan-950/50 border border-cyan-500/40 rounded-full flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                <Zap className="w-7 h-7 text-cyan-400 animate-bounce" />
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-widest text-white uppercase mb-2">
                  {song.title}
                </h3>
                <p className="text-xs text-cyan-400 font-semibold tracking-wider font-mono uppercase">
                  by {song.artist}
                </p>
                <p className="text-[11px] text-slate-400 mt-3 max-w-xs mx-auto leading-relaxed">
                  {song.description}
                </p>
              </div>
              
              <button
                type="button"
                onClick={handleStartConcert}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold tracking-widest uppercase rounded-lg shadow-[0_4px_20px_rgba(6,182,212,0.4)] active:scale-95 transition-all cursor-pointer text-sm flex items-center justify-center space-x-2 animate-pulse"
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span>START CONCERT (ライブ開始)</span>
              </button>
              
              <p className="text-[9px] font-mono text-slate-500">
                * Clicking starts audio playback in full sync. Use your cursor to trace falling lyrics!
              </p>
            </div>
          </motion.div>
        )}

        {countdown !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center z-50 pointer-events-none"
          >
            <motion.div
              key={countdown}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 1 }}
              exit={{ scale: 2.2, opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="text-7xl font-black text-cyan-400 font-sans tracking-wider flex flex-col items-center"
            >
              {countdown === 0 ? (
                <span className="text-emerald-400 drop-shadow-[0_0_30px_rgba(52,211,153,0.8)] font-sans italic">START!</span>
              ) : (
                <span className="drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]">{countdown}</span>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
