/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { ArrowLeft, Heart, Music, Sparkles, Scale, Info } from "lucide-react";

interface CreditScreenProps {
  onBack: () => void;
}

export const CreditScreen: React.FC<CreditScreenProps> = ({ onBack }) => {
  return (
    <div className="w-full min-h-full bg-[#030712] text-white p-6 md:p-10 flex flex-col justify-start relative pb-12">
      
      {/* Decorative cyber bloom glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #06b6d4 1px, transparent 1px),
            linear-gradient(to bottom, #06b6d4 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px"
        }}
      />

      {/* Header bar */}
      <div className="relative z-10 flex items-center justify-between mb-8 pb-4 border-b border-slate-800/80">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 cursor-pointer text-xs font-mono font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO TITLE</span>
        </button>

        <span className="text-xs font-mono text-cyan-400 font-bold bg-cyan-950/45 px-2.5 py-1 rounded border border-cyan-500/10 flex items-center space-x-1.5">
          <Info className="w-3.5 h-3.5 text-cyan-400" />
          <span>ABOUT PROJECT</span>
        </span>
      </div>

      {/* Credits core content card */}
      <div className="relative z-10 max-w-2xl mx-auto w-full bg-slate-900/40 border border-slate-800/70 rounded-3xl p-6 md:p-8 space-y-8 backdrop-blur-md shadow-xl">
        
        {/* Concept Title */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1.5 text-pink-400 mb-1 animate-pulse">
            <Heart className="w-4 h-4 fill-pink-500 text-pink-500" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] font-black">
              Co-creation Tribute
            </span>
          </div>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-300">
            COLOR TRACE
          </h2>
          <span className="text-xs text-slate-400 tracking-[0.2em] block mt-1">
            〜歌詞で紡ぐ、世界にひとつのミク〜
          </span>
        </div>

        {/* Breakdown section */}
        <div className="space-y-6 text-sm text-slate-350 leading-relaxed">
          <div className="space-y-2">
            <h3 className="font-semibold text-white flex items-center space-x-2 border-b border-slate-800 pb-1 text-sm font-mono tracking-wider">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>PROJECT CONCEPT</span>
            </h3>
            <p className="text-xs text-slate-400">
              『COLOR TRACE』は、音楽をただ聴きリズムを叩くだけだった従来のリズムゲームの在り方から、歌詞を「キャッチし、収集し、まとうもの」へと再文脈化する、初音ミクファンとクリエイターのためのインタラクティブな共創ライブアート空間です。
            </p>
            <p className="text-xs text-slate-400">
              プレイヤーカーソルの物理的な軌道が、そのまま軌跡アートとして結晶化。あなただけのミク衣装がいま、紡ぎ出されます。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="font-semibold text-white flex items-center space-x-1.5 border-b border-slate-800 pb-1 text-xs font-mono uppercase tracking-wider text-cyan-300">
                <Music className="w-3.5 h-3.5" />
                <span>Featured Composers</span>
              </h4>
              <ul className="text-xs space-y-1.5 text-slate-400 font-mono">
                <li>• <strong>imie</strong> (Track: こたえて)</li>
                <li>• <strong>Rulmry</strong> (Track: アフター・ザ・カーテン)</li>
                <li>• <strong>夜未アガリ</strong> (Track: シャッターチャンス)</li>
                <li>• <strong>夏山よつぎ×ど～ぱみん</strong> (Track: 世界最後の音楽隊)</li>
                <li>• <strong>鶴三</strong> (Track: トリツクロジー)</li>
                <li>• <strong>Twinfield</strong> (Track: TAKEOVER)</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-white flex items-center space-x-1.5 border-b border-slate-800 pb-1 text-xs font-mono uppercase tracking-wider text-pink-300">
                <Scale className="w-3.5 h-3.5" />
                <span>Creative Rights</span>
              </h4>
              <p className="text-[10px] text-slate-400 leading-normal">
                本製品は、クリプトン・フューチャー・メディア株式会社のピアプロ・キャラクター・ライセンスに基づき、「初音ミク」の非営利かつファン活動としての利用ガイドラインに準拠して制作されています。
              </p>
            </div>
          </div>
        </div>

        {/* Footer closing block with pulse */}
        <div className="pt-6 border-t border-slate-800/60 text-center">
          <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
            Let the colors trace the futuristic melody forever.
          </span>
        </div>

      </div>
    </div>
  );
};
