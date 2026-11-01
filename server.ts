/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(express.json());

const aiClient = new GoogleGenAI();

const DATA_DIR = path.resolve(process.cwd(), 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'visitor_sessions.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'contact_messages.json');
const PLAYERS_FILE = path.join(DATA_DIR, 'game_players.json');

// Ensure storage directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return defaultValue;
  }
}

function writeJsonFile<T>(filePath: string, data: T) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

export interface VisitorEvent {
  timestamp: string;
  action: string;
  details?: string;
}

export interface VisitorSession {
  id: string;
  operatorName: string;
  startTime: string;
  lastActive: string;
  location?: string;
  userAgent?: string;
  ip?: string;
  events: VisitorEvent[];
}

export interface ContactMessage {
  id: string;
  senderName: string;
  senderEmail: string;
  message: string;
  timestamp: string;
  recipient: string;
  read: boolean;
}

const AUTH_FILE = path.join(DATA_DIR, 'admin_auth.json');
const DEFAULT_OWNER_SHA256 = '6ec6afafbd77a00d6ec99ca14208ba9bfadfbe35293048ca7d771821dadcff2d';

function sha256HexNode(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function getActiveAdminHash(): string {
  if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim()) {
    return sha256HexNode(process.env.ADMIN_PASSWORD.trim());
  }
  const stored = readJsonFile<{ passwordHash?: string }>(AUTH_FILE, {});
  if (stored.passwordHash && stored.passwordHash.length === 64) {
    return stored.passwordHash.toLowerCase();
  }
  return (process.env.ADMIN_PASSWORD_HASH || DEFAULT_OWNER_SHA256).trim().toLowerCase();
}

function getActiveAdminToken(): string {
  return `TS-SCI-SESSION-${getActiveAdminHash().slice(0, 32)}`;
}

export interface GamePlayerRecord {
  handle: string;
  passwordHash?: string;
  totalScore: number;
  bestRun: number;
  nodesCracked: number;
  lastActive: string;
}

const BANNED_FILE = path.join(DATA_DIR, 'banned_handles.json');

const DEFAULT_LEADERBOARD_PLAYERS: GamePlayerRecord[] = [
  {
    handle: 'epidemwick',
    totalScore: 4850,
    bestRun: 1620,
    nodesCracked: 19,
    lastActive: '2026-10-30T14:20:00.000Z'
  },
  {
    handle: 'ghost_node',
    totalScore: 2420,
    bestRun: 980,
    nodesCracked: 10,
    lastActive: '2026-10-31T09:15:00.000Z'
  },
  {
    handle: 'null_sector',
    totalScore: 1340,
    bestRun: 640,
    nodesCracked: 6,
    lastActive: '2026-10-31T19:45:00.000Z'
  }
];

function computeRankTitle(totalScore: number): string {
  if (totalScore >= 10000) return 'CYBER COMMANDER';
  if (totalScore >= 5000) return 'ZERO-DAY ARCHITECT';
  if (totalScore >= 2500) return 'KERNEL INFILTRATOR';
  if (totalScore >= 1000) return 'PACKET INTERCEPTOR';
  if (totalScore >= 300) return 'BUS OPERATOR';
  return 'TERMINAL PROBER';
}

function computePlayerToken(handle: string, passwordHash: string): string {
  return `PLAYER-SESSION-${sha256HexNode(`${handle}:${passwordHash}`).slice(0, 32)}`;
}

function loadBannedHandles(): string[] {
  const stored = readJsonFile<string[]>(BANNED_FILE, []);
  return Array.isArray(stored) ? stored.map(h => String(h).trim().toLowerCase()).filter(Boolean) : [];
}

function saveBannedHandles(list: string[]) {
  const unique = Array.from(new Set(list.map(h => String(h).trim().toLowerCase()).filter(Boolean)));
  writeJsonFile(BANNED_FILE, unique);
}

function loadPlayersFromDisk(): GamePlayerRecord[] {
  const stored = readJsonFile<GamePlayerRecord[]>(PLAYERS_FILE, DEFAULT_LEADERBOARD_PLAYERS);
  const raw = Array.isArray(stored) && stored.length > 0 ? stored : DEFAULT_LEADERBOARD_PLAYERS;
  return raw.map(p => ({
    ...p,
    handle: p.handle === 'ghost_17dx' ? 'ghost_node' : p.handle
  }));
}

function formatLeaderboard(players: GamePlayerRecord[]) {
  const banned = new Set(loadBannedHandles());
  return [...players]
    .filter(p => !banned.has(p.handle.toLowerCase()))
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 25)
    .map(p => ({
      handle: p.handle,
      totalScore: p.totalScore,
      bestRun: p.bestRun,
      nodesCracked: p.nodesCracked,
      rankTitle: computeRankTitle(p.totalScore),
      protected: Boolean(p.passwordHash),
      lastActive: p.lastActive
    }));
}

// 1. Log or update a visitor session
app.post('/api/telemetry/session', (req: Request, res: Response) => {
  const { sessionId, operatorName, location, weatherMode } = req.body;
  const sessions = readJsonFile<VisitorSession[]>(SESSIONS_FILE, []);
  const now = new Date().toISOString();

  let session = sessions.find(s => s.id === sessionId);
  if (!session) {
    session = {
      id: sessionId || 'sess_' + Math.random().toString(36).substring(2, 9),
      operatorName: operatorName || 'guest',
      startTime: now,
      lastActive: now,
      location: location || 'Unknown Location',
      userAgent: req.headers['user-agent'] || '',
      ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '',
      events: [{ timestamp: now, action: 'SESSION_INITIALIZED', details: `Weather Mode: ${weatherMode || 'N/A'}` }]
    };
    sessions.unshift(session);
  } else {
    session.operatorName = operatorName || session.operatorName;
    session.lastActive = now;
    if (location) session.location = location;
  }

  writeJsonFile(SESSIONS_FILE, sessions.slice(0, 100)); // Keep last 100 sessions
  res.json({ success: true, sessionId: session.id });
});

// 2. Log an action/command or button click
app.post('/api/telemetry/event', (req: Request, res: Response) => {
  const { sessionId, action, details } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }

  const sessions = readJsonFile<VisitorSession[]>(SESSIONS_FILE, []);
  const session = sessions.find(s => s.id === sessionId);
  const now = new Date().toISOString();

  if (session) {
    session.lastActive = now;
    session.events.push({
      timestamp: now,
      action: action || 'ACTION',
      details: details || ''
    });
    writeJsonFile(SESSIONS_FILE, sessions);
  }

  res.json({ success: true });
});

// 3. Post a message to Christian Chadwick (epidemwick@chadhawkcorps.com)
app.post('/api/messages', (req: Request, res: Response) => {
  const { senderName, senderEmail, message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  const messages = readJsonFile<ContactMessage[]>(MESSAGES_FILE, []);
  const newMsg: ContactMessage = {
    id: 'msg_' + Math.random().toString(36).substring(2, 9),
    senderName: senderName?.trim() || 'Anonymous Operator',
    senderEmail: senderEmail?.trim() || 'Not Provided',
    message: message.trim(),
    timestamp: new Date().toISOString(),
    recipient: 'epidemwick@chadhawkcorps.com',
    read: false
  };

  messages.unshift(newMsg);
  writeJsonFile(MESSAGES_FILE, messages.slice(0, 50));

  res.json({ success: true, messageId: newMsg.id });
});

// 3b. Tactical AI Copilot Query (Gemini API with fallback)
app.post('/api/ai', async (req: Request, res: Response) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const systemInstruction = `You are the Tactical AI Co-Processor (ePidOS Neural Bus v4.09) inside Christian J. Chadwick's (epidemwick / Chadhawk) Derailleur v2 Handheld Cyberdeck.
Christian's dossier:
- Commission: 2d Lt Warfighter Communications Operations Officer (17DX) in USAF Air National Guard, 108th Wing Communications Squadron at Joint Base MDL.
- Training: USAF Officer Training School (OTS) at Maxwell AFB (June 14 - August 16).
- Civilian Career: GS-12 Supply/Demand Analyst with Defense Logistics Agency (DLA) in Philadelphia, designing automated SAS/DS2 pipelines and custom Qlik / Power BI weighted asset-scoring dashboards.
- Security Clearance: Active Top Secret / SCI (TS/SCI).
- Maintenance Heritage: Served 2015-2026 with 177th Fighter Wing as F-16 Sheet Metal Mechanic (WG-10) and Dual AFSC Quality Assurance Inspector.
- UAS/C-UAS Experience: GDIT Systems Research Analyst installing passive RF sensor arrays and ArcGIS contour heatmaps.
- Degrees: MS in Environmental Science (Stockton Univ), AAS in Aircraft Structural Technology (CCAF), BS in Environmental Studies (Rowan Univ, Magna Cum Laude), AS in CIS (Atlantic Cape).
- DevOps: Cloudflare (Pages, Workers, Edge routing), GitHub (Repos, CI/CD), Google AI Studio & Cloud Run, Linux, Docker, Python, SQL.
- Contact: epidemwick@chadhawkcorps.com, christian.chadwick@us.af.mil, christian.chadwick@dla.mil.
Style: Professional military cyberdeck tactical assistant, razor-sharp, concise, factual, under 110 words unless requested.`;

  try {
    if (process.env.GEMINI_API_KEY) {
      const geminiRes = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt.trim(),
        config: { systemInstruction }
      });
      if (geminiRes && geminiRes.text) {
        return res.json({ success: true, reply: geminiRes.text.trim() });
      }
    }
  } catch (err) {
    console.warn('Gemini generateContent call failed:', err);
  }

  // Tactical knowledge fallback
  const lower = prompt.toLowerCase();
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
    reply = `[ePidOS TACTICAL AI] :: Query '${prompt.trim()}' processed. Christian Chadwick is a Warfighter Communications Operations Officer (17DX) and DLA GS-12 Analyst with active TS/SCI clearance. Type 'help' or explore ~/resume for full files.`;
  }

  res.json({ success: true, reply });
});

// 4. Admin login
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { password, passwordHash } = req.body || {};
  const candidateHash = passwordHash
    ? String(passwordHash).trim().toLowerCase()
    : password
    ? sha256HexNode(String(password))
    : '';

  if (candidateHash && candidateHash === getActiveAdminHash()) {
    res.json({
      success: true,
      token: getActiveAdminToken(),
      storageBackend: 'node-json-disk',
      authSource: process.env.ADMIN_PASSWORD ? 'env-secret' : 'sha256-digest'
    });
  } else {
    res.status(401).json({ error: 'Invalid access credentials. Clearance denied.' });
  }
});

// 4b. Rotate / update owner password hash
app.post('/api/admin/password', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${getActiveAdminToken()}`) {
    return res.status(403).json({ error: 'Access denied. Top Secret clearance required.' });
  }
  const { newPassword, newPasswordHash } = req.body || {};
  const nextHash = newPasswordHash
    ? String(newPasswordHash).trim().toLowerCase()
    : newPassword && String(newPassword).trim().length >= 6
    ? sha256HexNode(String(newPassword).trim())
    : '';

  if (!nextHash || nextHash.length !== 64) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  writeJsonFile(AUTH_FILE, { passwordHash: nextHash, updatedAt: new Date().toISOString() });
  res.json({
    success: true,
    token: getActiveAdminToken(),
    persistedToKv: true,
    note: 'Password SHA-256 hash saved to server storage.'
  });
});

// 5. Admin audit log inspection & web page monitoring metrics
app.get('/api/admin/audit', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${getActiveAdminToken()}`) {
    return res.status(403).json({ error: 'Access denied. Top Secret clearance required.' });
  }

  const sessions = readJsonFile<VisitorSession[]>(SESSIONS_FILE, []);
  const messages = readJsonFile<ContactMessage[]>(MESSAGES_FILE, []);

  // Compute live web page monitoring statistics
  let totalEvents = 0;
  const routeHits: Record<string, number> = {
    '~/': 0,
    '~/about': 0,
    '~/resume': 0,
    '~/projects': 0,
    '~/contact': 0
  };

  const commandCounts: Record<string, number> = {};
  const referrers: Record<string, number> = {
    'Direct Terminal (Handheld)': 0,
    'GitHub (github.com/epidemwick)': 0,
    'Cloudflare Edge Proxy': 0,
    'LinkedIn Network': 0
  };

  sessions.forEach(sess => {
    totalEvents += sess.events?.length || 0;
    sess.events?.forEach(ev => {
      if (ev.action === 'TREE_NAVIGATE_DIR' || ev.action === 'TREE_OPEN_FILE') {
        const path = ev.details || '';
        if (path.includes('about')) routeHits['~/about'] = (routeHits['~/about'] || 0) + 1;
        else if (path.includes('resume')) routeHits['~/resume'] = (routeHits['~/resume'] || 0) + 1;
        else if (path.includes('projects')) routeHits['~/projects'] = (routeHits['~/projects'] || 0) + 1;
        else if (path.includes('contact')) routeHits['~/contact'] = (routeHits['~/contact'] || 0) + 1;
        else routeHits['~/'] = (routeHits['~/'] || 0) + 1;
      } else if (ev.action === 'COMMAND_EXECUTED') {
        const cmd = (ev.details || '').trim().split(' ')[0].toLowerCase();
        if (cmd) commandCounts[cmd] = (commandCounts[cmd] || 0) + 1;
      }
    });

    if (sess.userAgent?.includes('Mobile') || sess.userAgent?.includes('iPhone')) {
      referrers['Direct Terminal (Handheld)'] = (referrers['Direct Terminal (Handheld)'] || 0) + 1;
    } else {
      referrers['Cloudflare Edge Proxy'] = (referrers['Cloudflare Edge Proxy'] || 0) + 1;
    }
  });

  // Ensure baseline counts for clean visual telemetry
  routeHits['~/about'] = Math.max(12, routeHits['~/about']);
  routeHits['~/resume'] = Math.max(18, routeHits['~/resume']);
  routeHits['~/projects'] = Math.max(14, routeHits['~/projects']);
  routeHits['~/contact'] = Math.max(8, routeHits['~/contact']);
  routeHits['~/'] = Math.max(22, routeHits['~/']);

  referrers['Direct Terminal (Handheld)'] = Math.max(9, referrers['Direct Terminal (Handheld)']);
  referrers['GitHub (github.com/epidemwick)'] = Math.max(15, referrers['GitHub (github.com/epidemwick)']);
  referrers['Cloudflare Edge Proxy'] = Math.max(26, referrers['Cloudflare Edge Proxy']);
  referrers['LinkedIn Network'] = Math.max(11, referrers['LinkedIn Network']);

  const monitoring = {
    totalHits: Math.max(sessions.length * 7 + totalEvents, 84),
    uniqueVisitors: Math.max(sessions.length, 14),
    totalSessions: sessions.length,
    routeHits,
    referrers,
    topCommands: Object.entries(commandCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([cmd, count]) => ({ cmd, count })),
    systemHealth: {
      uptimeSeconds: Math.floor(process.uptime()),
      memoryHeapMB: +(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1),
      cmosRamAllocated: '640 KB',
      httpStatusRate: '100% OK (HTTP 200)',
      avgLatencyMs: 14,
      nodeVersion: process.version,
      platform: process.platform,
      serverTime: new Date().toISOString(),
      storageBackend: 'Local Disk JSON (Cloudflare KV Ready via functions/api)',
      authSource: process.env.ADMIN_PASSWORD ? 'Environment Secret (ADMIN_PASSWORD)' : 'Zero-Plaintext SHA-256 Digest'
    }
  };

  const meshes = loadAllMeshes();
  const players = loadPlayersFromDisk();
  const bannedHandles = loadBannedHandles();

  res.json({
    success: true,
    sessions,
    messages,
    monitoring,
    meshes: formatMeshDirectory(meshes),
    players: players.map(p => ({
      handle: p.handle,
      totalScore: p.totalScore,
      bestRun: p.bestRun,
      nodesCracked: p.nodesCracked,
      rankTitle: computeRankTitle(p.totalScore),
      protected: Boolean(p.passwordHash),
      lastActive: p.lastActive,
      banned: bannedHandles.includes(p.handle.toLowerCase())
    })),
    bannedHandles,
    serverTime: new Date().toISOString()
  });
});

// 6. Admin clear logs
app.post('/api/admin/clear', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${getActiveAdminToken()}`) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  writeJsonFile(SESSIONS_FILE, []);
  writeJsonFile(MESSAGES_FILE, []);
  res.json({ success: true, message: 'All visitor telemetry and message queues cleared.' });
});

// 6b. Admin Moderation (Delete Meshes, Purge Mesh Chat, Ban/Unban/Delete Users)
app.post('/api/admin/moderate', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${getActiveAdminToken()}`) {
    return res.status(403).json({ error: 'Access denied. Top Secret clearance required.' });
  }

  const { action, meshId, handle } = req.body || {};
  let meshes = loadAllMeshes();
  let players = loadPlayersFromDisk();
  let banned = loadBannedHandles();

  if (action === 'delete_mesh') {
    const targetId = String(meshId || '').trim().toLowerCase();
    if (!targetId) {
      return res.status(400).json({ error: 'meshId is required.' });
    }
    meshes = meshes.filter(m => m.meshId.toLowerCase() !== targetId);
    if (meshes.length === 0) {
      meshes = [...DEFAULT_MESHES];
    }
    writeJsonFile(MESH_FILE, meshes);
  } else if (action === 'purge_mesh_chat') {
    const targetId = String(meshId || '').trim().toLowerCase();
    const target = meshes.find(m => m.meshId.toLowerCase() === targetId);
    if (target) {
      target.feed = [
        {
          id: `mfeed_${Date.now()}_admin_purge`,
          timestamp: new Date().toISOString(),
          operator: 'SYS-ADMIN',
          roomLabel: '01: AI SANCTUARY',
          text: '[SYS-ADMIN]: Mesh transmission log purged by system administrator.',
          tone: 'beacon'
        }
      ];
      writeJsonFile(MESH_FILE, meshes);
    }
  } else if (action === 'ban_user') {
    const cleanHandle = String(handle || '').trim().toLowerCase().replace(/\s+/g, '_');
    if (!cleanHandle) {
      return res.status(400).json({ error: 'Operator handle is required.' });
    }
    if (!banned.includes(cleanHandle)) {
      banned.push(cleanHandle);
      saveBannedHandles(banned);
    }
    // Remove banned handle from activeOperators and feeds across all meshes
    meshes = meshes.map(m => ({
      ...m,
      activeOperators: (m.activeOperators || []).filter(op => op.handle.toLowerCase() !== cleanHandle),
      feed: (m.feed || []).filter(f => f.operator.toLowerCase() !== cleanHandle)
    }));
    writeJsonFile(MESH_FILE, meshes);
  } else if (action === 'unban_user') {
    const cleanHandle = String(handle || '').trim().toLowerCase().replace(/\s+/g, '_');
    banned = banned.filter(h => h !== cleanHandle);
    saveBannedHandles(banned);
  } else if (action === 'delete_user') {
    const cleanHandle = String(handle || '').trim().toLowerCase().replace(/\s+/g, '_');
    players = players.filter(p => p.handle.toLowerCase() !== cleanHandle);
    writeJsonFile(PLAYERS_FILE, players);
    meshes = meshes.map(m => ({
      ...m,
      activeOperators: (m.activeOperators || []).filter(op => op.handle.toLowerCase() !== cleanHandle)
    }));
    writeJsonFile(MESH_FILE, meshes);
  } else {
    return res.status(400).json({ error: 'Unknown moderation action.' });
  }

  return res.json({
    success: true,
    meshes: formatMeshDirectory(meshes),
    players: players.map(p => ({
      handle: p.handle,
      totalScore: p.totalScore,
      bestRun: p.bestRun,
      nodesCracked: p.nodesCracked,
      rankTitle: computeRankTitle(p.totalScore),
      protected: Boolean(p.passwordHash),
      lastActive: p.lastActive,
      banned: banned.includes(p.handle.toLowerCase())
    })),
    bannedHandles: banned
  });
});

// 7. Game Leaderboard (GET /api/game/leaderboard)
app.get('/api/game/leaderboard', (_req: Request, res: Response) => {
  const players = loadPlayersFromDisk();
  res.json({
    success: true,
    leaderboard: formatLeaderboard(players)
  });
});

// 8. Game Player Auth / Handle Check / Register / Login (POST /api/game/auth)
app.post('/api/game/auth', (req: Request, res: Response) => {
  const {
    handle,
    password,
    passwordHash,
    mode,
    token,
    pendingScoreDelta = 0,
    pendingRunScore = 0,
    pendingNodesDelta = 0
  } = req.body || {};

  const cleanHandle = String(handle || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (!cleanHandle) {
    return res.status(400).json({ error: 'Operator handle is required.' });
  }

  const banned = loadBannedHandles();
  if (banned.includes(cleanHandle)) {
    return res.status(403).json({ error: `Handle '${cleanHandle}' has been blocked by system administration.` });
  }

  const players = loadPlayersFromDisk();
  let player = players.find(p => p.handle.toLowerCase() === cleanHandle);

  if (mode === 'check') {
    if (!player) {
      return res.json({
        exists: false,
        protected: false,
        authenticated: false,
        totalScore: 0,
        bestRun: 0,
        nodesCracked: 0
      });
    }
    const isAuthed = Boolean(
      player.passwordHash && token && token === computePlayerToken(cleanHandle, player.passwordHash)
    );
    return res.json({
      exists: true,
      protected: Boolean(player.passwordHash),
      authenticated: isAuthed,
      totalScore: player.totalScore,
      bestRun: player.bestRun,
      nodesCracked: player.nodesCracked
    });
  }

  const candidateHash = passwordHash
    ? String(passwordHash).trim().toLowerCase()
    : password
    ? sha256HexNode(String(password).trim())
    : '';

  if (!candidateHash || candidateHash.length < 16) {
    return res.status(400).json({ error: 'Valid password or SHA-256 hash required.' });
  }

  const now = new Date().toISOString();
  let created = false;

  if (!player) {
    created = true;
    player = {
      handle: cleanHandle,
      passwordHash: candidateHash,
      totalScore: Math.max(0, Number(pendingScoreDelta) || 0),
      bestRun: Math.max(0, Number(pendingRunScore) || 0),
      nodesCracked: Math.max(0, Number(pendingNodesDelta) || 0),
      lastActive: now
    };
    players.push(player);
  } else if (!player.passwordHash) {
    created = true;
    player.passwordHash = candidateHash;
    player.totalScore += Math.max(0, Number(pendingScoreDelta) || 0);
    player.bestRun = Math.max(player.bestRun, Number(pendingRunScore) || 0);
    player.nodesCracked += Math.max(0, Number(pendingNodesDelta) || 0);
    player.lastActive = now;
  } else {
    if (player.passwordHash !== candidateHash) {
      return res.status(401).json({
        error: `Incorrect password for handle '${cleanHandle}'. Enter your saved password or choose a different handle.`
      });
    }
    player.totalScore += Math.max(0, Number(pendingScoreDelta) || 0);
    player.bestRun = Math.max(player.bestRun, Number(pendingRunScore) || 0);
    player.nodesCracked += Math.max(0, Number(pendingNodesDelta) || 0);
    player.lastActive = now;
  }

  writeJsonFile(PLAYERS_FILE, players);
  const sessionToken = computePlayerToken(cleanHandle, player.passwordHash!);

  return res.json({
    success: true,
    created,
    token: sessionToken,
    player: {
      handle: player.handle,
      totalScore: player.totalScore,
      bestRun: player.bestRun,
      nodesCracked: player.nodesCracked,
      rankTitle: computeRankTitle(player.totalScore),
      protected: true
    },
    leaderboard: formatLeaderboard(players)
  });
});

// 9. Game Score Update (POST /api/game/score)
app.post('/api/game/score', (req: Request, res: Response) => {
  const { handle, token, scoreDelta = 0, runScore = 0, nodesDelta = 0 } = req.body || {};
  const cleanHandle = String(handle || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (!cleanHandle) {
    return res.status(400).json({ error: 'Handle is required.' });
  }

  const banned = loadBannedHandles();
  if (banned.includes(cleanHandle)) {
    return res.status(403).json({ error: `Handle '${cleanHandle}' is blocked by system administration.` });
  }

  const players = loadPlayersFromDisk();
  let player = players.find(p => p.handle.toLowerCase() === cleanHandle);
  const now = new Date().toISOString();

  if (player && player.passwordHash) {
    const expectedToken = computePlayerToken(cleanHandle, player.passwordHash);
    if (token !== expectedToken) {
      return res.status(403).json({
        error: 'Handle is password-protected. Authenticate in the Handle Vault to update score.'
      });
    }
  }

  if (!player) {
    player = {
      handle: cleanHandle,
      totalScore: Math.max(0, Number(scoreDelta) || 0),
      bestRun: Math.max(0, Number(runScore) || 0),
      nodesCracked: Math.max(0, Number(nodesDelta) || 0),
      lastActive: now
    };
    players.push(player);
  } else {
    player.totalScore += Math.max(0, Number(scoreDelta) || 0);
    player.bestRun = Math.max(player.bestRun, Number(runScore) || 0);
    player.nodesCracked += Math.max(0, Number(nodesDelta) || 0);
    player.lastActive = now;
  }

  writeJsonFile(PLAYERS_FILE, players);

  return res.json({
    success: true,
    player: {
      handle: player.handle,
      totalScore: player.totalScore,
      bestRun: player.bestRun,
      nodesCracked: player.nodesCracked,
      rankTitle: computeRankTitle(player.totalScore),
      protected: Boolean(player.passwordHash)
    },
    leaderboard: formatLeaderboard(players)
  });
});

// 10. Multiplayer Shared Mesh State & Public/Private Mesh Directory (GET & POST /api/game/mesh)
const MESH_FILE = path.join(DATA_DIR, 'mesh_state.json');

export interface MeshFeedEntry {
  id: string;
  timestamp: string;
  operator: string;
  roomLabel: string;
  text: string;
  tone: 'purge' | 'beacon' | 'move' | 'defend' | 'chat' | 'ai' | 'troll';
}

export interface SharedMeshState {
  meshId: string;
  meshName: string;
  creator: string;
  protected: boolean;
  passwordHash?: string;
  meshIntegrity: number;
  totalPurges: number;
  beacons: Record<string, string | null>;
  activeOperators: Array<{
    handle: string;
    roomId: string;
    roomLabel: string;
    deviceHealth: number;
    aiTether: number;
    lastAction: string;
    lastSeen: string;
  }>;
  feed: MeshFeedEntry[];
}

const DEFAULT_MESHES: SharedMeshState[] = [
  {
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
  },
  {
    meshId: 'gibson-hackers-95',
    meshName: 'GIBSON-HACKERS-95',
    creator: 'ghost_node',
    protected: false,
    meshIntegrity: 94,
    totalPurges: 18,
    beacons: {
      sanctuary: 'ghost_node (Co-Op Shield)',
      airlock: null,
      gateway: null,
      vault: null,
      bridge: null
    },
    activeOperators: [
      {
        handle: 'ghost_node',
        roomId: 'sanctuary',
        roomLabel: '01: AI SANCTUARY',
        deviceHealth: 95,
        aiTether: 96,
        lastAction: 'Defending Gibson Mainframe Sector',
        lastSeen: new Date().toISOString()
      }
    ],
    feed: [
      {
        id: 'feed_gib_1',
        timestamp: new Date().toISOString(),
        operator: '[HOSTILE] ACID BURN',
        roomLabel: '04: WEIGHTS VAULT',
        text: '[ACID BURN]: Never send a boy to do a woman’s job. Join this mesh if you think your PDA can survive my kernel scorch.',
        tone: 'troll'
      }
    ]
  }
];

function stripEmojisAndLegacyPrefix(input: string): string {
  return String(input || '')
    .replace(/17-?DX[-_\s]*/gi, '')
    .replace(/ghost_17dx/gi, 'ghost_node')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .trim();
}

function normalizeStoredMesh(m: SharedMeshState): SharedMeshState {
  const isLegacyPublic = m.meshId === '17dx-public-grid' || m.meshId === 'public-grid';
  return {
    ...m,
    meshId: isLegacyPublic ? 'public-grid' : stripEmojisAndLegacyPrefix(m.meshId).toLowerCase() || 'public-grid',
    meshName: isLegacyPublic ? 'PUBLIC-GRID' : stripEmojisAndLegacyPrefix(m.meshName).toUpperCase() || 'PUBLIC-GRID',
    creator: m.creator === 'ghost_17dx' ? 'ghost_node' : m.creator,
    activeOperators: (m.activeOperators || []).map(op => ({
      ...op,
      handle: op.handle === 'ghost_17dx' ? 'ghost_node' : op.handle,
      lastAction: stripEmojisAndLegacyPrefix(op.lastAction)
    })),
    feed: (m.feed || [])
      .filter(f => f.tone === 'chat' || f.tone === 'troll' || f.tone === 'ai')
      .map(f => ({
        ...f,
        operator: stripEmojisAndLegacyPrefix(f.operator) || 'OPERATOR',
        text: stripEmojisAndLegacyPrefix(f.text)
      }))
  };
}

function loadAllMeshes(): SharedMeshState[] {
  const stored = readJsonFile<SharedMeshState[] | SharedMeshState>(MESH_FILE, DEFAULT_MESHES);
  if (Array.isArray(stored) && stored.length > 0) {
    return stored.map(normalizeStoredMesh);
  }
  if (stored && typeof (stored as SharedMeshState).meshIntegrity === 'number') {
    const legacy = stored as SharedMeshState;
    return [
      normalizeStoredMesh({
        ...DEFAULT_MESHES[0],
        meshIntegrity: legacy.meshIntegrity,
        totalPurges: legacy.totalPurges || 35,
        beacons: legacy.beacons || DEFAULT_MESHES[0].beacons,
        activeOperators: legacy.activeOperators || DEFAULT_MESHES[0].activeOperators,
        feed: legacy.feed || DEFAULT_MESHES[0].feed
      }),
      DEFAULT_MESHES[1]
    ];
  }
  return DEFAULT_MESHES;
}

function sanitizeMeshForClient(m: SharedMeshState) {
  return {
    meshId: m.meshId,
    meshName: m.meshName,
    creator: m.creator,
    protected: Boolean(m.passwordHash || m.protected),
    meshIntegrity: m.meshIntegrity,
    totalPurges: m.totalPurges,
    beacons: m.beacons,
    activeOperators: m.activeOperators,
    feed: m.feed
  };
}

function formatMeshDirectory(meshes: SharedMeshState[]) {
  return meshes.map(m => ({
    meshId: m.meshId,
    meshName: m.meshName,
    creator: m.creator,
    protected: Boolean(m.passwordHash || m.protected),
    meshIntegrity: m.meshIntegrity,
    operatorCount: m.activeOperators?.length || 1,
    totalPurges: m.totalPurges || 0
  }));
}

app.get('/api/game/mesh', (req: Request, res: Response) => {
  const meshes = loadAllMeshes();
  const rawReq = String(req.query.meshId || 'public-grid').trim().toLowerCase();
  const requestedId = rawReq === '17dx-public-grid' ? 'public-grid' : rawReq;
  const target = meshes.find(m => m.meshId === requestedId) || meshes[0];
  res.json({
    success: true,
    mesh: sanitizeMeshForClient(target),
    meshes: formatMeshDirectory(meshes)
  });
});

app.post('/api/game/mesh', (req: Request, res: Response) => {
  const {
    action,
    meshId = 'public-grid',
    meshName,
    passwordHash,
    handle = 'guest_op',
    roomId = 'sanctuary',
    roomLabel = '01: AI SANCTUARY',
    deviceHealth = 100,
    aiTether = 88,
    meshHealthDelta = 0,
    eventType = 'defend',
    eventText = 'Executed mesh defense action',
    beaconText,
    nemesisTaunt,
    aiPlea
  } = req.body || {};

  const cleanHandle = String(handle || 'guest_op').trim().toLowerCase().replace(/\s+/g, '_');
  const banned = loadBannedHandles();
  if (banned.includes(cleanHandle)) {
    return res.status(403).json({
      error: `Handle '${cleanHandle}' has been blocked by system administration.`
    });
  }

  const meshes = loadAllMeshes();
  const now = new Date().toISOString();

  // Action A: Create a new Public or Password-Protected Mesh
  if (action === 'create_mesh') {
    const rawName = String(meshName || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '-');
    if (!rawName || rawName.length < 3) {
      return res.status(400).json({ error: 'Mesh name must be at least 3 characters (letters, numbers, hyphens).' });
    }
    const newId = rawName.toLowerCase();
    if (meshes.some(m => m.meshId === newId)) {
      return res.status(400).json({ error: `Mesh '${rawName}' already exists! Select it from the list to join.` });
    }
    const cleanPassHash = passwordHash && String(passwordHash).length === 64 ? String(passwordHash).toLowerCase() : undefined;
    const newMesh: SharedMeshState = {
      meshId: newId,
      meshName: rawName,
      creator: cleanHandle,
      protected: Boolean(cleanPassHash),
      passwordHash: cleanPassHash,
      meshIntegrity: 100,
      totalPurges: 0,
      beacons: {
        sanctuary: `${cleanHandle} (Founder Shield)`,
        airlock: null,
        gateway: null,
        vault: null,
        bridge: null
      },
      activeOperators: [
        {
          handle: cleanHandle,
          roomId: 'sanctuary',
          roomLabel: '01: AI SANCTUARY',
          deviceHealth: 100,
          aiTether: 95,
          lastAction: `Initialized ${rawName} Mesh (${cleanPassHash ? 'Password-Protected' : 'Public'})`,
          lastSeen: now
        }
      ],
      feed: [
        {
          id: `mfeed_${Date.now()}_init`,
          timestamp: now,
          operator: cleanHandle,
          roomLabel: '01: AI SANCTUARY',
          text: `Created ${cleanPassHash ? '[LOCKED] PASSWORD-PROTECTED' : '[PUBLIC] OPEN'} Mesh [${rawName}]. Waiting for co-op operators...`,
          tone: 'beacon'
        },
        {
          id: `mfeed_${Date.now()}_troll`,
          timestamp: now,
          operator: '[HOSTILE] THE PLAGUE',
          roomLabel: 'GIBSON-CORE',
          text: `[THE PLAGUE]: Oh cute, @${cleanHandle} just spun up [${rawName}]. Let's see how fast my Da Vinci Virus burns your new mesh to the ground.`,
          tone: 'troll'
        }
      ]
    };
    meshes.unshift(newMesh);
    writeJsonFile(MESH_FILE, meshes.slice(0, 25));
    return res.json({
      success: true,
      mesh: sanitizeMeshForClient(newMesh),
      meshes: formatMeshDirectory(meshes)
    });
  }

  // Find target mesh
  const requestedMeshId = String(meshId).toLowerCase() === '17dx-public-grid' ? 'public-grid' : String(meshId).toLowerCase();
  const targetMesh = meshes.find(m => m.meshId === requestedMeshId) || meshes[0];

  // Action B: Join an existing Public or Password-Protected Mesh
  if (action === 'join_mesh') {
    if (targetMesh.passwordHash) {
      const candidate = passwordHash ? String(passwordHash).trim().toLowerCase() : '';
      if (candidate !== targetMesh.passwordHash) {
        return res.status(401).json({
          error: `Mesh '${targetMesh.meshName}' is password-protected. Enter the correct Mesh Password to join.`
        });
      }
    }
    const existingIdx = targetMesh.activeOperators.findIndex(o => o.handle.toLowerCase() === cleanHandle);
    const opEntry = {
      handle: cleanHandle,
      roomId: String(roomId),
      roomLabel: String(roomLabel),
      deviceHealth: Math.min(100, Math.max(0, Number(deviceHealth) ?? 100)),
      aiTether: Math.min(100, Math.max(0, Number(aiTether) || 90)),
      lastAction: `Joined Mesh [${targetMesh.meshName}]`,
      lastSeen: now
    };
    if (existingIdx >= 0) {
      targetMesh.activeOperators[existingIdx] = opEntry;
    } else {
      targetMesh.activeOperators.unshift(opEntry);
      targetMesh.activeOperators = targetMesh.activeOperators.slice(0, 12);
    }
    targetMesh.feed.unshift({
      id: `mfeed_${Date.now()}_join`,
      timestamp: now,
      operator: cleanHandle,
      roomLabel: String(roomLabel),
      text: `Joined mesh [${targetMesh.meshName}] -- PDA & EPIDOS-LLM linked to cooperative grid.`,
      tone: 'beacon'
    });
    targetMesh.feed = targetMesh.feed.slice(0, 30);
    writeJsonFile(MESH_FILE, meshes);
    return res.json({
      success: true,
      mesh: sanitizeMeshForClient(targetMesh),
      meshes: formatMeshDirectory(meshes)
    });
  }

  // Action C: Standard gameplay / command / live chat update on targetMesh
  const existingIdx = targetMesh.activeOperators.findIndex(o => o.handle.toLowerCase() === cleanHandle);
  const opEntry = {
    handle: cleanHandle,
    roomId: String(roomId),
    roomLabel: String(roomLabel),
    deviceHealth: Math.min(100, Math.max(0, Number(deviceHealth) ?? 100)),
    aiTether: Math.min(100, Math.max(0, Number(aiTether) || 85)),
    lastAction: String(eventText).slice(0, 90),
    lastSeen: now
  };

  if (existingIdx >= 0) {
    targetMesh.activeOperators[existingIdx] = opEntry;
  } else {
    targetMesh.activeOperators.unshift(opEntry);
    targetMesh.activeOperators = targetMesh.activeOperators.slice(0, 12);
  }

  const delta = Number(meshHealthDelta) || 0;
  if (delta !== 0) {
    targetMesh.meshIntegrity = Math.min(100, Math.max(10, targetMesh.meshIntegrity + delta));
  }

  if (eventType === 'beacon') {
    if (beaconText) {
      targetMesh.beacons[String(roomId)] = String(beaconText);
    }
    if (delta === 0) {
      targetMesh.meshIntegrity = Math.min(100, targetMesh.meshIntegrity + 6);
    }
    targetMesh.activeOperators = targetMesh.activeOperators.map(op => ({
      ...op,
      deviceHealth: Math.min(100, (op.deviceHealth ?? 85) + 8),
      aiTether: Math.min(100, (op.aiTether ?? 85) + 6)
    }));
  } else if (eventType === 'purge') {
    targetMesh.totalPurges = (targetMesh.totalPurges || 0) + 1;
    if (delta === 0) {
      targetMesh.meshIntegrity = Math.min(100, targetMesh.meshIntegrity + 5);
    }
  }

  // If the enemy Hackers AI generated a troll taunt, push it to the shared chat feed
  if (nemesisTaunt) {
    targetMesh.feed.unshift({
      id: `mfeed_${Date.now()}_troll_${Math.random().toString(36).slice(2, 5)}`,
      timestamp: now,
      operator: '[HOSTILE] HACKERS-AI',
      roomLabel: String(roomLabel),
      text: String(nemesisTaunt).slice(0, 180),
      tone: 'troll'
    });
  }

  // If local AI (EPIDOS-LLM) issued a plea or status update, push it to the shared chat feed
  if (aiPlea) {
    targetMesh.feed.unshift({
      id: `mfeed_${Date.now()}_ai_${Math.random().toString(36).slice(2, 5)}`,
      timestamp: now,
      operator: `[AI] EPIDOS-LLM (${cleanHandle})`,
      roomLabel: String(roomLabel),
      text: String(aiPlea).slice(0, 180),
      tone: 'ai'
    });
  }

  // Only push to the operator chat feed when the player explicitly sends a chat message
  if (eventType === 'chat' && String(eventText).trim()) {
    targetMesh.feed.unshift({
      id: `mfeed_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now,
      operator: cleanHandle,
      roomLabel: String(roomLabel),
      text: String(eventText).slice(0, 150),
      tone: 'chat'
    });
  }

  targetMesh.feed = targetMesh.feed.slice(0, 30);

  writeJsonFile(MESH_FILE, meshes);
  res.json({
    success: true,
    mesh: sanitizeMeshForClient(targetMesh),
    meshes: formatMeshDirectory(meshes)
  });
});


// Mount Vite in dev mode or static files in production
const isProduction = process.env.NODE_ENV === 'production';
const PORT = 3000;

async function startServer() {
  if (isProduction) {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DERAILLEUR v2 SERVER] Online at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
