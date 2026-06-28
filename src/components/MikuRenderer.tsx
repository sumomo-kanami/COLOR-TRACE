/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { CapturedLyric } from "../types";

interface MikuRendererProps {
  capturedLyrics: CapturedLyric[];
  theme: string;
  isDancing?: boolean;
  isWalking?: boolean;
  bpm?: number;
  hp?: number; // 0 to 100
  isDamaged?: boolean; // triggers the red damage flash
}

export const MikuRenderer: React.FC<MikuRendererProps> = ({
  capturedLyrics,
  theme,
  isDancing = false,
  isWalking = false,
  bpm = 120,
  hp = 100,
  isDamaged = false
}) => {
  // Determine color saturation / bloom based on lyrics count
  const isColorTheme = theme.includes("色");
  const isLingerTheme = theme.includes("余韻");
  const isPhotoTheme = theme.includes("写真");
  const isCosmicTheme = theme.includes("未来と音楽");
  const isTrueFakeTheme = theme.includes("本当");
  const isEnergyTheme = theme.includes("エネルギー");

  const captureRatio = Math.min(capturedLyrics.length / 10, 1.0); // full bloom at 10 lyrics

  // Build a map of captured parts
  const partsActive = useMemo(() => {
    const map: Record<string, string[]> = {
      headset: [],
      ribbons: [],
      sleeves: [],
      skirt: [],
      boots: [],
      wings: []
    };

    capturedLyrics.forEach((lyric, idx) => {
      if (idx % 5 === 0) map.ribbons.push(lyric.text);
      else if (idx % 5 === 1) map.headset.push(lyric.text);
      else if (idx % 5 === 2) map.sleeves.push(lyric.text);
      else if (idx % 5 === 3) map.skirt.push(lyric.text);
      else map.boots.push(lyric.text);
    });

    return map;
  }, [capturedLyrics]);

  // Color dynamics based on lyrics count & theme
  const colors = useMemo(() => {
    // If "こたえて" and no lyrics, start in monochrome!
    if (isColorTheme && capturedLyrics.length === 0) {
      return {
        hair: "#4b5563", // gray-600
        hairHighlight: "#9ca3af", // gray-400
        clothes: "#1f2937", // gray-800
        accent: "#374151", // gray-700
        skin: "#e5e7eb", // gray-200
        tie: "#6b7280" // gray-500
      };
    }

    // Gradual coloration for 'こたえて' (Color)
    if (isColorTheme) {
      const lerpHair = blendColors("#38bdf8", "#4b5563", 1 - captureRatio);
      return {
        hair: lerpHair,
        hairHighlight: blendColors("#ec4899", "#9ca3af", 1 - captureRatio),
        clothes: blendColors("#111827", "#1f2937", 1 - captureRatio),
        accent: blendColors("#06b6d4", "#374151", 1 - captureRatio),
        skin: "#fef08a", // soft anime warm cream
        tie: blendColors("#ec4899", "#6b7280", 1 - captureRatio)
      };
    }

    // Purple / Indigo 'アフター・ザ・カーテン' (Linger)
    if (isLingerTheme) {
      return {
        hair: "#8b5cf6", // Indigo purple
        hairHighlight: "#a78bfa",
        clothes: "#1e1b4b", // deep night
        accent: "#3b82f6", // clear blue
        skin: "#fffbeb",
        tie: "#ec4899"
      };
    }

    // Warm Retro Yellow 'シャッターチャンス' (Photo)
    if (isPhotoTheme) {
      return {
        hair: "#f59e0b", // Amber
        hairHighlight: "#fcd34d",
        clothes: "#27272a", // zinc dark
        accent: "#10b981", // emerald snap
        skin: "#fffaf0",
        tie: "#ef4444"
      };
    }

    // Cyber Cyan-Gold Constellation '世界最後の音楽隊' (Cosmic)
    if (isCosmicTheme) {
      return {
        hair: "#06b6d4", // cyan
        hairHighlight: "#f59e0b", // gold
        clothes: "#0f172a", // deep navy space
        accent: "#fbbf24", // cosmic gold
        skin: "#fafaf9",
        tie: "#06b6d4"
      };
    }

    // Dual-Tone Dark Cyber Pink vs Mint 'トリツクロジー' (True/Fake)
    if (isTrueFakeTheme) {
      return {
        hair: "#14b8a6", // teal/mint genuine
        hairHighlight: "#f43f5e", // rose falsehood
        clothes: "#090d16",
        accent: "#f43f5e",
        skin: "#fff5f5",
        tie: "#14b8a6"
      };
    }

    // Electric Violet Lightning 'TAKEOVER' (Energy)
    if (isEnergyTheme) {
      return {
        hair: "#d946ef", // magenta/fuchsia
        hairHighlight: "#eab308", // bright electric yellow
        clothes: "#18002a", // radioactive purple
        accent: "#eab308",
        skin: "#faf5ff",
        tie: "#a855f7"
      };
    }

    // Default Hatsune Miku classic cyan colors
    return {
      hair: "#06b6d4",
      hairHighlight: "#22d3ee",
      clothes: "#1f2937",
      accent: "#ec4899",
      skin: "#ffedd5",
      tie: "#06b6d4"
    };
  }, [theme, capturedLyrics.length, captureRatio, isColorTheme, isLingerTheme, isPhotoTheme, isCosmicTheme, isTrueFakeTheme, isEnergyTheme]);

  // Color blending helper
  function blendColors(color1: string, color2: string, ratio: number): string {
    if (isNaN(ratio) || ratio >= 1) return color2;
    if (ratio <= 0) return color1;
    const c1 = parseHex(color1);
    const c2 = parseHex(color2);
    const r = Math.round(c1.r + (c2.r - c1.r) * ratio);
    const g = Math.round(c1.g + (c2.g - c1.g) * ratio);
    const b = Math.round(c1.b + (c2.b - c1.b) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function parseHex(hex: string) {
    if (!hex) return { r: 0, g: 0, b: 0 };
    if (hex.startsWith("rgb")) {
      const match = hex.match(/\d+/g);
      if (match) return { r: parseInt(match[0]) || 0, g: parseInt(match[1]) || 0, b: parseInt(match[2]) || 0 };
    }
    const clean = hex.replace("#", "");
    const bigint = parseInt(clean, 16) || 0;
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255
    };
  }

  // Animation ticks
  const [danceTick, setDanceTick] = React.useState(0);
  React.useEffect(() => {
    let interval: any = null;
    if (isDancing || isWalking) {
      // Walk/Dance cycle speed is proportional to BPM
      const stepSpeed = (bpm / 120) * 6.5;
      interval = setInterval(() => {
        setDanceTick(t => (t + stepSpeed) % 360);
      }, 30);
    }
    return () => clearInterval(interval);
  }, [isDancing, isWalking, bpm]);

  const walkPhase = (danceTick * Math.PI) / 180;
  const isMoving = isDancing || isWalking;

  // Twice the frequency of leg swings for realistic natural bobbing
  const bobOffset = isMoving ? Math.sin(walkPhase * 2) * 5 : 0;
  const tailSwayL = isMoving ? Math.sin(walkPhase) * 11 : 0;
  const tailSwayR = isMoving ? Math.sin(walkPhase + Math.PI / 2) * 11 : 0;

  // Swings for walking leg & arm locomotion
  const legShiftL = isWalking ? Math.sin(walkPhase) * 16 : 0;
  const legShiftR = isWalking ? -Math.sin(walkPhase) * 16 : 0;
  const armShiftL = isWalking ? -Math.sin(walkPhase) * 12 : 0;
  const armShiftR = isWalking ? Math.sin(walkPhase) * 12 : 0;

  // Compute facial expression state based on current HP
  const activeExpression = useMemo(() => {
    if (hp <= 0) return "angry";
    if (hp <= 20) return "worried";
    if (hp <= 50) return "tired";
    return "normal";
  }, [hp]);

  // Design modular paths and elements for face styles
  const faceElements = useMemo(() => {
    switch (activeExpression) {
      case "tired":
        return {
          eyebrows: (
            <>
              {/* Slanted slightly tired/flat */}
              <path d="M 174,118 Q 185,116 194,119" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 206,119 Q 215,116 226,118" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
            </>
          ),
          eyes: (
            <>
              {/* Heavy/smaller eyes */}
              <ellipse cx="185" cy="131" rx="6" ry="8" fill="#0284c7" />
              <ellipse cx="183" cy="129" rx="2" ry="3" fill="#ffffff" />
              <path d="M 176,122 Q 185,119 193,124" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />

              <ellipse cx="215" cy="131" rx="6" ry="8" fill="#0284c7" />
              <ellipse cx="213" cy="129" rx="2" ry="3" fill="#ffffff" />
              <path d="M 207,124 Q 215,119 224,122" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
            </>
          ),
          mouth: (
            /* Flat mouth (｡-_-｡) */
            <path d="M 194,146 L 206,146" fill="none" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" />
          )
        };
      case "worried":
        return {
          eyebrows: (
            <>
              {/* Slanted up-inwards for worry */}
              <path d="M 174,113 Q 185,118 194,120" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 206,120 Q 215,118 226,113" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
            </>
          ),
          eyes: (
            <>
              {/* Worried shivers */}
              <ellipse cx="185" cy="131" rx="5.5" ry="9" fill="#0274b7" />
              <ellipse cx="183" cy="129" rx="1.5" ry="3" fill="#ffffff" />
              <circle cx="186.5" cy="132" r="1" fill="#ffffff" />
              <path d="M 176,122 Q 185,118 193,123" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />

              <ellipse cx="215" cy="131" rx="5.5" ry="9" fill="#0274b7" />
              <ellipse cx="213" cy="129" rx="1.5" ry="3" fill="#ffffff" />
              <circle cx="216.5" cy="132" r="1" fill="#ffffff" />
              <path d="M 207,123 Q 215,118 224,122" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
            </>
          ),
          mouth: (
            /* Wavy worried line */
            <path d="M 193,148 Q 197,144 200,148 Q 203,152 207,148" fill="none" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" />
          )
        };
      case "angry":
        return {
          eyebrows: (
            <>
              {/* Defiant angry slant (｀・ω・´) */}
              <path d="M 174,122 Q 185,117 194,111" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
              <path d="M 206,111 Q 215,117 226,122" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
            </>
          ),
          eyes: (
            <>
              {/* Direct gaze */}
              <ellipse cx="185" cy="130" rx="6" ry="10" fill="#0264a7" />
              <ellipse cx="183" cy="128" rx="2.5" ry="4" fill="#ffffff" />
              <path d="M 176,120 Q 185,116 193,122" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />

              <ellipse cx="215" cy="130" rx="6" ry="10" fill="#0264a7" />
              <ellipse cx="213" cy="128" rx="2.5" ry="4" fill="#ffffff" />
              <path d="M 207,120 Q 215,116 224,122" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
            </>
          ),
          mouth: (
            /* Angry pouting expression */
            <path d="M 194,149 Q 200,141 206,149" fill="none" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" />
          )
        };
      case "normal":
      default:
        return {
          eyebrows: (
            <>
              <path d="M 174,116 Q 185,112 195,116" fill="none" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M 205,116 Q 215,112 226,116" fill="none" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" />
            </>
          ),
          eyes: (
            <>
              <ellipse cx="185" cy="130" rx="6" ry="10" fill="#0284c7" />
              <ellipse cx="183" cy="128" rx="2" ry="4" fill="#ffffff" />
              <path d="M 176,120 Q 185,116 193,122" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />

              <ellipse cx="215" cy="130" rx="6" ry="10" fill="#0284c7" />
              <ellipse cx="213" cy="128" rx="2" ry="4" fill="#ffffff" />
              <path d="M 207,120 Q 215,116 224,122" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
            </>
          ),
          mouth: (
            <path d="M 194,146 Q 200,154 206,146" fill="none" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" />
          )
        };
    }
  }, [activeExpression]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center pointer-events-none drop-shadow-[0_0_25px_rgba(56,189,248,0.35)] select-none">
      <style>{`
        @keyframes lowHpPulse {
          0%, 100% { filter: drop-shadow(0 0 15px rgba(239, 68, 68, 0.45)); }
          50% { filter: drop-shadow(0 0 35px rgba(239, 68, 68, 0.95)) brightness(1.1); }
        }
        .animate-lowhp-pulse {
          animation: lowHpPulse 0.4s ease-in-out infinite alternate;
        }

        @keyframes damageFlashKey {
          0%, 100% { filter: brightness(1) drop-shadow(0 0 25px rgba(56,189,248,0.35)); }
          30%, 70% { filter: brightness(1.1) sepia(0.8) hue-rotate(-50deg) saturate(12) drop-shadow(0 0 35px rgba(239, 68, 68, 0.9)); }
          50% { filter: brightness(1.2) sepia(1) hue-rotate(-60deg) saturate(16) drop-shadow(0 0 50px rgb(239, 68, 68)); }
        }
        .damage-flash-active {
          animation: damageFlashKey 0.16s ease-in-out infinite;
        }
      `}</style>
      {/* Decorative Particle Halo ring */}
      <svg
        viewBox="0 0 400 400"
        className="absolute w-[360px] h-[360px] animate-[spin_20s_linear_infinite]"
        style={{ opacity: 0.15 + captureRatio * 0.4 }}
      >
        <circle
          cx="200"
          cy="200"
          r="160"
          fill="none"
          stroke={colors.accent}
          strokeWidth="2"
          strokeDasharray="10 15 20 5"
        />
        <circle
          cx="200"
          cy="200"
          r="175"
          fill="none"
          stroke={colors.hairHighlight}
          strokeWidth="1"
          strokeDasharray="4 8"
        />
        {/* Constellation line mappings if Cosmic Theme */}
        {isCosmicTheme && (
          <path
            d="M 120,80 L 160,50 L 240,50 L 280,80 M 80,180 L 50,220 M 320,180 L 350,220"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
        )}
      </svg>

      {/* Main Hatsune Miku SVG Render Frame */}
      <svg
        id="miku-vector-graphic"
        viewBox="0 0 400 420"
        className={`w-[300px] h-[315px] z-10 transition-all duration-300 ${
          isDamaged ? "damage-flash-active" : ""
        } ${hp <= 20 && hp > 0 ? "animate-lowhp-pulse" : ""}`}
        style={{
          transform: `translate(${isWalking ? Math.sin(walkPhase) * 5 : 0}px, ${bobOffset}px)`
        }}
      >
        <defs>
          {/* Neon glow filters */}
          <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="backHairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.hair} />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>
        </defs>

        {/* 1. TWIN TAILS (HAIR) */}
        {/* Left Twin Tail */}
        <path
          d={`M 140,100 C 60,110 ${30 + tailSwayL},190 40,290 C 20,240 70,160 140,115 Z`}
          fill="url(#backHairGrad)"
          stroke={colors.hairHighlight}
          strokeWidth={capturedLyrics.length > 0 ? "2.5" : "1"}
          filter={capturedLyrics.length > 0 ? "url(#neon-glow)" : undefined}
          className="transition-all duration-500"
        />
        {/* Right Twin Tail */}
        <path
          d={`M 260,100 C 340,110 ${370 + tailSwayR},190 360,290 C 380,240 330,160 260,115 Z`}
          fill="url(#backHairGrad)"
          stroke={colors.hairHighlight}
          strokeWidth={capturedLyrics.length > 0 ? "2.5" : "1"}
          filter={capturedLyrics.length > 0 ? "url(#neon-glow)" : undefined}
          className="transition-all duration-500"
        />

        {/* 2. BODY & LIMBS */}
        {/* Head Base Hair Back */}
        <path d="M 135,115 Q 200,70 265,115 Q 200,90 135,115 Z" fill={colors.hair} />

        {/* Neck */}
        <rect x="188" y="160" width="24" height="25" fill={colors.skin} rx="4" />

        {/* Left Sleeve (Armwarmer) */}
        <path
          d={`M 110,185 L ${85 + armShiftL},260 L ${105 + armShiftL},265 L 130,190 Z`}
          fill={colors.clothes}
          stroke={colors.accent}
          strokeWidth="1.5"
          className="transition-all duration-300"
        />
        {/* Right Sleeve (Armwarmer) */}
        <path
          d={`M 290,185 L ${315 + armShiftR},260 L ${295 + armShiftR},265 L 270,190 Z`}
          fill={colors.clothes}
          stroke={colors.accent}
          strokeWidth="1.5"
          className="transition-all duration-300"
        />

        {/* Body Form / Vest */}
        <path
          d="M 155,180 L 245,180 L 235,260 L 165,260 Z"
          fill={colors.clothes}
          stroke={colors.accent}
          strokeWidth="1"
          className="transition-all duration-300"
        />

        {/* Neck Collar */}
        <path d="M 170,180 L 200,200 L 230,180 L 215,175 L 185,175 Z" fill="#ffffff" stroke="#cbd5e1" />

        {/* Neck Tie */}
        <path
          d="M 194,195 L 206,195 L 210,245 L 200,260 L 190,245 Z"
          fill={colors.tie}
          filter="url(#neon-glow)"
          className="transition-all duration-300"
        />

        {/* 3. SKIRT */}
        {/* Pleated futuristic floating panels */}
        <path
          d="M 160,260 Q 200,255 240,260 L 275,320 Q 200,310 125,320 Z"
          fill={colors.clothes}
          stroke={colors.accent}
          strokeWidth={capturedLyrics.length > 5 ? "3" : "1.5"}
          className="transition-all duration-300"
        />
        {/* Left mini panel skirt */}
        <path d="M 145,262 L 160,260 L 125,320 L 110,314 Z" fill="#374151" opacity="0.6" />
        {/* Right mini panel skirt */}
        <path d="M 240,260 L 255,262 L 290,314 L 275,320 Z" fill="#374151" opacity="0.6" />

        {/* 4. BOOTS (THIGH HIGHS) */}
        {/* Left Leg / Boot */}
        <path
          d={`M 155,320 L ${165 + legShiftL},410 L ${135 + legShiftL},410 L 140,320 Z`}
          fill={colors.clothes}
          stroke={colors.accent}
          strokeWidth="1.5"
          className="transition-all duration-300"
        />
        {/* Right Leg / Boot */}
        <path
          d={`M 245,320 L ${235 + legShiftR},410 L ${265 + legShiftR},410 L 260,320 Z`}
          fill={colors.clothes}
          stroke={colors.accent}
          strokeWidth="1.5"
          className="transition-all duration-300"
        />

        {/* 5. FACE (ANIME STYLING) */}
        <circle cx="200" cy="130" r="42" fill={colors.skin} />
        {/* Eyebrows */}
        <g>{faceElements.eyebrows}</g>
        {/* Eyes (Cute cyber cyan anime eyes with custom expressions) */}
        <g>{faceElements.eyes}</g>
        {/* Mouth (Smile, tired line, worried wave, or angry pout) */}
        <g>{faceElements.mouth}</g>

        {/* Front Hair Bangs */}
        <path
          d="M 158,95 Q 165,145 170,148 L 175,110 L 190,147 L 200,105 L 210,147 L 225,110 L 230,148 Q 235,145 242,95 C 220,78 180,78 158,95 Z"
          fill={colors.hair}
        />
        {/* Long sidelocks framed down */}
        <path d="M 158,95 C 150,140 145,180 148,220 L 155,220 L 161,105 Z" fill={colors.hair} />
        <path d="M 242,95 C 250,140 255,180 252,220 L 245,220 L 239,105 Z" fill={colors.hair} />

        {/* 6. ACCESSORIES */}
        {/* Hair Ribbons (Magenta glow blocks) */}
        <rect
          x="134"
          y="93"
          width="14"
          height="14"
          fill={capturedLyrics.length > 0 ? colors.accent : "#374151"}
          stroke={colors.hairHighlight}
          strokeWidth="1"
          rx="2"
          transform="rotate(15 141 100)"
          className="transition-all duration-300"
        />
        <rect
          x="252"
          y="93"
          width="14"
          height="14"
          fill={capturedLyrics.length > 0 ? colors.accent : "#374151"}
          stroke={colors.hairHighlight}
          strokeWidth="1"
          rx="2"
          transform="rotate(-15 259 100)"
          className="transition-all duration-300"
        />

        {/* Cyber Headset */}
        <rect
          x="152"
          y="104"
          width="8"
          height="24"
          fill="#111827"
          rx="2"
          stroke={colors.hairHighlight}
          strokeWidth="1"
        />
        <rect
          x="240"
          y="104"
          width="8"
          height="24"
          fill="#111827"
          rx="2"
          stroke={colors.hairHighlight}
          strokeWidth="1"
        />
        {/* Headband arch over head */}
        <path d="M 158,102 Q 200,82 242,102" fill="none" stroke="#1f2937" strokeWidth="4" />
        <path d="M 158,102 Q 200,82 242,102" fill="none" stroke={colors.hairHighlight} strokeWidth="1" />
      </svg>

      {/* 7. DYNAMIC LYRICS OVERLAY: Visual printing of letters as badges directly mapped onto Miku */}
      <div className="absolute inset-x-0 bottom-0 top-[10px] flex flex-col justify-between items-center pointer-events-none text-[8px] font-mono leading-none text-center select-none">
        
        {/* Headset / Ribbons Lyrics */}
        <div className="flex justify-between w-[240px] mt-16 scale-90">
          <div className="bg-slate-900/90 border border-cyan-400 text-cyan-300 px-1 rounded-sm max-w-[90px] truncate shadow-[0_0_8px_rgba(34,211,238,0.5)] transition-all animate-bounce">
            {partsActive.ribbons[0] ? `Ribbon: ${partsActive.ribbons[0]}` : "ーー"}
          </div>
          <div className="bg-slate-900/90 border border-pink-500 text-pink-300 px-1 rounded-sm max-w-[90px] truncate shadow-[0_0_8px_rgba(236,72,153,0.5)] transition-all animate-bounce">
            {partsActive.headset[0] ? `Headset: ${partsActive.headset[0]}` : "ーー"}
          </div>
        </div>

        {/* Sleeves / Arms Lyrics */}
        <div className="flex justify-between w-[290px] mt-1 p-1">
          <div className="bg-zinc-900/80 border border-indigo-400 text-indigo-300 px-1 rounded-sm max-w-[100px] truncate -rotate-12 transform origin-left transition-all">
            {partsActive.sleeves[0] ? `L-Arm: ${partsActive.sleeves[0]}` : "ーー"}
          </div>
          <div className="bg-zinc-900/80 border border-indigo-400 text-indigo-300 px-1 rounded-sm max-w-[100px] truncate rotate-12 transform origin-right transition-all">
            {partsActive.sleeves[1] ? `R-Arm: ${partsActive.sleeves[1]}` : "ーー"}
          </div>
        </div>

        {/* Skirt Panel Scroll (Displaying up to 4 captured lyrics as virtual pleat threads) */}
        <div className="mt-16 flex flex-col items-center justify-center space-y-[2px] bg-slate-950/80 border border-emerald-400/30 px-3 py-1 rounded w-[190px] shadow-[inset_0_0_6px_rgba(52,211,153,0.2)]">
          <div className="text-[7px] text-emerald-400 uppercase tracking-widest font-bold opacity-60">
            Costume Panel Threads
          </div>
          {partsActive.skirt.length > 0 ? (
            partsActive.skirt.slice(-3).map((txt, index) => (
              <span
                key={index}
                className="text-white font-sans text-[9px] font-semibold animate-pulse leading-normal block max-w-[170px] truncate"
                style={{
                  color: isPhotoTheme ? "#f59e0b" : isEnergyTheme ? "#f5f3ff" : "#22d3ee",
                  textShadow: "0 0 6px currentColor"
                }}
              >
                {index + 1}. {txt}
              </span>
            ))
          ) : (
            <span className="text-gray-500 italic scale-90">No costume thread yet</span>
          )}
        </div>

        {/* Boots Lyric Track */}
        <div className="flex justify-between w-[210px] mb-3 scale-95">
          <div className="bg-slate-950/90 text-amber-300 border border-amber-500/40 px-1 rounded transform -skew-y-3 max-w-[90px] truncate">
            {partsActive.boots[0] ? `L-Boot: ${partsActive.boots[0]}` : "未装着"}
          </div>
          <div className="bg-slate-950/90 text-amber-300 border border-amber-500/40 px-1 rounded transform skew-y-3 max-w-[90px] truncate">
            {partsActive.boots[1] ? `R-Boot: ${partsActive.boots[1]}` : "未装着"}
          </div>
        </div>

      </div>

      {/* Retro/Glitch Overlay Indicator for Shutter/Takeover/Trichology */}
      {isPhotoTheme && capturedLyrics.length > 0 && (
        <div className="absolute top-1 right-2 bg-yellow-500 text-black text-[7px] px-1 font-mono uppercase tracking-widest rounded shadow font-bold">
          CAMERA CONNECTED
        </div>
      )}
      {isEnergyTheme && capturedLyrics.length > 0 && (
        <div className="absolute top-1 left-2 bg-fuchsia-500 text-white text-[7px] px-1 font-mono uppercase tracking-widest rounded shadow font-bold animate-pulse">
          OVERDRIVE MODE
        </div>
      )}
      {isColorTheme && (
        <div className="absolute bottom-1 right-2 text-[8px] font-mono text-cyan-400 opacity-60">
          Color Depth: {Math.round(captureRatio * 100)}%
        </div>
      )}

      {/* Angry game over dialogue bubble */}
      {activeExpression === "angry" && (
        <div className="absolute top-[40px] right-[15px] bg-red-950/95 text-red-100 border border-red-500 px-3 py-2 rounded-xl text-xs font-bold font-sans shadow-[0_0_15px_rgba(239,68,68,0.5)] max-w-[170px] leading-relaxed transition-all animate-bounce select-none z-35 pointer-events-auto">
          <div className="text-[10px] text-red-400 font-mono mb-0.5">(｀・ω・´)</div>
          「ちゃんと歌詞を届けてよ！」
          {/* tiny speech pointer arrow */}
          <div className="absolute bottom-[-6px] left-[25px] w-0 h-0 border-t-[6px] border-t-red-500 border-x-[6px] border-x-transparent" />
        </div>
      )}
    </div>
  );
};
