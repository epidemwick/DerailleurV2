/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { HardwareChassis } from './components/HardwareChassis';
import { CrtScreen } from './components/CrtScreen';
import { ContactModal } from './components/ContactModal';
import { AdminAuditModal } from './components/AdminAuditModal';
import { AiChatModal } from './components/AiChatModal';
import { INITIAL_FILESYSTEM, FOLDER_ORDER, computeWeatherInterestMode } from './utils/filesystem';
import { executeChainedCommands } from './utils/commandParser';
import { FileSystemData, SystemStatus, TerminalLine } from './types/terminal';
import { retroAudio } from './utils/soundEffects';

export default function App() {
  const [isPoweredOn, setIsPoweredOn] = useState<boolean>(true);
  const [isDegaussing, setIsDegaussing] = useState<boolean>(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>('offline');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [operatorName, setOperatorName] = useState<string>('guest');
  const [currentDir, setCurrentDir] = useState<string>('~');
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileSystem] = useState<FileSystemData>(INITIAL_FILESYSTEM);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const [depressedButton, setDepressedButton] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Modals state
  const [isContactOpen, setIsContactOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState<boolean>(false);
  const [pendingOwnerLogin, setPendingOwnerLogin] = useState<boolean>(false);
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? sessionStorage.getItem('adminToken') : null;
  });

  const isAdmin = Boolean(
    adminToken && (operatorName.toLowerCase() === 'epidemwick' || operatorName.toLowerCase() === 'chadhawk')
  );

  // Unique session ID for visitor telemetry logging
  const [sessionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('epidos_session');
      if (stored) return stored;
      const created = 'sess_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('epidos_session', created);
      return created;
    }
    return 'sess_' + Math.random().toString(36).substring(2, 9);
  });

  const [isScreensaverActive, setIsScreensaverActive] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('screensaver') === '1';
    }
    return false;
  });

  const [isFlickerActive, setIsFlickerActive] = useState<boolean>(true);
  const terminalRef = useRef<HTMLDivElement | null>(null);

  const [editorState, setEditorState] = useState<{
    isOpen: boolean;
    appType: 'vim' | 'nano';
    fileName: string;
    fileContent: string;
  } | null>(null);

  const [isGameOpen, setIsGameOpen] = useState<boolean>(false);

  // Retro LED battery level: loads from sessionStorage or initializes to 94%
  const [batteryLevel, setBatteryLevel] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('derailleur_battery');
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 3 && parsed <= 100) return parsed;
      }
    }
    return 94;
  });

  // Thermal throttling simulation: core temperature in °C (nominal: 38°C, max: 96°C)
  const [coreTemp, setCoreTemp] = useState<number>(38);
  const lastCommandTimeRef = useRef<number>(Date.now());

  // Battery slowly drains over time during active sessions (~1% every 25 seconds)
  useEffect(() => {
    if (!isPoweredOn) return;
    const timer = setInterval(() => {
      setBatteryLevel(prev => {
        const next = Math.max(4, prev - 1);
        try {
          sessionStorage.setItem('derailleur_battery', String(next));
        } catch {
          // ignore
        }
        return next;
      });
    }, 25000);
    return () => clearInterval(timer);
  }, [isPoweredOn]);

  // Thermal dissipation over time (decays back down toward nominal 38°C)
  useEffect(() => {
    if (!isPoweredOn) {
      setCoreTemp(38);
      return;
    }
    const timer = setInterval(() => {
      setCoreTemp(prev => {
        if (prev <= 38) return 38;
        // Dissipation rate scales up if forced-air fan kicks in at high temps
        const coolingDelta = prev >= 80 ? 2.8 : prev >= 60 ? 1.8 : 1.2;
        return Math.max(38, +(prev - coolingDelta).toFixed(1));
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPoweredOn]);

  const uid = () => Math.random().toString(36).substring(2, 9);

  // 60-second inactivity screensaver timer
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const resetInactivityTimer = () => {
      clearTimeout(timer);
      if (isPoweredOn && !isScreensaverActive && !isGameOpen) {
        timer = setTimeout(() => {
          setIsScreensaverActive(true);
        }, 60000); // 60 seconds of inactivity
      }
    };

    const handleUserActivity = () => {
      if (!isScreensaverActive) {
        resetInactivityTimer();
      }
    };

    resetInactivityTimer();

    window.addEventListener('mousemove', handleUserActivity, { passive: true });
    window.addEventListener('mousedown', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });
    window.addEventListener('wheel', handleUserActivity, { passive: true });
    window.addEventListener('touchstart', handleUserActivity, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('mousedown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('wheel', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
    };
  }, [isPoweredOn, isScreensaverActive, isGameOpen]);

  // Helper to log telemetry event to backend
  const logTelemetryEvent = useCallback((action: string, details?: string) => {
    try {
      fetch('/api/telemetry/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action, details })
      }).catch(() => {});
    } catch {
      // Ignore background telemetry errors
    }
  }, [sessionId]);

  // Helper to append lines to the terminal
  const appendLines = useCallback((lines: TerminalLine[]) => {
    setTerminalLines(prev => [...prev, ...lines]);
  }, []);

  const pulseButton = (btnId: string) => {
    setDepressedButton(btnId);
    setTimeout(() => setDepressedButton(null), 220);
  };

  // Cold reboot system / initial boot screen
  const initBootScreen = useCallback(() => {
    setIsLoggedIn(false);
    setIsAuthenticating(false);
    setOperatorName('guest');
    setCurrentDir('~');
    setActiveFile(null);
    setEditorState(null);
    setIsGameOpen(false);
    setSystemStatus('offline');
    setAdminToken(null);
    try {
      sessionStorage.removeItem('adminToken');
    } catch {
      // ignore
    }

    const bootLines: TerminalLine[] = [
      { id: uid(), type: 'system', text: "DERAILLEUR v2 // BIOS REV 4.09 (C) CHADHAWK CORPS." },
      { id: uid(), type: 'system', text: "Checking 640K Low-Power CMOS RAM... OK" },
      { id: uid(), type: 'system', text: "Mounting /dev/epidos0 on / ... READONLY" },
      { id: uid(), type: 'system', text: "----------------------------------------------------------------" },
      { id: uid(), type: 'prompt', text: "Enter operator handle to initialize session:" }
    ];
    setTerminalLines(bootLines);
  }, []);

  // Trigger CRT cathode beam warm-up animation
  const playCrtPowerOnAnimation = () => {
    const el = document.getElementById('crt-on-overlay');
    if (!el) return;
    el.classList.remove('active');
    void el.offsetWidth;
    el.classList.add('active');
    retroAudio.playCrtWarmup();
    setTimeout(() => {
      el.classList.remove('active');
    }, 680);
  };

  // Trigger CRT degauss magnetic coil pulse
  const triggerDegauss = useCallback(() => {
    if (!isPoweredOn) return;
    pulseButton('degauss');
    retroAudio.playDegauss();
    logTelemetryEvent('DEGAUSS_TRIGGERED');
    setIsDegaussing(false);
    setTimeout(() => {
      setIsDegaussing(true);
      setTimeout(() => {
        setIsDegaussing(false);
      }, 980);
    }, 10);
  }, [isPoweredOn, logTelemetryEvent]);

  // Handle operator login & live Neofetch sequence
  const handleOperatorLogin = useCallback(async (handleInput: string) => {
    setIsAuthenticating(true);
    setSystemStatus('thinking');
    const cleanHandle = (handleInput.trim() || 'operator').toLowerCase().replace(/\s+/g, '_');
    const isOwner = cleanHandle === 'epidemwick' || cleanHandle === 'chadhawk';
    const displayHandle = cleanHandle === 'epidemwick' ? 'epidemwick' : isOwner ? 'epidemwick' : cleanHandle;
    setOperatorName(displayHandle);

    const authId = uid();
    appendLines([
      { id: uid(), type: 'prompt', text: `login as: ${handleInput || 'operator'}` },
      { id: authId, type: 'system', text: "Authenticating operator credentials..." },
      { id: uid(), type: 'system', text: "----------------------------------------------------------------" }
    ]);

    let locationText = "Philadelphia, Pennsylvania";
    let weatherText = "58°F, Clear";
    let tempF = 58;
    let weatherCondition = "Clear";

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const geoRes = await fetch("https://ipapi.co/json/", { signal: controller.signal });
      clearTimeout(timeoutId);
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.city && geoData.region) {
          locationText = `${geoData.city}, ${geoData.region}`;
        }
      }
    } catch {
      // Fallback used
    }

    try {
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 1200);
      const wttrRes = await fetch("https://wttr.in/?format=%t,+%C", { signal: controller2.signal });
      clearTimeout(timeoutId2);
      if (wttrRes.ok) {
        const rawWeather = await wttrRes.text();
        const cleaned = rawWeather.replace(/<[^>]*>/g, '').replace(/[^\x20-\x7E°]/g, '').trim();
        if (cleaned && cleaned.length < 42 && !cleaned.toLowerCase().includes("error") && !cleaned.toLowerCase().includes("html")) {
          weatherText = cleaned;
          // Extract numeric temperature
          const tempMatch = cleaned.match(/([+-]?\d+)/);
          if (tempMatch) {
            tempF = parseInt(tempMatch[1], 10);
          }
          const condMatch = cleaned.replace(/[+-]?\d+°?[CF]?/, '').replace(/^,\s*/, '').trim();
          if (condMatch) {
            weatherCondition = condMatch;
          }
        }
      }
    } catch {
      // Fallback used
    }

    // Compute dynamic interest mode based on Christian Chadwick's hobbies and real weather
    const interestMode = computeWeatherInterestMode(tempF, weatherCondition);
    const fullWeatherString = `${weatherText} (${interestMode})`;

    // Log session to backend
    try {
      fetch('/api/telemetry/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          operatorName: displayHandle,
          location: locationText,
          weatherMode: interestMode
        })
      }).catch(() => {});
    } catch {
      // Ignore
    }

    setTimeout(() => {
      const nowStr = new Date().toLocaleString();
      const summaryLines: TerminalLine[] = [
        { id: uid(), type: 'system', text: `λ Operator: ${displayHandle}` },
        { id: uid(), type: 'system', text: `λ Host: Derailleur v2 Handheld` },
        { id: uid(), type: 'system', text: `λ Time: ${nowStr}` },
        { id: uid(), type: 'system', text: `λ Location: ${locationText}` },
        { id: uid(), type: 'system', text: `λ Weather: ${fullWeatherString}` },
        { id: uid(), type: 'system', text: `λ Status: Online` },
        { id: uid(), type: 'system', text: "----------------------------------------------------------------" },
        {
          id: uid(),
          type: 'help',
          text: "Type 'help' to get commands, or select buttons on the navbar and the file tree."
        },
        { id: uid(), type: 'system', text: "----------------------------------------------------------------" }
      ];

      appendLines(summaryLines);
      setIsAuthenticating(false);
      setIsLoggedIn(true);
      setSystemStatus('online');
      retroAudio.playBeep(640, 0.1);
    }, 700);
  }, [appendLines, sessionId]);

  // Handle initial login submit: triggers password authentication if handle is 'epidemwick' or 'chadhawk'
  const handleLoginSubmit = useCallback((handleInput: string) => {
    const raw = handleInput.trim();
    const clean = raw.toLowerCase();

    if (clean === 'epidemwick' || clean === 'chadhawk') {
      // Prompt for owner password via modal (every cold login requires verification)
      setPendingOwnerLogin(true);
      setIsAdminOpen(true);
      appendLines([
        { id: uid(), type: 'prompt', text: `login as: ${handleInput}` },
        { id: uid(), type: 'system', text: `[SECURITY PROTOCOL] :: Operator handle '${handleInput}' recognized.` },
        { id: uid(), type: 'system', text: "[AUTHORIZATION REQUIRED] :: Enter owner passcode in the security dialog to verify clearance..." }
      ]);
      retroAudio.playBeep(880, 0.1);
      return;
    }

    // Standard guest / visitor login
    handleOperatorLogin(handleInput);
  }, [appendLines, handleOperatorLogin]);

  // Execute command input string
  const handleExecuteCommand = useCallback((cmdString: string) => {
    if (!cmdString.trim()) return;

    logTelemetryEvent('COMMAND_EXECUTED', cmdString);

    // Echo the command with prompt header
    const promptHeader = `${operatorName}@derailleur:${currentDir}$ ${cmdString}`;
    const echoLine: TerminalLine = {
      id: uid(),
      type: 'prompt',
      text: promptHeader
    };

    // Calculate thermal impact of command
    const now = Date.now();
    const elapsed = now - lastCommandTimeRef.current;
    lastCommandTimeRef.current = now;

    // Rapid burst detection (less than 1400ms between commands adds extra bus thrash heat)
    const isRapidBurst = elapsed < 1400;

    const lowerCmd = cmdString.toLowerCase().trim();
    let heatGain = 5; // standard command (ls, pwd, cd, clear)

    if (lowerCmd.includes('stress') || lowerCmd.includes('burnin') || lowerCmd.includes('benchmark')) {
      heatGain = 35;
    } else if (lowerCmd.includes('screensaver') || lowerCmd.includes('matrix')) {
      heatGain = 18;
    } else if (lowerCmd.includes('degauss')) {
      heatGain = 16;
    } else if (lowerCmd.startsWith('cat') || lowerCmd.startsWith('vim') || lowerCmd.startsWith('nano')) {
      heatGain = 10;
    }

    if (cmdString.includes('&&')) {
      heatGain += (cmdString.split('&&').length - 1) * 6;
    }

    if (isRapidBurst) {
      heatGain += 8; // penalty for thrashing the CPU pipeline in rapid succession
    }

    let calculatedNextTemp = coreTemp;
    setCoreTemp(prev => {
      const next = Math.min(96, +(prev + heatGain).toFixed(1));
      calculatedNextTemp = next;
      if (next >= 84 && prev < 84) {
        retroAudio.playBeep(320, 0.25);
      }
      return next;
    });

    const res = executeChainedCommands(cmdString, {
      operatorName,
      currentDir,
      fileSystem,
      isAdmin,
      batteryLevel,
      coreTemp: calculatedNextTemp
    });

    if (res.clearTerminal) {
      setTerminalLines([]);
      setActiveFile(null);
      return;
    }

    if (res.triggerRestart) {
      pulseButton('restart');
      retroAudio.playHeavySwitch();
      initBootScreen();
      return;
    }

    if (res.triggerDegauss) {
      triggerDegauss();
    }

    if (res.triggerContactModal) {
      setIsContactOpen(true);
    }

    if (res.triggerAdminModal) {
      setIsAdminOpen(true);
    }

    if (res.triggerAiChatModal) {
      setIsAiChatOpen(true);
    }

    if (res.triggerScreensaver) {
      setIsScreensaverActive(true);
    }

    if (res.triggerFlickerToggle) {
      setIsFlickerActive(prev => !prev);
    }

    if (res.triggerGame) {
      setEditorState(null);
      setIsGameOpen(true);
      retroAudio.playHeavySwitch();
    }

    if (res.nextDir) {
      setCurrentDir(res.nextDir);
      setActiveFile(null);
      setIsGameOpen(false);
    }

    if (res.openEditor) {
      setIsGameOpen(false);
      setActiveFile(res.openEditor.fileName);
      setEditorState({
        isOpen: true,
        appType: res.openEditor.appType,
        fileName: res.openEditor.fileName,
        fileContent: res.openEditor.fileContent
      });
      retroAudio.playHeavySwitch();
    }

    const thermalAlertLines: TerminalLine[] = [];
    if (calculatedNextTemp >= 84) {
      thermalAlertLines.push({
        id: uid(),
        type: 'error',
        text: `[THERMAL THROTTLE] :: 486DX2 core junction reached ${Math.round(calculatedNextTemp)}°C! CRT horizontal deflection jitter active.`
      });
    }

    setTerminalLines(prev => [...prev, echoLine, ...res.outputLines, ...thermalAlertLines]);
  }, [operatorName, currentDir, fileSystem, initBootScreen, triggerDegauss, logTelemetryEvent, isAdmin, batteryLevel, coreTemp]);

  // Toggle Power
  const togglePower = () => {
    pulseButton('power');
    retroAudio.playHeavySwitch();
    logTelemetryEvent(isPoweredOn ? 'POWER_OFF' : 'POWER_ON');
    if (isPoweredOn) {
      if (editorState?.isOpen) setEditorState(null);
      if (isGameOpen) setIsGameOpen(false);
      setIsPoweredOn(false);
      setSystemStatus('poweroff');
    } else {
      setIsPoweredOn(true);
      setSystemStatus(isLoggedIn ? 'online' : 'offline');
      playCrtPowerOnAnimation();
    }
  };

  // Toggle Audio
  const toggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      retroAudio.enabled = next;
      if (next) retroAudio.playBeep(880, 0.05);
      return next;
    });
  };

  // Hardware tape-deck buttons
  const handleHwNavigate = (action: 'rew' | 'play' | 'ffwd') => {
    if (!isLoggedIn || isAuthenticating || !isPoweredOn) return;
    pulseButton(action);
    retroAudio.playHeavySwitch();
    logTelemetryEvent('HARDWARE_BUTTON_CLICKED', action.toUpperCase());

    if (action === 'rew') {
      if (editorState?.isOpen) {
        setEditorState(null);
      } else {
        const idx = FOLDER_ORDER.indexOf(currentDir);
        const prevIdx = idx <= 0 ? FOLDER_ORDER.length - 1 : idx - 1;
        handleExecuteCommand(`cd ${FOLDER_ORDER[prevIdx]} && ls`);
      }
    } else if (action === 'ffwd') {
      if (editorState?.isOpen) setEditorState(null);
      const idx = FOLDER_ORDER.indexOf(currentDir);
      const nextIdx = (idx + 1) % FOLDER_ORDER.length;
      handleExecuteCommand(`cd ${FOLDER_ORDER[nextIdx]} && ls`);
    } else if (action === 'play') {
      if (editorState?.isOpen) {
        setEditorState(null);
      } else {
        const files = Object.keys(fileSystem[currentDir]?.files || {});
        if (files.length > 0) {
          handleExecuteCommand(`vim ${files[0]}`);
        } else {
          handleExecuteCommand('cd ~/about && vim about_me.txt');
        }
      }
    }
  };

  // Direct click on directory in tree
  const handleNavigateDir = (targetDir: string) => {
    if (!isLoggedIn || isAuthenticating || !isPoweredOn) return;
    if (editorState?.isOpen) setEditorState(null);
    if (isGameOpen) setIsGameOpen(false);
    retroAudio.playKeyClick();
    logTelemetryEvent('TREE_NAVIGATE_DIR', targetDir);
    handleExecuteCommand(`cd ${targetDir} && ls`);
  };

  // Direct click on file in tree
  const handleOpenFile = (dirPath: string, fileName: string) => {
    if (!isLoggedIn || isAuthenticating || !isPoweredOn) return;
    if (editorState?.isOpen) setEditorState(null);
    if (isGameOpen) setIsGameOpen(false);
    retroAudio.playKeyClick();
    logTelemetryEvent('TREE_OPEN_FILE', `${dirPath}/${fileName}`);
    if (currentDir !== dirPath) {
      setCurrentDir(dirPath);
    }
    handleExecuteCommand(`vim ${fileName}`);
  };

  // Scroll wheel delta: syncs rotary wheel rotation AND viewport scroll
  const handleRotateWheel = (deltaY: number) => {
    setWheelRotation(prev => prev + deltaY * 0.35);
    if (terminalRef.current) {
      terminalRef.current.scrollTop += deltaY;
    }
  };

  // Admin token handlers
  const handleAdminLogin = (token: string) => {
    setAdminToken(token);
    sessionStorage.setItem('adminToken', token);
    logTelemetryEvent('OWNER_AUTHENTICATED', 'epidemwick');

    if (pendingOwnerLogin || !isLoggedIn) {
      setPendingOwnerLogin(false);
      handleOperatorLogin('epidemwick');
    }
  };

  const handleAdminLogout = () => {
    setAdminToken(null);
    sessionStorage.removeItem('adminToken');
    setIsAdminOpen(false);
  };

  const handleCloseAdminModal = () => {
    setIsAdminOpen(false);
    if (pendingOwnerLogin && !isLoggedIn) {
      setPendingOwnerLogin(false);
      appendLines([
        { id: uid(), type: 'error', text: "[ACCESS DENIED] :: Owner authentication cancelled." },
        { id: uid(), type: 'prompt', text: "Enter operator handle to initialize session:" }
      ]);
      retroAudio.playBeep(300, 0.15);
    }
  };

  // Initial setup: check ?autostart=1 or boot up
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart');

    if (autostart === '1') {
      // Instant start for testing & ultra mode
      setOperatorName('epidemwick');
      setIsLoggedIn(true);
      setSystemStatus('online');
      setCurrentDir('~');
      setTerminalLines([
        { id: uid(), type: 'system', text: "DERAILLEUR v2 // BIOS REV 4.09 (C) CHADHAWK CORPS." },
        { id: uid(), type: 'system', text: "Mounting /dev/epidos0 on / ... READONLY" },
        { id: uid(), type: 'system', text: "----------------------------------------------------------------" },
        { id: uid(), type: 'system', text: "Authenticating operator credentials..." },
        { id: uid(), type: 'system', text: "----------------------------------------------------------------" },
        { id: uid(), type: 'system', text: "λ Operator: epidemwick [AUTOSTART]" },
        { id: uid(), type: 'system', text: "λ Host: Derailleur v2 Handheld" },
        { id: uid(), type: 'system', text: "λ Status: Online" },
        { id: uid(), type: 'system', text: "----------------------------------------------------------------" },
        { id: uid(), type: 'help', text: "Type 'help' to get commands, or select buttons on the navbar and the file tree." },
        { id: uid(), type: 'system', text: "----------------------------------------------------------------" }
      ]);
      playCrtPowerOnAnimation();
    } else {
      initBootScreen();
      playCrtPowerOnAnimation();
    }

    if (params.get('screensaver') === '1') {
      setIsScreensaverActive(true);
    }
  }, [initBootScreen]);

  return (
    <div className="w-full max-w-full flex items-center justify-center min-h-[100dvh] p-1 sm:p-4 md:p-8 overflow-hidden box-border">
      <HardwareChassis
        isPoweredOn={isPoweredOn}
        batteryLevel={batteryLevel}
        coreTemp={coreTemp}
        systemStatus={systemStatus}
        soundEnabled={soundEnabled}
        wheelRotation={wheelRotation}
        depressedButton={depressedButton}
        onRestart={() => {
          pulseButton('restart');
          retroAudio.playHeavySwitch();
          logTelemetryEvent('RESTART_TRIGGERED');
          initBootScreen();
        }}
        onDegauss={triggerDegauss}
        onTogglePower={togglePower}
        onToggleSound={toggleSound}
        onHwNavigate={handleHwNavigate}
        onRotateWheel={handleRotateWheel}
      >
        <CrtScreen
          isPoweredOn={isPoweredOn}
          isDegaussing={isDegaussing}
          isLoggedIn={isLoggedIn}
          isAuthenticating={isAuthenticating}
          operatorName={operatorName}
          currentDir={currentDir}
          activeFile={activeFile}
          fileSystem={fileSystem}
          terminalLines={terminalLines}
          editorState={editorState}
          onExecuteCommand={handleExecuteCommand}
          onLoginSubmit={handleLoginSubmit}
          onCloseEditor={() => setEditorState(null)}
          onNavigateDir={handleNavigateDir}
          onOpenFile={handleOpenFile}
          onScrollDelta={handleRotateWheel}
          onOpenContactModal={() => setIsContactOpen(true)}
          onOpenAdminModal={() => setIsAdminOpen(true)}
          onOpenAiChatModal={() => setIsAiChatOpen(true)}
          isScreensaverActive={isScreensaverActive}
          onDismissScreensaver={() => setIsScreensaverActive(false)}
          isAdmin={isAdmin}
          coreTemp={coreTemp}
          isFlickerActive={isFlickerActive}
          scrollRef={terminalRef}
          isGameOpen={isGameOpen}
          onOpenGame={() => {
            setEditorState(null);
            setIsGameOpen(true);
            retroAudio.playHeavySwitch();
            logTelemetryEvent('GAME_OPENED', operatorName);
          }}
          onCloseGame={() => setIsGameOpen(false)}
          onSwitchOperatorHandle={(newHandle: string) => {
            setOperatorName(newHandle);
            logTelemetryEvent('PLAYER_HANDLE_AUTHENTICATED', newHandle);
          }}
          onLogEvent={logTelemetryEvent}
        />
      </HardwareChassis>

      {/* Visitor Direct Message Modal */}
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        defaultSenderName={operatorName !== 'guest' ? operatorName : ''}
        onMessageSent={(msg) => {
          appendLines([
            { id: uid(), type: 'system', text: `[MAILBOX] :: ${msg}` }
          ]);
        }}
      />

      {/* Owner Protected Telemetry & Audit Modal */}
      <AdminAuditModal
        isOpen={isAdminOpen}
        onClose={handleCloseAdminModal}
        adminToken={adminToken}
        onAdminLogin={handleAdminLogin}
        onAdminLogout={handleAdminLogout}
      />

      {/* Tactical AI Chatbot Modal */}
      <AiChatModal
        isOpen={isAiChatOpen}
        onClose={() => setIsAiChatOpen(false)}
      />
    </div>
  );
}
