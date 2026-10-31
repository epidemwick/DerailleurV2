/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { retroAudio } from '../utils/soundEffects';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

interface AiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiChatModal: React.FC<AiChatModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: "ePidOS Neural Co-Processor v4.09 Online. I have indexed 2d Lt Christian Chadwick's cyberspace operations record, USAF OTS commission, DLA supply analytics, TS/SCI clearance, and engineering projects. Ask me anything below.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickPrompts = [
    "OTS Military Commission",
    "TS/SCI Clearance",
    "DLA GS-12 Analytics",
    "F-16 Aircraft QA",
    "How to Contact"
  ];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || input).trim();
    if (!textToSend || isLoading) return;

    const userMsg: Message = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    retroAudio.playKeyClick();

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToSend })
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg: Message = {
          id: 'ai_' + Math.random().toString(36).substring(2, 9),
          sender: 'ai',
          text: data.reply || "Transmission acknowledged. No additional telemetry found.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiMsg]);
        retroAudio.playBeep(1200, 0.1);
      } else {
        throw new Error('API returned non-200');
      }
    } catch {
      // Local tactical fallback if offline or backend is unreachable
      const lower = textToSend.toLowerCase();
      let reply = "";
      if (lower.includes("clearance") || lower.includes("security") || lower.includes("ts/sci")) {
        reply = "2d Lt Christian Chadwick holds an active Top Secret clearance with Sensitive Compartmented Information access (TS/SCI), adjudicated through DoD DCSA.";
      } else if (lower.includes("military") || lower.includes("commission") || lower.includes("ots") || lower.includes("usaf") || lower.includes("ang")) {
        reply = "Christian completed USAF Officer Training School (OTS) at Maxwell AFB (June 14 - August 16) and serves as an Assistant Director of Operations / Warfighter Communications Operations Officer (17DX) in the 108th Wing Communications Squadron at Joint Base MDL.";
      } else if (lower.includes("dla") || lower.includes("job") || lower.includes("work") || lower.includes("experience")) {
        reply = "Christian serves dually as a civilian GS-12 Supply/Demand Analyst with the Defense Logistics Agency (DLA) in Philadelphia, and as a 17DX Cyberspace Operations Officer in the USAF ANG.";
      } else if (lower.includes("f-16") || lower.includes("qa") || lower.includes("fabrication") || lower.includes("mechanic")) {
        reply = "From 2015 to 2026, Christian served with the 177th Fighter Wing as an F-16 Sheet Metal Mechanic (WG-10) and Dual AFSC Quality Assurance Inspector, auditing structural repairs.";
      } else if (lower.includes("email") || lower.includes("contact") || lower.includes("hire") || lower.includes("reach")) {
        reply = "Direct transmission channels: Personal epidemwick@chadhawkcorps.com, Military christian.chadwick@us.af.mil, DoD DLA christian.chadwick@dla.mil, GitHub github.com/epidemwick.";
      } else {
        reply = `Query '${textToSend}' evaluated. Christian Chadwick is a Warfighter Communications Operations Officer (17DX) and DLA GS-12 Analyst with active TS/SCI clearance. Check ~/resume for full dossier records.`;
      }

      const aiMsg: Message = {
        id: 'ai_' + Math.random().toString(36).substring(2, 9),
        sender: 'ai',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
      retroAudio.playBeep(980, 0.1);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0e0a04] border-2 border-[#5bc0be] p-3 sm:p-5 max-w-lg w-full rounded-lg shadow-[0_0_35px_rgba(91,192,190,0.45)] font-mono text-xs text-[#ffb000] flex flex-col max-h-[92dvh] h-[520px]"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Tactile AI Copilot Dialog"
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-dashed border-[#5bc0be] pb-2 mb-2 sm:mb-3 shrink-0">
          <div className="font-bold tracking-widest text-xs sm:text-sm flex items-center gap-2 text-[#5bc0be]">
            <span>[ ⚡ TACTICAL AI CO-PROCESSOR ]</span>
          </div>
          <button
            onClick={() => {
              retroAudio.playSwitchClick();
              onClose();
            }}
            className="text-[#9e6b00] hover:text-[#ffb000] font-bold text-sm px-2 cursor-pointer transition-colors"
            title="Close dialog [ESC]"
          >
            [X]
          </button>
        </div>

        {/* Quick Prompt Suggestions */}
        <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-2 sm:mb-3 shrink-0">
          {quickPrompts.map(qp => (
            <button
              key={qp}
              onClick={() => handleSend(qp)}
              disabled={isLoading}
              className="text-[9.5px] sm:text-[10px] bg-[#171308] border border-[#3d2b05] hover:border-[#5bc0be] hover:text-[#5bc0be] text-[#ffb000] px-2 py-1 rounded-sm cursor-pointer transition-all uppercase"
            >
              + {qp}
            </button>
          ))}
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto space-y-2.5 sm:space-y-3 p-2.5 sm:p-3 bg-[#080602] border border-[#2b1f05] rounded-sm scrollbar-thin">
          {messages.map(m => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 mb-1 text-[8.5px] sm:text-[9px] text-[#9e6b00]">
                <span>{m.sender === 'user' ? 'OPERATOR' : 'ePidOS NEURAL BUS'}</span>
                <span>{m.timestamp}</span>
              </div>
              <div
                className={`p-2 sm:p-2.5 rounded-sm max-w-[90%] sm:max-w-[85%] text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-[#291e04] text-[#ffd266] border border-[#523d0a]'
                    : 'bg-[#0f1412] text-[#e8f7f6] border border-[#1e4544]'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex flex-col items-start">
              <div className="text-[8.5px] sm:text-[9px] text-[#9e6b00] mb-1">ePidOS NEURAL BUS // PROCESSING...</div>
              <div className="p-2 bg-[#0f1412] border border-[#1e4544] text-[#5bc0be] text-xs animate-pulse">
                λ Querying tactical inference engine...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSend();
          }}
          className="mt-2 sm:mt-3 flex gap-2 shrink-0"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask tactical AI about OTS, clearance, DLA, F-16s..."
            className="flex-1 bg-[#140e02] border border-[#5bc0be]/50 focus:border-[#5bc0be] text-[#ffb000] px-3 py-2 text-[16px] sm:text-xs rounded-sm outline-none transition-colors"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-[#5bc0be] hover:bg-[#72dedc] text-black font-bold px-3 sm:px-4 py-2 text-xs rounded-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            TRANSMIT
          </button>
        </form>
      </div>
    </div>
  );
};
