/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Song, CapturedLyric, MousePoint } from "../types";
import { MikuRenderer } from "./MikuRenderer";
import { saveGalleryItem } from "../utils/galleryStore";
import { Play, RotateCcw, Save, Sparkles, Star, Award, ChevronRight, Check, ArrowLeft } from "lucide-react";
import { GlobalAudio } from "../utils/AudioEngine";

interface ResultScreenProps {
  song: Song;
  capturedLyrics: CapturedLyric[];
  mouseTrace: MousePoint[];
  score: number;
  onRestart: () => void;
  onGoToGallery: () => void;
  onBackToTitle: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  song,
  capturedLyrics,
  mouseTrace,
  score,
  onRestart,
  onGoToGallery,
  onBackToTitle
}) => {
  const replayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [customName, setCustomName] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  // Playback trajectory animation stats
  const [playbackIdx, setPlaybackIdx] = useState(0);
  const [isReplaying, setIsReplaying] = useState(true);
  const playbackSpeed = 4; // draw N coordinates points per frame
  const animFrameId = useRef<number | null>(null);

  // Trigger triumph melody on mount
  useEffect(() => {
    GlobalAudio.init();
    GlobalAudio.startSong(song.id, song.bpm - 20); // soft victory swing beat
    return () => {
      GlobalAudio.stopSong();
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [song]);

  // Handle Trace Artwork Replay Logic
  useEffect(() => {
    const canvas = replayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Reset and clear drawing board
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (mouseTrace.length === 0) return;

    // Helper to extract non-drifting original screen coordinates
    const getOrigX = (pt: { x: number; scrollOffset?: number }) => {
      return pt.scrollOffset !== undefined ? pt.x - pt.scrollOffset : pt.x;
    };

    // Calculate bounds for dynamic scaling to fit the entire trace onto the canvas nicely
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    mouseTrace.forEach(pt => {
      if (pt) {
        const ox = getOrigX(pt);
        if (ox < minX) minX = ox;
        if (ox > maxX) maxX = ox;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }
    });
    capturedLyrics.forEach(lyric => {
      const ox = getOrigX(lyric);
      if (ox < minX) minX = ox;
      if (ox > maxX) maxX = ox;
      if (lyric.y < minY) minY = lyric.y;
      if (lyric.y > maxY) maxY = lyric.y;
    });

    const padding = 35;
    const targetW = canvas.width - padding * 2;
    const targetH = canvas.height - padding * 2;
    const traceW = maxX - minX;
    const traceH = maxY - minY;

    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    if (traceW > 0 && traceH > 0) {
      scale = Math.min(targetW / traceW, targetH / traceH);
      offsetX = padding + (targetW - traceW * scale) / 2 - minX * scale;
      offsetY = padding + (targetH - traceH * scale) / 2 - minY * scale;
    }

    const getX = (x: number, scrollOffset?: number) => {
      const origX = scrollOffset !== undefined ? x - scrollOffset : x;
      return origX * scale + offsetX;
    };
    const getY = (y: number) => y * scale + offsetY;

    let idx = 0;
    if (!isReplaying) {
      // If paused/ended, render the entire trace directly
      renderStaticFullTrace(ctx, canvas);
      return;
    }

    const animateReplay = () => {
      // Clear with soft trails to make drawing feel active
      ctx.fillStyle = "rgba(3, 7, 18, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw trace up to index
      const limitPoints = Math.min(idx, mouseTrace.length);
      if (limitPoints > 1 && mouseTrace[0]) {
        ctx.beginPath();
        ctx.strokeStyle = song.primaryColor;
        ctx.lineWidth = 4;
        ctx.shadowColor = song.secondaryColor;
        ctx.shadowBlur = 8;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.moveTo(getX(mouseTrace[0].x, mouseTrace[0].scrollOffset), getY(mouseTrace[0].y));
        for (let i = 1; i < limitPoints; i++) {
          if (mouseTrace[i]) {
            ctx.lineTo(getX(mouseTrace[i].x, mouseTrace[i].scrollOffset), getY(mouseTrace[i].y));
          }
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      }

      // Render caught lyric labels along the path as they are reached chronologically
      capturedLyrics.forEach(lyric => {
        // Find nearest coordinate timestamp
        const matchingPointIdx = mouseTrace.findIndex(pt => pt && pt.time >= lyric.timestamp);
        if (matchingPointIdx !== -1 && matchingPointIdx <= idx) {
          // Draw a small glowing star on canvas where lyric was caught
          ctx.font = "bold 9px sans-serif";
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = song.secondaryColor;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(getX(lyric.x, lyric.scrollOffset), getY(lyric.y), 4, 0, Math.PI * 2);
          ctx.fill();

          // Text label
          ctx.fillStyle = song.primaryColor;
          ctx.fillText(lyric.text, getX(lyric.x, lyric.scrollOffset) + 8, getY(lyric.y) + 3);
          ctx.shadowBlur = 0;
        }
      });

      // Advance chronometer
      if (idx < mouseTrace.length) {
        idx += playbackSpeed;
        setPlaybackIdx(Math.min(idx, mouseTrace.length));
        animFrameId.current = requestAnimationFrame(animateReplay);
      } else {
        setIsReplaying(false);
        renderStaticFullTrace(ctx, canvas);
      }
    };

    animFrameId.current = requestAnimationFrame(animateReplay);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [isReplaying, mouseTrace, capturedLyrics, song]);

  const renderStaticFullTrace = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    ctx.fillStyle = "#030712";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (mouseTrace.length === 0) return;

    // Helper inside static
    const getOrigX = (pt: { x: number; scrollOffset?: number }) => {
      return pt.scrollOffset !== undefined ? pt.x - pt.scrollOffset : pt.x;
    };

    // Calculate bounds same way
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    mouseTrace.forEach(pt => {
      if (pt) {
        const ox = getOrigX(pt);
        if (ox < minX) minX = ox;
        if (ox > maxX) maxX = ox;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }
    });
    capturedLyrics.forEach(lyric => {
      const ox = getOrigX(lyric);
      if (ox < minX) minX = ox;
      if (ox > maxX) maxX = ox;
      if (lyric.y < minY) minY = lyric.y;
      if (lyric.y > maxY) maxY = lyric.y;
    });

    const padding = 35;
    const targetW = canvas.width - padding * 2;
    const targetH = canvas.height - padding * 2;
    const traceW = maxX - minX;
    const traceH = maxY - minY;

    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    if (traceW > 0 && traceH > 0) {
      scale = Math.min(targetW / traceW, targetH / traceH);
      offsetX = padding + (targetW - traceW * scale) / 2 - minX * scale;
      offsetY = padding + (targetH - traceH * scale) / 2 - minY * scale;
    }

    const getX = (x: number, scrollOffset?: number) => {
      const origX = scrollOffset !== undefined ? x - scrollOffset : x;
      return origX * scale + offsetX;
    };
    const getY = (y: number) => y * scale + offsetY;

    if (mouseTrace.length > 1 && mouseTrace[0]) {
      ctx.beginPath();
      ctx.strokeStyle = song.primaryColor;
      ctx.lineWidth = 3;
      ctx.shadowColor = song.secondaryColor;
      ctx.shadowBlur = 6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.moveTo(getX(mouseTrace[0].x, mouseTrace[0].scrollOffset), getY(mouseTrace[0].y));
      for (let i = 1; i < mouseTrace.length; i++) {
        if (mouseTrace[i]) {
          ctx.lineTo(getX(mouseTrace[i].x, mouseTrace[i].scrollOffset), getY(mouseTrace[i].y));
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Print all captured lyrics
    capturedLyrics.forEach(lyric => {
      ctx.beginPath();
      ctx.arc(getX(lyric.x, lyric.scrollOffset), getY(lyric.y), 5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.font = "bold 9px 'JetBrains Mono', sans-serif";
      ctx.fillStyle = "#22d3ee";
      ctx.fillText(lyric.text, getX(lyric.x, lyric.scrollOffset) + 8, getY(lyric.y) + 3);
    });
  };

  const handleBackToTitleClick = () => {
    GlobalAudio.stopSong();
    onBackToTitle();
  };

  const handleSaveToGallery = () => {
    const finalTitle = customName.trim() || `${song.title}の軌跡`;
    saveGalleryItem(
      song.id,
      song.title,
      song.artist,
      song.theme,
      capturedLyrics.length,
      song.lyrics.filter(l => !l.isFake).length,
      capturedLyrics,
      mouseTrace,
      finalTitle,
      `Special Dynamic Style: ${song.theme}`
    );
    setIsSaved(true);
    // Smooth navigation delay to let saving animation play
    setTimeout(() => {
      onGoToGallery();
    }, 1200);
  };

  // Compute grading
  const ratio = song.lyrics.filter(l => !l.isFake).length > 0
    ? capturedLyrics.length / song.lyrics.filter(l => !l.isFake).length
    : 0;
  const grade = ratio >= 0.95 ? "SSS" : ratio >= 0.85 ? "S" : ratio >= 0.7 ? "A" : "B";

  return (
    <div className="w-full min-h-full bg-[#030712] text-white p-6 md:p-8 flex flex-col justify-start relative pb-12">
      
      {/* Upper header */}
      <div className="relative z-10 flex items-center justify-between mb-6 pb-3 border-b border-slate-800/80">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-[#06b6d4] uppercase font-bold">公演結果</span>
          <h2 className="text-xl font-bold tracking-tight">STATION REPORT</h2>
        </div>
        <div className="bg-slate-900 border border-slate-800 px-3 py-1 rounded text-xs font-mono font-semibold">
          Theme: {song.theme}
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        
        {/* Left Column (Miku Wardrobe Showcase) */}
        <div className="lg:col-span-4 flex flex-col bg-slate-900/30 border border-slate-800/80 rounded-2xl p-5 items-center justify-center relative">
          <div className="absolute top-2 left-2 text-[8px] font-mono text-slate-500 uppercase tracking-widest">
            FINISHED MIKU WARDROBE
          </div>

          <div className="w-[280px] h-[300px]">
            <MikuRenderer
              capturedLyrics={capturedLyrics}
              theme={song.theme}
              isDancing={false}
            />
          </div>

          {/* Stats Box */}
          <div className="w-full bg-slate-950/70 border border-slate-800/60 p-4 rounded-xl space-y-2 mt-4 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Captured Lyrics (キャッチ数):</span>
              <span className="text-white font-bold">
                {capturedLyrics.length} / {song.lyrics.filter(l => !l.isFake).length}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-900 pt-1.5">
              <span className="text-slate-400">Catch Rate (キャッチ率):</span>
              <span className="text-sky-400 font-bold">{Math.round(ratio * 100)}%</span>
            </div>
            <div className="flex justify-between border-t border-slate-900 pt-1.5">
              <span className="text-slate-400">Harmonic Score (スコア):</span>
              <span className="text-cyan-400 font-extrabold">{score.toLocaleString()} PTS</span>
            </div>
            <div className="flex justify-between border-t border-slate-900 pt-1.5 items-center">
              <span className="text-slate-400">Cocreation Rank:</span>
              <span className="text-lg font-black text-pink-400 font-sans tracking-wide">
                {grade}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (Trace Playback Canvas + Title Input Form + Controls) */}
        <div className="lg:col-span-8 flex flex-col justify-between space-y-6">
          
          {/* Replay Player Wrapper */}
          <div className="relative flex-1 bg-[#050b18] border border-slate-800/80 rounded-2xl overflow-hidden min-h-[260px] flex flex-col">
            <div className="absolute top-2 left-2 z-20 text-[8px] font-mono text-slate-350 bg-slate-900/90 border border-slate-800/60 px-2 py-0.5 rounded uppercase tracking-widest">
              Replay Tracing trajectory (ライブ軌跡再生中)
            </div>

            {/* Animation state toggler */}
            <div className="absolute top-2 right-2 z-20 flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsReplaying(!isReplaying)}
                className="p-1 px-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 rounded text-[10px] font-mono text-slate-350 cursor-pointer flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3 text-cyan-400" />
                <span>{isReplaying ? "Pause" : "Restart Replay / Play Static"}</span>
              </button>
            </div>

            {/* Playback Progress Indicator */}
            {isReplaying && mouseTrace.length > 0 && (
              <div className="absolute bottom-2 left-3 z-20 text-[9px] font-mono text-cyan-400 bg-slate-950/70 border border-cyan-500/20 px-2 py-0.5 rounded">
                Drawing Frame: {playbackIdx} / {mouseTrace.length}
              </div>
            )}

            {/* Interactive Drawing Board */}
            <canvas
              ref={replayCanvasRef}
              width="500"
              height="280"
              className="w-full h-full flex-1 min-h-[220px]"
            />
          </div>

          {/* Form + Save action */}
          <div className="bg-slate-900/50 border border-slate-805/70 p-5 rounded-2xl space-y-4">
            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                作品名 (Give Your Masterpiece a Title)
              </label>
              <input
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value.slice(0, 24))}
                placeholder={`${song.title}の軌跡 #${Math.floor(Math.random() * 900 + 100)}`}
                className="w-full bg-[#050b18] border border-slate-800 focus:border-cyan-500 outline-none rounded-xl px-4 py-3 text-sm text-white placeholder-slate-650 transition-all font-sans"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                あなたが描いた軌跡と、キャッチした歌詞による唯一無二のアートに名前を付け、保存しましょう。
              </span>
            </div>

            {/* Action buttons */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                <button
                  type="button"
                  onClick={handleSaveToGallery}
                  disabled={isSaved}
                  className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-pink-950/30 transition-all duration-300 cursor-pointer disabled:opacity-50"
                >
                  {isSaved ? (
                    <>
                      <Check className="w-4 h-4 animate-bounce" />
                      <span>SAVED TO GALLERY!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>GALLERY に保存する</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onRestart}
                  className="flex-1 flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>もう一度あそぶ</span>
                </button>
              </div>

              <button
                id="btn-back-to-title"
                type="button"
                onClick={handleBackToTitleClick}
                className="w-full flex items-center justify-center space-x-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-350 hover:text-white font-bold py-3 px-6 rounded-xl transition-all cursor-pointer tracking-wider text-xs"
              >
                <ArrowLeft className="w-4 h-4 text-cyan-400" />
                <span>ホーム画面に戻る</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
