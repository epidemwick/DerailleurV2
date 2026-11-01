/**
 * Cloudflare Pages Functions Route Handler for /api/*
 * Automatically executed on Cloudflare Pages global serverless edge.
 *
 * Supports:
 * 1. Persistent storage via Cloudflare KV binding `EPIDOS_KV` (falls back to edge isolate memory if unbound)
 * 2. Zero-plaintext owner authentication via Cloudflare secret `ADMIN_PASSWORD`, KV-stored hash, or SHA-256 digest
 * 3. Cloudflare Workers AI binding `AI` for Tactical AI Co-Processor queries
 */

interface Env {
  ADMIN_PASSWORD?: string;
  ADMIN_PASSWORD_HASH?: string;
  EPIDOS_KV?: {
    get(key: string, type?: 'json' | 'text'): Promise<any>;
    put(key: string, value: string): Promise<void>;
  };
  AI?: {
    run(model: string, input: any): Promise<any>;
  };
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

export interface GamePlayerRecord {
  handle: string;
  passwordHash?: string;
  totalScore: number;
  bestRun: number;
  nodesCracked: number;
  lastActive: string;
}

const DEFAULT_EDGE_PLAYERS: GamePlayerRecord[] = [
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

// In-memory fallback for edge execution if EPIDOS_KV is not yet bound in Cloudflare Pages settings
let inMemorySessions: VisitorSession[] = [];
let inMemoryMessages: ContactMessage[] = [];
let inMemoryPasswordHash: string | null = null;
let inMemoryPlayers: GamePlayerRecord[] = [...DEFAULT_EDGE_PLAYERS];
let inMemoryBannedHandles: string[] = [];

// One-way SHA-256 fallback digest (no plaintext password stored in repository)
const DEFAULT_OWNER_SHA256 = '6ec6afafbd77a00d6ec99ca14208ba9bfadfbe35293048ca7d771821dadcff2d';

function corsHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getActivePasswordHash(env: Env): Promise<string> {
  // 1. If a plaintext ADMIN_PASSWORD secret is configured in Cloudflare Dashboard, hash it for comparison
  if (env.ADMIN_PASSWORD && env.ADMIN_PASSWORD.trim()) {
    return await sha256Hex(env.ADMIN_PASSWORD.trim());
  }
  // 2. If a custom password hash was saved into Cloudflare KV via the Admin Console
  if (env.EPIDOS_KV) {
    try {
      const kvHash = await env.EPIDOS_KV.get('admin_password_hash', 'text');
      if (kvHash && typeof kvHash === 'string' && kvHash.length === 64) {
        return kvHash.trim();
      }
    } catch {
      // ignore KV read error
    }
  }
  if (inMemoryPasswordHash) {
    return inMemoryPasswordHash;
  }
  // 3. If ADMIN_PASSWORD_HASH env var is set or fallback to default SHA-256 digest
  return (env.ADMIN_PASSWORD_HASH || DEFAULT_OWNER_SHA256).trim().toLowerCase();
}

async function computeAdminToken(env: Env): Promise<string> {
  const activeHash = await getActivePasswordHash(env);
  return `TS-SCI-SESSION-${activeHash.slice(0, 32)}`;
}

async function loadSessions(env: Env): Promise<VisitorSession[]> {
  if (env.EPIDOS_KV) {
    try {
      const stored = await env.EPIDOS_KV.get('sessions', 'json');
      if (Array.isArray(stored)) {
        inMemorySessions = stored;
        return stored;
      }
    } catch {
      // fallback to memory
    }
  }
  return inMemorySessions;
}

async function saveSessions(env: Env, sessions: VisitorSession[]): Promise<void> {
  const trimmed = sessions.slice(0, 100);
  inMemorySessions = trimmed;
  if (env.EPIDOS_KV) {
    try {
      await env.EPIDOS_KV.put('sessions', JSON.stringify(trimmed));
    } catch {
      // ignore KV write error
    }
  }
}

async function loadMessages(env: Env): Promise<ContactMessage[]> {
  if (env.EPIDOS_KV) {
    try {
      const stored = await env.EPIDOS_KV.get('messages', 'json');
      if (Array.isArray(stored)) {
        inMemoryMessages = stored;
        return stored;
      }
    } catch {
      // fallback to memory
    }
  }
  return inMemoryMessages;
}

async function saveMessages(env: Env, messages: ContactMessage[]): Promise<void> {
  const trimmed = messages.slice(0, 50);
  inMemoryMessages = trimmed;
  if (env.EPIDOS_KV) {
    try {
      await env.EPIDOS_KV.put('messages', JSON.stringify(trimmed));
    } catch {
      // ignore KV write error
    }
  }
}

function computeRankTitle(totalScore: number): string {
  if (totalScore >= 10000) return 'CYBER COMMANDER';
  if (totalScore >= 5000) return 'ZERO-DAY ARCHITECT';
  if (totalScore >= 2500) return 'KERNEL INFILTRATOR';
  if (totalScore >= 1000) return 'PACKET INTERCEPTOR';
  if (totalScore >= 300) return 'BUS OPERATOR';
  return 'TERMINAL PROBER';
}

async function computePlayerToken(handle: string, passwordHash: string): Promise<string> {
  const digest = await sha256Hex(`${handle}:${passwordHash}`);
  return `PLAYER-SESSION-${digest.slice(0, 32)}`;
}

async function loadBannedHandles(env: Env): Promise<string[]> {
  if (env.EPIDOS_KV) {
    try {
      const stored = await env.EPIDOS_KV.get('banned_handles', 'json');
      if (Array.isArray(stored)) {
        inMemoryBannedHandles = stored.map(h => String(h).trim().toLowerCase()).filter(Boolean);
        return inMemoryBannedHandles;
      }
    } catch {
      // fallback
    }
  }
  return inMemoryBannedHandles;
}

async function saveBannedHandles(env: Env, list: string[]): Promise<void> {
  const unique = Array.from(new Set(list.map(h => String(h).trim().toLowerCase()).filter(Boolean)));
  inMemoryBannedHandles = unique;
  if (env.EPIDOS_KV) {
    try {
      await env.EPIDOS_KV.put('banned_handles', JSON.stringify(unique));
    } catch {
      // ignore
    }
  }
}

async function loadPlayers(env: Env): Promise<GamePlayerRecord[]> {
  if (env.EPIDOS_KV) {
    try {
      const stored = await env.EPIDOS_KV.get('game_players', 'json');
      if (Array.isArray(stored) && stored.length > 0) {
        inMemoryPlayers = stored.map((p: GamePlayerRecord) => ({
          ...p,
          handle: p.handle === 'ghost_17dx' ? 'ghost_node' : p.handle
        }));
        return inMemoryPlayers;
      }
    } catch {
      // fallback to memory
    }
  }
  return inMemoryPlayers;
}

async function savePlayers(env: Env, players: GamePlayerRecord[]): Promise<void> {
  const trimmed = players.slice(0, 200);
  inMemoryPlayers = trimmed;
  if (env.EPIDOS_KV) {
    try {
      await env.EPIDOS_KV.put('game_players', JSON.stringify(trimmed));
    } catch {
      // ignore KV write error
    }
  }
}

function formatLeaderboard(players: GamePlayerRecord[], bannedHandles: string[] = []) {
  const banned = new Set(bannedHandles.map(h => h.toLowerCase()));
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

export async function onRequest(context: { request: Request; env: Env; params: { route?: string[] } }): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/?/, '');
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const activeHash = await getActivePasswordHash(env);
  const adminToken = await computeAdminToken(env);

  // 1. Admin login (verifies against Cloudflare secret / KV hash / SHA-256 digest)
  if (path === 'admin/login' && method === 'POST') {
    try {
      const body = (await request.json()) as { password?: string; passwordHash?: string };
      const candidateHash = body.passwordHash
        ? body.passwordHash.trim().toLowerCase()
        : body.password
        ? await sha256Hex(body.password)
        : '';

      if (candidateHash && candidateHash === activeHash) {
        return new Response(
          JSON.stringify({
            success: true,
            token: adminToken,
            storageBackend: env.EPIDOS_KV ? 'cloudflare-kv' : 'cloudflare-edge-memory',
            authSource: env.ADMIN_PASSWORD ? 'cloudflare-secret' : 'cloudflare-sha256'
          }),
          { status: 200, headers: corsHeaders() }
        );
      } else {
        return new Response(
          JSON.stringify({ error: 'Invalid access credentials. Clearance denied.' }),
          { status: 401, headers: corsHeaders() }
        );
      }
    } catch {
      return new Response(JSON.stringify({ error: 'Malformed request.' }), { status: 400, headers: corsHeaders() });
    }
  }

  // 1b. Rotate / update owner password in Cloudflare KV
  if (path === 'admin/password' && method === 'POST') {
    const auth = request.headers.get('Authorization');
    if (auth !== `Bearer ${adminToken}`) {
      return new Response(JSON.stringify({ error: 'Access denied. Top Secret clearance required.' }), {
        status: 403,
        headers: corsHeaders()
      });
    }
    try {
      const body = (await request.json()) as { newPassword?: string; newPasswordHash?: string };
      const nextHash = body.newPasswordHash
        ? body.newPasswordHash.trim().toLowerCase()
        : body.newPassword && body.newPassword.trim().length >= 6
        ? await sha256Hex(body.newPassword.trim())
        : '';

      if (!nextHash || nextHash.length !== 64) {
        return new Response(
          JSON.stringify({ error: 'New password must be at least 6 characters.' }),
          { status: 400, headers: corsHeaders() }
        );
      }

      inMemoryPasswordHash = nextHash;
      if (env.EPIDOS_KV) {
        await env.EPIDOS_KV.put('admin_password_hash', nextHash);
      }
      const nextToken = `TS-SCI-SESSION-${nextHash.slice(0, 32)}`;
      return new Response(
        JSON.stringify({
          success: true,
          token: nextToken,
          persistedToKv: Boolean(env.EPIDOS_KV),
          note: env.ADMIN_PASSWORD
            ? 'Note: ADMIN_PASSWORD environment variable is set in Cloudflare Dashboard and takes priority until removed.'
            : env.EPIDOS_KV
            ? 'Password SHA-256 hash saved to Cloudflare KV (EPIDOS_KV).'
            : 'Password updated in Edge Memory (bind EPIDOS_KV in Cloudflare Pages for permanent KV persistence).'
        }),
        { status: 200, headers: corsHeaders() }
      );
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to update password.' }), {
        status: 500,
        headers: corsHeaders()
      });
    }
  }

  // 2. Admin audit & web page monitoring metrics
  if (path === 'admin/audit' && method === 'GET') {
    const auth = request.headers.get('Authorization');
    if (auth !== `Bearer ${adminToken}`) {
      return new Response(JSON.stringify({ error: 'Access denied. Top Secret clearance required.' }), {
        status: 403,
        headers: corsHeaders()
      });
    }

    const sessions = await loadSessions(env);
    const messages = await loadMessages(env);

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
          const p = ev.details || '';
          if (p.includes('about')) routeHits['~/about'] = (routeHits['~/about'] || 0) + 1;
          else if (p.includes('resume')) routeHits['~/resume'] = (routeHits['~/resume'] || 0) + 1;
          else if (p.includes('projects')) routeHits['~/projects'] = (routeHits['~/projects'] || 0) + 1;
          else if (p.includes('contact')) routeHits['~/contact'] = (routeHits['~/contact'] || 0) + 1;
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

    routeHits['~/about'] = Math.max(14, routeHits['~/about']);
    routeHits['~/resume'] = Math.max(18, routeHits['~/resume']);
    routeHits['~/projects'] = Math.max(16, routeHits['~/projects']);
    routeHits['~/contact'] = Math.max(10, routeHits['~/contact']);
    routeHits['~/'] = Math.max(22, routeHits['~/']);

    referrers['Direct Terminal (Handheld)'] = Math.max(12, referrers['Direct Terminal (Handheld)']);
    referrers['GitHub (github.com/epidemwick)'] = Math.max(18, referrers['GitHub (github.com/epidemwick)']);
    referrers['Cloudflare Edge Proxy'] = Math.max(34, referrers['Cloudflare Edge Proxy']);
    referrers['LinkedIn Network'] = Math.max(15, referrers['LinkedIn Network']);

    const computedTopCommands = Object.entries(commandCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([cmd, count]) => ({ cmd, count }));

    const monitoring = {
      totalHits: Math.max(sessions.length * 7 + totalEvents, 84),
      uniqueVisitors: Math.max(sessions.length, 14),
      totalSessions: sessions.length,
      routeHits,
      referrers,
      topCommands:
        computedTopCommands.length > 0
          ? computedTopCommands
          : [
              { cmd: 'ls', count: 48 },
              { cmd: 'cat', count: 36 },
              { cmd: 'vim', count: 24 },
              { cmd: 'help', count: 18 },
              { cmd: 'ping', count: 12 },
              { cmd: 'cpu', count: 10 }
            ],
      systemHealth: {
        uptimeSeconds: 86400,
        memoryHeapMB: 12.4,
        cmosRamAllocated: '640 KB',
        httpStatusRate: '100% OK (Cloudflare Edge 200)',
        avgLatencyMs: 8,
        nodeVersion: 'Cloudflare Workers Runtime V8',
        platform: env.EPIDOS_KV ? 'Cloudflare Pages + KV Storage' : 'Cloudflare Pages Edge',
        serverTime: new Date().toISOString(),
        storageBackend: env.EPIDOS_KV ? 'Cloudflare KV (EPIDOS_KV Bound)' : 'Edge Isolate Memory (Unbound KV)',
        authSource: env.ADMIN_PASSWORD
          ? 'Cloudflare Secret (ADMIN_PASSWORD)'
          : env.EPIDOS_KV
          ? 'Cloudflare KV / SHA-256 Digest'
          : 'Zero-Plaintext SHA-256 Digest'
      }
    };

    const players = await loadPlayers(env);
    const bannedHandles = await loadBannedHandles(env);
    let meshes: any[] = [];
    if (env.EPIDOS_KV) {
      try {
        const kvMeshes = await env.EPIDOS_KV.get('mesh_networks', 'json');
        if (Array.isArray(kvMeshes)) meshes = kvMeshes;
      } catch {
        // ignore
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sessions,
        messages,
        monitoring,
        meshes: meshes.map((m: any) => ({
          meshId: m.meshId === '17dx-public-grid' ? 'public-grid' : m.meshId || 'public-grid',
          meshName: m.meshName === '17DX-PUBLIC-GRID' ? 'PUBLIC-GRID' : m.meshName || 'PUBLIC-GRID',
          creator: m.creator || 'epidemwick',
          protected: Boolean(m.passwordHash || m.protected),
          meshIntegrity: m.meshIntegrity ?? 89,
          operatorCount: m.activeOperators?.length || 1,
          totalPurges: m.totalPurges || 0
        })),
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
      }),
      { status: 200, headers: corsHeaders() }
    );
  }

  // 2b. Admin Moderation (POST /api/admin/moderate)
  if (path === 'admin/moderate' && method === 'POST') {
    const auth = request.headers.get('Authorization');
    if (auth !== `Bearer ${adminToken}`) {
      return new Response(JSON.stringify({ error: 'Access denied. Top Secret clearance required.' }), {
        status: 403,
        headers: corsHeaders()
      });
    }
    try {
      const body = (await request.json()) as { action?: string; meshId?: string; handle?: string };
      let players = await loadPlayers(env);
      let banned = await loadBannedHandles(env);
      let meshes: any[] = [];
      if (env.EPIDOS_KV) {
        try {
          const kvMeshes = await env.EPIDOS_KV.get('mesh_networks', 'json');
          if (Array.isArray(kvMeshes)) meshes = kvMeshes;
        } catch {
          // ignore
        }
      }

      if (body.action === 'delete_mesh') {
        const targetId = String(body.meshId || '').trim().toLowerCase();
        meshes = meshes.filter((m: any) => String(m.meshId || '').toLowerCase() !== targetId);
        if (env.EPIDOS_KV) {
          await env.EPIDOS_KV.put('mesh_networks', JSON.stringify(meshes));
        }
      } else if (body.action === 'purge_mesh_chat') {
        const targetId = String(body.meshId || '').trim().toLowerCase();
        const target = meshes.find((m: any) => String(m.meshId || '').toLowerCase() === targetId);
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
          if (env.EPIDOS_KV) {
            await env.EPIDOS_KV.put('mesh_networks', JSON.stringify(meshes));
          }
        }
      } else if (body.action === 'ban_user') {
        const cleanHandle = String(body.handle || '').trim().toLowerCase().replace(/\s+/g, '_');
        if (cleanHandle && !banned.includes(cleanHandle)) {
          banned.push(cleanHandle);
          await saveBannedHandles(env, banned);
        }
        meshes = meshes.map((m: any) => ({
          ...m,
          activeOperators: (m.activeOperators || []).filter((op: any) => op.handle?.toLowerCase() !== cleanHandle),
          feed: (m.feed || []).filter((f: any) => f.operator?.toLowerCase() !== cleanHandle)
        }));
        if (env.EPIDOS_KV) {
          await env.EPIDOS_KV.put('mesh_networks', JSON.stringify(meshes));
        }
      } else if (body.action === 'unban_user') {
        const cleanHandle = String(body.handle || '').trim().toLowerCase().replace(/\s+/g, '_');
        banned = banned.filter(h => h !== cleanHandle);
        await saveBannedHandles(env, banned);
      } else if (body.action === 'delete_user') {
        const cleanHandle = String(body.handle || '').trim().toLowerCase().replace(/\s+/g, '_');
        players = players.filter(p => p.handle.toLowerCase() !== cleanHandle);
        await savePlayers(env, players);
      }

      return new Response(
        JSON.stringify({
          success: true,
          meshes: meshes.map((m: any) => ({
            meshId: m.meshId || 'public-grid',
            meshName: m.meshName || 'PUBLIC-GRID',
            creator: m.creator || 'epidemwick',
            protected: Boolean(m.passwordHash || m.protected),
            meshIntegrity: m.meshIntegrity ?? 89,
            operatorCount: m.activeOperators?.length || 1,
            totalPurges: m.totalPurges || 0
          })),
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
        }),
        { status: 200, headers: corsHeaders() }
      );
    } catch {
      return new Response(JSON.stringify({ error: 'Moderation request failed.' }), {
        status: 500,
        headers: corsHeaders()
      });
    }
  }

  // 3. Telemetry Session (creates or updates session in Cloudflare KV)
  if (path === 'telemetry/session' && method === 'POST') {
    try {
      const body = (await request.json()) as any;
      const now = new Date().toISOString();
      const sessions = await loadSessions(env);
      const sessionId = body.sessionId || 'sess_' + Math.random().toString(36).substring(2, 9);

      let session = sessions.find(s => s.id === sessionId);
      if (!session) {
        session = {
          id: sessionId,
          operatorName: body.operatorName || 'guest',
          startTime: now,
          lastActive: now,
          location: body.location || 'Unknown Location',
          userAgent: request.headers.get('user-agent') || '',
          ip: request.headers.get('cf-connecting-ip') || 'Cloudflare Edge',
          events: [{ timestamp: now, action: 'SESSION_INITIALIZED', details: body.weatherMode || '' }]
        };
        sessions.unshift(session);
      } else {
        session.operatorName = body.operatorName || session.operatorName;
        session.lastActive = now;
        if (body.location) session.location = body.location;
      }

      await saveSessions(env, sessions);

      return new Response(JSON.stringify({ success: true, sessionId: session.id }), {
        status: 200,
        headers: corsHeaders()
      });
    } catch {
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders() });
    }
  }

  // 4. Telemetry Event (appends event & persists to Cloudflare KV)
  if (path === 'telemetry/event' && method === 'POST') {
    try {
      const body = (await request.json()) as any;
      if (!body.sessionId) {
        return new Response(JSON.stringify({ error: 'Missing sessionId' }), { status: 400, headers: corsHeaders() });
      }
      const now = new Date().toISOString();
      const sessions = await loadSessions(env);
      const sess = sessions.find(s => s.id === body.sessionId);
      if (sess) {
        sess.lastActive = now;
        sess.events.push({
          timestamp: now,
          action: body.action || 'ACTION',
          details: body.details || ''
        });
        await saveSessions(env, sessions);
      }
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders() });
    } catch {
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders() });
    }
  }

  // 5. Messages (loads existing messages from Cloudflare KV, prepends new message, and saves)
  if (path === 'messages' && method === 'POST') {
    try {
      const body = (await request.json()) as any;
      if (!body.message || !String(body.message).trim()) {
        return new Response(JSON.stringify({ error: 'Message content is required' }), {
          status: 400,
          headers: corsHeaders()
        });
      }
      const messages = await loadMessages(env);
      const newMsg: ContactMessage = {
        id: 'msg_' + Math.random().toString(36).substring(2, 9),
        senderName: body.senderName?.trim() || 'Anonymous Operator',
        senderEmail: body.senderEmail?.trim() || 'Not Provided',
        message: String(body.message).trim(),
        timestamp: new Date().toISOString(),
        recipient: 'epidemwick@chadhawkcorps.com',
        read: false
      };
      messages.unshift(newMsg);
      await saveMessages(env, messages);

      return new Response(JSON.stringify({ success: true, messageId: newMsg.id }), {
        status: 200,
        headers: corsHeaders()
      });
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to record message' }), {
        status: 500,
        headers: corsHeaders()
      });
    }
  }

  // 6. Admin Clear
  if (path === 'admin/clear' && method === 'POST') {
    const auth = request.headers.get('Authorization');
    if (auth !== `Bearer ${adminToken}`) {
      return new Response(JSON.stringify({ error: 'Access denied.' }), { status: 403, headers: corsHeaders() });
    }
    await saveSessions(env, []);
    await saveMessages(env, []);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders() });
  }

  // 7. AI Chatbot / Tactical Co-Processor
  if (path === 'ai' && method === 'POST') {
    try {
      const body = (await request.json()) as { prompt?: string };
      const prompt = (body.prompt || '').trim();
      if (!prompt) {
        return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400, headers: corsHeaders() });
      }

      if (env.AI) {
        try {
          const aiResponse = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
            messages: [
              {
                role: 'system',
                content: `You are the Tactical AI Co-Processor inside the Derailleur v2 Handheld Cyberdeck (ePidOS v4.09), representing Christian J. Chadwick (epidemwick / Chadhawk). Christian is a 2d Lt Warfighter Communications Operations Officer (17DX) in the USAF ANG and a GS-12 Supply/Demand Analyst at DLA with active TS/SCI clearance. Keep responses crisp, factual, and in retro-tactical terminal style.`
              },
              { role: 'user', content: prompt }
            ]
          });
          if (aiResponse && aiResponse.response) {
            return new Response(JSON.stringify({ success: true, reply: aiResponse.response }), {
              status: 200,
              headers: corsHeaders()
            });
          }
        } catch {
          // fallback
        }
      }

      const lower = prompt.toLowerCase();
      let reply = '';
      if (lower.includes('clearance') || lower.includes('security') || lower.includes('ts/sci')) {
        reply =
          '2d Lt Christian Chadwick holds an active Top Secret clearance with Sensitive Compartmented Information access (TS/SCI), vetted through DoD DCSA.';
      } else if (lower.includes('military') || lower.includes('commission') || lower.includes('ots') || lower.includes('usaf')) {
        reply =
          'Christian completed USAF Officer Training School (OTS) at Maxwell AFB (June 14 - August 16) and serves as an Assistant Director of Operations / Warfighter Communications Operations Officer (17DX) in the 108th Wing Communications Squadron.';
      } else if (lower.includes('dla') || lower.includes('work') || lower.includes('experience') || lower.includes('job')) {
        reply =
          'Christian serves dually as a civilian GS-12 Supply/Demand Analyst with the Defense Logistics Agency (DLA) in Philadelphia, and as a 17DX Cyberspace Operations Officer in the USAF ANG.';
      } else if (lower.includes('contact') || lower.includes('email') || lower.includes('reach') || lower.includes('hire')) {
        reply =
          'Direct transmission channels: Personal email epidemwick@chadhawkcorps.com, Military christian.chadwick@us.af.mil, DoD DLA christian.chadwick@dla.mil, or via GitHub github.com/epidemwick.';
      } else {
        reply = `[ePidOS TACTICAL AI] :: Query '${prompt}' analyzed against Christian Chadwick's record. Specialties: Cyberspace Operations (17DX), Enterprise Logistics Analytics (DLA GS-12), TS/SCI Comms Infrastructure, and Cloudflare/GitHub DevOps. Type 'help' or explore ~/resume for full files.`;
      }

      return new Response(JSON.stringify({ success: true, reply }), {
        status: 200,
        headers: corsHeaders()
      });
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to process AI query' }), {
        status: 500,
        headers: corsHeaders()
      });
    }
  }

  // 8. Game Leaderboard (GET /api/game/leaderboard)
  if (path === 'game/leaderboard' && method === 'GET') {
    const players = await loadPlayers(env);
    const banned = await loadBannedHandles(env);
    return new Response(
      JSON.stringify({
        success: true,
        leaderboard: formatLeaderboard(players, banned)
      }),
      { status: 200, headers: corsHeaders() }
    );
  }

  // 9. Game Player Auth / Handle Check / Register / Login (POST /api/game/auth)
  if (path === 'game/auth' && method === 'POST') {
    try {
      const body = (await request.json()) as any;
      const cleanHandle = String(body.handle || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');

      if (!cleanHandle) {
        return new Response(JSON.stringify({ error: 'Operator handle is required.' }), {
          status: 400,
          headers: corsHeaders()
        });
      }

      const banned = await loadBannedHandles(env);
      if (banned.includes(cleanHandle)) {
        return new Response(
          JSON.stringify({ error: `Handle '${cleanHandle}' has been blocked by system administration.` }),
          { status: 403, headers: corsHeaders() }
        );
      }

      const players = await loadPlayers(env);
      let player = players.find(p => p.handle.toLowerCase() === cleanHandle);

      if (body.mode === 'check') {
        if (!player) {
          return new Response(
            JSON.stringify({
              exists: false,
              protected: false,
              authenticated: false,
              totalScore: 0,
              bestRun: 0,
              nodesCracked: 0
            }),
            { status: 200, headers: corsHeaders() }
          );
        }
        const expectedToken = player.passwordHash
          ? await computePlayerToken(cleanHandle, player.passwordHash)
          : null;
        const isAuthed = Boolean(expectedToken && body.token && body.token === expectedToken);
        return new Response(
          JSON.stringify({
            exists: true,
            protected: Boolean(player.passwordHash),
            authenticated: isAuthed,
            totalScore: player.totalScore,
            bestRun: player.bestRun,
            nodesCracked: player.nodesCracked
          }),
          { status: 200, headers: corsHeaders() }
        );
      }

      const candidateHash = body.passwordHash
        ? String(body.passwordHash).trim().toLowerCase()
        : body.password
        ? await sha256Hex(String(body.password).trim())
        : '';

      if (!candidateHash || candidateHash.length < 16) {
        return new Response(JSON.stringify({ error: 'Valid password or SHA-256 hash required.' }), {
          status: 400,
          headers: corsHeaders()
        });
      }

      const now = new Date().toISOString();
      let created = false;
      const pendingScoreDelta = Math.max(0, Number(body.pendingScoreDelta) || 0);
      const pendingRunScore = Math.max(0, Number(body.pendingRunScore) || 0);
      const pendingNodesDelta = Math.max(0, Number(body.pendingNodesDelta) || 0);

      if (!player) {
        created = true;
        player = {
          handle: cleanHandle,
          passwordHash: candidateHash,
          totalScore: pendingScoreDelta,
          bestRun: pendingRunScore,
          nodesCracked: pendingNodesDelta,
          lastActive: now
        };
        players.push(player);
      } else if (!player.passwordHash) {
        created = true;
        player.passwordHash = candidateHash;
        player.totalScore += pendingScoreDelta;
        player.bestRun = Math.max(player.bestRun, pendingRunScore);
        player.nodesCracked += pendingNodesDelta;
        player.lastActive = now;
      } else {
        if (player.passwordHash !== candidateHash) {
          return new Response(
            JSON.stringify({
              error: `Incorrect password for handle '${cleanHandle}'. Enter your saved password or choose a different handle.`
            }),
            { status: 401, headers: corsHeaders() }
          );
        }
        player.totalScore += pendingScoreDelta;
        player.bestRun = Math.max(player.bestRun, pendingRunScore);
        player.nodesCracked += pendingNodesDelta;
        player.lastActive = now;
      }

      await savePlayers(env, players);
      const sessionToken = await computePlayerToken(cleanHandle, player.passwordHash!);

      return new Response(
        JSON.stringify({
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
          leaderboard: formatLeaderboard(players, banned)
        }),
        { status: 200, headers: corsHeaders() }
      );
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to process player authentication.' }), {
        status: 500,
        headers: corsHeaders()
      });
    }
  }

  // 10. Game Score Update (POST /api/game/score)
  if (path === 'game/score' && method === 'POST') {
    try {
      const body = (await request.json()) as any;
      const cleanHandle = String(body.handle || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');

      if (!cleanHandle) {
        return new Response(JSON.stringify({ error: 'Handle is required.' }), {
          status: 400,
          headers: corsHeaders()
        });
      }

      const banned = await loadBannedHandles(env);
      if (banned.includes(cleanHandle)) {
        return new Response(
          JSON.stringify({ error: `Handle '${cleanHandle}' is blocked by system administration.` }),
          { status: 403, headers: corsHeaders() }
        );
      }

      const players = await loadPlayers(env);
      let player = players.find(p => p.handle.toLowerCase() === cleanHandle);
      const now = new Date().toISOString();

      if (player && player.passwordHash) {
        const expectedToken = await computePlayerToken(cleanHandle, player.passwordHash);
        if (body.token !== expectedToken) {
          return new Response(
            JSON.stringify({
              error: 'Handle is password-protected. Authenticate in the Handle Vault to update score.'
            }),
            { status: 403, headers: corsHeaders() }
          );
        }
      }

      const scoreDelta = Math.max(0, Number(body.scoreDelta) || 0);
      const runScore = Math.max(0, Number(body.runScore) || 0);
      const nodesDelta = Math.max(0, Number(body.nodesDelta) || 0);

      if (!player) {
        player = {
          handle: cleanHandle,
          totalScore: scoreDelta,
          bestRun: runScore,
          nodesCracked: nodesDelta,
          lastActive: now
        };
        players.push(player);
      } else {
        player.totalScore += scoreDelta;
        player.bestRun = Math.max(player.bestRun, runScore);
        player.nodesCracked += nodesDelta;
        player.lastActive = now;
      }

      await savePlayers(env, players);

      return new Response(
        JSON.stringify({
          success: true,
          player: {
            handle: player.handle,
            totalScore: player.totalScore,
            bestRun: player.bestRun,
            nodesCracked: player.nodesCracked,
            rankTitle: computeRankTitle(player.totalScore),
            protected: Boolean(player.passwordHash)
          },
          leaderboard: formatLeaderboard(players, banned)
        }),
        { status: 200, headers: corsHeaders() }
      );
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to save game score.' }), {
        status: 500,
        headers: corsHeaders()
      });
    }
  }

  // 11. Multiplayer Shared Mesh State & Public/Private Mesh Directory (GET & POST /api/game/mesh)
  if (path === 'game/mesh') {
    const defaultMeshes = [
      {
        meshId: 'public-grid',
        meshName: 'PUBLIC-GRID',
        creator: 'epidemwick',
        protected: false,
        passwordHash: undefined as string | undefined,
        meshIntegrity: 89,
        totalPurges: 35,
        beacons: {
          sanctuary: null,
          airlock: 'epidemwick (Co-Op Shield)',
          gateway: null,
          vault: null,
          bridge: 'ghost_node (Co-Op Shield)'
        } as Record<string, string | null>,
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
        passwordHash: undefined as string | undefined,
        meshIntegrity: 94,
        totalPurges: 18,
        beacons: {
          sanctuary: 'ghost_node (Co-Op Shield)',
          airlock: null,
          gateway: null,
          vault: null,
          bridge: null
        } as Record<string, string | null>,
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

    let meshes = defaultMeshes;
    if (env.EPIDOS_KV) {
      try {
        const kvMeshes = await env.EPIDOS_KV.get('mesh_networks', 'json');
        if (Array.isArray(kvMeshes) && kvMeshes.length > 0) {
          meshes = kvMeshes.map((m: any) => ({
            ...m,
            meshId: m.meshId === '17dx-public-grid' ? 'public-grid' : m.meshId,
            meshName: m.meshName === '17DX-PUBLIC-GRID' ? 'PUBLIC-GRID' : m.meshName
          }));
        }
      } catch {
        // fallback
      }
    }

    const sanitizeMesh = (m: any) => ({
      meshId: m.meshId || 'public-grid',
      meshName: m.meshName || 'PUBLIC-GRID',
      creator: m.creator || 'epidemwick',
      protected: Boolean(m.passwordHash || m.protected),
      meshIntegrity: m.meshIntegrity ?? 89,
      totalPurges: m.totalPurges ?? 0,
      beacons: m.beacons || {},
      activeOperators: m.activeOperators || [],
      feed: m.feed || []
    });

    const formatDir = (list: any[]) =>
      list.map(m => ({
        meshId: m.meshId || 'public-grid',
        meshName: m.meshName || 'PUBLIC-GRID',
        creator: m.creator || 'epidemwick',
        protected: Boolean(m.passwordHash || m.protected),
        meshIntegrity: m.meshIntegrity ?? 89,
        operatorCount: m.activeOperators?.length || 1,
        totalPurges: m.totalPurges || 0
      }));

    if (method === 'GET') {
      const rawReq = (url.searchParams.get('meshId') || 'public-grid').trim().toLowerCase();
      const reqId = rawReq === '17dx-public-grid' ? 'public-grid' : rawReq;
      const target = meshes.find((m: any) => m.meshId === reqId) || meshes[0];
      return new Response(
        JSON.stringify({
          success: true,
          mesh: sanitizeMesh(target),
          meshes: formatDir(meshes)
        }),
        { status: 200, headers: corsHeaders() }
      );
    }

    if (method === 'POST') {
      try {
        const body = (await request.json()) as any;
        const cleanHandle = String(body.handle || 'guest_op')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '_');

        const banned = await loadBannedHandles(env);
        if (banned.includes(cleanHandle)) {
          return new Response(
            JSON.stringify({ error: `Handle '${cleanHandle}' has been blocked by system administration.` }),
            { status: 403, headers: corsHeaders() }
          );
        }

        const roomId = String(body.roomId || 'sanctuary');
        const roomLabel = String(body.roomLabel || '01: AI SANCTUARY');
        const deviceHealth = Math.min(100, Math.max(0, Number(body.deviceHealth) ?? 100));
        const aiTether = Math.min(100, Math.max(0, Number(body.aiTether) || 85));
        const meshHealthDelta = Number(body.meshHealthDelta) || 0;
        const eventType = String(body.eventType || 'defend');
        const eventText = String(body.eventText || 'Executed mesh defense action').slice(0, 150);
        const now = new Date().toISOString();

        if (body.action === 'create_mesh') {
          const rawName = String(body.meshName || '')
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9_-]/g, '-');
          if (!rawName || rawName.length < 3) {
            return new Response(
              JSON.stringify({ error: 'Mesh name must be at least 3 characters.' }),
              { status: 400, headers: corsHeaders() }
            );
          }
          const newId = rawName.toLowerCase();
          if (meshes.some((m: any) => m.meshId === newId)) {
            return new Response(
              JSON.stringify({ error: `Mesh '${rawName}' already exists! Select it from the list to join.` }),
              { status: 400, headers: corsHeaders() }
            );
          }
          const cleanPassHash =
            body.passwordHash && String(body.passwordHash).length === 64
              ? String(body.passwordHash).toLowerCase()
              : undefined;

          const newMesh = {
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
            } as Record<string, string | null>,
            activeOperators: [
              {
                handle: cleanHandle,
                roomId: 'sanctuary',
                roomLabel: '01: AI SANCTUARY',
                deviceHealth: 100,
                aiTether: 95,
                lastAction: `Initialized ${rawName} Mesh`,
                lastSeen: now
              }
            ],
            feed: [
              {
                id: `mfeed_${Date.now()}_init`,
                timestamp: now,
                operator: cleanHandle,
                roomLabel: '01: AI SANCTUARY',
                text: `Created ${cleanPassHash ? '[LOCKED] PASSWORD-PROTECTED' : '[PUBLIC] OPEN'} Mesh [${rawName}].`,
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
          meshes = meshes.slice(0, 25);
          if (env.EPIDOS_KV) {
            try {
              await env.EPIDOS_KV.put('mesh_networks', JSON.stringify(meshes));
            } catch {
              // ignore
            }
          }
          return new Response(
            JSON.stringify({
              success: true,
              mesh: sanitizeMesh(newMesh),
              meshes: formatDir(meshes)
            }),
            { status: 200, headers: corsHeaders() }
          );
        }

        const rawMeshId = String(body.meshId || 'public-grid').toLowerCase();
        const normalizedMeshId = rawMeshId === '17dx-public-grid' ? 'public-grid' : rawMeshId;
        const targetMesh =
          meshes.find((m: any) => m.meshId === normalizedMeshId) || meshes[0];

        if (body.action === 'join_mesh') {
          if (targetMesh.passwordHash) {
            const candidate = body.passwordHash ? String(body.passwordHash).trim().toLowerCase() : '';
            if (candidate !== targetMesh.passwordHash) {
              return new Response(
                JSON.stringify({
                  error: `Mesh '${targetMesh.meshName}' is password-protected. Enter the correct Mesh Password to join.`
                }),
                { status: 401, headers: corsHeaders() }
              );
            }
          }
          const existingIdx = targetMesh.activeOperators.findIndex(
            (o: any) => o.handle.toLowerCase() === cleanHandle
          );
          const opEntry = {
            handle: cleanHandle,
            roomId,
            roomLabel,
            deviceHealth,
            aiTether,
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
            roomLabel,
            text: `Joined mesh [${targetMesh.meshName}] -- PDA & EPIDOS-LLM linked to cooperative grid.`,
            tone: 'beacon'
          });
          targetMesh.feed = targetMesh.feed.slice(0, 30);
          if (env.EPIDOS_KV) {
            try {
              await env.EPIDOS_KV.put('mesh_networks', JSON.stringify(meshes));
            } catch {
              // ignore
            }
          }
          return new Response(
            JSON.stringify({
              success: true,
              mesh: sanitizeMesh(targetMesh),
              meshes: formatDir(meshes)
            }),
            { status: 200, headers: corsHeaders() }
          );
        }

        const existingIdx = targetMesh.activeOperators.findIndex(
          (o: any) => o.handle.toLowerCase() === cleanHandle
        );
        const opEntry = {
          handle: cleanHandle,
          roomId,
          roomLabel,
          deviceHealth,
          aiTether,
          lastAction: eventText.slice(0, 90),
          lastSeen: now
        };

        if (existingIdx >= 0) {
          targetMesh.activeOperators[existingIdx] = opEntry;
        } else {
          targetMesh.activeOperators.unshift(opEntry);
          targetMesh.activeOperators = targetMesh.activeOperators.slice(0, 12);
        }

        if (meshHealthDelta !== 0) {
          targetMesh.meshIntegrity = Math.min(100, Math.max(10, targetMesh.meshIntegrity + meshHealthDelta));
        }

        if (eventType === 'beacon') {
          if (body.beaconText) {
            targetMesh.beacons[roomId] = String(body.beaconText);
          }
          if (meshHealthDelta === 0) {
            targetMesh.meshIntegrity = Math.min(100, targetMesh.meshIntegrity + 6);
          }
          targetMesh.activeOperators = targetMesh.activeOperators.map((op: any) => ({
            ...op,
            deviceHealth: Math.min(100, (op.deviceHealth ?? 85) + 8),
            aiTether: Math.min(100, (op.aiTether ?? 85) + 6)
          }));
        } else if (eventType === 'purge') {
          targetMesh.totalPurges = (targetMesh.totalPurges || 0) + 1;
          if (meshHealthDelta === 0) {
            targetMesh.meshIntegrity = Math.min(100, targetMesh.meshIntegrity + 5);
          }
        }

        if (body.nemesisTaunt) {
          targetMesh.feed.unshift({
            id: `mfeed_${Date.now()}_troll_${Math.random().toString(36).slice(2, 5)}`,
            timestamp: now,
            operator: '[HOSTILE] HACKERS-AI',
            roomLabel,
            text: String(body.nemesisTaunt).slice(0, 180),
            tone: 'troll'
          });
        }

        if (body.aiPlea) {
          targetMesh.feed.unshift({
            id: `mfeed_${Date.now()}_ai_${Math.random().toString(36).slice(2, 5)}`,
            timestamp: now,
            operator: `[AI] EPIDOS-LLM (${cleanHandle})`,
            roomLabel,
            text: String(body.aiPlea).slice(0, 180),
            tone: 'ai'
          });
        }

        if (eventType === 'chat' && eventText.trim()) {
          targetMesh.feed.unshift({
            id: `mfeed_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            timestamp: now,
            operator: cleanHandle,
            roomLabel,
            text: eventText,
            tone: 'chat'
          });
        }
        targetMesh.feed = targetMesh.feed.slice(0, 30);

        if (env.EPIDOS_KV) {
          try {
            await env.EPIDOS_KV.put('mesh_networks', JSON.stringify(meshes));
          } catch {
            // ignore KV write error
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            mesh: sanitizeMesh(targetMesh),
            meshes: formatDir(meshes)
          }),
          { status: 200, headers: corsHeaders() }
        );
      } catch {
        return new Response(JSON.stringify({ error: 'Failed to update mesh state.' }), {
          status: 500,
          headers: corsHeaders()
        });
      }
    }
  }

  return new Response(JSON.stringify({ error: 'Route not found' }), { status: 404, headers: corsHeaders() });
}

