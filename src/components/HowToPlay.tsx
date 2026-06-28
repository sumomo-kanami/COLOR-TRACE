/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Sparkles, Wand2, ShieldAlert, Zap, Compass, RefreshCw } from "lucide-react";
import { GlobalAudio } from "../utils/AudioEngine";

interface HowToPlayProps {
  onBack: () => void;
}

export const HowToPlay: React.FC<HowToPlayProps> = ({ onBack }) => {
  const [testCaught, setTestCaught] = useState(false);
  const [hoverCount, setHoverCount] = useState(0);

  const triggerTestLyric = () => {
    GlobalAudio.init();
    GlobalAudio.playHit("色");
    setTestCaught(true);
    setHoverCount(prev => prev + 1);
    setTimeout(() => {
      setTestCaught(false);
    }, 1200);
  };

  return (
    <div className="w-full min-h-full bg-[#030712] text-white p-6 md:p-10 flex flex-col justify-start relative pb-12">
      {/* Decorative cyber backdrop */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header bar */}
      <div className="relative z-10 flex items-center justify-between mb-8 pb-4 border-b border-slate-800/80">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 cursor-pointer text-xs font-mono font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO TITLE</span>
        </button>

        <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/45 px-2.5 py-1 rounded border border-emerald-500/10">
          HOW-TO GUIDE
        </span>
      </div>

      {/* Main flow */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 flex-1">
        {/* Core Instructions */}
        <div className="flex flex-col space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">遊び方 (How to Play)</h2>
            <p className="text-xs text-slate-400 mt-1">
              『COLOR TRACE』は、音楽と歌詞をキャッチする軌跡共創ゲームです。リズムゲームの枠を超えた、新しいアート体験をお届けします。
            </p>
          </div>

          {/* Three Core Rules */}
          <div className="space-y-4">
            <div className="bg-slate-900/50 border border-slate-805/70 p-4 rounded-xl flex items-start space-x-3">
              <div className="bg-cyan-500/10 p-2 rounded-lg text-cyan-400">
                <Compass className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">1. 歌詞をマウスでキャッチ</h3>
                <p className="text-xs text-slate-400 mt-1">
                  楽曲の進行に合わせて、画面中央のミクの周囲から文節（歌詞）オブジェクトが様々な方向に漂い出します。マウスカーソルをその上に置くと（ホバー）、キャッチ完了です！
                </p>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-805/70 p-4 rounded-xl flex items-start space-x-3">
              <div className="bg-amber-500/10 p-2 rounded-lg text-amber-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">2. 軌跡の軌道アート</h3>
                <p className="text-xs text-slate-400 mt-1">
                  プレイ中のあなたのすべての運動軌跡は「輝く余韻」として記録されます。公演が終了した後、あなたのライブ軌跡が巻き戻され、一幅のカンバスアートとして再生されます。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Interactive practice panel & Theme details */}
        <div className="flex flex-col space-y-6 justify-between">
          {/* Practice playground */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex flex-col items-center justify-center text-center relative h-[180px] overflow-hidden">
            <div className="absolute top-2 left-2 text-[8px] font-mono text-slate-500 uppercase tracking-wider">
              Practice Sandbox (テストゾーン)
            </div>

            <AnimatePresence mode="wait">
              {!testCaught ? (
                <motion.div
                  key="lyric-bubble"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  onMouseEnter={triggerTestLyric}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-sky-500/30 border border-cyan-400 text-cyan-300 font-semibold rounded-lg cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)] animate-pulse"
                >
                  未来
                </motion.div>
              ) : (
                <motion.div
                  key="splash-text"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1.2 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center"
                >
                  <Sparkles className="w-8 h-8 text-pink-400 animate-spin" />
                  <span className="text-xs font-bold text-white mt-1">
                    CATCH SUCCESS! (スコア＆軌道アップ)
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            <span className="text-[10px] text-slate-400 mt-3 block">
              {hoverCount > 0
                ? `Caught: ${hoverCount} times! お見事です！`
                : "マウスを「未来」に合わせてキャッチを試してみましょう。"}
            </span>
          </div>

          {/* Theme Rules Panel */}
          <div className="bg-slate-950/80 border border-slate-800/80 p-5 rounded-xl space-y-3.5">
            <h4 className="text-xs font-mono font-bold text-slate-350 tracking-wider uppercase border-b border-slate-800/60 pb-1.5 flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>注意が必要な特殊演出ルール</span>
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-baseline">
                <span className="font-semibold text-cyan-300 w-1/3">● トリツクロジー</span>
                <span className="text-slate-400 w-2/3">
                  本物の歌詞（白/シアン色に輝く）の他に、偽物の歌詞（暗い灰色、ノイズ付き）が出現します。偽物を取ると、ミクが乱れノイズが入るので無視しましょう！
                </span>
              </div>
              <div className="flex justify-between items-baseline border-t border-slate-900 pt-1.5">
                <span className="font-semibold text-amber-400 w-1/3">● シャッターチャンス</span>
                <span className="text-slate-400 w-2/3">
                  キャッチ成功のたびにカメラフラッシュが閃き、カメラのスナップ写真が溜まります。
                </span>
              </div>
              <div className="flex justify-between items-baseline border-t border-slate-900 pt-1.5">
                <span className="font-semibold text-purple-400 w-1/3">● アフターザカーテン</span>
                <span className="text-slate-400 w-2/3">
                  軌跡の残響が極めて長い間画面上に留まります。絵の具で描くように、大河のような軌跡を残してください。
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
