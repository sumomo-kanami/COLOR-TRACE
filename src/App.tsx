/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Song, CapturedLyric, MousePoint } from "./types";
import { TitleScreen } from "./components/TitleScreen";
import { SongSelectScreen } from "./components/SongSelectScreen";
import { HowToPlay } from "./components/HowToPlay";
import { GamePlayScreen } from "./components/GamePlayScreen";
import { ResultScreen } from "./components/ResultScreen";
import { GalleryScreen } from "./components/GalleryScreen";
import { CreditScreen } from "./components/CreditScreen";
import { Sparkles, Music } from "lucide-react";
import { loadSongToPlayer } from "./utils/textalive";

type ActivePage =
  | "title"
  | "song_select"
  | "how_to_play"
  | "gameplay"
  | "result"
  | "gallery"
  | "credit";

export default function App() {
  const [currentPage, setCurrentPage] = useState<ActivePage>("title");

  // Game session states
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [sessionCaptured, setSessionCaptured] = useState<CapturedLyric[]>([]);
  const [sessionTrace, setSessionTrace] = useState<MousePoint[]>([]);
  const [sessionScore, setSessionScore] = useState(0);

  // Scene navigators
  const navigateTo = (page: ActivePage) => {
    setCurrentPage(page);
  };

  const handleStartGame = (song: Song) => {
    setSelectedSong(song);
    setSessionCaptured([]);
    setSessionTrace([]);
    setSessionScore(0);
    loadSongToPlayer(song); // Load chosen track into TextAlive dynamically
    navigateTo("gameplay");
  };

  const handleFinishStage = (data: {
    capturedLyrics: CapturedLyric[];
    mouseTrace: MousePoint[];
    score: number;
  }) => {
    setSessionCaptured(data.capturedLyrics);
    setSessionTrace(data.mouseTrace);
    setSessionScore(data.score);
    navigateTo("result");
  };

  const handleRestart = () => {
    setSelectedSong(null);
    setSessionCaptured([]);
    setSessionTrace([]);
    setSessionScore(0);
    navigateTo("song_select");
  };

  const handleBackToTitle = () => {
    setSelectedSong(null);
    setSessionCaptured([]);
    setSessionTrace([]);
    setSessionScore(0);
    navigateTo("title");
  };

  return (
    <div className="w-full h-screen min-h-[580px] bg-[#030712] text-white font-sans flex flex-col justify-between select-none overflow-hidden">
      
      {/* 2. Primary Page Router Frame with Motion Page transitions */}
      <div className="flex-1 w-full relative h-[calc(100vh-25px)] overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="w-full h-full"
          >
            {currentPage === "title" && (
              <TitleScreen 
                onNavigate={navigateTo} 
                onSelectSong={handleStartGame}
              />
            )}

            {currentPage === "song_select" && (
              <SongSelectScreen
                onBack={() => navigateTo("title")}
                onSelectSong={handleStartGame}
              />
            )}

            {currentPage === "how_to_play" && (
              <HowToPlay onBack={() => navigateTo("title")} />
            )}

            {currentPage === "gameplay" && selectedSong && (
              <GamePlayScreen
                song={selectedSong}
                onQuit={() => navigateTo("song_select")}
                onFinishStage={handleFinishStage}
                onBackToTitle={handleBackToTitle}
              />
            )}

            {currentPage === "result" && selectedSong && (
              <ResultScreen
                song={selectedSong}
                capturedLyrics={sessionCaptured}
                mouseTrace={sessionTrace}
                score={sessionScore}
                onRestart={handleRestart}
                onGoToGallery={() => navigateTo("gallery")}
                onBackToTitle={handleBackToTitle}
              />
            )}

            {currentPage === "gallery" && (
              <GalleryScreen onBack={() => navigateTo("title")} />
            )}

            {currentPage === "credit" && (
              <CreditScreen onBack={() => navigateTo("title")} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Decorative Compact Workspace Rail in margin (No slop according to design guidelines) */}
      <footer className="h-[25px] bg-[#030712] border-t border-slate-900 flex items-center justify-between px-4 text-[9px] font-mono text-slate-500 shrink-0 select-none pointer-events-none z-50">
        <div className="flex items-center space-x-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>COLOR TRACE ~ Spinning hatsune miku with your cursor lines</span>
        </div>
        <div className="flex items-center space-x-3">
          <span>CO-CREATION ARTWORK STAGE</span>
          <span className="hidden sm:inline">2026</span>
        </div>
      </footer>
    </div>
  );
}
