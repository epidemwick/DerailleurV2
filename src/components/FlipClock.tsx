/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';

interface FlipClockProps {
  isPoweredOn: boolean;
}

export const FlipClock: React.FC<FlipClockProps> = ({ isPoweredOn }) => {
  const [time, setTime] = useState<{
    mon: string;
    day: string;
    hr: string;
    min: string;
  }>({
    mon: 'OCT',
    day: '30',
    hr: '18',
    min: '49'
  });

  useEffect(() => {
    const updateTime = () => {
      if (!isPoweredOn) {
        setTime({ mon: '--', day: '--', hr: '--', min: '--' });
        return;
      }
      const now = new Date();
      const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      setTime({
        mon: months[now.getMonth()],
        day: String(now.getDate()).padStart(2, '0'),
        hr: String(now.getHours()).padStart(2, '0'),
        min: String(now.getMinutes()).padStart(2, '0')
      });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isPoweredOn]);

  return (
    <div
      className="flip-clock-glass-housing select-none"
      title="Hardware Split-Flap Clock"
      aria-label={`Current clock: ${time.mon} ${time.day} ${time.hr}:${time.min}`}
    >
      <div className="flip-card amber-flap" id="flip-mon">{time.mon}</div>
      <div className="flip-card" id="flip-day">{time.day}</div>
      <span className="flip-sep">:</span>
      <div className="flip-card" id="flip-hr">{time.hr}</div>
      <span className="flip-sep">:</span>
      <div className="flip-card" id="flip-min">{time.min}</div>
    </div>
  );
};
