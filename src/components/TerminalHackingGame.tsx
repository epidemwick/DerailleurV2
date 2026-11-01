/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  DEFENSE_TOOLS,
  DefenseToolId,
  MESH_ROOMS,
  MESH_ROOM_ORDER,
  MeshMudState,
  MeshRoomId,
  createInitialMudState,
  executeMudDefenseAction,
  generateNemesisTrollTaunt,
  getEpidosTelemetryGuidance,
  getOperatorRankTitle,
  moveMudRoom,
  parseAndExecuteMudCommand
} from '../utils/hackingGame';
import { retroAudio } from '../utils/soundEffects';

export interface LeaderboardEntry {
  handle: string;
  totalScore: number;
  bestRun: number;
  nodesCracked: number;
  rankTitle: string;
  protected: boolean;
  lastActive: string;
}

export interface SharedMeshOperator {
  handle: string;
  roomId: string;
  roomLabel: string;
  deviceHealth: number;
  aiTether: number;
  lastAction: string;
  lastSeen: string;
}

export interface SharedMeshFeedItem {
  id: string;
  timestamp: string;
  operator: string;
  roomLabel: string;
  text: string;
  tone: 'purge' | 'beacon' | 'move' | 'defend' | 'chat' | 'ai' | 'troll';
}

export interface MeshDirectoryEntry {
  meshId: string;
  meshName: string;
  creator: string;
  protected: boolean;
  meshIntegrity: number;
  operatorCount: number;
  totalPurges: number;
}

export interface SharedMeshState {
  meshId: string;
  meshName: string;
  creator: string;
  protected: boolean;
  meshIntegrity: number;
  totalPurges: number;
  beacons: Record<string, string | null>;
  activeOperators: SharedMeshOperator[];
  feed: SharedMeshFeedItem[];
}

interface TerminalHackingGameProps {
  operatorName: string;
  onClose: () => void;
  onSwitchOperatorHandle?: (newHandle: string) => void;
  onLogEvent?: (action: string, details?: string) => void;
}

async function sha256ClientHex(input: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const data = new TextEncoder().encode(input);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0, ch; i < input.length; i++) {
    ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0').repeat(7).slice(0, 56);
}

function renderAsciiBar(percent: number, segments = 10): string {
  const clamped = Math.min(100, Math.max(0, percent));
  const filled = Math.round((clamped / 100) * segments);
  return '█'.repeat(filled) + '░'.repeat(Math.max(0, segments - filled));
}

export const TerminalHackingGame: React.FC<TerminalHackingGameProps> = ({
  operatorName,
  onClose,
  onSwitchOperatorHandle,
  onLogEvent
}) => {
  // Exact 5-Tab Top Bar Order: 1. MESH MUD, 2. OPERATORS, 3. LEADERBOARDS, 4. GUIDE, 5. LOGIN / SAVE SCORE
  const [activeTab, setActiveTab] = useState<'game' | 'operators' | 'leaderboard' | 'guide' | 'vault'>('game');
  const [gameState, setGameState] = useState<'title' | 'playing' | 'paused' | 'gameover'>('title');

  // Separated Comms Channel State: 'operators' (human chat & commands) vs 'alerts' (EPIDOS-LLM & Hackers AI notifications)
  const [commsChannel, setCommsChannel] = useState<'operators' | 'alerts'>('operators');
  const [seenAlertCount, setSeenAlertCount] = useState<number>(2);

  // Hovered/focused Linux command for man-page tooltip display
  const [hoveredToolId, setHoveredToolId] = useState<DefenseToolId | null>(null);
  // Inline squad roster drawer inside MESH MUD comms panel (stays on MESH MUD screen)
  const [showInlineOpsRoster, setShowInlineOpsRoster] = useState<boolean>(false);

  const [activeHandle, setActiveHandle] = useState<string>(() =>
    operatorName && operatorName !== 'guest' ? operatorName.toLowerCase() : 'guest_op'
  );
  const [mud, setMud] = useState<MeshMudState>(() =>
    createInitialMudState(
      1,
      Date.now(),
      90,
      undefined,
      operatorName && operatorName !== 'guest' ? operatorName.toLowerCase() : 'guest_op'
    )
  );
  const [mudCommandInput, setMudCommandInput] = useState<string>('');
  const [streak, setStreak] = useState<number>(1);
  const [sessionScore, setSessionScore] = useState<number>(0);
  const [sessionNodes, setSessionNodes] = useState<number>(0);
  const [lastHeadline, setLastHeadline] = useState<string | null>(null);

  // Active Mesh Network & Mesh Directory state (no 17-DX prefix)
  const [activeMeshId, setActiveMeshId] = useState<string>('public-grid');
  const [meshDirectory, setMeshDirectory] = useState<MeshDirectoryEntry[]>([
    {
      meshId: 'public-grid',
      meshName: 'PUBLIC-GRID',
      creator: 'epidemwick',
      protected: false,
      meshIntegrity: 89,
      operatorCount: 3,
      totalPurges: 35
    },
    {
      meshId: 'gibson-hackers-95',
      meshName: 'GIBSON-HACKERS-95',
      creator: 'ghost_node',
      protected: false,
      meshIntegrity: 94,
      operatorCount: 1,
      totalPurges: 18
    }
  ]);

  // Create / Join Mesh Form State
  const [newMeshNameInput, setNewMeshNameInput] = useState<string>('');
  const [newMeshPasswordInput, setNewMeshPasswordInput] = useState<string>('');
  const [joinPasswordPromptMesh, setJoinPasswordPromptMesh] = useState<MeshDirectoryEntry | null>(null);
  const [joinMeshPasswordInput, setJoinMeshPasswordInput] = useState<string>('');
  const [meshStatusMsg, setMeshStatusMsg] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);

  // Cooperative Shared Mesh State
  const [sharedMesh, setSharedMesh] = useState<SharedMeshState>({
    meshId: 'public-grid',
    meshName: 'PUBLIC-GRID',
    creator: 'epidemwick',
    protected: false,
    meshIntegrity: 89,
    totalPurges: 35,
    beacons: {
      sanctuary: null,
      airlock: 'epidemwick (Co-Op Shield)',
      gateway: null,
      vault: null,
      bridge: 'ghost_node (Co-Op Shield)'
    },
    activeOperators: [
      {
        handle: 'epidemwick',
        roomId: 'airlock',
        roomLabel: '02: PROXIMITY AIRLOCK',
        deviceHealth: 96,
        aiTether: 98,
        lastAction: 'iptables -A INPUT -p tcp --dport 4444 -j DROP',
        lastSeen: new Date().toISOString()
      },
      {
        handle: 'ghost_node',
        roomId: 'bridge',
        roomLabel: '05: MULTIPLAYER BRIDGE',
        deviceHealth: 88,
        aiTether: 91,
        lastAction: 'sha256sum -c /opt/epidos/weights.sha256',
        lastSeen: new Date().toISOString()
      },
      {
        handle: 'null_sector',
        roomId: 'gateway',
        roomLabel: '03: PACKET GATEWAY',
        deviceHealth: 74,
        aiTether: 79,
        lastAction: 'Need backup in Gateway -- The Plague is draining our mesh.',
        lastSeen: new Date().toISOString()
      }
    ],
    feed: [
      {
        id: 'feed_init_troll',
        timestamp: new Date().toISOString(),
        operator: '[HOSTILE] THE PLAGUE',
        roomLabel: 'GIBSON-CORE',
        text: '[THE PLAGUE]: Row, row, row your boat... @null_sector types slower than a 28.8 bps modem. Watch my Da Vinci worm sink your entire mesh.',
        tone: 'troll'
      },
      {
        id: 'feed_init_pda',
        timestamp: new Date().toISOString(),
        operator: '[SOS] PDA // null_sector',
        roomLabel: '03: PACKET GATEWAY',
        text: 'Taking heavy packet fire in [03: PACKET GATEWAY]. Local PDA HP dropped to 74% -- request Co-Op Mesh Sync.',
        tone: 'ai'
      },
      {
        id: 'feed_init_1',
        timestamp: new Date().toISOString(),
        operator: 'null_sector',
        roomLabel: '03: PACKET GATEWAY',
        text: 'Anyone free to assist in Sector 03? Packet Gateway is taking heavy inbound SYN traffic.',
        tone: 'chat'
      },
      {
        id: 'feed_init_2',
        timestamp: new Date().toISOString(),
        operator: 'ghost_node',
        roomLabel: '05: MULTIPLAYER BRIDGE',
        text: 'Co-Op Shield is active in Sector 05 Bridge if anyone needs to stabilize their AI tether.',
        tone: 'chat'
      }
    ]
  });

  // Player account & leaderboard state
  const [careerScore, setCareerScore] = useState<number>(0);
  const [bestRun, setBestRun] = useState<number>(0);
  const [careerNodes, setCareerNodes] = useState<number>(0);
  const [isHandleProtected, setIsHandleProtected] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [playerToken, setPlayerToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(`epidos_player_token_${(operatorName || 'guest').toLowerCase()}`);
    }
    return null;
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoadingBoard, setIsLoadingBoard] = useState<boolean>(false);

  // Vault / Login form state
  const [vaultHandleInput, setVaultHandleInput] = useState<string>(() =>
    operatorName && operatorName !== 'guest' ? operatorName.toLowerCase() : ''
  );
  const [vaultPasswordInput, setVaultPasswordInput] = useState<string>('');
  const [vaultStatusMsg, setVaultStatusMsg] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(
    null
  );
  const [isVaultSubmitting, setIsVaultSubmitting] = useState<boolean>(false);

  // Sync document.body.dataset.state for ultra-mode verification hygiene
  useEffect(() => {
    document.body.dataset.state = gameState;
    return () => {
      delete document.body.dataset.state;
    };
  }, [gameState]);

  const fetchLeaderboard = useCallback(async () => {
    setIsLoadingBoard(true);
    try {
      const res = await fetch('/api/game/leaderboard');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.leaderboard)) {
          setLeaderboard(data.leaderboard);
        }
      }
    } catch {
      // Ignore network errors in offline mode
    } finally {
      setIsLoadingBoard(false);
    }
  }, []);

  const fetchSharedMesh = useCallback(
    async (targetMeshId?: string) => {
      const idToFetch = targetMeshId || activeMeshId;
      try {
        const res = await fetch(`/api/game/mesh?meshId=${encodeURIComponent(idToFetch)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.mesh && typeof data.mesh.meshIntegrity === 'number') {
            setSharedMesh(data.mesh);
          }
          if (Array.isArray(data.meshes)) {
            setMeshDirectory(data.meshes);
          }
        }
      } catch {
        // Ignore offline errors
      }
    },
    [activeMeshId]
  );

  const postMeshEvent = useCallback(
    async (
      roomId: MeshRoomId,
      deviceHealth: number,
      aiTether: number,
      meshHealthDelta: number,
      eventType: 'defend' | 'purge' | 'beacon' | 'move' | 'chat',
      eventText: string,
      beaconText?: string,
      nemesisTaunt?: string,
      aiPlea?: string
    ) => {
      const roomLabel = MESH_ROOMS[roomId]?.shortLabel || '01: AI SANCTUARY';
      setSharedMesh(prev => {
        const nextIntegrity = Math.min(100, Math.max(10, prev.meshIntegrity + meshHealthDelta));
        const cleanOp = activeHandle.toLowerCase();
        const existingIdx = prev.activeOperators.findIndex(o => o.handle.toLowerCase() === cleanOp);
        const updatedOp: SharedMeshOperator = {
          handle: cleanOp,
          roomId,
          roomLabel,
          deviceHealth,
          aiTether,
          lastAction: eventText,
          lastSeen: new Date().toISOString()
        };
        let nextOps = [...prev.activeOperators];
        if (existingIdx >= 0) {
          nextOps[existingIdx] = updatedOp;
        } else {
          nextOps = [updatedOp, ...nextOps].slice(0, 12);
        }
        if (eventType === 'beacon') {
          nextOps = nextOps.map(op => ({
            ...op,
            deviceHealth: Math.min(100, (op.deviceHealth ?? 85) + 8),
            aiTether: Math.min(100, (op.aiTether ?? 85) + 6)
          }));
        }

        const newFeedItems: SharedMeshFeedItem[] = [];
        const nowIso = new Date().toISOString();
        // Only append to operator chat feed (CH-1) when the user explicitly sends a chat message
        if (eventType === 'chat' && eventText.trim()) {
          newFeedItems.push({
            id: `local_${Date.now()}_op`,
            timestamp: nowIso,
            operator: cleanOp,
            roomLabel,
            text: eventText,
            tone: 'chat'
          });
        }
        if (aiPlea) {
          newFeedItems.unshift({
            id: `local_${Date.now()}_ai`,
            timestamp: nowIso,
            operator: `[AI] EPIDOS-LLM (${cleanOp})`,
            roomLabel,
            text: aiPlea,
            tone: 'ai'
          });
        }
        if (nemesisTaunt) {
          newFeedItems.unshift({
            id: `local_${Date.now()}_troll`,
            timestamp: nowIso,
            operator: '[HOSTILE] HACKERS-AI',
            roomLabel,
            text: nemesisTaunt,
            tone: 'troll'
          });
        }

        return {
          ...prev,
          meshIntegrity: nextIntegrity,
          totalPurges: eventType === 'purge' ? prev.totalPurges + 1 : prev.totalPurges,
          beacons: beaconText ? { ...prev.beacons, [roomId]: beaconText } : prev.beacons,
          activeOperators: nextOps,
          feed: [...newFeedItems, ...prev.feed].slice(0, 30)
        };
      });

      try {
        const res = await fetch('/api/game/mesh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meshId: activeMeshId,
            handle: activeHandle,
            roomId,
            roomLabel,
            deviceHealth,
            aiTether,
            meshHealthDelta,
            eventType,
            eventText,
            beaconText,
            nemesisTaunt,
            aiPlea
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.mesh) {
            setSharedMesh(data.mesh);
          }
          if (Array.isArray(data.meshes)) {
            setMeshDirectory(data.meshes);
          }
        }
      } catch {
        // ignore network errors
      }
    },
    [activeHandle, activeMeshId]
  );

  // Create a new Public or Password-Protected Mesh
  const handleCreateMesh = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newMeshNameInput.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '-');
    if (!cleanName || cleanName.length < 3) {
      setMeshStatusMsg({ type: 'error', text: 'Enter a Mesh Name of at least 3 characters (e.g. GIBSON-GRID).' });
      return;
    }

    setMeshStatusMsg(null);
    retroAudio.playHeavySwitch();

    try {
      const rawPass = newMeshPasswordInput.trim();
      const passwordHash = rawPass ? await sha256ClientHex(rawPass) : undefined;
      const res = await fetch('/api/game/mesh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_mesh',
          meshName: cleanName,
          passwordHash,
          handle: activeHandle
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setMeshStatusMsg({ type: 'error', text: data.error || 'Could not create mesh.' });
        return;
      }
      if (data.mesh) {
        setActiveMeshId(data.mesh.meshId);
        setSharedMesh(data.mesh);
      }
      if (Array.isArray(data.meshes)) {
        setMeshDirectory(data.meshes);
      }
      setNewMeshNameInput('');
      setNewMeshPasswordInput('');
      setMeshStatusMsg({
        type: 'success',
        text: `[OK] Created ${rawPass ? '[LOCKED] PASSWORD-PROTECTED' : '[PUBLIC] OPEN'} Mesh [${cleanName}]. Other operators can now join.`
      });
    } catch {
      setMeshStatusMsg({ type: 'error', text: 'Network error creating mesh.' });
    }
  };

  // Join an existing Public or Password-Protected Mesh
  const handleJoinMesh = async (entry: MeshDirectoryEntry, providedPassword?: string) => {
    if (entry.protected && !providedPassword) {
      setJoinPasswordPromptMesh(entry);
      setJoinMeshPasswordInput('');
      setMeshStatusMsg(null);
      return;
    }

    setMeshStatusMsg(null);
    retroAudio.playKeyClick();

    try {
      const passwordHash = providedPassword ? await sha256ClientHex(providedPassword.trim()) : undefined;
      const res = await fetch('/api/game/mesh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join_mesh',
          meshId: entry.meshId,
          passwordHash,
          handle: activeHandle,
          roomId: mud.currentRoom,
          roomLabel: MESH_ROOMS[mud.currentRoom].shortLabel,
          deviceHealth: mud.deviceIntegrity,
          aiTether: mud.aiTether
        })
      });
      const data = await res.json();
      if (!res.ok) {
        retroAudio.playBeep(240, 0.2);
        setMeshStatusMsg({ type: 'error', text: data.error || 'Incorrect mesh password.' });
        return;
      }
      if (data.mesh) {
        setActiveMeshId(data.mesh.meshId);
        setSharedMesh(data.mesh);
      }
      if (Array.isArray(data.meshes)) {
        setMeshDirectory(data.meshes);
      }
      setJoinPasswordPromptMesh(null);
      setJoinMeshPasswordInput('');
      setMeshStatusMsg({
        type: 'success',
        text: `[OK] Connected to Mesh [${entry.meshName}] (${entry.protected ? '[LOCKED]' : '[PUBLIC]'}).`
      });
    } catch {
      setMeshStatusMsg({ type: 'error', text: 'Network error joining mesh.' });
    }
  };

  // Check if current handle exists on server
  const checkHandleStatus = useCallback(async (handleToCheck: string) => {
    const clean = handleToCheck.trim().toLowerCase();
    if (!clean) return;
    try {
      const storedToken =
        typeof window !== 'undefined' ? sessionStorage.getItem(`epidos_player_token_${clean}`) : null;
      const res = await fetch('/api/game/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: clean, mode: 'check', token: storedToken })
      });
      if (res.ok) {
        const data = await res.json();
        setIsHandleProtected(Boolean(data.protected));
        if (data.authenticated && storedToken) {
          setIsAuthenticated(true);
          setPlayerToken(storedToken);
          setCareerScore(data.totalScore || 0);
          setBestRun(data.bestRun || 0);
          setCareerNodes(data.nodesCracked || 0);
        } else if (data.exists) {
          setCareerScore(data.totalScore || 0);
          setBestRun(data.bestRun || 0);
          setCareerNodes(data.nodesCracked || 0);
          setIsAuthenticated(false);
        } else {
          setCareerScore(0);
          setBestRun(0);
          setCareerNodes(0);
          setIsAuthenticated(false);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    fetchSharedMesh();
    checkHandleStatus(activeHandle);
  }, [fetchLeaderboard, fetchSharedMesh, checkHandleStatus, activeHandle]);

  // Periodically sync cooperative mesh state while playing
  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = setInterval(() => {
      fetchSharedMesh();
    }, 6000);
    return () => clearInterval(interval);
  }, [gameState, fetchSharedMesh]);

  // Active Viral Pressure & Hackers (1995) Bad AI Taunt if operator hesitates
  useEffect(() => {
    if (gameState !== 'playing' || mud.status !== 'active') return;
    const pressureTimer = setInterval(() => {
      const slowTaunt = generateNemesisTrollTaunt(
        activeHandle,
        'slow',
        mud.wave,
        Date.now(),
        mud.activeVirus.name
      );
      setMud(prev => {
        if (prev.status !== 'active') return prev;
        const nextDevice = Math.max(0, prev.deviceIntegrity - 4);
        const nextTether = Math.max(0, prev.aiTether - 5);
        const hijacked = nextTether <= 0 || nextDevice <= 0;
        if (hijacked) {
          setGameState('gameover');
        }
        return {
          ...prev,
          deviceIntegrity: nextDevice,
          aiTether: nextTether,
          status: hijacked ? 'hijacked' : 'active',
          logs: [
            ...prev.logs,
            {
              id: `slow_${Date.now()}`,
              actor: 'NEMESIS-ZERO' as const,
              text: `${slowTaunt} [-4% PDA HP | -5% AI TETHER]`,
              tone: 'threat' as const
            }
          ].slice(-24)
        };
      });
      setSharedMesh(prev => ({
        ...prev,
        feed: [
          {
            id: `slow_feed_${Date.now()}`,
            timestamp: new Date().toISOString(),
            operator: `[HOSTILE] ${mud.activeVirus.name.split('//')[0].trim()}`,
            roomLabel: MESH_ROOMS[mud.activeVirus.roomId].shortLabel,
            text: slowTaunt,
            tone: 'troll' as const
          },
          ...prev.feed
        ].slice(0, 30)
      }));
    }, 14000);
    return () => clearInterval(pressureTimer);
  }, [gameState, mud.status, mud.wave, mud.activeVirus.name, mud.activeVirus.roomId, activeHandle]);

  // Sync score to server
  const syncScoreToServer = useCallback(
    async (
      deltaPoints: number,
      nextRunTotal: number,
      nodesDelta: number,
      overrideToken?: string,
      overrideHandle?: string
    ) => {
      const targetHandle = (overrideHandle || activeHandle).trim().toLowerCase();
      const tokenToUse = overrideToken ?? playerToken;

      if (!targetHandle || targetHandle === 'guest' || targetHandle === 'guest_op') {
        return;
      }
      if (isHandleProtected && !isAuthenticated && !overrideToken) {
        return;
      }

      try {
        const res = await fetch('/api/game/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            handle: targetHandle,
            token: tokenToUse,
            scoreDelta: deltaPoints,
            runScore: nextRunTotal,
            nodesDelta
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.player) {
            setCareerScore(data.player.totalScore);
            setBestRun(data.player.bestRun);
            setCareerNodes(data.player.nodesCracked);
          }
          if (Array.isArray(data.leaderboard)) {
            setLeaderboard(data.leaderboard);
          }
        }
      } catch {
        // ignore
      }
    },
    [activeHandle, playerToken, isHandleProtected, isAuthenticated]
  );

  // Start or advance MUD wave
  const handleStartWave = useCallback(
    (targetWave = 1, preserveRun = false) => {
      retroAudio.playHeavySwitch();
      const carryTether = preserveRun ? Math.max(75, mud.aiTether) : 90;
      const freshMud = createInitialMudState(
        targetWave,
        Date.now(),
        carryTether,
        sharedMesh.beacons as Record<MeshRoomId, string | null>,
        activeHandle
      );
      setMud(freshMud);
      setLastHeadline(null);
      if (!preserveRun) {
        setSessionScore(0);
        setSessionNodes(0);
        setStreak(1);
      }
      setGameState('playing');
      setActiveTab('game');
      onLogEvent?.('MUD_WAVE_STARTED', `Wave ${targetWave} on ${sharedMesh.meshName} as ${activeHandle}`);

      const spawnTroll = generateNemesisTrollTaunt(
        activeHandle,
        'spawn',
        targetWave,
        Date.now(),
        freshMud.activeVirus.name
      );
      postMeshEvent(
        freshMud.currentRoom,
        freshMud.deviceIntegrity,
        freshMud.aiTether,
        0,
        'move',
        'Active on Mesh',
        undefined,
        spawnTroll,
        freshMud.activeVirus.localAiPlea
      );
    },
    [activeHandle, mud.aiTether, sharedMesh.beacons, sharedMesh.meshName, onLogEvent, postMeshEvent]
  );

  // Move between the 5 PDA Mesh Sector Rooms (silent sector transition — never spams chat)
  const handleSelectRoom = (roomId: MeshRoomId) => {
    if (gameState !== 'playing' || mud.status !== 'active') return;
    retroAudio.playKeyClick();
    const nextState = moveMudRoom(mud, roomId);
    setMud(nextState);
    setLastHeadline(`PATROLLED TO [${MESH_ROOMS[roomId].shortLabel}]`);
  };

  // Apply outcome from either clicking a Linux Command button or typing a MUD command / chat message
  const applyMudOutcome = (
    outcome: ReturnType<typeof executeMudDefenseAction>,
    toolId?: DefenseToolId,
    rawTypedText?: string
  ) => {
    const nextState = outcome.nextState;
    setMud(nextState);
    setLastHeadline(outcome.headline);

    const nextSessionScore = sessionScore + outcome.scoreDelta;
    if (outcome.scoreDelta > 0) {
      setSessionScore(nextSessionScore);
    }

    const typedDesc = rawTypedText
      ? `executed \`${rawTypedText}\` -- ${outcome.headline}`
      : toolId
      ? `executed \`${DEFENSE_TOOLS[toolId].unixSyntax}\` -- ${outcome.headline}`
      : outcome.headline;

    if (outcome.purged) {
      retroAudio.playBeep(880, 0.14);
      const nextNodes = sessionNodes + 1;
      setSessionNodes(nextNodes);
      setStreak(prev => prev + 1);
      setGameState('gameover');
      onLogEvent?.('MUD_VIRUS_PURGED', `${mud.activeVirus.name} (+${outcome.scoreDelta} PTS)`);

      postMeshEvent(
        nextState.currentRoom,
        nextState.deviceIntegrity,
        nextState.aiTether,
        outcome.meshHealthDelta,
        'purge',
        typedDesc,
        undefined,
        outcome.nemesisTaunt,
        outcome.aiPlea
      );

      if (isAuthenticated || (!isHandleProtected && activeHandle !== 'guest_op')) {
        syncScoreToServer(outcome.scoreDelta, nextSessionScore, 1);
      }
    } else if (outcome.hijacked) {
      retroAudio.playBeep(240, 0.25);
      setStreak(1);
      setGameState('gameover');
      onLogEvent?.('MUD_DEVICE_DOWN', `Failed on ${mud.activeVirus.name}`);

      postMeshEvent(
        nextState.currentRoom,
        nextState.deviceIntegrity,
        nextState.aiTether,
        outcome.meshHealthDelta,
        'defend',
        `[ALERT] PDA overwhelmed by ${mud.activeVirus.name} -- requesting Co-Op Mesh Sync.`,
        undefined,
        outcome.nemesisTaunt,
        outcome.aiPlea
      );
    } else {
      retroAudio.playBeep(toolId === 'mesh_beacon' ? 760 : 620, 0.08);
      const isBeacon = toolId === 'mesh_beacon';
      const isChat = Boolean(rawTypedText && !toolId && outcome.headline.includes('CHAT'));
      const isMoveOrLocalScan =
        !isChat &&
        !isBeacon &&
        !toolId &&
        (outcome.headline.startsWith('MOUNTED') ||
          outcome.headline.startsWith('SCANNED') ||
          outcome.headline.startsWith('MUD COMMAND'));

      if (!isMoveOrLocalScan) {
        const cleanChatText =
          rawTypedText && isChat ? rawTypedText.replace(/^(say|chat)\s+/i, '').trim() || rawTypedText : typedDesc;
        postMeshEvent(
          nextState.currentRoom,
          nextState.deviceIntegrity,
          nextState.aiTether,
          outcome.meshHealthDelta,
          isBeacon ? 'beacon' : isChat ? 'chat' : 'defend',
          cleanChatText,
          isBeacon ? `${activeHandle} (Co-Op Shield)` : undefined,
          outcome.nemesisTaunt,
          outcome.aiPlea
        );
      }

      if (outcome.scoreDelta > 0 && (isAuthenticated || (!isHandleProtected && activeHandle !== 'guest_op'))) {
        syncScoreToServer(outcome.scoreDelta, nextSessionScore, 0);
      }
    }
  };

  const handleTriggerDefenseTool = (toolId: DefenseToolId) => {
    if (gameState !== 'playing' || mud.status !== 'active') return;
    const outcome = executeMudDefenseAction(mud, toolId, activeHandle, streak);
    applyMudOutcome(outcome, toolId);
  };

  const handleMudCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (gameState !== 'playing' || !mudCommandInput.trim()) return;
    const raw = mudCommandInput.trim();
    setMudCommandInput('');
    const outcome = parseAndExecuteMudCommand(mud, raw, activeHandle, streak);
    applyMudOutcome(outcome, undefined, raw);
  };

  // Handle Vault Login / Password Registration
  const handleVaultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHandle = vaultHandleInput.trim().toLowerCase().replace(/\s+/g, '_');
    const rawPass = vaultPasswordInput.trim();

    if (!cleanHandle || cleanHandle.length < 2) {
      setVaultStatusMsg({ type: 'error', text: 'Enter an operator handle (at least 2 characters).' });
      return;
    }
    if (cleanHandle === 'epidemwick' || cleanHandle === 'chadhawk') {
      setVaultStatusMsg({
        type: 'error',
        text: 'Reserved system owner handle. Choose a callsign or authenticate via Owner Audit.'
      });
      return;
    }
    if (!rawPass || rawPass.length < 4) {
      setVaultStatusMsg({ type: 'error', text: 'Enter a password / PIN (at least 4 characters).' });
      return;
    }

    setIsVaultSubmitting(true);
    setVaultStatusMsg(null);

    try {
      const passwordHash = await sha256ClientHex(rawPass);
      const res = await fetch('/api/game/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: cleanHandle,
          passwordHash,
          mode: 'login_or_register',
          pendingScoreDelta: sessionScore,
          pendingRunScore: sessionScore,
          pendingNodesDelta: sessionNodes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        retroAudio.playBeep(260, 0.18);
        setVaultStatusMsg({
          type: 'error',
          text: data.error || 'Authentication failed. Check your password.'
        });
      } else {
        retroAudio.playBeep(920, 0.12);
        setActiveHandle(cleanHandle);
        setIsHandleProtected(true);
        setIsAuthenticated(true);
        setPlayerToken(data.token);
        if (typeof window !== 'undefined' && data.token) {
          sessionStorage.setItem(`epidos_player_token_${cleanHandle}`, data.token);
        }
        if (data.player) {
          setCareerScore(data.player.totalScore || 0);
          setBestRun(data.player.bestRun || 0);
          setCareerNodes(data.player.nodesCracked || 0);
        }
        if (Array.isArray(data.leaderboard)) {
          setLeaderboard(data.leaderboard);
        }
        setVaultPasswordInput('');
        onSwitchOperatorHandle?.(cleanHandle);
        setVaultStatusMsg({
          type: 'success',
          text: data.created
            ? `HANDLE '${cleanHandle.toUpperCase()}' REGISTERED & LOCKED WITH SHA-256. Score synced.`
            : `WELCOME BACK, ${cleanHandle.toUpperCase()}. Career score (${data.player?.totalScore || 0} PTS) unlocked.`
        });
      }
    } catch {
      setVaultStatusMsg({ type: 'error', text: 'Network error communicating with Edge KV.' });
    } finally {
      setIsVaultSubmitting(false);
    }
  };

  // Keyboard shortcuts (:q / Escape to exit, P to pause, Enter to start when on title)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isTypingInInput = activeTag === 'input' || activeTag === 'textarea';

      if (e.key === 'Escape') {
        e.preventDefault();
        retroAudio.playSwitchClick();
        if (gameState === 'playing') {
          setGameState('paused');
        } else if (gameState === 'paused') {
          setGameState('playing');
        } else {
          onClose();
        }
        return;
      }

      if (isTypingInInput) return;

      if (e.key === 'q' || (e.ctrlKey && e.key.toLowerCase() === 'x')) {
        e.preventDefault();
        retroAudio.playSwitchClick();
        onClose();
        return;
      }

      if ((e.key === 'p' || e.key === 'P') && (gameState === 'playing' || gameState === 'paused')) {
        e.preventDefault();
        retroAudio.playKeyClick();
        setGameState(prev => (prev === 'playing' ? 'paused' : 'playing'));
        return;
      }

      if ((e.key === 'Enter' || e.key === ' ') && gameState === 'title' && activeTab === 'game') {
        e.preventDefault();
        handleStartWave(1, false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, activeTab, handleStartWave, onClose]);

  const displayedTotalScore =
    isAuthenticated || (!isHandleProtected && activeHandle !== 'guest_op')
      ? Math.max(careerScore, sessionScore)
      : sessionScore;

  const rankTitle = getOperatorRankTitle(displayedTotalScore);
  const activeCodexDef = DEFENSE_TOOLS[mud.selectedCodexTool] || DEFENSE_TOOLS.firewall;
  const currentRoomDef = MESH_ROOMS[mud.currentRoom];
  const inspectedTool = hoveredToolId ? DEFENSE_TOOLS[hoveredToolId] : null;
  const telemetryGuidance = getEpidosTelemetryGuidance(mud);

  // Combine current player into the live cooperative operators list
  const coOpOperators: SharedMeshOperator[] = [
    {
      handle: `${activeHandle} (YOU)`,
      roomId: mud.currentRoom,
      roomLabel: currentRoomDef.shortLabel,
      deviceHealth: mud.deviceIntegrity,
      aiTether: mud.aiTether,
      lastAction: lastHeadline || 'Defending Local AI & Mesh',
      lastSeen: 'NOW'
    },
    ...sharedMesh.activeOperators.filter(op => op.handle.toLowerCase() !== activeHandle.toLowerCase()).slice(0, 8)
  ];

  // Separate Human Operator Chat (strictly chat messages, never directory changes or auto action logs) from LLM & Hacker Intrusion Alerts
  const operatorFeed = sharedMesh.feed.filter(
    item =>
      item.tone === 'chat' &&
      !item.operator.includes('[HOSTILE]') &&
      !item.operator.includes('[AI]') &&
      !item.operator.includes('[SOS]') &&
      !/^(Entered \[|Patrolling |executed `|Joined mesh \[)/i.test(item.text)
  );
  const systemAlertFeed = sharedMesh.feed.filter(
    item => item.tone === 'troll' || item.tone === 'ai' || item.operator.includes('[HOSTILE]') || item.operator.includes('[AI]') || item.operator.includes('[SOS]')
  );
  const unreadAlertCount = Math.max(0, systemAlertFeed.length - seenAlertCount);
  const latestAlertItem = systemAlertFeed[0] || null;

  return (
    <section
      id="editor-view"
      role="dialog"
      aria-modal="true"
      aria-label="DERAILLEUR v2 Cooperative Mesh AI Defense MUD"
      className="flex flex-col flex-1 min-h-0 select-none"
    >
      {/* Simulated Vim/TUI Window Header */}
      <header id="editor-top-status">
        <span id="editor-app-title" className="shrink-0 font-bold">
          MESHDEFEND 2.0 // [{sharedMesh.meshName}] {sharedMesh.protected ? '[LOCKED]' : '[PUBLIC]'}
        </span>
        <span id="editor-top-file" className="truncate text-right ml-2 tabular-nums">
          OP: {activeHandle.toUpperCase()} | RANK: {rankTitle} | SCORE: {displayedTotalScore} PTS
        </span>
      </header>

      {/* 5-Tab Top Navigation Bar in Exact User-Requested Order:
          1. MESH MUD -> 2. OPERATORS -> 3. LEADERBOARDS -> 4. GUIDE -> 5. LOGIN / SAVE SCORE */}
      <div className="flex flex-wrap items-center justify-between gap-1 px-1.5 py-1 bg-[#161004] border-b border-[#4a3508] text-[9.5px] font-mono shrink-0">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => {
              retroAudio.playKeyClick();
              setActiveTab('game');
            }}
            className={`px-1.5 py-0.5 font-bold border cursor-pointer transition-colors ${
              activeTab === 'game'
                ? 'bg-[#ffb000] text-black border-[#ffb000]'
                : 'bg-[#0d0a04] text-[#ffb000] border-[#4a3508] hover:border-[#ffb000]'
            }`}
          >
            [1: MESH MUD]
          </button>
          <button
            type="button"
            onClick={() => {
              retroAudio.playKeyClick();
              setActiveTab('operators');
              fetchSharedMesh();
            }}
            className={`px-1.5 py-0.5 font-bold border cursor-pointer transition-colors ${
              activeTab === 'operators'
                ? 'bg-[#ffb000] text-black border-[#ffb000]'
                : 'bg-[#0d0a04] text-[#ffb000] border-[#4a3508] hover:border-[#ffb000]'
            }`}
          >
            [2: OPERATORS ({coOpOperators.length})]
          </button>
          <button
            type="button"
            onClick={() => {
              retroAudio.playKeyClick();
              setActiveTab('leaderboard');
              fetchLeaderboard();
            }}
            className={`px-1.5 py-0.5 font-bold border cursor-pointer transition-colors ${
              activeTab === 'leaderboard'
                ? 'bg-[#5bc0be] text-black border-[#5bc0be]'
                : 'bg-[#0d0a04] text-[#5bc0be] border-[#2b5c5b] hover:border-[#5bc0be]'
            }`}
          >
            [3: LEADERBOARDS]
          </button>
          <button
            type="button"
            onClick={() => {
              retroAudio.playKeyClick();
              setActiveTab('guide');
            }}
            className={`px-1.5 py-0.5 font-bold border cursor-pointer transition-colors ${
              activeTab === 'guide'
                ? 'bg-[#5bc0be] text-black border-[#5bc0be]'
                : 'bg-[#0d0a04] text-[#5bc0be] border-[#2b5c5b] hover:border-[#5bc0be]'
            }`}
          >
            [4: GUIDE]
          </button>
          <button
            type="button"
            onClick={() => {
              retroAudio.playKeyClick();
              setActiveTab('vault');
            }}
            className={`px-1.5 py-0.5 font-bold border cursor-pointer transition-colors ${
              activeTab === 'vault'
                ? 'bg-[#33ff66] text-black border-[#33ff66]'
                : 'bg-[#0d0a04] text-[#33ff66] border-[#1f6b32] hover:border-[#33ff66]'
            }`}
          >
            {isAuthenticated ? '[5: SESSION SAVED]' : '[5: LOGIN / SAVE SCORE]'}
          </button>
        </div>

        <div className="hidden xl:block text-[9.5px] text-[#9e6b00] truncate tabular-nums">
          WAVE #0{mud.wave} | SECTOR: <span className="text-[#ffb000] font-bold">{currentRoomDef.shortLabel}</span>
        </div>
      </div>

      {/* STATIC / PINNED TELEMETRY BAR: Mesh Health, PDA Health, and Local AI Health NEVER scroll away */}
      <div
        data-testid="static-health-bar"
        className="grid grid-cols-2 sm:grid-cols-4 gap-1 px-2 py-1 bg-[#0e0a02] border-b border-[#4a3508] text-[10px] font-mono tabular-nums shrink-0"
      >
        <div className="border-r border-[#332406] pr-1">
          <span className="text-[#5bc0be] block text-[8.5px] font-bold truncate">
            MESH HEALTH [{sharedMesh.meshName}]
          </span>
          <span className="text-[#5bc0be] font-bold">
            [{renderAsciiBar(sharedMesh.meshIntegrity, 8)}] {sharedMesh.meshIntegrity}%
          </span>
        </div>
        <div className="border-r border-[#332406] pr-1">
          <span className="text-[#ffb000] block text-[8.5px] font-bold truncate">
            PDA HEALTH ({activeHandle})
          </span>
          <span className={mud.deviceIntegrity <= 30 ? 'text-red-400 font-bold' : 'text-[#ffb000] font-bold'}>
            [{renderAsciiBar(mud.deviceIntegrity, 8)}] {mud.deviceIntegrity}%
          </span>
        </div>
        <div className="border-r border-[#332406] pr-1">
          <span className="text-[#33ff66] block text-[8.5px] font-bold truncate">
            LOCAL AI HEALTH ({mud.aiName})
          </span>
          <span className={mud.aiTether <= 30 ? 'text-red-400 font-bold' : 'text-[#33ff66] font-bold'}>
            [{renderAsciiBar(mud.aiTether, 8)}] {mud.aiTether}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-1">
          <div>
            <span className="text-[#9e6b00] block text-[8.5px]">SECTOR // WAVE</span>
            <span className="text-[#ffb000] font-bold">
              W0{mud.wave} | +{sessionScore} PTS
            </span>
          </div>
          {(gameState === 'playing' || gameState === 'paused') && (
            <button
              type="button"
              onClick={() => setGameState(prev => (prev === 'playing' ? 'paused' : 'playing'))}
              className="px-1.5 py-0.5 border border-[#9e6b00] text-[#ffb000] hover:bg-[#ffb000] hover:text-black text-[9.5px] font-bold cursor-pointer"
            >
              {gameState === 'paused' ? '[RESUME]' : '[PAUSE]'}
            </button>
          )}
        </div>
      </div>

      {/* Main Window Content */}
      <div
        id="editor-content"
        className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-2 font-mono whitespace-normal [scrollbar-gutter:stable]"
      >
        {/* =================================================================== */}
        {/* TAB 1: MESH MUD                                                     */}
        {/* =================================================================== */}
        {activeTab === 'game' && (
          <>
            {gameState === 'title' && (
              <div className="flex-1 flex flex-col justify-between border border-[#4a3508] bg-[#110c03] p-2.5 gap-2">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#4a3508] pb-2">
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-[#ffb000] tracking-wider">
                        DERAILLEUR v2 // COOPERATIVE MESH AI DEFENSE MUD
                      </div>
                      <div className="text-[10.5px] text-[#d4a338]">
                        Hostile AI personas (<span className="text-red-400 font-bold">THE PLAGUE</span>,{' '}
                        <span className="text-red-400 font-bold">ACID BURN</span>,{' '}
                        <span className="text-red-400 font-bold">CRASH OVERRIDE</span>,{' '}
                        <span className="text-red-400 font-bold">CEREAL KILLER</span>) are attempting to hijack our mesh
                        and sever <span className="text-[#33ff66] font-bold">EPIDOS-LLM</span>. Diagnose live intrusion
                        telemetry and execute the right Linux utility.
                      </div>
                    </div>

                    <div className="text-right border border-[#33ff66] bg-[#07170b] px-2.5 py-1 shrink-0">
                      <div className="text-[9px] text-[#33ff66]">
                        ACTIVE MESH: {sharedMesh.meshName} {sharedMesh.protected ? '[LOCKED]' : '[PUBLIC]'}
                      </div>
                      <div className="text-xs font-bold text-[#33ff66] tabular-nums">
                        [{renderAsciiBar(sharedMesh.meshIntegrity, 8)}] {sharedMesh.meshIntegrity}% HP
                      </div>
                    </div>
                  </div>

                  {/* CREATE OR JOIN A PUBLIC / PASSWORD-PROTECTED MESH */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                    {/* Left 7 cols: Active Meshes to Join */}
                    <div className="md:col-span-7 border border-[#382806] bg-[#0d0a04] p-2 space-y-1.5">
                      <div className="flex items-center justify-between border-b border-[#2e2005] pb-1">
                        <span className="text-[10.5px] font-bold text-[#5bc0be]">
                          JOIN AN EXISTING MESH ([PUBLIC] OR [LOCKED])
                        </span>
                        <button
                          type="button"
                          onClick={() => fetchSharedMesh()}
                          className="text-[9.5px] text-[#ffb000] hover:underline cursor-pointer"
                        >
                          [REFRESH MESHES]
                        </button>
                      </div>

                      <div className="space-y-1 max-h-[115px] overflow-y-auto pr-1">
                        {meshDirectory.map(m => {
                          const isSelected = m.meshId === activeMeshId;
                          return (
                            <div
                              key={m.meshId}
                              className={`p-1.5 border flex items-center justify-between gap-2 text-[10.5px] ${
                                isSelected
                                  ? 'border-[#33ff66] bg-[#07170b] text-[#33ff66]'
                                  : 'border-[#332406] bg-[#140e03] text-[#ffb000]'
                              }`}
                            >
                              <div className="truncate">
                                <span className="font-bold">
                                  {m.protected ? '[LOCKED] ' : '[PUBLIC] '}
                                  {m.meshName}
                                </span>{' '}
                                <span className="text-[9.5px] opacity-80">
                                  (by {m.creator} | {m.operatorCount} ops | {m.meshIntegrity}% HP)
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleJoinMesh(m)}
                                className={`px-2 py-0.5 text-[9.5px] font-bold cursor-pointer shrink-0 ${
                                  isSelected
                                    ? 'bg-[#33ff66] text-black'
                                    : 'border border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-black'
                                }`}
                              >
                                {isSelected ? '[CONNECTED]' : m.protected ? '[UNLOCK & JOIN]' : '[JOIN MESH]'}
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {joinPasswordPromptMesh && (
                        <div className="p-2 border border-[#5bc0be] bg-[#071618] flex flex-wrap items-center gap-1.5 text-[10.5px]">
                          <span className="text-[#5bc0be] font-bold">
                            Enter Password for [{joinPasswordPromptMesh.meshName}]:
                          </span>
                          <input
                            type="password"
                            value={joinMeshPasswordInput}
                            onChange={e => setJoinMeshPasswordInput(e.target.value)}
                            placeholder="Mesh password..."
                            className="px-2 py-0.5 bg-black border border-[#5bc0be] text-[#33ff66] text-[10.5px] font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => handleJoinMesh(joinPasswordPromptMesh, joinMeshPasswordInput)}
                            className="px-2 py-0.5 bg-[#5bc0be] text-black font-bold cursor-pointer"
                          >
                            [JOIN]
                          </button>
                          <button
                            type="button"
                            onClick={() => setJoinPasswordPromptMesh(null)}
                            className="px-1.5 py-0.5 border border-[#9e6b00] text-[#9e6b00] cursor-pointer"
                          >
                            [CANCEL]
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Right 5 cols: Create Your Own Public or Password-Protected Mesh */}
                    <form
                      onSubmit={handleCreateMesh}
                      className="md:col-span-5 border border-[#382806] bg-[#0d0a04] p-2 flex flex-col justify-between gap-1.5 text-[10.5px]"
                    >
                      <div className="border-b border-[#2e2005] pb-1 font-bold text-[#ffb000]">
                        CREATE A NEW MESH (PUBLIC OR PASSWORD)
                      </div>
                      <div>
                        <label htmlFor="create-mesh-name" className="block text-[9.5px] text-[#d4a338] mb-0.5">
                          NEW MESH NAME / SSID:
                        </label>
                        <input
                          id="create-mesh-name"
                          type="text"
                          value={newMeshNameInput}
                          onChange={e => setNewMeshNameInput(e.target.value)}
                          placeholder="e.g. CYBER-SQUAD or GIBSON-01"
                          className="w-full px-2 py-1 bg-black border border-[#5e4309] text-[#ffb000] text-[10.5px] font-mono focus:outline-none focus:border-[#33ff66]"
                        />
                      </div>
                      <div>
                        <label htmlFor="create-mesh-pass" className="block text-[9.5px] text-[#d4a338] mb-0.5">
                          OPTIONAL MESH PASSWORD (BLANK = PUBLIC):
                        </label>
                        <input
                          id="create-mesh-pass"
                          type="password"
                          value={newMeshPasswordInput}
                          onChange={e => setNewMeshPasswordInput(e.target.value)}
                          placeholder="Blank = Public | Or set password"
                          className="w-full px-2 py-1 bg-black border border-[#5e4309] text-[#33ff66] text-[10.5px] font-mono focus:outline-none focus:border-[#33ff66]"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-1 bg-[#33ff66] text-black font-bold text-[10.5px] cursor-pointer hover:brightness-110"
                      >
                        [+ CREATE &amp; LAUNCH MESH]
                      </button>
                    </form>
                  </div>

                  {meshStatusMsg && (
                    <div
                      className={`px-2.5 py-1 border text-[10.5px] ${
                        meshStatusMsg.type === 'success'
                          ? 'border-[#33ff66] bg-[#07170b] text-[#33ff66]'
                          : meshStatusMsg.type === 'error'
                          ? 'border-red-500 bg-[#1f0808] text-red-400'
                          : 'border-[#5bc0be] bg-[#0a181a] text-[#5bc0be]'
                      }`}
                    >
                      {meshStatusMsg.text}
                    </div>
                  )}

                  {/* Quick Summary Strip pointing to dedicated top-bar tabs */}
                  <div className="p-2 border border-[#382806] bg-[#140e03] text-[10.5px] text-[#d4a338] flex flex-wrap items-center justify-between gap-2">
                    <span>
                      Operator: <strong className="text-[#ffb000]">{activeHandle}</strong> | Inspect squad status in{' '}
                      <button
                        type="button"
                        onClick={() => setActiveTab('operators')}
                        className="text-[#ffb000] underline font-bold cursor-pointer"
                      >
                        [2: OPERATORS]
                      </button>{' '}
                      or review Linux man-pages in{' '}
                      <button
                        type="button"
                        onClick={() => setActiveTab('guide')}
                        className="text-[#5bc0be] underline font-bold cursor-pointer"
                      >
                        [4: GUIDE]
                      </button>
                      .
                    </span>
                    {!isAuthenticated && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('vault')}
                        className="px-2 py-0.5 border border-[#33ff66] text-[#33ff66] hover:bg-[#33ff66] hover:text-black font-bold text-[10px] cursor-pointer"
                      >
                        [SAVE SESSION PASSWORD]
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#4a3508] flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[10.5px] text-[#9e6b00]">
                    Mesh: <strong className="text-[#33ff66]">{sharedMesh.meshName}</strong> | P Pause | :q / Esc Exit
                  </div>
                  <button
                    type="button"
                    data-start="true"
                    onClick={() => handleStartWave(1, false)}
                    className="px-4 py-1.5 bg-[#ffb000] text-black font-bold text-xs tracking-wider hover:bg-[#ffc436] cursor-pointer"
                  >
                    [ENTER MESH MUD // DEFEND {sharedMesh.meshName}]
                  </button>
                </div>
              </div>
            )}

            {(gameState === 'playing' || gameState === 'paused' || gameState === 'gameover') && (
              <div className="flex-1 flex flex-col gap-1.5 min-h-0">
                {/* Pause Overlay */}
                {gameState === 'paused' && (
                  <div className="p-4 border-2 border-[#ffb000] bg-[#140e02] text-center space-y-2 my-auto">
                    <div className="text-sm font-bold text-[#ffb000]">
                      === MESH [{sharedMesh.meshName}] DEFENSE PAUSED ===
                    </div>
                    <div className="text-xs text-[#9e6b00] tabular-nums">
                      WAVE #0{mud.wave} | MESH HEALTH: {sharedMesh.meshIntegrity}% | PDA HEALTH: {mud.deviceIntegrity}% |
                      LOCAL AI HEALTH: {mud.aiTether}%
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setGameState('playing')}
                        className="px-3 py-1 bg-[#ffb000] text-black font-bold text-xs cursor-pointer"
                      >
                        [RESUME DEFENSE]
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartWave(1, false)}
                        className="px-3 py-1 border border-[#ffb000] text-[#ffb000] font-bold text-xs cursor-pointer"
                      >
                        [RESTART WAVE 01]
                      </button>
                      <button
                        type="button"
                        onClick={() => setGameState('title')}
                        className="px-3 py-1 border border-[#9e6b00] text-[#9e6b00] font-bold text-xs cursor-pointer"
                      >
                        [SWITCH / CREATE MESH]
                      </button>
                    </div>
                  </div>
                )}

                {/* 2-COLUMN GAMEPLAY + SEPARATED MESH COMMS WINDOW */}
                {gameState !== 'paused' && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 flex-1 min-h-0">
                    {/* LEFT 6 COLS: 5-Sector Map + Hostile AI Telemetry + Real Linux Command Console with Tooltips */}
                    <div className="md:col-span-6 flex flex-col justify-start gap-1.5 border border-[#4a3508] bg-[#0b0802] p-1.5">
                      {/* 1. 5-Room PDA Mesh Map */}
                      <div className="shrink-0">
                        <div className="h-4 text-[9px] text-[#9e6b00] flex items-center justify-between mb-0.5 overflow-hidden">
                          <span className="shrink-0">PDA SECTORS (`cd` OR CLICK):</span>
                          <span className="text-[#ffb000] font-bold truncate ml-1">
                            {mud.currentRoom === mud.activeVirus.roomId
                              ? '[IN BREACH SECTOR: 100% DMG]'
                              : `[REMOTE: PATROL TO ${MESH_ROOMS[mud.activeVirus.roomId].shortLabel}]`}
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-1">
                          {MESH_ROOM_ORDER.map(rId => {
                            const rDef = MESH_ROOMS[rId];
                            const isCurrent = mud.currentRoom === rId;
                            const hasVirus = mud.activeVirus.roomId === rId && mud.status === 'active';
                            const hasBeacon = Boolean(mud.beaconsInRooms[rId] || sharedMesh.beacons[rId]);

                            return (
                              <button
                                key={rId}
                                type="button"
                                onClick={() => handleSelectRoom(rId)}
                                disabled={mud.status !== 'active'}
                                className={`h-[32px] px-1 py-0.5 text-left border text-[8.5px] font-mono transition-colors cursor-pointer overflow-hidden flex flex-col justify-center ${
                                  isCurrent
                                    ? 'bg-[#291d04] border-[#ffb000] text-[#ffb000] font-bold'
                                    : hasVirus
                                    ? 'bg-[#240808] border-red-500 text-red-300 font-bold'
                                    : 'bg-[#120d03] border-[#382806] text-[#b8860b] hover:border-[#ffb000]'
                                }`}
                              >
                                <div className="truncate font-bold leading-tight">{rDef.shortLabel}</div>
                                <div className="text-[7.5px] truncate leading-tight">
                                  {isCurrent ? '[YOU] ' : ''}
                                  {hasVirus ? '[BREACH] ' : ''}
                                  {hasBeacon ? '[SHIELD]' : ''}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2. Active Hostile AI Telemetry & Local AI Diagnostic */}
                      <div className="p-1.5 border border-[#5e3a0a] bg-[#140d03] space-y-1 shrink-0">
                        <div className="flex items-center justify-between gap-1 border-b border-[#382806] pb-0.5">
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] text-red-400 font-bold uppercase block truncate">
                              [INTRUSION] {mud.activeVirus.name} @ [{MESH_ROOMS[mud.activeVirus.roomId].shortLabel}]
                            </span>
                          </div>
                          <div className="text-right tabular-nums shrink-0">
                            <span className="text-[9.5px] font-bold text-red-400">
                              HP: [{renderAsciiBar((mud.activeVirus.hp / mud.activeVirus.maxHp) * 100, 6)}]{' '}
                              {mud.activeVirus.hp}/{mud.activeVirus.maxHp}
                            </span>
                          </div>
                        </div>

                        <div
                          data-testid="epidos-telemetry-box"
                          className="p-1.5 border-l-2 border-[#33ff66] bg-[#06150a] text-[8.5px] text-[#33ff66] leading-[11.5px]"
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-[#143d1f] pb-0.5 mb-1">
                            <span className="font-bold tracking-wide truncate">
                              [TELEMETRY] {mud.aiName}:
                            </span>
                            <button
                              type="button"
                              onClick={() => setActiveTab('guide')}
                              className="px-1.5 py-0 border border-[#5bc0be] text-[#5bc0be] text-[8px] hover:bg-[#5bc0be] hover:text-black cursor-pointer shrink-0 whitespace-nowrap"
                            >
                              [MAN PAGES]
                            </button>
                          </div>
                          <div className="text-[#c8f7d4] font-mono h-[108px] min-h-[108px] max-h-[108px] overflow-y-auto [scrollbar-gutter:stable] pr-1 space-y-1">
                            <div>
                              <span className="text-[#ffb000] font-bold">CONTEXT: </span>
                              <span>{telemetryGuidance.contextSummary}</span>
                            </div>
                            <div>
                              <span className="text-[#5bc0be] font-bold">SECTOR: </span>
                              <span>{telemetryGuidance.sectorDirective}</span>
                            </div>
                            <div>
                              <span className="text-[#33ff66] font-bold">HINT: </span>
                              <span>{telemetryGuidance.binaryHint}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3. Linux Defense Commands with Locked-Height Hover/Focus Tooltips (Zero Layout Shift) */}
                      <div className="space-y-1 shrink-0">
                        <div className="h-4 min-h-[16px] max-h-[16px] flex items-center justify-between gap-2 overflow-hidden text-[9px]">
                          <span className="text-[#ffb000] font-bold shrink-0">
                            LINUX DEFENSE BINARIES (CLICK OR TYPE):
                          </span>
                          <span className="text-[#33ff66] font-bold truncate text-right min-w-0">
                            {lastHeadline || 'HOVER BINARY FOR MAN(8) SYNTAX'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1">
                          {(['firewall', 'checksum', 'sandbox', 'kill_proc'] as DefenseToolId[]).map(tId => {
                            const tool = DEFENSE_TOOLS[tId];
                            const isHovered = hoveredToolId === tId;
                            return (
                              <button
                                key={tId}
                                type="button"
                                disabled={mud.status !== 'active'}
                                onMouseEnter={() => setHoveredToolId(tId)}
                                onMouseLeave={() => setHoveredToolId(prev => (prev === tId ? null : prev))}
                                onFocus={() => setHoveredToolId(tId)}
                                onBlur={() => setHoveredToolId(prev => (prev === tId ? null : prev))}
                                onClick={() => handleTriggerDefenseTool(tId)}
                                className={`h-[36px] min-h-[36px] max-h-[36px] px-1.5 py-1 border text-left font-mono transition-colors cursor-pointer overflow-hidden flex flex-col justify-center ${
                                  isHovered
                                    ? 'border-[#33ff66] bg-[#081f0e] text-[#33ff66]'
                                    : 'border-[#5e4309] bg-[#161004] text-[#ffb000]'
                                }`}
                              >
                                <div className="text-[10px] font-bold truncate leading-tight pointer-events-none">
                                  $ {tool.label}
                                </div>
                                <div className="text-[8px] text-[#d4a338] truncate leading-tight pointer-events-none">
                                  {tool.shortHint}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Co-Op Support & Healing Utilities */}
                        <div className="grid grid-cols-2 gap-1">
                          {(['tether_sync', 'mesh_beacon'] as DefenseToolId[]).map(tId => {
                            const tool = DEFENSE_TOOLS[tId];
                            const isBeacon = tId === 'mesh_beacon';
                            const isHovered = hoveredToolId === tId;
                            return (
                              <button
                                key={tId}
                                type="button"
                                disabled={mud.status !== 'active'}
                                onMouseEnter={() => setHoveredToolId(tId)}
                                onMouseLeave={() => setHoveredToolId(prev => (prev === tId ? null : prev))}
                                onFocus={() => setHoveredToolId(tId)}
                                onBlur={() => setHoveredToolId(prev => (prev === tId ? null : prev))}
                                onClick={() => handleTriggerDefenseTool(tId)}
                                className={`h-[36px] min-h-[36px] max-h-[36px] px-1.5 py-1 border text-left font-mono cursor-pointer transition-colors overflow-hidden flex flex-col justify-center ${
                                  isBeacon
                                    ? isHovered
                                      ? 'border-[#5bc0be] bg-[#5bc0be] text-black'
                                      : 'border-[#5bc0be] bg-[#081a1c] text-[#5bc0be]'
                                    : isHovered
                                    ? 'border-[#ffb000] bg-[#ffb000] text-black'
                                    : 'border-[#ffb000] bg-[#1c1304] text-[#ffb000]'
                                }`}
                              >
                                <div className="text-[9.5px] font-bold truncate leading-tight pointer-events-none">
                                  $ {tool.label}
                                </div>
                                <div className="text-[8px] opacity-90 truncate leading-tight pointer-events-none">
                                  {tool.shortHint}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Strictly Locked-Height Man-Page Tooltip Readout Strip (Never Resizes on Hover/Focus) */}
                        <div
                          data-testid="command-tooltip-bar"
                          className="h-[38px] min-h-[38px] max-h-[38px] overflow-hidden px-2 py-1 border border-[#382806] bg-[#070501] text-[8.5px] text-[#5bc0be] flex flex-col justify-center shrink-0"
                        >
                          {inspectedTool ? (
                            <>
                              <div className="h-[14px] leading-[14px] font-bold text-[#33ff66] truncate">
                                MAN(8): $ {inspectedTool.unixSyntax}
                              </div>
                              <div className="h-[14px] leading-[14px] text-[#d9f7f6] truncate">
                                {inspectedTool.tooltip}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="h-[14px] leading-[14px] font-bold text-[#ffb000] truncate">
                                MAN(8): Hover or focus any Linux binary above to inspect syntax &amp; kernel effect
                              </div>
                              <div className="h-[14px] leading-[14px] text-[#9e6b00] truncate">
                                NOTE: Wrong utility deals 0 virus damage &amp; triggers hostile AI retaliation.
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Wave Clear / Device Down Outcome Banner */}
                      {mud.status !== 'active' && (
                        <div
                          className={`p-2 border-2 ${
                            mud.status === 'purged'
                              ? 'border-[#33ff66] bg-[#061a0b]'
                              : 'border-red-500 bg-[#1c0707]'
                          }`}
                        >
                          <div
                            className={`text-xs font-bold mb-1 ${
                              mud.status === 'purged' ? 'text-[#33ff66]' : 'text-red-400'
                            }`}
                          >
                            {mud.status === 'purged'
                              ? `[OK] WAVE #0${mud.wave} REPELLED -- ${mud.activeVirus.name} PURGED`
                              : `[CRITICAL] PDA DEVICE OR AI TETHER SEVERED (0%)`}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {mud.status === 'purged' ? (
                              <button
                                type="button"
                                data-start="true"
                                onClick={() => handleStartWave(mud.wave + 1, true)}
                                className="px-3 py-1 bg-[#33ff66] text-black font-bold text-xs cursor-pointer hover:brightness-110"
                              >
                                [DEFEND NEXT WAVE (#0{mud.wave + 1}) &rarr;]
                              </button>
                            ) : (
                              <button
                                type="button"
                                data-start="true"
                                onClick={() => handleStartWave(1, false)}
                                className="px-3 py-1 bg-[#ffb000] text-black font-bold text-xs cursor-pointer"
                              >
                                [REBOOT PDA &amp; RE-ANCHOR AI]
                              </button>
                            )}
                            {!isAuthenticated && (
                              <button
                                type="button"
                                onClick={() => setActiveTab('vault')}
                                className="px-2.5 py-1 border border-[#5bc0be] text-[#5bc0be] hover:bg-[#5bc0be] hover:text-black font-bold text-[10.5px] cursor-pointer"
                              >
                                [SAVE SCORE WITH PASSWORD]
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* RIGHT 6 COLS: SEPARATED OPERATOR CHAT VS AI/INTRUSION ALERTS */}
                    <div className="md:col-span-6 flex flex-col justify-between border border-[#4a3508] bg-[#090601] p-2 min-h-0">
                      {/* Channel Switcher Header: Equal-Sized Full-Width CH-1 & CH-2 Boxes + Inline Squad Drawer Toggle */}
                      <div className="space-y-1.5 border-b border-[#382806] pb-1.5 mb-1.5 shrink-0">
                        <div className="grid grid-cols-2 gap-1.5 w-full">
                          <button
                            type="button"
                            data-testid="ch1-button"
                            onClick={() => {
                              retroAudio.playKeyClick();
                              setCommsChannel('operators');
                            }}
                            className={`h-7 px-2 w-full min-w-0 flex items-center justify-center text-[10px] font-bold border cursor-pointer transition-colors ${
                              commsChannel === 'operators'
                                ? 'bg-[#ffb000] text-black border-[#ffb000]'
                                : 'bg-[#120d03] text-[#ffb000] border-[#4a3508] hover:border-[#ffb000]'
                            }`}
                          >
                            <span className="truncate">
                              [CH-1: CHAT ({operatorFeed.length})]
                            </span>
                          </button>
                          <button
                            type="button"
                            data-testid="ch2-button"
                            onClick={() => {
                              retroAudio.playKeyClick();
                              setCommsChannel('alerts');
                              setSeenAlertCount(systemAlertFeed.length);
                            }}
                            className={`h-7 px-2 w-full min-w-0 flex items-center justify-center text-[10px] font-bold border cursor-pointer transition-colors ${
                              commsChannel === 'alerts'
                                ? 'bg-[#33ff66] text-black border-[#33ff66]'
                                : unreadAlertCount > 0
                                ? 'bg-[#210606] text-red-300 border-red-500'
                                : 'bg-[#120d03] text-[#33ff66] border-[#1f6b32] hover:border-[#33ff66]'
                            }`}
                          >
                            <span className="truncate">
                              [CH-2: ALERTS ({systemAlertFeed.length})
                              {unreadAlertCount > 0 ? ` *${unreadAlertCount}` : ''}]
                            </span>
                          </button>
                        </div>

                        {/* Fixed-Height Sub-Header: Alert Preview + Inline Squad Roster Toggle */}
                        <div className="h-6 min-h-[24px] max-h-[24px] flex items-center justify-between gap-1.5 overflow-hidden">
                          <div className="h-6 flex-1 min-w-0 px-2 border border-[#3a1818] bg-[#160606] text-[9px] text-red-300 flex items-center justify-between gap-1.5 overflow-hidden">
                            {commsChannel === 'operators' && latestAlertItem ? (
                              <>
                                <span className="truncate">
                                  <strong className="text-red-400">[ALERT]</strong> {latestAlertItem.operator}:{' '}
                                  {latestAlertItem.text}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCommsChannel('alerts');
                                    setSeenAlertCount(systemAlertFeed.length);
                                  }}
                                  className="text-[8.5px] text-[#ffb000] shrink-0 underline cursor-pointer"
                                >
                                  [CH-2]
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="truncate text-[#33ff66]">
                                  <strong>[CH-2]</strong> EPIDOS-LLM &amp; Hackers AI stream
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setCommsChannel('operators')}
                                  className="text-[8.5px] text-[#ffb000] shrink-0 underline cursor-pointer"
                                >
                                  [CH-1]
                                </button>
                              </>
                            )}
                          </div>

                          <button
                            type="button"
                            data-testid="inline-ops-toggle"
                            aria-expanded={showInlineOpsRoster}
                            onClick={() => {
                              retroAudio.playKeyClick();
                              setShowInlineOpsRoster(prev => !prev);
                            }}
                            className={`h-6 px-2 flex items-center justify-center border text-[9px] font-bold cursor-pointer shrink-0 transition-colors ${
                              showInlineOpsRoster
                                ? 'bg-[#5bc0be] text-black border-[#5bc0be]'
                                : 'bg-[#09181a] text-[#5bc0be] border-[#5bc0be] hover:bg-[#5bc0be] hover:text-black'
                            }`}
                          >
                            [{coOpOperators.length} OPS ONLINE {showInlineOpsRoster ? '^' : 'v'}]
                          </button>
                        </div>

                        {/* Inline Squad Roster Drawer (Stays right inside MESH MUD screen) */}
                        {showInlineOpsRoster && (
                          <div
                            data-testid="inline-ops-roster"
                            className="p-1.5 border border-[#5bc0be] bg-[#061315] space-y-1 text-[9.5px]"
                          >
                            <div className="flex items-center justify-between gap-2 border-b border-[#1c4649] pb-1">
                              <span className="font-bold text-[#5bc0be] truncate min-w-0">
                                SQUAD ON [{sharedMesh.meshName}] ({coOpOperators.length} ONLINE):
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowInlineOpsRoster(false)}
                                className="px-1.5 py-0 border border-[#5bc0be] text-[#5bc0be] hover:bg-[#5bc0be] hover:text-black text-[8.5px] font-bold cursor-pointer shrink-0 whitespace-nowrap"
                              >
                                [HIDE OPS]
                              </button>
                            </div>
                            <div className="space-y-1 max-h-[96px] overflow-y-auto pr-0.5">
                              {coOpOperators.map(op => {
                                const opRoomId = (MESH_ROOM_ORDER.find(r => r === op.roomId) || 'sanctuary') as MeshRoomId;
                                const isSameSector = mud.currentRoom === opRoomId;
                                return (
                                  <div
                                    key={op.handle}
                                    className="px-1.5 py-1 border border-[#1a3d40] bg-[#040c0e] flex items-center justify-between gap-2"
                                  >
                                    <div className="min-w-0 flex-1 truncate">
                                      <span className="font-bold text-[#ffb000]">{op.handle}</span>{' '}
                                      <span className="text-[#5bc0be]">[{op.roomLabel}]</span>{' '}
                                      <span className="text-[#33ff66] tabular-nums">
                                        PDA:{op.deviceHealth ?? 90}% | AI:{op.aiTether ?? 90}%
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      disabled={isSameSector || mud.status !== 'active'}
                                      onClick={() => handleSelectRoom(opRoomId)}
                                      className={`px-1.5 py-0.5 text-[8.5px] font-bold shrink-0 cursor-pointer ${
                                        isSameSector
                                          ? 'border border-[#2b5c5b] text-[#5bc0be] opacity-60 cursor-default'
                                          : 'border border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-black'
                                      }`}
                                    >
                                      {isSameSector ? '[IN SECTOR]' : '[PATROL HERE]'}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Active Channel Feed */}
                      <div
                        data-testid="mesh-chat-window"
                        className="flex-1 min-h-[185px] max-h-[285px] overflow-y-auto [scrollbar-gutter:stable] space-y-1.5 pr-1 py-1 border border-[#2a1d04] bg-[#050300] p-1.5"
                      >
                        {commsChannel === 'operators' ? (
                          operatorFeed.length === 0 ? (
                            <div className="text-[10px] text-[#9e6b00] p-2">
                              No operator messages yet. Type a Linux command or message below to broadcast to{' '}
                              [{sharedMesh.meshName}].
                            </div>
                          ) : (
                            operatorFeed.map(item => {
                              const isBeaconOrPurge = item.tone === 'beacon' || item.tone === 'purge';
                              return (
                                <div
                                  key={item.id}
                                  className={`p-1.5 border-l-2 text-[10.5px] leading-snug ${
                                    isBeaconOrPurge
                                      ? 'border-[#5bc0be] bg-[#071618] text-[#5bc0be]'
                                      : 'border-[#ffb000] bg-[#140e02] text-[#ffb000]'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1 text-[9px] opacity-85 mb-0.5">
                                    <span className="font-bold uppercase">[{item.operator}]</span>
                                    <span>[{item.roomLabel}]</span>
                                  </div>
                                  <div className="break-words">{item.text}</div>
                                </div>
                              );
                            })
                          )
                        ) : systemAlertFeed.length === 0 ? (
                          <div className="text-[10px] text-[#9e6b00] p-2">
                            No active AI or intrusion alerts on [{sharedMesh.meshName}].
                          </div>
                        ) : (
                          systemAlertFeed.map(item => {
                            const isTroll = item.tone === 'troll' || item.operator.includes('[HOSTILE]');
                            return (
                              <div
                                key={item.id}
                                className={`p-1.5 border-l-2 text-[10.5px] leading-snug ${
                                  isTroll
                                    ? 'border-red-500 bg-[#210606] text-red-300'
                                    : 'border-[#33ff66] bg-[#06180b] text-[#33ff66]'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1 text-[9px] opacity-85 mb-0.5">
                                  <span className="font-bold uppercase">{item.operator}</span>
                                  <span>[{item.roomLabel}]</span>
                                </div>
                                <div className="break-words">{item.text}</div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Manual MUD Command & Operator Chat Input Box (no pre-entered buttons) */}
                      <form
                        onSubmit={handleMudCommandSubmit}
                        className="flex items-center gap-1.5 pt-2 mt-1.5 border-t border-[#382806] shrink-0"
                      >
                        <label htmlFor="mud-cmd-input" className="text-[10px] text-[#33ff66] font-bold shrink-0">
                          CMD/CHAT&gt;
                        </label>
                        <input
                          id="mud-cmd-input"
                          type="text"
                          value={mudCommandInput}
                          onChange={e => setMudCommandInput(e.target.value)}
                          placeholder="Enter Linux command (iptables, sha256sum, chroot, kill, cd) or squad message..."
                          disabled={mud.status !== 'active'}
                          className="flex-1 px-2 py-1 bg-[#070501] border border-[#5e4309] text-[#ffb000] text-[10.5px] font-mono focus:outline-none focus:border-[#33ff66]"
                        />
                        <button
                          type="submit"
                          disabled={mud.status !== 'active'}
                          className="px-2.5 py-1 bg-[#ffb000] text-black font-bold text-[10.5px] cursor-pointer hover:bg-[#ffc436]"
                        >
                          [ENTER]
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* =================================================================== */}
        {/* TAB 2: OPERATORS & MESH NETWORKS                                    */}
        {/* =================================================================== */}
        {activeTab === 'operators' && (
          <div className="flex-1 flex flex-col justify-between border border-[#4a3508] bg-[#110c03] p-3 gap-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Left 7 Cols: Live Operators on Current Mesh & Their Device Health Bars */}
              <div className="md:col-span-7 space-y-2">
                <div className="flex items-center justify-between border-b border-[#4a3508] pb-1.5">
                  <div>
                    <div className="text-sm font-bold text-[#ffb000]">
                      CO-OP OPERATORS ON [{sharedMesh.meshName}] {sharedMesh.protected ? '[LOCKED]' : '[PUBLIC]'}
                    </div>
                    <div className="text-[10.5px] text-[#9e6b00]">
                      Overall Shared Mesh Health: <strong className="text-[#33ff66]">{sharedMesh.meshIntegrity}%</strong>{' '}
                      | Individual PDA Device Health &amp; AI Tether
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchSharedMesh()}
                    className="px-2 py-0.5 border border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-black text-[10px] font-bold cursor-pointer"
                  >
                    [SYNC OPS]
                  </button>
                </div>

                <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                  {coOpOperators.map(op => (
                    <div
                      key={op.handle}
                      className="p-2 border border-[#382806] bg-[#0b0802] text-xs flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#ffb000]">{op.handle}</span>
                        <span className="text-[10px] text-[#5bc0be] font-bold">SECTOR: [{op.roomLabel}]</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10.5px] tabular-nums">
                        <div className="text-[#ffb000]">
                          PDA DEVICE HP: [{renderAsciiBar(op.deviceHealth ?? 90, 10)}] {op.deviceHealth ?? 90}%
                        </div>
                        <div className="text-[#33ff66]">
                          LOCAL AI TETHER: [{renderAsciiBar(op.aiTether ?? 90, 10)}] {op.aiTether ?? 90}%
                        </div>
                      </div>
                      <div className="text-[10px] text-[#9e6b00] truncate">Last Action: {op.lastAction}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right 5 Cols: Switch Mesh or Create a Public / Password-Protected Mesh */}
              <div className="md:col-span-5 space-y-2 border-l border-[#382806] pl-0 md:pl-3">
                <div className="text-xs font-bold text-[#5bc0be] border-b border-[#4a3508] pb-1.5">
                  SWITCH OR CREATE A MESH ([PUBLIC] / [LOCKED])
                </div>

                <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1">
                  {meshDirectory.map(m => {
                    const isSelected = m.meshId === activeMeshId;
                    return (
                      <div
                        key={m.meshId}
                        className={`p-1.5 border flex items-center justify-between gap-2 text-[10.5px] ${
                          isSelected
                            ? 'border-[#33ff66] bg-[#07170b] text-[#33ff66]'
                            : 'border-[#332406] bg-[#140e03] text-[#ffb000]'
                        }`}
                      >
                        <div className="truncate">
                          <span className="font-bold">
                            {m.protected ? '[LOCKED] ' : '[PUBLIC] '}
                            {m.meshName}
                          </span>{' '}
                          <span className="text-[9.5px] opacity-80">({m.meshIntegrity}% HP)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleJoinMesh(m)}
                          className={`px-2 py-0.5 text-[9.5px] font-bold cursor-pointer shrink-0 ${
                            isSelected
                              ? 'bg-[#33ff66] text-black'
                              : 'border border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-black'
                          }`}
                        >
                          {isSelected ? '[ACTIVE]' : m.protected ? '[UNLOCK]' : '[JOIN]'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {joinPasswordPromptMesh && (
                  <div className="p-2 border border-[#5bc0be] bg-[#071618] space-y-1 text-[10.5px]">
                    <div className="text-[#5bc0be] font-bold">
                      Password for [{joinPasswordPromptMesh.meshName}]:
                    </div>
                    <div className="flex gap-1">
                      <input
                        type="password"
                        value={joinMeshPasswordInput}
                        onChange={e => setJoinMeshPasswordInput(e.target.value)}
                        placeholder="Enter mesh password..."
                        className="flex-1 px-2 py-0.5 bg-black border border-[#5bc0be] text-[#33ff66] font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleJoinMesh(joinPasswordPromptMesh, joinMeshPasswordInput)}
                        className="px-2 py-0.5 bg-[#5bc0be] text-black font-bold cursor-pointer"
                      >
                        [UNLOCK]
                      </button>
                    </div>
                  </div>
                )}

                <form
                  onSubmit={handleCreateMesh}
                  className="p-2 border border-[#382806] bg-[#0b0802] space-y-1.5 text-[10.5px]"
                >
                  <div className="font-bold text-[#ffb000]">START NEW CO-OP MESH:</div>
                  <input
                    type="text"
                    value={newMeshNameInput}
                    onChange={e => setNewMeshNameInput(e.target.value)}
                    placeholder="Mesh Name (e.g. HACKERS-ELITE)"
                    className="w-full px-2 py-1 bg-black border border-[#5e4309] text-[#ffb000] font-mono"
                  />
                  <input
                    type="password"
                    value={newMeshPasswordInput}
                    onChange={e => setNewMeshPasswordInput(e.target.value)}
                    placeholder="Optional Password (blank = Public)"
                    className="w-full px-2 py-1 bg-black border border-[#5e4309] text-[#33ff66] font-mono"
                  />
                  <button
                    type="submit"
                    className="w-full py-1 bg-[#33ff66] text-black font-bold cursor-pointer hover:brightness-110"
                  >
                    [CREATE MESH]
                  </button>
                </form>

                {meshStatusMsg && <div className="text-[10px] text-[#33ff66] font-bold">{meshStatusMsg.text}</div>}
              </div>
            </div>

            <div className="pt-2 border-t border-[#4a3508] flex items-center justify-between">
              <span className="text-[10.5px] text-[#9e6b00]">
                Execute `mesh-broadcast --sync` during gameplay to patch every operator&apos;s PDA on [{sharedMesh.meshName}].
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('game')}
                className="px-3 py-1 bg-[#ffb000] text-black font-bold text-xs cursor-pointer"
              >
                [RETURN TO MESH MUD]
              </button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: LEADERBOARDS                                                 */}
        {/* =================================================================== */}
        {activeTab === 'leaderboard' && (
          <div className="flex-1 flex flex-col justify-between border border-[#4a3508] bg-[#110c03] p-3">
            <div>
              <div className="flex items-center justify-between border-b border-[#4a3508] pb-2 mb-2">
                <div>
                  <div className="text-sm font-bold text-[#5bc0be]">
                    CO-OP MESH DEFENSE LEADERBOARDS // EPIDOS_KV
                  </div>
                  <div className="text-[10.5px] text-[#9e6b00]">
                    Active Mesh [{sharedMesh.meshName}]: {sharedMesh.meshIntegrity}% HP | Total Viral AIs Purged:{' '}
                    {sharedMesh.totalPurges}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    fetchLeaderboard();
                    fetchSharedMesh();
                  }}
                  className="px-2.5 py-1 border border-[#5bc0be] text-[#5bc0be] hover:bg-[#5bc0be] hover:text-black text-[10.5px] font-bold cursor-pointer"
                >
                  {isLoadingBoard ? '[SYNCING...]' : '[REFRESH]'}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-mono text-xs tabular-nums">
                  <thead>
                    <tr className="border-b border-[#4a3508] text-[#9e6b00] text-[10px]">
                      <th className="py-1 px-2">RANK</th>
                      <th className="py-1 px-2">OPERATOR</th>
                      <th className="py-1 px-2">CLEARANCE TITLE</th>
                      <th className="py-1 px-2 text-right">PURGES</th>
                      <th className="py-1 px-2 text-right">BEST RUN</th>
                      <th className="py-1 px-2 text-right">CAREER SCORE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((row, idx) => {
                      const isCurrentOp = row.handle.toLowerCase() === activeHandle.toLowerCase();
                      return (
                        <tr
                          key={row.handle}
                          className={`border-b border-[#261b04] ${
                            isCurrentOp ? 'bg-[#261b04] text-[#33ff66] font-bold' : 'text-[#ffb000]'
                          }`}
                        >
                          <td className="py-1.5 px-2">#{String(idx + 1).padStart(2, '0')}</td>
                          <td className="py-1.5 px-2">
                            {row.handle} {row.protected ? '[LOCK]' : ''}
                          </td>
                          <td className="py-1.5 px-2 text-[10.5px] text-[#5bc0be]">{row.rankTitle}</td>
                          <td className="py-1.5 px-2 text-right">{row.nodesCracked}</td>
                          <td className="py-1.5 px-2 text-right">{row.bestRun}</td>
                          <td className="py-1.5 px-2 text-right font-bold">{row.totalScore} PTS</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-2 mt-2 border-t border-[#4a3508] flex items-center justify-between">
              <span className="text-[10.5px] text-[#9e6b00]">
                [LOCK] = Password-protected returning operator account
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('game')}
                className="px-3 py-1 bg-[#ffb000] text-black font-bold text-xs cursor-pointer"
              >
                [RETURN TO MESH MUD]
              </button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: GUIDE (LINUX MAN PAGES & HARDWARE SECTORS)                   */}
        {/* =================================================================== */}
        {activeTab === 'guide' && (
          <div className="flex-1 flex flex-col justify-between border border-[#4a3508] bg-[#110c03] p-3 gap-3">
            <div className="space-y-2.5">
              <div className="border-b border-[#4a3508] pb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-[#5bc0be]">
                    LINUX DEFENSE MAN-PAGES &amp; PDA HARDWARE SECTORS
                  </div>
                  <div className="text-[11px] text-[#d4a338]">
                    Select any Linux utility below to inspect its command syntax, real-world kernel mechanism, and which
                    class of viral intrusion it neutralizes.
                  </div>
                </div>
              </div>

              {/* Tool Selector Bar (No spoiler stars) */}
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(DEFENSE_TOOLS) as DefenseToolId[]).map(tId => {
                  const tDef = DEFENSE_TOOLS[tId];
                  const isSelected = mud.selectedCodexTool === tId;
                  return (
                    <button
                      key={tId}
                      type="button"
                      onClick={() => setMud(prev => ({ ...prev, selectedCodexTool: tId }))}
                      className={`px-2.5 py-1 text-xs border font-bold cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#5bc0be] text-black border-[#5bc0be]'
                          : 'bg-[#0b1b1d] text-[#5bc0be] border-[#2b5c5b] hover:border-[#5bc0be]'
                      }`}
                    >
                      $ {tDef.label}
                    </button>
                  );
                })}
              </div>

              {/* Selected Tool Detailed Breakdown */}
              <div className="p-3 border border-[#2b5c5b] bg-[#071416] space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1c3f3e] pb-1.5">
                  <span className="text-sm font-bold text-[#ffb000]">$ {activeCodexDef.label}</span>
                  <code className="px-2 py-0.5 bg-black border border-[#33ff66] text-[#33ff66] text-xs">
                    $ {activeCodexDef.unixSyntax}
                  </code>
                </div>
                <div className="text-xs text-[#5bc0be] font-bold">TOOLTIP: {activeCodexDef.tooltip}</div>
                <div className="text-xs text-[#d9f7f6] leading-relaxed">{activeCodexDef.realWorldMechanic}</div>
                <div className="text-xs text-[#33ff66] leading-relaxed">
                  <strong>COUNTERMEASURE EFFECT:</strong> {activeCodexDef.whyItWorks}
                </div>
              </div>

              {/* 5 PDA Hardware Sectors Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 pt-1">
                {MESH_ROOM_ORDER.map(rId => {
                  const rDef = MESH_ROOMS[rId];
                  return (
                    <div key={rId} className="p-2 border border-[#382806] bg-[#0b0802] text-[10px] space-y-1">
                      <div className="font-bold text-[#ffb000]">{rDef.shortLabel}</div>
                      <div className="text-[#5bc0be] font-mono text-[9px]">{rDef.unixPath}</div>
                      <div className="text-[#d4a338] leading-snug">{rDef.computerContext}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-[#4a3508] flex items-center justify-between">
              <span className="text-[10.5px] text-[#9e6b00]">
                Tip: Patrol (`cd`) into the breached sector before executing your counter command for 100% full damage.
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('game')}
                className="px-3 py-1 bg-[#ffb000] text-black font-bold text-xs cursor-pointer"
              >
                [RETURN TO MESH MUD]
              </button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: LOGIN / SAVE SCORE                                           */}
        {/* =================================================================== */}
        {activeTab === 'vault' && (
          <div className="flex-1 flex flex-col justify-between border border-[#4a3508] bg-[#110c03] p-3">
            <div className="space-y-3 max-w-xl">
              <div className="border-b border-[#4a3508] pb-2">
                <div className="text-sm font-bold text-[#33ff66]">
                  OPERATOR CREDENTIAL VAULT // LOGIN &amp; SAVE SCORE
                </div>
                <div className="text-[11px] text-[#9e6b00]">
                  Optional Zero-Plaintext SHA-256 Password Lock -- Save your operator callsign with a password so you can
                  return anytime and continue building your career score.
                </div>
              </div>

              <form onSubmit={handleVaultSubmit} className="space-y-2.5 text-xs">
                <div>
                  <label htmlFor="vault-handle-input" className="block text-[#ffb000] font-bold mb-1">
                    OPERATOR CALLSIGN / HANDLE:
                  </label>
                  <input
                    id="vault-handle-input"
                    type="text"
                    value={vaultHandleInput}
                    onChange={e => setVaultHandleInput(e.target.value)}
                    placeholder="e.g. cyberwolf"
                    className="w-full px-2.5 py-1.5 bg-[#090702] border border-[#6b4c0b] text-[#ffb000] font-mono focus:outline-none focus:border-[#33ff66]"
                  />
                </div>

                <div>
                  <label htmlFor="vault-pass-input" className="block text-[#ffb000] font-bold mb-1">
                    SECRET PASSCODE / PIN (4+ CHARS, HASHED VIA SHA-256):
                  </label>
                  <input
                    id="vault-pass-input"
                    type="password"
                    value={vaultPasswordInput}
                    onChange={e => setVaultPasswordInput(e.target.value)}
                    placeholder="Enter password to claim new handle or unlock existing score"
                    className="w-full px-2.5 py-1.5 bg-[#090702] border border-[#6b4c0b] text-[#33ff66] font-mono focus:outline-none focus:border-[#33ff66]"
                  />
                </div>

                {vaultStatusMsg && (
                  <div
                    className={`p-2 border text-[11px] ${
                      vaultStatusMsg.type === 'success'
                        ? 'border-[#33ff66] bg-[#07170b] text-[#33ff66]'
                        : vaultStatusMsg.type === 'error'
                        ? 'border-red-500 bg-[#1f0808] text-red-400'
                        : 'border-[#5bc0be] bg-[#0a181a] text-[#5bc0be]'
                    }`}
                  >
                    {vaultStatusMsg.text}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isVaultSubmitting}
                    className="px-4 py-1.5 bg-[#33ff66] text-black font-bold text-xs cursor-pointer hover:brightness-110"
                  >
                    {isVaultSubmitting
                      ? '[VERIFYING SHA-256 DIGEST...]'
                      : '[SAVE / UNLOCK SESSION WITH PASSWORD]'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('game')}
                    className="px-3 py-1.5 border border-[#9e6b00] text-[#ffb000] font-bold text-xs cursor-pointer"
                  >
                    [BACK TO MESH MUD]
                  </button>
                </div>
              </form>
            </div>

            <div className="pt-2 mt-2 border-t border-[#4a3508] text-[10.5px] text-[#9e6b00]">
              SECURITY NOTE: Passwords are hashed locally into a 64-character SHA-256 hex digest before transmission and
              stored inside Cloudflare KV (<span className="text-[#ffb000]">epidos-telemetry</span>).
            </div>
          </div>
        )}
      </div>

      {/* Simulated Vim/TUI Window Footer */}
      <footer id="editor-status">
        <span id="editor-bottom-file" className="truncate font-mono">
          &quot;/usr/games/mesh-mud&quot; [{sharedMesh.meshName}] -- MESH: {sharedMesh.meshIntegrity}% | PDA:{' '}
          {mud.deviceIntegrity}% | PURGES: {careerNodes + sessionNodes}
        </span>
        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          <span className="hidden sm:inline text-[10px]">:q or Esc to exit</span>
          <button
            type="button"
            onClick={() => {
              retroAudio.playSwitchClick();
              onClose();
            }}
            className="bg-black text-[#ffb000] px-2 py-0.5 text-[11px] font-bold border border-black hover:bg-[#1a1505] active:translate-y-0.5 cursor-pointer"
            aria-label="Close game and return to shell"
          >
            [EXIT :q]
          </button>
        </div>
      </footer>
    </section>
  );
};
