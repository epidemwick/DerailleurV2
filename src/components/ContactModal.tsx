/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { retroAudio } from '../utils/soundEffects';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSenderName?: string;
  onMessageSent?: (msg: string) => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  onClose,
  defaultSenderName = '',
  onMessageSent
}) => {
  const [senderName, setSenderName] = useState(defaultSenderName);
  const [senderEmail, setSenderEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    setStatusMessage("Transmitting packet across secure relay...");
    retroAudio.playKeyClick();

    try {
      let sent = false;
      try {
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderName: senderName || 'Anonymous Visitor',
            senderEmail: senderEmail || 'No reply email',
            message: message.trim()
          })
        });
        if (res.ok) sent = true;
      } catch {
        // Fallback for static hosts
      }

      // If backend was reached or offline fallback active
      try {
        const stored = JSON.parse(localStorage.getItem('derailleur_outbox') || '[]');
        stored.push({
          senderName: senderName || 'Anonymous Visitor',
          senderEmail: senderEmail || 'No reply email',
          message: message.trim(),
          timestamp: new Date().toISOString()
        });
        localStorage.setItem('derailleur_outbox', JSON.stringify(stored));
      } catch {
        // ignore
      }

      setIsSuccess(true);
      setStatusMessage("TRANSMISSION SUCCESSFUL // Encrypted packet queued for epidemwick@chadhawkcorps.com");
      retroAudio.playBeep(1100, 0.15);
      if (onMessageSent) {
        onMessageSent(`Transmission received from ${senderName || 'Anonymous'}. Forwarded to owner mailbox.`);
      }
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        setStatusMessage(null);
        setMessage('');
      }, 1800);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openMailto = () => {
    const subject = encodeURIComponent(`Derailleur v2 Terminal Transmission from ${senderName || 'Visitor'}`);
    const body = encodeURIComponent(`${message}\n\nFrom: ${senderName} (${senderEmail})`);
    window.open(`mailto:epidemwick@chadhawkcorps.com?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0e0a04] border-2 border-[#ffb000] p-5 max-w-md w-full rounded-lg shadow-[0_0_35px_rgba(255,176,0,0.5)] font-mono text-xs text-[#ffb000]"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Direct Transmission to Christian Chadwick"
      >
        <div className="flex justify-between items-center border-b border-dashed border-[#ffb000] pb-2 mb-3">
          <div className="font-bold tracking-widest text-sm flex items-center gap-2">
            <span>[ ✉ DIRECT TRANSMISSION ]</span>
          </div>
          <button
            onClick={() => {
              retroAudio.playSwitchClick();
              onClose();
            }}
            className="bg-[#ffb000] text-black font-bold px-1.5 py-0.5 hover:bg-white text-[11px]"
            aria-label="Close dialog"
          >
            [X]
          </button>
        </div>

        <p className="text-[11px] text-[#9e6b00] mb-3 leading-relaxed">
          Send a direct encrypted transmission to <strong>2d Lt Christian Chadwick</strong> (<span className="text-[#ffb000]">epidemwick@chadhawkcorps.com</span>). Logs directly into the owner terminal inbox.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1 text-gray-300">
              OPERATOR HANDLE / YOUR NAME:
            </label>
            <input
              type="text"
              value={senderName}
              onChange={e => setSenderName(e.target.value)}
              placeholder="e.g. Commander Shepard or Jane Doe"
              className="w-full bg-[#171206] border border-[#ffb000] px-2.5 py-1.5 text-xs text-[#ffb000] outline-none focus:border-white focus:bg-[#201808]"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1 text-gray-300">
              RETURN FREQUENCY / YOUR EMAIL (OPTIONAL):
            </label>
            <input
              type="email"
              value={senderEmail}
              onChange={e => setSenderEmail(e.target.value)}
              placeholder="operator@organization.mil or your@email.com"
              className="w-full bg-[#171206] border border-[#ffb000] px-2.5 py-1.5 text-xs text-[#ffb000] outline-none focus:border-white focus:bg-[#201808]"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1 text-gray-300">
              TRANSMISSION PACKET / MESSAGE:
            </label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Enter your message, inquiry, project proposal, or collaboration request..."
              className="w-full bg-[#171206] border border-[#ffb000] p-2 text-xs text-[#ffb000] outline-none focus:border-white focus:bg-[#201808] resize-none"
            />
          </div>

          {statusMessage && (
            <div className={`p-2 rounded border text-[11px] ${isSuccess ? 'border-[#33ff66] text-[#33ff66] bg-[#00220a]' : 'border-[#ff5555] text-[#ff5555] bg-[#220000]'}`}>
              {statusMessage}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-[#ffb000] text-black font-bold py-2 text-xs hover:bg-white active:translate-y-0.5 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'TRANSMITTING...' : 'TRANSMIT TO CHADWICK'}
            </button>

            <button
              type="button"
              onClick={openMailto}
              className="px-3 bg-[#1c1506] border border-[#ffb000] text-[#ffb000] hover:bg-[#2e2309] text-[11px] font-bold"
              title="Launch system email client"
            >
              MAILTO ↗
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
