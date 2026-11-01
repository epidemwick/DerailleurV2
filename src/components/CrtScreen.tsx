/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { FileSystemData, TerminalLine } from '../types/terminal';
import { VimEditor } from './VimEditor';
import { OperatorAvatar } from './OperatorAvatar';
import { GreekMatrixScreensaver } from './GreekMatrixScreensaver';
import { retroAudio } from '../utils/soundEffects';

interface CrtScreenProps {
  isPoweredOn: boolean;
  isDegaussing: boolean;
  isLoggedIn: boolean;
  isAuthenticating: boolean;
  operatorName: string;
  currentDir: string;
  activeFile: string | null;
  fileSystem: FileSystemData;
  terminalLines: TerminalLine[];
  editorState: {
    isOpen: boolean;
    appType: 'vim' | 'nano';
    fileName: string;
    fileContent: string;
  } | null;
  onExecuteCommand: (cmd: string) => void;
  onLoginSubmit: (handle: string) => void;
  onCloseEditor: () => void;
  onNavigateDir: (dir: string) => void;
  onOpenFile: (dir: string, file: string) => void;
  onScrollDelta: (deltaY: number) => void;
  onOpenContactModal?: () => void;
  onOpenAdminModal?: () => void;
  onOpenAiChatModal?: () => void;
  isScreensaverActive?: boolean;
  onDismissScreensaver?: () => void;
  isAdmin?: boolean;
  coreTemp?: number;
  isFlickerActive?: boolean;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}

export const CrtScreen: React.FC<CrtScreenProps> = ({
  isPoweredOn,
  isDegaussing,
  isLoggedIn,
  isAuthenticating,
  operatorName,
  currentDir,
  activeFile,
  fileSystem,
  terminalLines,
  editorState,
  onExecuteCommand,
  onLoginSubmit,
  onCloseEditor,
  onNavigateDir,
  onOpenFile,
  onScrollDelta,
  onOpenContactModal,
  onOpenAdminModal,
  onOpenAiChatModal,
  isScreensaverActive,
  onDismissScreensaver,
  isAdmin,
  coreTemp = 38,
  isFlickerActive = true,
  scrollRef
}) => {
  const [inputValue, setInputValue] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const localTerminalRef = useRef<HTMLDivElement>(null);
  const terminalContainerRef = scrollRef || localTerminalRef;
  const inputRef = useRef<HTMLInputElement>(null);
  const screenInnerRef = useRef<HTMLDivElement>(null);

  // Keep screen text 100% crisp and readable (thermal metrics available in commands)
  const getThermalClass = () => '';

  const isMobileOrTouch = () =>
    typeof window !== 'undefined' &&
    (window.innerWidth <= 768 || window.matchMedia('(pointer: coarse)').matches);

  // Reset horizontal scroll whenever directory or active file changes
  useEffect(() => {
    if (screenInnerRef.current) {
      screenInnerRef.current.scrollLeft = 0;
    }
  }, [currentDir, activeFile, editorState]);

  // Keep internal terminal output scrolled to latest line without scrolling outer browser window
  useEffect(() => {
    if (!editorState?.isOpen && terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [terminalLines, editorState, terminalContainerRef]);

  // Keep focus on input on desktop only (avoid auto-popping mobile keyboard and dragging viewport)
  useEffect(() => {
    if (isPoweredOn && !editorState?.isOpen && !isAuthenticating && !isMobileOrTouch()) {
      inputRef.current?.focus();
    }
  }, [isPoweredOn, editorState, isAuthenticating]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isPoweredOn || isAuthenticating) return;

    // Up / Down arrow history navigation
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIdx = historyIndex + 1 < commandHistory.length ? historyIndex + 1 : historyIndex;
      setHistoryIndex(nextIdx);
      setInputValue(commandHistory[commandHistory.length - 1 - nextIdx] || '');
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputValue(commandHistory[commandHistory.length - 1 - nextIdx] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputValue('');
      }
      return;
    }

    // Tab autocomplete
    if (e.key === 'Tab') {
      e.preventDefault();
      const currentInput = inputValue.trim();
      const dirObj = fileSystem[currentDir];
      if (!dirObj) return;

      const parts = currentInput.split(/\s+/);
      const lastWord = parts[parts.length - 1] || '';

      const candidates = [
        ...dirObj.folders.map(f => f + '/'),
        ...Object.keys(dirObj.files)
      ];

      const match = candidates.find(c => c.toLowerCase().startsWith(lastWord.toLowerCase()));
      if (match) {
        parts[parts.length - 1] = match;
        setInputValue(parts.join(' '));
        retroAudio.playBeep(980, 0.04);
      }
      return;
    }

    // Enter submission
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = inputValue.trim();
      setInputValue('');
      setHistoryIndex(-1);
      retroAudio.playHeavySwitch();

      if (!isLoggedIn) {
        onLoginSubmit(val);
      } else {
        if (val) {
          setCommandHistory(prev => [...prev, val]);
          onExecuteCommand(val);
          // Only scroll down when the user actively submits a command
          setTimeout(() => {
            if (terminalContainerRef.current) {
              terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
            }
          }, 40);
        }
      }
      return;
    }

    // Typing sound
    if (e.key.length === 1 || e.key === 'Backspace') {
      retroAudio.playKeyClick();
    }
  };

  const pathSuffix = currentDir === "~" ? "~" : currentDir;
  const isAboutActive = currentDir === "~/about" || activeFile === "about_me.txt";
  const isResumeActive = currentDir === "~/resume" || ["experience.txt", "education.txt", "skills.txt"].includes(activeFile || '');
  const isProjectsActive = currentDir === "~/projects" || activeFile === "README.txt";
  const isContactActive = currentDir === "~/contact" || activeFile === "contact_me.txt";

  const folders = [
    { dir: "~/about", name: "about/" },
    { dir: "~/resume", name: "resume/" },
    { dir: "~/projects", name: "projects/" },
    { dir: "~/contact", name: "contact/" }
  ];

  const handleNavCommand = (cmd: string) => {
    if (isMobileOrTouch()) {
      inputRef.current?.blur();
    }
    onExecuteCommand(cmd);
  };

  return (
    <div
      id="screen-bezel"
      className={isDegaussing ? "degaussing" : ""}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, a, nav, #top-nav, #editor-view')) {
          return;
        }
        if (isMobileOrTouch() && !target.closest('#input-line')) {
          return;
        }
        if (isPoweredOn && !editorState?.isOpen && !isAuthenticating) {
          inputRef.current?.focus();
        }
      }}
    >
      <div id="screen-inner" ref={screenInnerRef} className={isFlickerActive ? "crt-flicker-active" : ""}>
        {/* Top Navigation Bar: Left deck has IDENT card with buttons underneath; Right deck has full-width tree */}
        <nav id="top-nav" aria-label="Terminal Navigation">
          <div className="nav-left-deck">
            {/* Top Row: Operator Ident Card */}
            <div className="nav-left">
              <OperatorAvatar operatorName={operatorName} isLoggedIn={isLoggedIn} />
              <div className="flex flex-col min-w-0">
                <span id="nav-url" title={`derailleur://epidos/${pathSuffix}`}>
                  derailleur://epidos/{pathSuffix}
                </span>
                <span className="text-[8.5px] text-[#9e6b00] tracking-wider uppercase font-mono font-bold">
                  {operatorName.toLowerCase() === 'epidemwick' ? 'OWNER // TOP SECRET' : 'OPERATOR ACTIVE'}
                </span>
              </div>
            </div>

            {/* Bottom Row: Navigation buttons positioned directly under the IDENT card */}
            <div className="nav-links" role="group" aria-label="Quick directory shortcuts">
              <button
                className={`nav-btn ${isAboutActive ? 'active-nav' : ''}`}
                id="nav-btn-about"
                onClick={() => handleNavCommand('cd ~/about && ls')}
                disabled={!isLoggedIn || isAuthenticating || !isPoweredOn}
              >
                ABOUT
              </button>
              <button
                className={`nav-btn ${isResumeActive ? 'active-nav' : ''}`}
                id="nav-btn-resume"
                onClick={() => handleNavCommand('cd ~/resume && ls')}
                disabled={!isLoggedIn || isAuthenticating || !isPoweredOn}
              >
                RESUME
              </button>
              <button
                className={`nav-btn ${isProjectsActive ? 'active-nav' : ''}`}
                id="nav-btn-projects"
                onClick={() => handleNavCommand('cd ~/projects && ls')}
                disabled={!isLoggedIn || isAuthenticating || !isPoweredOn}
              >
                PROJECTS
              </button>
              <button
                className={`nav-btn ${isContactActive ? 'active-nav' : ''}`}
                id="nav-btn-contact"
                onClick={() => handleNavCommand('cd ~/contact && ls')}
                disabled={!isLoggedIn || isAuthenticating || !isPoweredOn}
              >
                CONTACT
              </button>
              <button
                className="nav-btn text-[#5bc0be] border-[#5bc0be]"
                id="nav-btn-msg"
                onClick={() => {
                  if (isMobileOrTouch()) inputRef.current?.blur();
                  onOpenContactModal?.();
                }}
                title="Transmit message to Christian Chadwick"
                disabled={!isLoggedIn || isAuthenticating || !isPoweredOn}
              >
                ✉ MSG
              </button>
              <button
                className="nav-btn text-[#ffd266] border-[#ffd266]"
                id="nav-btn-ai-chat"
                onClick={() => {
                  if (isMobileOrTouch()) inputRef.current?.blur();
                  onOpenAiChatModal?.();
                }}
                title="Open Tactical AI Co-Processor Chatbot"
                disabled={!isLoggedIn || isAuthenticating || !isPoweredOn}
              >
                ⚡ AI CHAT
              </button>
              {isAdmin && (
                <button
                  className="nav-btn text-[#33ff66] border-[#33ff66]"
                  id="nav-btn-audit"
                  onClick={() => {
                    if (isMobileOrTouch()) inputRef.current?.blur();
                    onOpenAdminModal?.();
                  }}
                  title="Owner telemetry & audit log portal"
                  disabled={!isLoggedIn || isAuthenticating || !isPoweredOn}
                >
                  🛡 AUDIT
                </button>
              )}
              <button
                className="nav-btn"
                id="nav-btn-clear"
                onClick={() => handleNavCommand('clear')}
                disabled={!isLoggedIn || isAuthenticating || !isPoweredOn}
              >
                CLEAR
              </button>
            </div>
          </div>

          <div className="nav-tree" id="nav-tree" aria-label="Filesystem Tree">
            <button
              className={`tree-item tree-folder w-full text-left ${currentDir === '~' && !activeFile ? 'tree-active' : ''}`}
              onClick={() => {
                if (isMobileOrTouch()) inputRef.current?.blur();
                onNavigateDir('~');
              }}
              disabled={!isLoggedIn || isAuthenticating || !isPoweredOn}
            >
              λ ~/
            </button>
            {folders.map(f => {
              const isFolderSelected = currentDir === f.dir && !activeFile;
              const isFolderCurrent = currentDir === f.dir;
              const folderFiles = Object.keys(fileSystem[f.dir]?.files || {});

              return (
                <div key={f.dir}>
                  <button
                    className={`tree-item tree-folder w-full text-left ${isFolderSelected ? 'tree-active' : ''}`}
                    onClick={() => {
                      if (isMobileOrTouch()) inputRef.current?.blur();
                      onNavigateDir(f.dir);
                    }}
                    disabled={!isLoggedIn || isAuthenticating || !isPoweredOn}
                  >
                    λ ├─ {f.name}
                  </button>
                  {isFolderCurrent &&
                    folderFiles.map((file, idx) => {
                      const branch = idx === folderFiles.length - 1 ? '└─' : '├─';
                      const isFileSelected = activeFile === file;
                      return (
                        <button
                          key={file}
                          className={`tree-item w-full text-left ${isFileSelected ? 'tree-active' : ''}`}
                          onClick={() => {
                            if (isMobileOrTouch()) inputRef.current?.blur();
                            onOpenFile(f.dir, file);
                          }}
                          disabled={!isLoggedIn || isAuthenticating || !isPoweredOn}
                        >
                          λ │  {branch} {file}
                        </button>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Dedicated partition line between nav and viewport */}
        <div className="w-full flex items-center justify-between text-[8.5px] uppercase mb-1 px-0.5 select-none min-w-0 overflow-hidden gap-1 font-mono">
          <span className={`truncate ${coreTemp >= 74 ? 'text-orange-400 font-bold' : 'text-[#9e6b00]'}`}>
            --- DERAILLEUR CONSOLE BUS ---
          </span>
          <span className={`shrink-0 text-right ${coreTemp >= 84 ? 'text-red-400 font-bold animate-pulse' : coreTemp >= 74 ? 'text-orange-400 font-bold' : 'text-[#9e6b00]'}`}>
            {coreTemp >= 84
              ? `[CRIT: ${Math.round(coreTemp)}°C]`
              : coreTemp >= 74
              ? `[THROT: ${Math.round(coreTemp)}°C]`
              : editorState?.isOpen
              ? '[EDITOR]'
              : '[SHELL]'}
          </span>
        </div>

        {/* Content area: either Vim/Nano Editor or Terminal Stream */}
        {editorState?.isOpen ? (
          <div className={`flex-1 min-h-0 flex flex-col ${getThermalClass()}`}>
            <VimEditor
              appType={editorState.appType}
              fileName={editorState.fileName}
              fileContent={editorState.fileContent}
              onClose={onCloseEditor}
              onScrollDelta={onScrollDelta}
            />
          </div>
        ) : (
          <main
            id="terminal"
            ref={terminalContainerRef}
            aria-label="Terminal screen output"
          >
            <div id="output" className={getThermalClass()}>
              {terminalLines.map(line => (
                <div
                  key={line.id}
                  className={`line ${line.className || ''}`}
                >
                  {line.actions && line.actions.length > 0 ? (
                    <div className="my-1 p-1.5 border border-[#4a3508] bg-[#161004]/90 rounded-sm">
                      <div className="text-[11px] text-[#9e6b00] mb-1.5 font-mono">
                        [DIRECTORY: {line.actions[0]?.dir || currentDir}] — Select a file or folder below (or in the file tree) to open:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {line.actions.map(action => (
                          <button
                            key={`${line.id}-${action.label}`}
                            type="button"
                            onClick={() => {
                              if (isMobileOrTouch()) inputRef.current?.blur();
                              if (action.actionType === 'dir') {
                                onNavigateDir(action.target);
                              } else {
                                onOpenFile(action.dir || currentDir, action.target);
                              }
                            }}
                            className={`px-2 py-1 text-xs font-mono font-bold border rounded-sm cursor-pointer transition-colors ${
                              action.actionType === 'dir'
                                ? 'border-[#5bc0be] text-[#5bc0be] bg-[#0d1b1e]/80 hover:bg-[#5bc0be] hover:text-black'
                                : 'border-[#ffb000] text-[#ffb000] bg-[#1f1604] hover:bg-[#ffb000] hover:text-black'
                            }`}
                          >
                            {action.actionType === 'dir' ? `📁 ${action.label}` : `📄 ${action.label}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : line.html ? (
                    <span dangerouslySetInnerHTML={{ __html: line.html }} />
                  ) : line.text && /^[-=]{10,}$/.test(line.text.trim()) ? (
                    <span className="block whitespace-nowrap overflow-hidden">{line.text}</span>
                  ) : (
                    <span>{line.text}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Prompt line */}
            <div
              id="input-line"
              onClick={() => {
                if (isPoweredOn && !editorState?.isOpen && !isAuthenticating) {
                  inputRef.current?.focus();
                }
              }}
            >
              <label htmlFor="cmd-input" id="prompt-label">
                {!isLoggedIn
                  ? 'login as:'
                  : `${operatorName}@derailleur:${currentDir}$`}
              </label>
              <input
                ref={inputRef}
                id="cmd-input"
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                spellCheck={false}
                disabled={!isPoweredOn || isAuthenticating}
                aria-label="Terminal command prompt"
              />
            </div>
            <div ref={terminalEndRef} />
          </main>
        )}

        {/* Phosphor Greek Terminal Matrix Rain Screensaver */}
        <GreekMatrixScreensaver
          isActive={!!isScreensaverActive}
          onDismiss={onDismissScreensaver || (() => {})}
        />
      </div>

      {/* Permanent Vintage Phosphor CRT Burn-In Ghost Layer */}
      <div className={`crt-burn-in ${!isPoweredOn ? 'unpowered' : ''}`} aria-hidden="true">
        <div className="crt-burn-in-mask" />
        <div className="crt-burn-in-content">
          <div className="burn-line burn-header">CHADHAWK CORPS // DERAILLEUR OS/2 (ROM BIOS v4.09 1989-1994)</div>
          <div className="burn-line burn-sub">SYS_ID: #4092-DH88  MEMORY: 640KB BASE  VRAM: 32KB AMBER TUBE</div>
          <div className="burn-line burn-prompt">chadhawk@derailleur:~$ ls -la /system/bus/pci</div>
          <div className="burn-line burn-log">[ 0.000000] BIOS-e820: 0000000000000000 - 000000000009fc00 (usable)</div>
          <div className="burn-line burn-log">[ 0.001840] CPU: i486DX2-66 stepping 07, 16KB L1 cache, FPU ready</div>
          <div className="burn-line burn-prompt">chadhawk@derailleur:~$ epidos --monochrome --amber --scanlines</div>
          <div className="burn-box">
            <div>+----------------------------------------------+</div>
            <div>| DERAILLEUR SYS_CONSOLE [SESSION 001]         |</div>
            <div>| OPERATOR: CHADHAWK   CLEARANCE: LEVEL 5      |</div>
            <div>+----------------------------------------------+</div>
          </div>
          <div className="burn-line burn-bottom">login as: chadhawk_</div>
        </div>
      </div>

      {/* CRT Power-On Startup Beam Overlay */}
      <div id="crt-on-overlay" aria-hidden="true">
        <div className="crt-on-beam"></div>
      </div>

      {/* CRT Power-Off Screen Overlay */}
      <div
        id="crt-off-overlay"
        className={!isPoweredOn ? "active" : ""}
        aria-hidden={isPoweredOn}
      >
        <div className="crt-beam"></div>
        <div className="crt-standby-hint">
          [ SYSTEM POWERED OFF — PRESS POWER OR RESTART TO WAKE ]
        </div>
      </div>
    </div>
  );
};
