/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';

interface GreekMatrixScreensaverProps {
  isActive: boolean;
  onDismiss: () => void;
}

const GREEK_CHARS = "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψω";

interface StreamColumn {
  x: number;
  headRow: number;
  speedRowsPerSec: number;
  accumRows: number;
  trailLength: number;
  chars: string[];
  active: boolean;
  cooldownSec: number;
}

export const GreekMatrixScreensaver: React.FC<GreekMatrixScreensaverProps> = ({
  isActive,
  onDismiss
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // User input listener to dismiss screensaver (with grace period & movement threshold)
  useEffect(() => {
    if (!isActive) return;

    let isImmune = true;
    const immuneTimer = setTimeout(() => {
      isImmune = false;
    }, 400);

    let initialMousePos: { x: number; y: number } | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (isImmune) return;
      if (!initialMousePos) {
        initialMousePos = { x: e.clientX, y: e.clientY };
        return;
      }
      const dist = Math.hypot(e.clientX - initialMousePos.x, e.clientY - initialMousePos.y);
      if (dist > 15) {
        onDismiss();
      }
    };

    const handleKeyOrClick = () => {
      if (isImmune) return;
      onDismiss();
    };

    window.addEventListener('keydown', handleKeyOrClick);
    window.addEventListener('mousedown', handleKeyOrClick);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('wheel', handleKeyOrClick);
    window.addEventListener('touchstart', handleKeyOrClick);

    return () => {
      clearTimeout(immuneTimer);
      window.removeEventListener('keydown', handleKeyOrClick);
      window.removeEventListener('mousedown', handleKeyOrClick);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('wheel', handleKeyOrClick);
      window.removeEventListener('touchstart', handleKeyOrClick);
    };
  }, [isActive, onDismiss]);

  // Crisp, grid-aligned, slow-falling Greek phosphor stream animation
  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 700);

    const fontSize = 18;
    const rowHeight = 22;
    const colWidth = 26;

    const randomGreekChar = () =>
      GREEK_CHARS[Math.floor(Math.random() * GREEK_CHARS.length)];

    let maxRows = Math.ceil(height / rowHeight) + 12;
    let numCols = Math.max(1, Math.floor(width / colWidth));
    let columns: StreamColumn[] = [];

    const initColumns = () => {
      maxRows = Math.ceil(height / rowHeight) + 12;
      numCols = Math.max(1, Math.floor(width / colWidth));
      columns = [];

      for (let i = 0; i < numCols; i++) {
        const chars: string[] = [];
        for (let r = 0; r < maxRows; r++) {
          chars.push(randomGreekChar());
        }
        // Stagger initial positions and speeds so the screen is calm and easy to read
        const startActive = Math.random() < 0.65;
        columns.push({
          x: Math.floor(i * colWidth + (colWidth - fontSize) * 0.5),
          headRow: startActive ? Math.floor(Math.random() * (maxRows * 0.7)) - 6 : -2,
          // Gentle, readable fall speed: 4.5 to 7.5 rows per second (~1 step every 140-220ms)
          speedRowsPerSec: 4.5 + Math.random() * 3.0,
          accumRows: 0,
          trailLength: 6 + Math.floor(Math.random() * 5), // Clean 6-10 character trail
          chars,
          active: startActive,
          cooldownSec: startActive ? 0 : Math.random() * 2.5
        });
      }
    };

    initColumns();

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
      initColumns();
    };
    window.addEventListener('resize', handleResize);

    let lastTime = performance.now();

    const render = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(render);

      const dt = Math.min(0.1, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      // Clear background completely each frame so characters never smear or overlap
      ctx.fillStyle = '#0d0a04';
      ctx.fillRect(0, 0, width, height);

      ctx.font = `bold ${fontSize}px "Courier New", Courier, monospace`;
      ctx.textBaseline = 'top';

      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];

        if (!col.active) {
          col.cooldownSec -= dt;
          if (col.cooldownSec <= 0) {
            col.active = true;
            col.headRow = -1;
            col.accumRows = 0;
            col.speedRowsPerSec = 4.5 + Math.random() * 3.0;
            col.trailLength = 6 + Math.floor(Math.random() * 5);
          }
          continue;
        }

        // Advance column in discrete grid steps
        col.accumRows += col.speedRowsPerSec * dt;
        if (col.accumRows >= 1) {
          const steps = Math.floor(col.accumRows);
          col.accumRows -= steps;
          col.headRow += steps;

          // Lock a fresh Greek character into the newly reached head cell
          if (col.headRow >= 0 && col.headRow < col.chars.length) {
            col.chars[col.headRow] = randomGreekChar();
          }
        }

        // Draw the discrete, stationary trail characters behind headRow
        for (let offset = col.trailLength; offset >= 0; offset--) {
          const rowIdx = col.headRow - offset;
          if (rowIdx < 0 || rowIdx >= maxRows) continue;

          const y = rowIdx * rowHeight;
          if (y < -rowHeight || y > height + rowHeight) continue;

          const ch = col.chars[rowIdx] || 'Ω';

          if (offset === 0) {
            // Leading character: crisp bright phosphor gold-white
            ctx.shadowColor = '#ffb000';
            ctx.shadowBlur = 6;
            ctx.fillStyle = '#fff3c4';
            ctx.fillText(ch, col.x, y);
          } else if (offset === 1) {
            // Second character: primary bright amber
            ctx.shadowBlur = 2;
            ctx.fillStyle = '#ffb000';
            ctx.fillText(ch, col.x, y);
          } else {
            // Stationary trail characters: smooth, legible step-down fade without jitter
            ctx.shadowBlur = 0;
            const progress = (offset - 1) / col.trailLength;
            const alpha = Math.max(0.12, +(0.78 * (1 - progress)).toFixed(2));
            ctx.fillStyle = `rgba(255, 168, 0, ${alpha})`;
            ctx.fillText(ch, col.x, y);
          }
        }

        ctx.shadowBlur = 0;

        // When the entire trail has fallen past the bottom of the screen, pause briefly then respawn
        if (col.headRow - col.trailLength > Math.ceil(height / rowHeight)) {
          col.active = false;
          col.cooldownSec = 0.4 + Math.random() * 1.8;
        }
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div
      className="absolute inset-0 z-40 bg-[#0d0a04] flex flex-col cursor-none select-none overflow-hidden"
      onClick={onDismiss}
      role="region"
      aria-label="Phosphor Greek Matrix Screensaver"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Screen Burn-in Protection Banner */}
      <div className="absolute top-3 left-4 right-4 flex justify-between items-center text-[10px] text-[#ffb000] tracking-widest bg-black/75 px-3 py-1 border border-[#4a3508] pointer-events-none">
        <span className="font-bold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#ffb000] animate-pulse" />
          EPIDOS v2 // PHOSPHOR BURN-IN PROTECTION [GREEK STREAM]
        </span>
        <span className="text-gray-300">PRESS ANY KEY OR TAP TO WAKE</span>
      </div>

      {/* Subtle CRT Scanline Overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.28) 50%)",
          backgroundSize: "100% 4px"
        }}
      />
    </div>
  );
};
