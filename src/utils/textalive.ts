/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Player } from "textalive-app-api";
import { Song } from "../types";

// Read token from environment variables or use an empty string if not configured.
// Avoid using "your_developer_token_here" as TextAlive API will fail validation with invalid placeholders.
const token = (import.meta as any).env?.VITE_TEXTALIVE_TOKEN || "";

// Create and export the TextAlive Player instance
export const player = typeof window !== "undefined" ? new Player({
  app: {
    token: token,
    appName: "COLOR TRACE"
  }
} as any) : null;

// Track active states to coordinate loading and playback
let isSongLoading = false;
let isGameplayActive = false;

// Suppress uncaught DOMException/AbortError from browser play() vs pause() race conditions
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message = reason?.message || String(reason || "");
    const name = reason?.name || "";
    
    // Catch common play/pause interruption messages
    if (
      message.includes("The play() request was interrupted") ||
      message.includes("play() request") ||
      message.includes("pause()") ||
      name === "AbortError"
    ) {
      console.log("[TextAlive] Caught and suppressed play() vs pause() interruption error:", message);
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

// Callbacks to notify when timer is ready
const timerReadyCallbacks = new Set<() => void>();

export function registerTimerReadyCallback(cb: () => void) {
  timerReadyCallbacks.add(cb);
  if (player && player.timer) {
    // If the player timer is already initialized and ready, fire immediately
    cb();
  }
  return () => {
    timerReadyCallbacks.delete(cb);
  };
}

if (player) {
  player.addListener({
    onAppReady: (app) => {
      console.log("[TextAlive] Player App Ready. Managed mode:", app.managed);
      if (!app.managed) {
        // こたえて / imie
        player.createFromSongUrl("https://piapro.jp/t/6W2N/20251215164617", {
          video: {
            // 音楽地図訂正履歴
            beatId: 4827293,
            chordId: 2963754,
            repetitiveSegmentId: 3086261,
        
            // 歌詞URL: https://piapro.jp/t/9o24
            // 歌詞タイミング訂正履歴: https://textalive.jp/lyrics/piapro.jp%2Ft%2F6W2N%2F20251215164617
            lyricId: 126519,
            lyricDiffId: 28645
          },
        });

        // アフター・ザ・カーテン / Rulmry
        // player.createFromSongUrl("https://piapro.jp/t/zoqO/20251214200738", {
        //   video: {
        //     // 音楽地図訂正履歴
        //     beatId: 4827294,
        //     chordId: 2963755,
        //     repetitiveSegmentId: 3086262,
        // 
        //     // 歌詞URL: https://piapro.jp/t/EVO2
        //     // 歌詞タイミング訂正履歴: https://textalive.jp/lyrics/piapro.jp%2Ft%2FzoqO%2F20251214200738
        //     lyricId: 126591,
        //     lyricDiffId: 28627
        //   },
        // });

        // シャッターチャンス / 夜未アガリ
        // player.createFromSongUrl("https://piapro.jp/t/PNpQ/20251209170719", {
        //   video: {
        //     // 音楽地図訂正履歴
        //     beatId: 4827295,
        //     chordId: 2963756,
        //     repetitiveSegmentId: 3086263,
        // 
        //     // 歌詞URL: https://piapro.jp/t/wyWv
        //     // 歌詞タイミング訂正履歴: https://textalive.jp/lyrics/piapro.jp%2Ft%2FPNpQ%2F20251209170719
        //     lyricId: 126542,
        //     lyricDiffId: 28628
        //   },
        // });

        // 世界最後の音楽隊 / 夏山よつぎ×ど～ぱみん
        // player.createFromSongUrl("https://piapro.jp/t/B3yJ/20251215061727", {
        //   video: {
        //     // 音楽地図訂正履歴
        //     beatId: 4827296,
        //     chordId: 2963757,
        //     repetitiveSegmentId: 3086264,
        // 
        //     // 歌詞URL: https://piapro.jp/t/9U-6
        //     // 歌詞タイミング訂正履歴: https://textalive.jp/lyrics/piapro.jp%2Ft%2FB3yJ%2F20251215061727
        //     lyricId: 126594,
        //     lyricDiffId: 28629
        //   },
        // });

        // トリツクロジー / 鶴三
        // player.createFromSongUrl("https://piapro.jp/t/QBdL/20251215094303", {
        //   video: {
        //     // 音楽地図訂正履歴
        //     beatId: 4827297,
        //     chordId: 2963758,
        //     repetitiveSegmentId: 3086265,
        // 
        //     // 歌詞URL: https://piapro.jp/t/Nixq
        //     // 歌詞タイミング訂正履歴: https://textalive.jp/lyrics/piapro.jp%2Ft%2FQBdL%2F20251215094303
        //     lyricId: 126593,
        //     lyricDiffId: 28630
        //   },
        // });

        // TAKEOVER / Twinfield
        // player.createFromSongUrl("https://piapro.jp/t/E2i3/20251215092113", {
        //   video: {
        //     // 音楽地図訂正履歴
        //     beatId: 4827298,
        //     chordId: 2963759,
        //     repetitiveSegmentId: 3086266,
        // 
        //     // 歌詞URL: https://piapro.jp/t/zxWP
        //     // 歌詞タイミング訂正履歴: https://textalive.jp/lyrics/piapro.jp%2Ft%2FE2i3%2F20251215092113
        //     lyricId: 126533,
        //     lyricDiffId: 28631
        //   },
        // });
      }
    },
    onTimerReady: () => {
      console.log("[TextAlive] Timer Ready. Gameplay active:", isGameplayActive);
      timerReadyCallbacks.forEach(cb => {
        try { cb(); } catch (e) { console.warn("[TextAlive] Callback error:", e); }
      });
      if (isGameplayActive) {
        try {
          player.requestPlay();
        } catch (error) {
          console.warn("[TextAlive] Failed to request play on timer ready:", error);
        }
      }
    },
    onPlay: () => {
      console.log("[TextAlive] Playback started successfully.");
    },
    onPause: () => {
      console.log("[TextAlive] Playback paused.");
      if (isGameplayActive) {
        const currentPos = player?.timer?.position || 0;
        const duration = player?.video?.duration || 180000;
        if (currentPos >= duration - 5000) {
          console.log("[TextAlive] Paused near the end of the song. No auto-resume needed.");
          return;
        }
        console.log("[TextAlive] Playback was paused during active gameplay! Attempting to auto-resume...");
        setTimeout(() => {
          if (isGameplayActive && player) {
            try {
              player.requestPlay();
            } catch (error) {
              console.warn("[TextAlive] Auto-resume on pause failed:", error);
            }
          }
        }, 200);
      }
    },
    onStop: () => {
      console.log("[TextAlive] Playback stopped.");
    }
  });
}

// Load the selected song dynamically to avoid parallel loader conflicts
export async function loadSongToPlayer(song: Song) {
  if (!player || !song.piaproUrl || !song.textAliveConfig) return;
  
  if (isSongLoading) {
    console.warn("[TextAlive] A song is already loading. Skipping parallel request.");
    return;
  }
  
  isSongLoading = true;
  console.log(`[TextAlive] Loading song: ${song.title} (${song.piaproUrl})`);

  try {
    // Stop any active playback first
    try {
      player.requestStop();
    } catch (_) {}
    
    await player.createFromSongUrl(song.piaproUrl, {
      video: {
        beatId: song.textAliveConfig.beatId,
        chordId: song.textAliveConfig.chordId,
        repetitiveSegmentId: song.textAliveConfig.repetitiveSegmentId,
        lyricId: song.textAliveConfig.lyricId,
        lyricDiffId: song.textAliveConfig.lyricDiffId
      }
    });
    console.log(`[TextAlive] Song loaded successfully: ${song.title}`);
  } catch (error) {
    console.warn("[TextAlive] Failed to load song into Player:", error);
  } finally {
    isSongLoading = false;
  }
}

// Play song in TextAlive player if ready
export function playSongInPlayer() {
  isGameplayActive = true;
  if (!player) return;
  try {
    // If the timer is already ready, request play immediately.
    // Otherwise, onTimerReady will request play once loading finishes.
    if (player.timer) {
      player.requestPlay();
    }
  } catch (error) {
    console.warn("[TextAlive] Failed to play song in player:", error);
  }
}

// Stop playback in TextAlive player
export function stopSongInPlayer() {
  isGameplayActive = false;
  if (!player) return;
  try {
    player.requestStop();
  } catch (error) {
    console.warn("[TextAlive] Failed to stop song in player:", error);
  }
}

