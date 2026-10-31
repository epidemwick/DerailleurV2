/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { retroAudio } from '../utils/soundEffects';

interface VimEditorProps {
  appType: 'vim' | 'nano';
  fileName: string;
  fileContent: string;
  onClose: () => void;
  onScrollDelta?: (deltaY: number) => void;
}

export const VimEditor: React.FC<VimEditorProps> = ({
  appType,
  fileName,
  fileContent,
  onClose,
  onScrollDelta
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'q' || (e.ctrlKey && e.key.toLowerCase() === 'x')) {
        e.preventDefault();
        retroAudio.playSwitchClick();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (onScrollDelta) {
      onScrollDelta(4);
    }
  };

  return (
    <section
      id="editor-view"
      role="dialog"
      aria-modal="true"
      aria-label={`Text editor: ${fileName}`}
    >
      <header id="editor-top-status">
        <span id="editor-app-title" className="shrink-0 font-bold">
          {appType === 'nano' ? 'nano 6.2' : 'VIM 8.2'}
        </span>
        <span id="editor-top-file" className="truncate text-right ml-2">File: {fileName}</span>
      </header>

      <div
        id="editor-content"
        ref={contentRef}
        tabIndex={0}
        onScroll={handleScroll}
        dangerouslySetInnerHTML={{ __html: fileContent }}
      />

      <footer id="editor-status">
        <span id="editor-bottom-file" className="truncate font-mono">"{fileName}"</span>
        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          <span className="hidden sm:inline text-[10px]">{appType === 'nano' ? 'Ctrl+X to exit' : ':q to exit'}</span>
          <button
            onClick={() => {
              retroAudio.playSwitchClick();
              onClose();
            }}
            className="bg-black text-[#ffb000] px-2 py-0.5 text-[11px] font-bold border border-black hover:bg-[#1a1505] active:translate-y-0.5 cursor-pointer"
            aria-label="Close editor"
          >
            [EXIT :q]
          </button>
        </div>
      </footer>
    </section>
  );
};
