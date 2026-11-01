/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { FlipClock } from './FlipClock';
import { SystemStatus } from '../types/terminal';
import { retroAudio } from '../utils/soundEffects';

interface HardwareChassisProps {
  isPoweredOn: boolean;
  batteryLevel?: number;
  coreTemp?: number;
  systemStatus: SystemStatus;
  soundEnabled: boolean;
  wheelRotation: number;
  depressedButton: string | null;
  children: React.ReactNode;
  onRestart: () => void;
  onDegauss: () => void;
  onTogglePower: () => void;
  onToggleSound: () => void;
  onHwNavigate: (action: 'rew' | 'play' | 'ffwd') => void;
  onRotateWheel: (deltaY: number) => void;
}

export const HardwareChassis: React.FC<HardwareChassisProps> = ({
  isPoweredOn,
  batteryLevel = 94,
  coreTemp = 38,
  systemStatus,
  soundEnabled,
  wheelRotation,
  depressedButton,
  children,
  onRestart,
  onDegauss,
  onTogglePower,
  onToggleSound,
  onHwNavigate,
  onRotateWheel
}) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    document.body.style.userSelect = 'none';
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = e.clientY - startYRef.current;
      startYRef.current = e.clientY;
      onRotateWheel(delta * 2.2);
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onRotateWheel]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    onRotateWheel(e.deltaY * 0.7);
    retroAudio.playKeyClick();
  };

  const getLedClass = () => {
    if (!isPoweredOn) return 'led-poweroff';
    if (systemStatus === 'thinking') return 'led-thinking';
    if (systemStatus === 'online') return 'led-online';
    return 'led-offline';
  };

  return (
    <div id="device-chassis" role="region" aria-label="Derailleur v2 Handheld Cyberdeck">
      {/* Distressed Red Bezel Striping */}
      <div className="red-frame-stripe" aria-hidden="true" />

      {/* Top Bezel Controls: POWER first, RESTART second, DEGAUSS third */}
      <header className="bezel-top-controls" aria-label="Hardware top controls">
        <button
          className={`hw-top-btn power-btn ${!isPoweredOn ? 'off-state' : ''}`}
          id="hw-pwr-btn"
          onClick={onTogglePower}
          title="Toggle System Power"
          aria-label={isPoweredOn ? "Turn power off" : "Turn power on"}
        >
          <span className="pwr-dot" aria-hidden="true" />
          <span>POWER</span>
        </button>

        <button
          className={`hw-top-btn ${depressedButton === 'restart' ? 'depressed' : ''}`}
          onClick={onRestart}
          title="Cold Reboot System"
          aria-label="Restart system"
        >
          <span>RESTART</span>
        </button>

        <button
          className={`hw-top-btn degauss-btn ${depressedButton === 'degauss' ? 'depressed' : ''}`}
          onClick={onDegauss}
          title="Demagnetize CRT Coil (Degauss)"
          aria-label="Degauss CRT monitor"
          disabled={!isPoweredOn}
        >
          <span className="degauss-dot" aria-hidden="true" />
          <span>DEGAUSS</span>
        </button>

        <button
          className="hw-top-btn sound-btn"
          onClick={onToggleSound}
          title="Toggle Tactile Audio"
          aria-label={soundEnabled ? "Mute audio clicks" : "Unmute audio clicks"}
        >
          <span>{soundEnabled ? 'AUDIO: ON' : 'AUDIO: OFF'}</span>
        </button>

        {/* Realistic Retro Multi-Segment LED Battery Gauge */}
        <div
          className={`hw-batt-gauge ${!isPoweredOn ? 'off-state' : ''}`}
          id="hw-batt-gauge"
          title={`Internal Ni-MH 7.2V Cell Pack: ${batteryLevel}% [${batteryLevel <= 18 ? 'CRITICAL / LOW' : batteryLevel <= 50 ? 'DISCHARGING' : 'NOMINAL'}]`}
          role="status"
          aria-label={`Battery level ${batteryLevel} percent`}
        >
          <div className="batt-label-wrap">
            <span className="batt-text">BATT</span>
            <span className="batt-cell-tag">7.2V</span>
          </div>

          <div className="batt-ladder" aria-hidden="true">
            {/* Segment 1: Critical / Low (<20%) - Red */}
            <span
              className={`batt-segment seg-red ${isPoweredOn && batteryLevel > 0 ? 'lit' : ''} ${isPoweredOn && batteryLevel <= 18 ? 'pulsing' : ''}`}
              title="Cell 1: Red (Critical reserve)"
            />
            {/* Segment 2: Low-Mid (21%-40%) - Amber */}
            <span
              className={`batt-segment seg-amber ${isPoweredOn && batteryLevel >= 21 ? 'lit' : ''}`}
              title="Cell 2: Amber (Low reserve)"
            />
            {/* Segment 3: Mid (41%-60%) - Yellow */}
            <span
              className={`batt-segment seg-yellow ${isPoweredOn && batteryLevel >= 41 ? 'lit' : ''}`}
              title="Cell 3: Yellow (Mid capacity)"
            />
            {/* Segment 4: Mid-High (61%-80%) - Light Green */}
            <span
              className={`batt-segment seg-green ${isPoweredOn && batteryLevel >= 61 ? 'lit' : ''}`}
              title="Cell 4: Light Green (Good capacity)"
            />
            {/* Segment 5: Full (81%-100%) - Bright Green */}
            <span
              className={`batt-segment seg-green-bright ${isPoweredOn && batteryLevel >= 81 ? 'lit' : ''}`}
              title="Cell 5: Bright Green (Full charge)"
            />
          </div>

          <span className="batt-readout">{batteryLevel}%</span>
        </div>
      </header>

      <div className="bezel-top-label" aria-hidden="true">
        ◢ VOL // CH-02
      </div>

      {/* Right Side Bezel Arrow Markers (Interactive Scroll Buttons) */}
      <div className="scroll-bezel-marker">
        <button
          className="arrow-80s-btn"
          onClick={() => {
            onRotateWheel(-120);
            retroAudio.playKeyClick();
          }}
          title="Scroll viewport up"
          aria-label="Scroll viewport up"
        >
          ▲
        </button>
        <span className="scroll-text" aria-hidden="true">SCROLL</span>
        <button
          className="arrow-80s-btn"
          onClick={() => {
            onRotateWheel(120);
            retroAudio.playKeyClick();
          }}
          title="Scroll viewport down"
          aria-label="Scroll viewport down"
        >
          ▼
        </button>
      </div>

      {/* Right Side Protruding Rotary Scroll Wheel (Scrollable & Draggable) */}
      <div
        className="wheel-recess-slot"
        title="Rotary Scroll Wheel (Drag or Mousewheel to scroll screen)"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        role="scrollbar"
        aria-orientation="vertical"
        aria-valuenow={Math.round(wheelRotation)}
        aria-label="Rotary scroll wheel"
      >
        <div
          id="scroll-wheel"
          ref={wheelRef}
          style={{ backgroundPosition: `0px ${wheelRotation}px` }}
        />
      </div>

      {/* CRT Screen Slot */}
      {children}

      {/* Bottom Hardware Bezel Panel */}
      <footer className="bottom-hardware-deck" aria-label="Hardware status and branding">
        <div className="brand-cluster">
          <div className="derailleur-logo">
            DERAILLEUR<span>v2</span>
          </div>
          <div className="corp-stamp">PRODUCED BY CHADHAWK CORPS.</div>
        </div>

        <div className="status-cluster" aria-label={`System Link Status: ${systemStatus}`}>
          <div className="led-label" aria-hidden="true">
            SYS<br />LINK
          </div>
          <div
            id="status-led"
            className={getLedClass()}
            title={`Status: ${systemStatus}`}
            role="status"
            aria-live="polite"
          />
        </div>

        {/* Flip Clock Counter */}
        <FlipClock isPoweredOn={isPoweredOn} />
      </footer>
    </div>
  );
};
