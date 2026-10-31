/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { retroAudio } from '../utils/soundEffects';

interface OperatorAvatarProps {
  operatorName: string;
  isLoggedIn: boolean;
}

export const OperatorAvatar: React.FC<OperatorAvatarProps> = ({ operatorName, isLoggedIn }) => {
  const [showDossier, setShowDossier] = useState<boolean>(false);

  const toggleDossier = (e: React.MouseEvent) => {
    e.stopPropagation();
    retroAudio.playSwitchClick();
    setShowDossier(prev => !prev);
  };

  return (
    <>
      <button
        type="button"
        className="avatar-box rounded-full overflow-hidden p-0 relative cursor-pointer hover:border-[#ffe066] hover:shadow-[0_0_12px_rgba(255,176,0,0.6)] transition-all"
        id="avatar-box"
        onClick={toggleDossier}
        title="Operator ID // 2d Lt Christian Chadwick (Click to view dossier)"
        aria-label="Operator Profile Avatar"
      >
        {/* Digitized 80s 1-bit amber phosphor pixel/bitmap portrait based on Christian Chadwick's wedding photo */}
        <svg
          viewBox="0 0 48 48"
          className="w-full h-full bg-[#140e04]"
          shapeRendering="crispEdges"
          aria-hidden="true"
        >
          <defs>
            {/* 80s phosphor glow & CRT scanline pattern */}
            <filter id="phosphor-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="0.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <pattern id="avatar-scanlines" width="100" height="2" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="100" y2="0" stroke="rgba(0,0,0,0.4)" strokeWidth="0.8" />
            </pattern>
          </defs>

          {/* Background CRT phosphor base */}
          <rect width="48" height="48" fill="#140e04" />

          {/* Dithered subtle background wall texture */}
          <rect x="0" y="0" width="48" height="48" fill="url(#avatar-scanlines)" />

          {/* Dark Charcoal Suit silhouette (shoulders & chest) */}
          <path
            d="M 6 48 L 10 35 L 17 31 L 24 33 L 31 31 L 38 35 L 42 48 Z"
            fill="#3a2705"
          />
          <path
            d="M 10 48 L 13 36 L 19 32 L 24 35 L 29 32 L 35 36 L 38 48 Z"
            fill="#1c1303"
          />

          {/* Crisp White Shirt Collar (glowing amber/cream highlights) */}
          <polygon points="18,29 23,28 20,35" fill="#ffb000" />
          <polygon points="30,29 25,28 28,35" fill="#ffe082" />

          {/* Textured Necktie (golden amber vertical matrix) */}
          <polygon points="22,30 26,30 27,42 24,47 21,42" fill="#d99100" />
          {/* Tie texture hash lines */}
          <line x1="23" y1="33" x2="25" y2="33" stroke="#ffe082" strokeWidth="0.8" />
          <line x1="23" y1="36" x2="26" y2="36" stroke="#ffe082" strokeWidth="0.8" />
          <line x1="22" y1="39" x2="26" y2="39" stroke="#ffe082" strokeWidth="0.8" />
          <line x1="23" y1="42" x2="25" y2="42" stroke="#ffe082" strokeWidth="0.8" />

          {/* Hands adjusting tie knot (distinguished wedding pose) */}
          {/* Right hand knuckles */}
          <rect x="18" y="34" width="3" height="4" fill="#ffb000" rx="0.5" />
          <rect x="16" y="36" width="3" height="4" fill="#d99100" rx="0.5" />
          {/* Left hand fingers touching tie knot */}
          <rect x="27" y="33" width="3" height="4" fill="#ffe082" rx="0.5" />
          <rect x="29" y="35" width="3" height="4" fill="#d99100" rx="0.5" />

          {/* Neck & Adam's apple */}
          <polygon points="20,24 28,24 27,29 21,29" fill="#ffb000" />
          <polygon points="23,26 25,26 24,28" fill="#9e6b00" />

          {/* Head & Face base (3/4 angle looking left) */}
          <path
            d="M 18 13 C 18 8 28 8 30 13 C 32 17 31 23 28 25 C 25 26 20 26 18 22 Z"
            fill="#ffb000"
          />

          {/* Fade Haircut (short neat sides, military fade, textured top) */}
          {/* Top dark textured hair */}
          <path
            d="M 17 12 C 17 7 29 6 31 10 C 31 13 30 14 28 14 C 26 14 20 13 17 14 Z"
            fill="#0d0a04"
          />
          {/* Side fade (stippled dots on right temple / fade) */}
          <path
            d="M 28 12 L 31 11 L 32 17 L 29 17 Z"
            fill="#4a3508"
          />
          <circle cx="30" cy="14" r="0.6" fill="#0d0a04" />
          <circle cx="31" cy="15" r="0.6" fill="#0d0a04" />

          {/* Ear with sculpted rim */}
          <path d="M 30 16 C 32 16 32 19 30 20 Z" fill="#d99100" />

          {/* Facial features (focused gaze looking left, defined brow, strong nose, trimmed beard) */}
          {/* Dark defined brow */}
          <line x1="19" y1="13" x2="23" y2="13" stroke="#0d0a04" strokeWidth="1.2" />
          {/* Eye gazing left */}
          <rect x="20" y="14" width="2" height="1.2" fill="#0d0a04" />
          <rect x="20.5" y="14.2" width="0.8" height="0.8" fill="#ffffff" />

          {/* Nose bridge & tip (3/4 profile) */}
          <polyline points="20,14 18.5,17 21,18" stroke="#7a5200" strokeWidth="1" fill="none" />

          {/* Trimmed beard & mustache contour */}
          <path
            d="M 18 19 L 22 19 L 23 20 L 21 21 L 18 20 Z"
            fill="#3a2503"
          />
          <path
            d="M 18 21 C 18 25 24 26 27 24 C 28 22 29 19 29 18 L 27 18 C 27 21 24 23 21 23 C 19 23 18 22 18 21 Z"
            fill="#2c1c04"
          />
          {/* Beard stipple texture */}
          <circle cx="19.5" cy="22" r="0.4" fill="#ffb000" />
          <circle cx="22" cy="24" r="0.4" fill="#ffb000" />
          <circle cx="25" cy="23" r="0.4" fill="#ffb000" />

          {/* Lapel boutonniere / flower detail from wedding suit */}
          <circle cx="15" cy="34" r="1.2" fill="#ffcc00" />
          <circle cx="14" cy="35.5" r="0.9" fill="#5bc0be" />

          {/* Phosphor CRT Scanline overlay across whole avatar */}
          <rect width="48" height="48" fill="url(#avatar-scanlines)" pointerEvents="none" />
        </svg>

        {/* Ambient CRT vignette border */}
        <div className="absolute inset-0 rounded-full border border-[rgba(255,176,0,0.6)] pointer-events-none" />
      </button>

      {/* Pop-up Tactical ID Dossier Card */}
      {showDossier && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          onClick={() => setShowDossier(false)}
        >
          <div
            className="bg-[#0e0a04] border-2 border-[#ffb000] p-5 max-w-sm w-full rounded-lg shadow-[0_0_30px_rgba(255,176,0,0.4)] font-mono text-xs text-[#ffb000] select-none"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-label="Operator Identity Dossier"
          >
            <div className="flex justify-between items-center border-b border-dashed border-[#ffb000] pb-2 mb-3">
              <span className="font-bold tracking-widest">[ OPERATOR IDENT CARD // DoD-USAF ]</span>
              <button
                onClick={() => setShowDossier(false)}
                className="bg-[#ffb000] text-black font-bold px-1.5 py-0.5 hover:bg-white text-[10px]"
              >
                [X]
              </button>
            </div>

            <div className="flex gap-4 items-center mb-3">
              <div className="w-20 h-20 border-2 border-[#ffb000] rounded-md overflow-hidden bg-black shrink-0 relative shadow-[0_0_10px_rgba(255,176,0,0.3)]">
                <svg viewBox="0 0 48 48" className="w-full h-full bg-[#140e04]" shapeRendering="crispEdges">
                  {/* Scaled digitized portrait in modal */}
                  <rect width="48" height="48" fill="#140e04" />
                  <path d="M 6 48 L 10 35 L 17 31 L 24 33 L 31 31 L 38 35 L 42 48 Z" fill="#3a2705" />
                  <polygon points="18,29 23,28 20,35" fill="#ffb000" />
                  <polygon points="30,29 25,28 28,35" fill="#ffe082" />
                  <polygon points="22,30 26,30 27,42 24,47 21,42" fill="#d99100" />
                  <rect x="18" y="34" width="3" height="4" fill="#ffb000" />
                  <rect x="27" y="33" width="3" height="4" fill="#ffe082" />
                  <polygon points="20,24 28,24 27,29 21,29" fill="#ffb000" />
                  <path d="M 18 13 C 18 8 28 8 30 13 C 32 17 31 23 28 25 C 25 26 20 26 18 22 Z" fill="#ffb000" />
                  <path d="M 17 12 C 17 7 29 6 31 10 C 31 13 30 14 28 14 C 26 14 20 13 17 14 Z" fill="#0d0a04" />
                  <line x1="19" y1="13" x2="23" y2="13" stroke="#0d0a04" strokeWidth="1.2" />
                  <rect x="20" y="14" width="2" height="1.2" fill="#0d0a04" />
                  <polyline points="20,14 18.5,17 21,18" stroke="#7a5200" strokeWidth="1" fill="none" />
                  <path d="M 18 21 C 18 25 24 26 27 24 C 28 22 29 19 29 18 L 27 18 C 27 21 24 23 21 23 C 19 23 18 22 18 21 Z" fill="#2c1c04" />
                  <circle cx="15" cy="34" r="1.4" fill="#ffcc00" />
                </svg>
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
              </div>

              <div className="space-y-1">
                <div className="text-sm font-bold text-white tracking-wide">2d Lt Christian J. Chadwick</div>
                <div className="text-[11px] text-[#5bc0be]">USAF Air National Guard // 108th Wing</div>
                <div className="text-[10px] text-[#9e6b00]">Warfighter Comms Operations (17DX)</div>
                <div className="text-[10px] text-[#9e6b00]">DoD DLA Supply/Demand Analyst (GS-12)</div>
              </div>
            </div>

            <div className="space-y-1 bg-[#171206] p-2.5 rounded border border-[#4a3508] text-[11px] leading-relaxed">
              <div><span className="text-gray-400">CLEARANCE:</span> <span className="text-[#33ff66] font-bold">TOP SECRET / SCI</span></div>
              <div><span className="text-gray-400">ASSIGNMENT:</span> Joint Base MDL / Philadelphia, PA</div>
              <div><span className="text-gray-400">CONTACT:</span> epidemwick@chadhawkcorps.com</div>
              <div><span className="text-gray-400">INTERESTS:</span> Lifting, Trail Running, Valve Products, Single-Malt Scotch</div>
            </div>

            <div className="mt-3 text-center">
              <button
                onClick={() => setShowDossier(false)}
                className="w-full bg-[#1c1506] border border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-black py-1 font-bold transition-all text-xs"
              >
                RETURN TO TERMINAL
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
