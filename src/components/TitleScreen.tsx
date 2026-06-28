/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MikuRenderer } from "./MikuRenderer";
import { Play, BookOpen, Image as ImageIcon, Info, Music, Sparkles } from "lucide-react";
import { GlobalAudio } from "../utils/AudioEngine";
import { Song } from "../types";
import { SONGS_PLAYLIST } from "../data/songs";

interface TitleScreenProps {
  onNavigate: (screen: "song_select" | "how_to_play" | "gallery" | "credit") => void;
  onSelectSong?: (song: Song) => void;
}

const BACKGROUND_THEMES = [
  { theme: "色 (Color)", title: "こたえて", artist: "imie", lyricCount: 12 },
  { theme: "余韻 (Linger)", title: "アフター・ザ・カーテン", artist: "Rulmry", lyricCount: 14 },
  { theme: "写真 (Photo)", title: "シャッターチャンス", artist: "夜未アガリ", lyricCount: 10 },
  { theme: "未来と音楽 (Cosmic)", title: "世界最後の音楽隊", artist: "夏山よつぎ×ど～ぱみん", lyricCount: 13 },
  { theme: "本当の自分 (True/Fake)", title: "トリツクロジー", artist: "鶴三", lyricCount: 11 },
  { theme: "エネルギー (Energy)", title: "TAKEOVER", artist: "Twinfield", lyricCount: 12 }
];

export const TitleScreen: React.FC<TitleScreenProps> = ({ onNavigate, onSelectSong }) => {
  const [themeIdx, setThemeIdx] = useState(0);

  // Cycle background completed Mikus every 4.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setThemeIdx(prev => (prev + 1) % BACKGROUND_THEMES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const activeSlide = BACKGROUND_THEMES[themeIdx];

  // Helper to generate a dummy list of fake captured items to force full coloring on the slides
  const dummyCaptured = React.useMemo(() => {
    return Array.from({ length: activeSlide.lyricCount }).map((_, i) => ({
      text: `Lyric #${i}`,
      timestamp: i * 1000,
      x: 200,
      y: 200,
      partAssigned: ["ribbon", "headset", "sleeves", "skirt", "boots"][i % 5],
      color: "#06b6d4"
    }));
  }, [activeSlide]);

  return (
    <div className="relative w-full h-full min-h-[600px] bg-[#030712] overflow-hidden flex items-center justify-center text-white">
      {/* 1. EMBEDDED PROCEDURAL SLIDESHOW BACKGROUND */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center opacity-30 select-none pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={themeIdx}
            initial={{ opacity: 0, scale: 0.9, x: 50 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: -50 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="absolute flex items-center justify-center w-full max-w-lg"
          >
            <div className="flex flex-col items-center">
              <div className="w-[350px] h-[350px]">
                <MikuRenderer
                  capturedLyrics={dummyCaptured}
                  theme={activeSlide.theme}
                  isDancing={true}
                />
              </div>
              <div className="mt-4 text-center">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#06b6d4] font-medium block">
                  NOW DEMOING STYLE
                </span>
                <span className="text-sm font-semibold text-slate-300 drop-shadow">
                  {activeSlide.title} ({activeSlide.theme})
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Cyber Grid Decorative Cover */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #06b6d4 1px, transparent 1px),
            linear-gradient(to bottom, #06b6d4 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px"
        }}
      />

      {/* Ambient gradient blobs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-pink-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* 2. MENU CARD CONTAINER */}
      <div className="relative z-10 w-full max-w-md px-6 py-10 text-center flex flex-col items-center">
        {/* Subtle Game Logo Accent */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center space-x-2 bg-slate-900/80 border border-[#06b6d4]/40 px-3 py-1 rounded-full mb-6 shadow-md shadow-cyan-950/50 backdrop-blur-sm"
        >
          <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="text-[11px] font-mono font-semibold text-cyan-300 tracking-[0.15em] uppercase">
            Hatsune Miku Co-Creation Space
          </span>
        </motion.div>

        {/* Masterpiece Title Heading */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="mb-10 text-center"
        >
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tightest leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 font-sans [text-shadow:_0_0_20px_rgba(34,211,238,0.3)]">
              COLOR TRACE
            </span>
          </h1>
          <p className="mt-2 text-xs text-slate-400 tracking-[0.25em] font-sans">
            〜歌詞で紡ぐ、世界にひとつのミク〜
          </p>
        </motion.div>

        {/* Navigation Action Buttons Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
          className="w-full flex flex-col space-y-4"
        >
          <button
            id="menu-btn-play"
            onClick={() => {
              GlobalAudio.init(); // Warm audio on click
              onNavigate("song_select");
            }}
            className="group relative w-full flex items-center justify-between bg-gradient-to-r from-cyan-500/20 to-sky-600/30 hover:from-cyan-500 hover:to-sky-500 border border-cyan-400/50 hover:border-cyan-300 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-cyan-500/20 backdrop-blur-sm transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-center space-x-3 text-left">
              <Play className="w-5 h-5 text-cyan-300 group-hover:text-white transition-colors animate-pulse" />
              <div>
                <span className="text-sm tracking-wider font-bold block">START</span>
                <span className="text-[10px] text-slate-400 group-hover:text-indigo-100 font-normal transition-colors">
                  共創ライブを始める
                </span>
              </div>
            </div>
            <span className="text-xl opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 font-bold">
              →
            </span>
          </button>

          <button
            id="menu-btn-how-to"
            onClick={() => onNavigate("how_to_play")}
            className="group relative w-full flex items-center justify-between bg-slate-900/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-500 text-white font-medium py-3 px-5 rounded-xl transition-all cursor-pointer"
          >
            <div className="flex items-center space-x-3 text-left">
              <BookOpen className="w-5 h-5 text-teal-400" />
              <div>
                <span className="text-xs font-semibold tracking-wider block">HOW TO PLAY</span>
                <span className="text-[10px] text-slate-400 font-normal">遊び方の説明を見る</span>
              </div>
            </div>
            <span className="text-lg opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
              →
            </span>
          </button>

          <button
            id="menu-btn-gallery"
            onClick={() => onNavigate("gallery")}
            className="group relative w-full flex items-center justify-between bg-slate-900/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-500 text-white font-medium py-3 px-5 rounded-xl transition-all cursor-pointer"
          >
            <div className="flex items-center space-x-3 text-left">
              <ImageIcon className="w-5 h-5 text-pink-400" />
              <div>
                <span className="text-xs font-semibold tracking-wider block">GALLERY</span>
                <span className="text-[10px] text-slate-400 font-normal">過去作品の軌跡と衣装</span>
              </div>
            </div>
            <span className="text-lg opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
              →
            </span>
          </button>
        </motion.div>



        {/* Humble Footer Note (Avoiding Slop Margin Indicator according to design rules) */}
        <div className="mt-8 flex items-center space-x-1.5 opacity-40 hover:opacity-70 transition-opacity">
          <Music className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[9px] font-mono tracking-widest text-slate-350">
            Powered by Web Audio Synthesizer
          </span>
        </div>
      </div>
    </div>
  );
};
