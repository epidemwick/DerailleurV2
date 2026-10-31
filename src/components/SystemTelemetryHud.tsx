/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';

interface SystemTelemetryHudProps {
  coreTemp: number;
  isPoweredOn: boolean;
  isLoggedIn: boolean;
}

export const SystemTelemetryHud: React.FC<SystemTelemetryHudProps> = ({
  coreTemp,
  isPoweredOn,
  isLoggedIn
}) => {
  // Recent CPU load history for sparkline (12 data points)
  const [cpuHistory, setCpuHistory] = useState<number[]>([8, 12, 7, 14, 9, 11, 8, 15, 10, 8, 12, 9]);
  // Real-time network throughput (TX / RX in KB/s)
  const [netTx, setNetTx] = useState<number>(0.8);
  const [netRx, setNetRx] = useState<number>(3.2);
  const [netHistory, setNetHistory] = useState<number[]>([2, 4, 3, 6, 4, 5, 8, 4, 3, 5, 6, 4]);
  const [txPulse, setTxPulse] = useState<boolean>(false);
  const [rxPulse, setRxPulse] = useState<boolean>(false);

  // Current CPU load is latest sample
  const currentCpu = cpuHistory[cpuHistory.length - 1] || 8;

  // Compute fan RPM and rotation speed
  const fanRpm = !isPoweredOn
    ? 0
    : coreTemp >= 84
    ? 4800
    : coreTemp >= 74
    ? 3900
    : coreTemp >= 50
    ? 2800
    : 0;

  const fanSpinDuration = fanRpm === 4800 ? '0.15s' : fanRpm === 3900 ? '0.3s' : fanRpm === 2800 ? '0.65s' : '0s';

  // Compute thermal status tag and color
  const isCritical = coreTemp >= 84;
  const isThrottled = coreTemp >= 74;
  const isWarm = coreTemp >= 60;

  const clockFreq = isCritical ? '16MHz' : isThrottled ? '33MHz' : '66MHz';
  const statusLabel = isCritical ? 'OVERHEAT' : isThrottled ? 'THROTTLE' : isWarm ? 'WARM' : 'NOMINAL';

  // Tick CPU & Network metrics every 850ms
  useEffect(() => {
    if (!isPoweredOn) return;

    const interval = setInterval(() => {
      // CPU load scales with temperature and adds jitter
      let targetCpu = 6 + Math.floor(Math.random() * 8);
      if (coreTemp >= 84) {
        targetCpu = 92 + Math.floor(Math.random() * 8); // 92-100%
      } else if (coreTemp >= 74) {
        targetCpu = 65 + Math.floor(Math.random() * 20); // 65-85%
      } else if (coreTemp >= 55) {
        targetCpu = 28 + Math.floor(Math.random() * 24); // 28-52%
      }

      setCpuHistory(prev => [...prev.slice(1), targetCpu]);

      // Network traffic simulation
      const tx = +(0.2 + Math.random() * (coreTemp > 60 ? 4.5 : 1.6)).toFixed(1);
      const rx = +(0.8 + Math.random() * (coreTemp > 60 ? 12.0 : 4.8)).toFixed(1);
      setNetTx(tx);
      setNetRx(rx);
      setNetHistory(prev => [...prev.slice(1), Math.min(10, Math.round(rx))]);

      // Blink activity LEDs
      setTxPulse(Math.random() > 0.4);
      setRxPulse(Math.random() > 0.25);
    }, 850);

    return () => clearInterval(interval);
  }, [isPoweredOn, coreTemp]);

  if (!isPoweredOn) {
    return (
      <div className="telemetry-hud-container opacity-40 select-none" aria-hidden="true">
        <div className="telemetry-box text-[9px] text-neutral-600 border border-neutral-800 p-1">
          [ HARDWARE TELEMETRY // OFFLINE ]
        </div>
      </div>
    );
  }

  return (
    <aside
      className="telemetry-hud-container"
      id="telemetry-hud"
      aria-label="Hardware System Telemetry"
    >
      {/* Row 1: Temperature Gauge & Animated Forced-Air Fan */}
      <div className="telemetry-row">
        {/* Die Temperature */}
        <div
          className={`telemetry-item ${isCritical ? 'item-critical' : isThrottled ? 'item-throttled' : ''}`}
          title={`486DX2-66 CPU Junction Temp: ${Math.round(coreTemp)}°C [Clock: ${clockFreq}]`}
        >
          <div className="item-label-group">
            <span className="telemetry-title">DIE TEMP</span>
            <span
              className={`telemetry-status-tag ${
                isCritical
                  ? 'bg-red-950 text-red-400 border-red-700 font-bold'
                  : isThrottled
                  ? 'bg-amber-950 text-orange-400 border-orange-700 font-bold'
                  : isWarm
                  ? 'text-amber-300'
                  : 'text-neutral-400'
              }`}
            >
              {statusLabel}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`text-[11px] font-mono font-bold ${
                isCritical
                  ? 'text-red-400'
                  : isThrottled
                  ? 'text-orange-400'
                  : isWarm
                  ? 'text-amber-300'
                  : 'text-[#ffb000]'
              }`}
            >
              {Math.round(coreTemp)}°C
            </span>

            {/* Mini 6-segment LED thermal ladder */}
            <div className="telemetry-ladder" aria-hidden="true">
              <span className={`ladder-seg seg-green ${coreTemp >= 35 ? 'lit' : ''}`} />
              <span className={`ladder-seg seg-green ${coreTemp >= 48 ? 'lit' : ''}`} />
              <span className={`ladder-seg seg-amber ${coreTemp >= 60 ? 'lit' : ''}`} />
              <span className={`ladder-seg seg-amber ${coreTemp >= 68 ? 'lit' : ''}`} />
              <span className={`ladder-seg seg-red ${coreTemp >= 74 ? 'lit' : ''}`} />
              <span className={`ladder-seg seg-red ${coreTemp >= 84 ? 'lit' : ''}`} />
            </div>

            <span className="text-[8px] text-[#9e6b00] font-mono ml-auto">
              {clockFreq}
            </span>
          </div>
        </div>

        {/* Fan Status & Rotation Animation */}
        <div
          className="telemetry-item fan-item"
          title={`Copper Heatsink Blower: ${fanRpm > 0 ? `${fanRpm} RPM [FORCED AIR]` : 'PASSIVE CONVECTION [FAN OFF]'}`}
        >
          <div className="item-label-group">
            <span className="telemetry-title">CHASSIS FAN</span>
            <span className="text-[8px] font-mono text-neutral-400">
              {fanRpm > 0 ? `${fanRpm} RPM` : 'PASSIVE'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            {/* Spinning Fan Icon */}
            <div className="fan-icon-wrap" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                className="fan-svg"
                style={{
                  animation: fanRpm > 0 ? `fanSpin ${fanSpinDuration} linear infinite` : 'none',
                  color: isCritical ? '#ff4d3b' : isThrottled ? '#ffa024' : '#ffb000'
                }}
              >
                {/* 4-blade propeller */}
                <circle cx="12" cy="12" r="3" fill="currentColor" />
                <path
                  d="M12 9 C11 5 7 4 7 7 C7 9 10 11 12 12 Z"
                  fill="currentColor"
                  opacity="0.9"
                />
                <path
                  d="M15 12 C19 11 20 7 17 7 C15 7 13 10 12 12 Z"
                  fill="currentColor"
                  opacity="0.9"
                />
                <path
                  d="M12 15 C13 19 17 20 17 17 C17 15 14 13 12 12 Z"
                  fill="currentColor"
                  opacity="0.9"
                />
                <path
                  d="M9 12 C5 13 4 17 7 17 C9 17 11 14 12 12 Z"
                  fill="currentColor"
                  opacity="0.9"
                />
              </svg>
            </div>

            <div className="flex flex-col line-height-none">
              <span className={`text-[10px] font-mono font-bold ${fanRpm > 0 ? 'text-[#ffb000]' : 'text-neutral-500'}`}>
                {fanRpm > 0 ? `${fanRpm}` : '0'} <span className="text-[7.5px] font-normal text-neutral-400">RPM</span>
              </span>
              <span className="text-[7px] text-[#9e6b00] tracking-wider uppercase">
                {fanRpm >= 3900 ? 'HIGH FLOW' : fanRpm > 0 ? 'LOW NOISE' : 'IDLE OFF'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: CPU Load Graph & Network Traffic Meter */}
      <div className="telemetry-row mt-1">
        {/* CPU Load Graph with Sparkline */}
        <div
          className="telemetry-item"
          title={`CPU Load: ${currentCpu}% [486DX2 Pipeline]`}
        >
          <div className="item-label-group">
            <span className="telemetry-title">CPU LOAD</span>
            <span className={`text-[9px] font-mono font-bold ${currentCpu > 70 ? 'text-orange-400' : 'text-[#ffb000]'}`}>
              {currentCpu}%
            </span>
          </div>

          {/* SVG Raster Sparkline Bars */}
          <div className="sparkline-container mt-0.5" aria-hidden="true">
            {cpuHistory.map((val, idx) => {
              const heightPct = Math.max(12, Math.min(100, val));
              const isPeak = val >= 70;
              return (
                <div key={idx} className="sparkline-bar-slot">
                  <div
                    className={`sparkline-bar ${isPeak ? 'bar-peak' : ''}`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Network Traffic (TX/RX) */}
        <div
          className="telemetry-item"
          title={`Network I/O :: TX: ${netTx} KB/s | RX: ${netRx} KB/s`}
        >
          <div className="item-label-group">
            <span className="telemetry-title">NET TRAFFIC</span>
            <div className="flex items-center gap-1">
              <span
                className={`net-dot ${txPulse ? 'active' : ''}`}
                title="Transmitting Packets"
              />
              <span className="text-[7px] text-neutral-400 font-mono">TX</span>
              <span
                className={`net-dot ${rxPulse ? 'active' : ''}`}
                title="Receiving Packets"
              />
              <span className="text-[7px] text-neutral-400 font-mono">RX</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[8px] font-mono mt-0.5 px-0.5">
            <span className="text-neutral-300">
              ▲ <span className="text-[#ffb000]">{netTx}</span>K
            </span>
            <span className="text-neutral-300">
              ▼ <span className="text-[#5bc0be]">{netRx}</span>K
            </span>
            {/* Mini waveform bars */}
            <div className="flex items-end gap-0.5 h-3 ml-1" aria-hidden="true">
              {netHistory.slice(-5).map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-[#5bc0be]/70 rounded-2xs"
                  style={{ height: `${Math.max(2, h * 1.2)}px` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
