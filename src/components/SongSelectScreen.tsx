/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { motion } from "motion/react";
import { Song } from "../types";
import { SONGS_PLAYLIST } from "../data/songs";
import { ArrowLeft, Play, Music, Sparkles } from "lucide-react";
import { GlobalAudio } from "../utils/AudioEngine";

interface SongSelectScreenProps {
  onBack: () => void;
  onSelectSong: (song: Song) => void;
}

export const SongSelectScreen: React.FC<SongSelectScreenProps> = ({
  onBack,
  onSelectSong
}) => {
  // Play a brief sound trigger on load
  useEffect(() => {
    GlobalAudio.init();
    // Play light intro melody matching first song
    GlobalAudio.startSong("kotaete", 120);
    return () => {
      GlobalAudio.stopSong();
    };
  }, []);

  const handlePreviewSong = (song: Song) => {
    GlobalAudio.startSong(song.id, song.bpm);
  };

  return (
    <div className="w-full min-h-full bg-[#030712] text-white p-6 md:p-10 flex flex-col justify-start relative pb-12">
      {/* Decorative Grid Network */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #a855f7 1px, transparent 1px),
            linear-gradient(to bottom, #a855f7 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px"
        }}
      />

      {/* Header toolbar */}
      <div className="relative z-10 flex items-center justify-between mb-8 pb-4 border-b border-slate-800/80">
        <button
          onClick={() => {
            GlobalAudio.stopSong();
            onBack();
          }}
          className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 cursor-pointer text-xs font-mono font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO TITLE</span>
        </button>

        <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 font-bold bg-cyan-950/45 px-2.5 py-1 rounded-md border border-cyan-500/10">
          <Music className="w-3.5 h-3.5 animate-bounce" />
          <span>SELECT CONCERT TRACK</span>
        </div>
      </div>

      {/* Title block */}
      <div className="relative z-10 mb-8 max-w-xl">
        <h2 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-sky-100 to-slate-300">
          楽曲選択
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          ミクの衣装を紡ぐ楽曲を一編、お選びください。楽曲ごとに特化された体験・演出が立ち上がります。
        </p>
      </div>

      {/* Bento Grid layout of songs */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1">
        {SONGS_PLAYLIST.map((song, index) => {
          const difficultyColors = {
            Easy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
            Medium: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
            Hard: "bg-amber-500/10 text-amber-400 border-amber-500/20",
            Expert: "bg-rose-500/10 text-rose-400 border-rose-500/20"
          };

          return (
            <motion.div
              key={song.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.5 }}
              className="group relative flex flex-col justify-between bg-slate-900/40 hover:bg-slate-900/90 border border-slate-800/80 hover:border-cyan-500/40 rounded-2xl p-5 hover:shadow-lg hover:shadow-cyan-950/25 backdrop-blur-sm transition-all duration-300"
            >
              {/* Dynamic Theme Glow effect on hover */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity duration-500"
                style={{
                  background: `radial-gradient(circle at center, ${song.primaryColor}, transparent 70%)`
                }}
              />

              {/* Upper Section (Meta & Badges) */}
              <div>
                <div className="flex items-center justify-between mb-4 text-[10px] font-mono leading-none">
                  {/* Theme Badge */}
                  <span
                    className="px-2 py-1 rounded bg-slate-800 font-semibold tracking-wider transition-colors group-hover:text-white"
                    style={{ color: song.primaryColor }}
                  >
                    {song.theme}
                  </span>

                  {/* Difficulty Badge */}
                  <span
                    className={`px-2 py-0.5 rounded border ${difficultyColors[song.difficulty]}`}
                  >
                    {song.difficulty}
                  </span>
                </div>

                {/* Song Title & Author */}
                <h3 className="text-xl font-bold tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                  {song.title}
                </h3>
                <span className="text-xs text-slate-400 block mt-0.5">by {song.artist}</span>

                {/* Theme description */}
                <p className="text-xs text-slate-300/80 mt-3 line-clamp-2 md:line-clamp-3 leading-relaxed">
                  {song.description}
                </p>
              </div>

              {/* Interactive preview player and start key */}
              <div className="mt-6 pt-4 border-t border-slate-800/40 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handlePreviewSong(song)}
                  className="flex items-center space-x-1.5 text-slate-400 hover:text-white transition-colors text-xs font-mono font-bold bg-slate-800/50 hover:bg-slate-800 px-2 py-1.5 rounded"
                  title="Click to preview synthesized beat"
                >
                  <Music className="w-3.5 h-3.5 text-cyan-400" />
                  <span>PREVIEW BEAT</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    GlobalAudio.init();
                    GlobalAudio.resume();
                    GlobalAudio.stopSong();
                    onSelectSong(song);
                  }}
                  className="flex items-center space-x-2 text-xs font-bold px-3 py-2 bg-gradient-to-r from-cyan-600/35 to-sky-600/40 hover:from-cyan-500 hover:to-cyan-400 text-white rounded-lg border border-cyan-400/30 shadow-sm transition-all duration-300 hover:scale-105 cursor-pointer"
                >
                  <span>STAGE START</span>
                  <Play className="w-3 h-3 fill-white" />
                </button>
              </div>

              {/* Unique decoration per song on hover */}
              <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ color: song.secondaryColor }} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
