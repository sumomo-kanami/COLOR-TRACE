/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { getGalleryItems, deleteGalleryItem } from "../utils/galleryStore";
import { GalleryItem } from "../types";
import { MikuRenderer } from "./MikuRenderer";
import { ArrowLeft, Trash2, Play, Sparkles, Eye, X, RefreshCw, Calendar, Music } from "lucide-react";
import { GlobalAudio } from "../utils/AudioEngine";

interface GalleryScreenProps {
  onBack: () => void;
}

export const GalleryScreen: React.FC<GalleryScreenProps> = ({ onBack }) => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [selectedItemForReplay, setSelectedItemForReplay] = useState<GalleryItem | null>(null);

  // Replay modal dynamic stats
  const modalCanvasRef = useRef<HTMLCanvasElement>(null);
  const [modalPlayIdx, setModalPlayIdx] = useState(0);
  const [isModalReplaying, setIsModalReplaying] = useState(true);
  const modalAnimId = useRef<number | null>(null);

  useEffect(() => {
    setItems(getGalleryItems());
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteGalleryItem(id);
    setItems(updated);
  };

  // Replay animation inside Modal
  useEffect(() => {
    if (!selectedItemForReplay) return;
    const canvas = modalCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const trace = selectedItemForReplay.mouseTrace;
    if (trace.length === 0) return;

    // Helper to extract non-drifting original screen coordinates
    const getOrigX = (pt: { x: number; scrollOffset?: number }) => {
      return pt.scrollOffset !== undefined ? pt.x - pt.scrollOffset : pt.x;
    };

    // Calculate bounds for safe scaling
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    trace.forEach(pt => {
      if (pt) {
        const ox = getOrigX(pt);
        if (ox < minX) minX = ox;
        if (ox > maxX) maxX = ox;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }
    });
    selectedItemForReplay.capturedLyrics.forEach(lyric => {
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

    let pointerIdx = 0;
    if (!isModalReplaying) {
      drawStaticTraceOnCanvas(ctx, canvas, selectedItemForReplay);
      return;
    }

    const animate = () => {
      ctx.fillStyle = "rgba(3, 7, 18, 0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const limitPoints = Math.min(pointerIdx, trace.length);
      if (limitPoints > 1 && trace[0]) {
        ctx.beginPath();
        ctx.strokeStyle = "#38bdf8"; // cyan glow theme
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.moveTo(getX(trace[0].x, trace[0].scrollOffset), getY(trace[0].y));
        for (let i = 1; i < limitPoints; i++) {
          if (trace[i]) {
            ctx.lineTo(getX(trace[i].x, trace[i].scrollOffset), getY(trace[i].y));
          }
        }
        ctx.stroke();
      }

      // Display captured lyric points along trajectory
      selectedItemForReplay.capturedLyrics.forEach(lyric => {
        const ptIdx = trace.findIndex(pt => pt && pt.time >= lyric.timestamp);
        if (ptIdx !== -1 && ptIdx <= pointerIdx) {
          ctx.beginPath();
          ctx.arc(getX(lyric.x, lyric.scrollOffset), getY(lyric.y), 4, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();

          ctx.font = "bold 9px sans-serif";
          ctx.fillStyle = "#ec4899"; // pink text
          ctx.fillText(lyric.text, getX(lyric.x, lyric.scrollOffset) + 8, getY(lyric.y) + 3);
        }
      });

      if (pointerIdx < trace.length) {
        pointerIdx += 4; // speed multiplier
        setModalPlayIdx(Math.min(pointerIdx, trace.length));
        modalAnimId.current = requestAnimationFrame(animate);
      } else {
        setIsModalReplaying(false);
        drawStaticTraceOnCanvas(ctx, canvas, selectedItemForReplay);
      }
    };

    modalAnimId.current = requestAnimationFrame(animate);

    return () => {
      if (modalAnimId.current) cancelAnimationFrame(modalAnimId.current);
    };
  }, [selectedItemForReplay, isModalReplaying]);

  const drawStaticTraceOnCanvas = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, item: GalleryItem) => {
    ctx.fillStyle = "#030712";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const trace = item.mouseTrace;
    if (trace.length === 0) return;

    // Helper inside static
    const getOrigX = (pt: { x: number; scrollOffset?: number }) => {
      return pt.scrollOffset !== undefined ? pt.x - pt.scrollOffset : pt.x;
    };

    // Calculate bounds for safe scaling
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    trace.forEach(pt => {
      if (pt) {
        const ox = getOrigX(pt);
        if (ox < minX) minX = ox;
        if (ox > maxX) maxX = ox;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }
    });
    item.capturedLyrics.forEach(lyric => {
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

    if (trace.length > 1 && trace[0]) {
      ctx.beginPath();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(getX(trace[0].x, trace[0].scrollOffset), getY(trace[0].y));
      for (let i = 1; i < trace.length; i++) {
        if (trace[i]) {
          ctx.lineTo(getX(trace[i].x, trace[i].scrollOffset), getY(trace[i].y));
        }
      }
      ctx.stroke();
    }

    item.capturedLyrics.forEach(lyric => {
      ctx.beginPath();
      ctx.arc(getX(lyric.x, lyric.scrollOffset), getY(lyric.y), 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.font = "bold 9px sans-serif";
      ctx.fillStyle = "#ec4899";
      ctx.fillText(lyric.text, getX(lyric.x, lyric.scrollOffset) + 8, getY(lyric.y) + 3);
    });
  };

  const handleOpenReplay = (item: GalleryItem) => {
    setSelectedItemForReplay(item);
    setIsModalReplaying(true);
    setModalPlayIdx(0);
  };

  const handleCloseReplay = () => {
    setSelectedItemForReplay(null);
    if (modalAnimId.current) cancelAnimationFrame(modalAnimId.current);
  };

  return (
    <div className="w-full min-h-full bg-[#030712] text-white p-6 md:p-10 flex flex-col justify-start relative pb-12">
      
      {/* Header bar */}
      <div className="relative z-10 flex items-center justify-between mb-8 pb-4 border-b border-slate-800/80">
        <button
          id="btn-gallery-back"
          onClick={onBack}
          className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 cursor-pointer text-xs font-mono font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO TITLE</span>
        </button>

        <span className="text-xs font-mono text-pink-400 font-bold bg-pink-950/45 px-2.5 py-1 rounded border border-pink-500/10 flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          <span>SAVED MASTERPIECES</span>
        </span>
      </div>

      {/* Intro title */}
      <div className="relative z-10 mb-8 max-w-xl">
        <h2 className="text-2xl font-bold tracking-tight">ギャラリー (Gallery Archives)</h2>
        <p className="text-xs text-slate-400 mt-1">
          プレイヤーが紡ぎ出した、世界にただひとつの初音ミク衣装とライブ軌跡をアーカイブしています。
        </p>
      </div>

      {/* Grid containing gallery cards */}
      <div className="relative z-10 flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-800/80 rounded-2xl bg-slate-900/10">
            <Sparkles className="w-10 h-10 text-slate-600 mb-3 animate-pulse" />
            <span className="text-sm font-semibold text-slate-400">ギャラリーに登録された軌跡はありません</span>
            <span className="text-xs text-slate-500 mt-1">ゲームをプレイし、リザルト画面から保存しましょう！</span>
          </div>
        ) : (
          items.map(item => (
            <div
              key={item.id}
              id={`gallery-item-${item.id}`}
              className="group bg-slate-900/30 border border-slate-800/80 hover:border-pink-500/30 rounded-2xl p-5 flex flex-col justify-between hover:shadow-lg hover:shadow-pink-950/10 transition-all duration-300 relative"
            >
              {/* Upper Section */}
              <div>
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 mb-3">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-pink-400" />
                    <span>{item.creationDate}</span>
                  </span>
                  <span className="bg-slate-800 px-2 py-0.5 rounded font-bold uppercase text-slate-400">
                    Grade {item.capturedCount >= 10 ? "S" : "A"}
                  </span>
                </div>

                {/* Cover graphic */}
                <div className="w-full h-[180px] bg-slate-950/75 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center relative mb-4">
                  <div className="w-[180px] h-[180px] scale-90">
                    <MikuRenderer
                      capturedLyrics={item.capturedLyrics}
                      theme={item.theme}
                      isDancing={false}
                    />
                  </div>

                  {/* Lyric Capture overlay count indicator */}
                  <div className="absolute bottom-2 left-2 bg-slate-900/95 border border-slate-800 rounded px-2 py-1 text-[9px] font-mono text-slate-300">
                    Captured: <strong className="text-cyan-400">{item.capturedCount}</strong> syllables
                  </div>
                </div>

                {/* Captions */}
                <h3 className="text-sm font-bold text-white group-hover:text-pink-400 transition-colors line-clamp-1">
                  {item.customName}
                </h3>
                
                <div className="mt-1 flex items-center space-x-1.5 text-xs text-slate-400">
                  <Music className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-semibold">{item.songTitle}</span>
                  <span className="text-[10px] text-slate-500">by {item.artist}</span>
                </div>
              </div>

              {/* Lower Section Controls */}
              <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  id={`btn-replay-${item.id}`}
                  onClick={() => handleOpenReplay(item)}
                  className="flex items-center space-x-1.5 text-xs font-bold px-3 py-2 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg border border-slate-700/60 transition-all cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>軌跡を再生する</span>
                </button>

                <button
                  type="button"
                  id={`btn-delete-${item.id}`}
                  onClick={(e) => handleDelete(item.id, e)}
                  className="flex items-center justify-center w-11 h-11 rounded-2xl bg-[#090b14]/90 border border-red-500/25 text-[#ff5f6e] hover:text-red-400 hover:bg-[#150d17] hover:border-red-500/50 hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_12px_rgba(239,68,68,0.1)] hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] cursor-pointer"
                  title="Remove artwork"
                >
                  <Trash2 className="w-[18px] h-[18px]" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- REPLAY trajectory MODAL POPUP --- */}
      <AnimatePresence>
        {selectedItemForReplay && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col h-[480px] shadow-[0_0_50px_rgba(0,0,0,0.8)]"
            >
              {/* Modal Head */}
              <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest block">
                    TRACE LIVE REPLAY
                  </span>
                  <h3 className="text-sm font-semibold text-white">
                    {selectedItemForReplay.customName}
                  </h3>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsModalReplaying(!isModalReplaying)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs font-mono font-bold text-slate-300 cursor-pointer flex items-center space-x-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isModalReplaying ? "animate-spin" : ""}`} />
                    <span>{isModalReplaying ? "Pause" : "Play / Restart"}</span>
                  </button>

                  <button
                    onClick={handleCloseReplay}
                    className="p-1 px-2 rounded-lg bg-slate-800 hover:bg-red-600 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {/* Modal Core Drawing Canvas */}
              <div className="flex-1 bg-slate-950/90 relative flex items-center justify-center min-h-[300px]">
                {isModalReplaying && (
                  <div className="absolute bottom-2 left-3 text-[9px] font-mono text-cyan-300 bg-slate-900/60 px-2 py-0.5 rounded">
                    Replaying path frames: {modalPlayIdx} / {selectedItemForReplay.mouseTrace.length}
                  </div>
                )}
                
                <canvas
                  ref={modalCanvasRef}
                  width="600"
                  height="340"
                  className="w-full h-full flex-1"
                />
              </div>

              {/* Modal Footer summary line */}
              <div className="bg-slate-900 p-3.5 border-t border-slate-800 text-center text-xs text-slate-400 font-mono flex items-center justify-between">
                <span>Theme Preset: {selectedItemForReplay.theme}</span>
                <span>Original creation dated {selectedItemForReplay.creationDate}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
