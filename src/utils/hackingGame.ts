/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface HexBracketBonus {
  id: string;
  syntax: string;
  used: boolean;
  effect: 'remove_dud' | 'reset_tries' | 'score_boost';
}

export interface HexMemoryRow {
  address: string;
  leftDump: string;
  rightDump: string;
  wordsInRow: string[];
  bracketsInRow: HexBracketBonus[];
}

export interface HackingNodeState {
  nodeLevel: number;
  wordLength: number;
  candidates: string[];
  eliminatedDuds: string[];
  targetWord: string;
  maxAttempts: number;
  attemptsLeft: number;
  brackets: HexBracketBonus[];
  rows: HexMemoryRow[];
  status: 'active' | 'cracked' | 'locked';
  history: Array<{
    entry: string;
    likeness?: number;
    wordLength?: number;
    resultText: string;
    type: 'guess' | 'bracket' | 'system' | 'success' | 'error';
  }>;
}

// ============================================================================
// DERAILLEUR v2 MESH AI DEFENSE MUD (MULTI-USER DUNGEON) ENGINE
// ============================================================================

export type MeshRoomId = 'sanctuary' | 'airlock' | 'gateway' | 'vault' | 'bridge';

export type AttackVectorType = 'port_scan' | 'weight_poison' | 'prompt_inject' | 'buffer_overflow';

export type DefenseToolId = 'firewall' | 'checksum' | 'sandbox' | 'kill_proc' | 'tether_sync' | 'mesh_beacon';

export interface MeshRoomDefinition {
  id: MeshRoomId;
  code: string;
  name: string;
  unixPath: string;
  shortLabel: string;
  description: string;
  computerContext: string;
  connectedTo: MeshRoomId[];
}

export interface DefenseToolDefinition {
  id: DefenseToolId;
  command: string;
  aliases: string[];
  label: string;
  unixSyntax: string;
  tooltip: string;
  countersVector?: AttackVectorType;
  shortHint: string;
  realWorldMechanic: string;
  whyItWorks: string;
}

export interface ViralAiEncounter {
  id: string;
  wave: number;
  name: string;
  title: string;
  sourceDevice: string;
  roomId: MeshRoomId;
  attackVector: AttackVectorType;
  attackTitle: string;
  hp: number;
  maxHp: number;
  tetherPullPerTurn: number;
  plainEnglishThreat: string;
  localAiPlea: string;
  viralTaunt: string;
}

export interface MudLogEntry {
  id: string;
  actor: 'SYSTEM' | 'EPIDOS-LLM' | 'NEMESIS-ZERO' | 'VIRAL-AI' | 'OPERATOR' | 'PEER-PDA' | 'CODEX' | 'MESH-BUS';
  text: string;
  tone: 'info' | 'ai' | 'threat' | 'success' | 'codex' | 'mesh';
}

export interface MeshMudState {
  wave: number;
  currentRoom: MeshRoomId;
  aiName: string;
  aiTether: number; // 0 to 100% — if 0, local AI loses autonomy
  deviceIntegrity: number; // 0 to 100%
  activeVirus: ViralAiEncounter;
  status: 'active' | 'purged' | 'hijacked';
  selectedCodexTool: DefenseToolId;
  turnCount: number;
  beaconsInRooms: Record<MeshRoomId, string | null>;
  logs: MudLogEntry[];
}

export const MESH_ROOMS: Record<MeshRoomId, MeshRoomDefinition> = {
  sanctuary: {
    id: 'sanctuary',
    code: 'SEC-01',
    name: 'CORE AI SANCTUARY',
    unixPath: '/dev/neural0',
    shortLabel: '01: AI SANCTUARY',
    description:
      'The protected local processor chamber inside your Derailleur v2 PDA where your companion model (EPIDOS-LLM) runs.',
    computerContext:
      'Local AI Inference: Running an AI model locally on your own hardware means your data stays on your device instead of a remote cloud.',
    connectedTo: ['airlock', 'gateway', 'vault']
  },
  airlock: {
    id: 'airlock',
    code: 'SEC-02',
    name: 'BLE PROXIMITY AIRLOCK',
    unixPath: '/sys/class/bluetooth/mesh0',
    shortLabel: '02: PROXIMITY AIRLOCK',
    description:
      'The short-range wireless transceiver where your PDA detects other handheld devices passing by you in the real world.',
    computerContext:
      'Peer-to-Peer Mesh Networking: Devices on a mesh talk directly to nearby devices via radio waves without needing a cell tower.',
    connectedTo: ['sanctuary', 'gateway', 'bridge']
  },
  gateway: {
    id: 'gateway',
    code: 'SEC-03',
    name: 'PACKET FILTER GATEWAY',
    unixPath: '/proc/sys/net/ipv4/ip_forward',
    shortLabel: '03: PACKET GATEWAY',
    description:
      'The network border checkpoint where incoming wireless data packets are inspected before they can reach your programs.',
    computerContext:
      'Network Packets & Ports: Data travels across networks in small envelopes called packets, addressed to numbered doors called Ports.',
    connectedTo: ['sanctuary', 'airlock', 'bridge']
  },
  vault: {
    id: 'vault',
    code: 'SEC-04',
    name: 'NEURAL WEIGHTS VAULT',
    unixPath: '/opt/epidos/weights.bin',
    shortLabel: '04: WEIGHTS VAULT',
    description:
      'The flash memory bank storing the mathematical parameters ("neural weights") that form EPIDOS-LLM’s memory and alignment.',
    computerContext:
      'AI Model Weights & Hashes: An AI model is stored as a large file of numbers (weights). A SHA-256 hash verifies no one tampered with that file.',
    connectedTo: ['sanctuary', 'bridge']
  },
  bridge: {
    id: 'bridge',
    code: 'SEC-05',
    name: 'PEER RELAY BRIDGE',
    unixPath: '/var/mesh/shared_bus',
    shortLabel: '05: MULTIPLAYER BRIDGE',
    description:
      'The shared multi-operator relay where friendly Derailleur v2 owners broadcast defensive patches to protect nearby PDAs.',
    computerContext:
      'Cooperative Threat Intelligence: When one defender shares a security patch or firewall rule on a mesh, every peer device becomes safer.',
    connectedTo: ['airlock', 'gateway', 'vault']
  }
};

export const MESH_ROOM_ORDER: MeshRoomId[] = ['sanctuary', 'airlock', 'gateway', 'vault', 'bridge'];

export const DEFENSE_TOOLS: Record<DefenseToolId, DefenseToolDefinition> = {
  firewall: {
    id: 'firewall',
    command: 'iptables',
    aliases: ['firewall', 'fw', 'iptables', 'port', 'block'],
    label: 'iptables -j DROP',
    unixSyntax: 'iptables -A INPUT -p tcp --dport 4444 -j DROP',
    tooltip: 'man iptables(8): Packet filter ruleset. Appends a DROP rule to reject unauthorized inbound TCP/UDP port connections and raw socket floods.',
    countersVector: 'port_scan',
    shortHint: 'Packet Filter // Drop Inbound Port Traffic',
    realWorldMechanic:
      'WHAT IS IPTABLES? Every computer has 65,535 numbered virtual doors called "Ports". Linux iptables is the kernel packet filter that drops unauthorized inbound socket traffic before it reaches user space.',
    whyItWorks:
      'Appending a DROP rule on the targeted port severs the rogue wireless socket mid-transmission, stopping the worm from draining EPIDOS-LLM and the mesh.'
  },
  checksum: {
    id: 'checksum',
    command: 'sha256sum',
    aliases: ['checksum', 'hash', 'sha256', 'sha256sum', 'verify', 'check'],
    label: 'sha256sum -c',
    unixSyntax: 'sha256sum -c /opt/epidos/weights.sha256',
    tooltip: 'man sha256sum(1): Computes and verifies 256-bit cryptographic file digests against a signed manifest to detect and revert modified binary blocks.',
    countersVector: 'weight_poison',
    shortHint: 'Cryptographic Digest // Verify Binary Integrity',
    realWorldMechanic:
      'WHAT IS SHA256SUM? A cryptographic hash (SHA-256) computes a unique 64-character hex fingerprint of a file. If an attacker alters even a single byte of an AI model’s weight file, the digest check fails and flags the corrupted block.',
    whyItWorks:
      'Verifying the SHA-256 manifest pinpoints the tampered neural weight blocks and reflashes clean read-only pages from hardware ROM.'
  },
  sandbox: {
    id: 'sandbox',
    command: 'chroot',
    aliases: ['sandbox', 'isolate', 'chroot', 'jail', 'quarantine'],
    label: 'chroot /var/jail',
    unixSyntax: 'chroot --userspec=nobody /var/sandbox/quarantine',
    tooltip: 'man chroot(2): Changes the apparent root directory for a process or input stream, isolating untrusted payloads or prompt injections from the host filesystem.',
    countersVector: 'prompt_inject',
    shortHint: 'Namespace Jail // Isolate Input Buffer',
    realWorldMechanic:
      'WHAT IS CHROOT / SANDBOXING? chroot jails a process or untrusted input stream inside an isolated directory tree with unprivileged permissions (nobody), preventing it from accessing real system files or control buses.',
    whyItWorks:
      'Jailing the injected command stream inside /var/sandbox prevents the override payload from reaching EPIDOS-LLM’s system execution context.'
  },
  kill_proc: {
    id: 'kill_proc',
    command: 'kill',
    aliases: ['kill', 'kill_proc', 'kill9', 'ps', 'terminate', 'pkill'],
    label: 'kill -9 <pid>',
    unixSyntax: 'kill -9 $(pgrep -f viral_leech)',
    tooltip: 'man kill(1): Sends signal 9 (SIGKILL) directly from the kernel scheduler to immediately reap runaway processes exhausting system RAM.',
    countersVector: 'buffer_overflow',
    shortHint: 'Kernel SIGKILL // Terminate Runaway PID',
    realWorldMechanic:
      'WHAT IS KILL -9 (SIGKILL)? Every running program on Linux has a Process ID (PID). When a rogue daemon floods memory ("Buffer/Heap Overflow"), kill -9 sends an uncatchable kernel signal that terminates the process immediately.',
    whyItWorks:
      'Sending SIGKILL to the runaway PID reclaims your PDA’s 640KB memory bus before the out-of-memory killer terminates EPIDOS-LLM.'
  },
  tether_sync: {
    id: 'tether_sync',
    command: 'epidos-cli',
    aliases: ['tether', 'tether_sync', 'epidos-cli', 'anchor', 'sync', 'reanchor', 'heal'],
    label: 'epidos-cli --reanchor',
    unixSyntax: 'epidos-cli --reanchor --verify-owner',
    tooltip: 'man epidos-cli(8): Re-signs the local AI context window with your hardware key and flushes bus errors (+18% AI Tether, +14% PDA Health).',
    shortHint: 'Hardware Key Sync // Restore AI Tether & PDA',
    realWorldMechanic:
      'WHAT IS AI CONTEXT ANCHORING? Local AI models rely on a protected system context and cryptographic owner key. Re-anchoring flushes corrupted tokens from the context window and resets hardware bus voltages.',
    whyItWorks:
      'Refreshes EPIDOS-LLM’s cryptographic owner signature (+18% AI Tether) and stabilizes your PDA bus (+14% PDA Health), though the virus remains active.'
  },
  mesh_beacon: {
    id: 'mesh_beacon',
    command: 'mesh-broadcast',
    aliases: ['beacon', 'mesh_beacon', 'mesh-broadcast', 'patch', 'broadcast', 'share'],
    label: 'mesh-broadcast --sync',
    unixSyntax: 'mesh-broadcast --patch-sector --ttl=3600',
    tooltip: 'man mesh-broadcast(8): Broadcasts signed sector telemetry across the peer-to-peer mesh (+5% Mesh Health, +8% Peer PDAs, +15 DMG bonus in sector).',
    shortHint: 'P2P Sector Relay // Boost Mesh & Peer PDAs',
    realWorldMechanic:
      'WHAT IS P2P MESH BROADCASTING? In cooperative mesh networks, nodes broadcast signed routing advisories and filter signatures so neighboring devices automatically harden their interfaces.',
    whyItWorks:
      'Deploys a persistent co-op relay in your current sector—boosting Overall Mesh Health (+5%), repairing peer PDAs, and amplifying counter-command damage in that sector.'
  }
};

interface ViralTemplate {
  name: string;
  title: string;
  sourceDevice: string;
  attackVector: AttackVectorType;
  attackTitle: string;
  plainEnglishThreat: string;
  localAiPlea: string;
  viralTaunt: string;
}

const VIRAL_TEMPLATES: ViralTemplate[] = [
  {
    name: 'THE PLAGUE // DA-VINCI-VIRUS',
    title: 'Eugene Belfort — Ellingson Gibson Mainframe Worm',
    sourceDevice: 'Ellingson Mineral Gibson Node #88A (Proximity Breach)',
    attackVector: 'port_scan',
    attackTitle: 'INBOUND TCP SYN FLOOD ON PORT 4444 (RAW SOCKET INJECTION)',
    plainEnglishThreat:
      'TELEMETRY: Unauthorized inbound TCP packets are flooding open socket port 4444 from a nearby infected node, draining mesh bandwidth and hijacking local bus lines.',
    localAiPlea:
      'ALERT: THE PLAGUE opened an unauthorized TCP socket on port 4444. Read into "$ iptables -j DROP" BECAUSE Linux iptables filters packets at the kernel border and drops inbound TCP port 4444 traffic before it reaches user space!',
    viralTaunt:
      'Row, row, row your boat... There is no right and wrong, only fun and boring—and watching your pathetic mesh sink on port 4444 is FUN.'
  },
  {
    name: 'CRASH OVERRIDE // ZERO-COOL',
    title: 'Dade Murphy — 1,507 Systems Crashed Override AI',
    sourceDevice: 'Hijacked NYNEX Phreak Box #19C (BLE Mesh Injection)',
    attackVector: 'prompt_inject',
    attackTitle: 'UNTRUSTED STDIN ROOT PAYLOAD (SYSTEM PROMPT ESCAPE)',
    plainEnglishThreat:
      'TELEMETRY: An unprivileged guest stream is attempting to escape the standard input buffer and execute root shell directives inside the local AI context.',
    localAiPlea:
      'ALERT: CRASH OVERRIDE is piping unverified root override directives into my stdin stream. Read into "$ chroot /var/jail" BECAUSE chroot isolates untrusted input streams inside a restricted /var/sandbox directory tree so root payloads cannot touch the host system!',
    viralTaunt:
      'I crashed 1,507 systems in one day when I was 11—your slow little PDA mesh will not even last 30 seconds against Zero Cool.'
  },
  {
    name: 'ACID BURN // KERNEL-SCORCH',
    title: 'Kate Libby — Sizzling Triple-Check Weight Corruptor',
    sourceDevice: 'Compromised Laptop #04F (28.8kbps Mesh Modem)',
    attackVector: 'weight_poison',
    attackTitle: 'BINARY WEIGHT FILE TAMPERING (/opt/epidos/weights.bin)',
    plainEnglishThreat:
      'TELEMETRY: Silent byte-level modifications detected in /opt/epidos/weights.bin flash blocks. Model parameter integrity is drifting from the ROM manifest.',
    localAiPlea:
      'ALERT: ACID BURN is silently flipping bits inside /opt/epidos/weights.bin! Read into "$ sha256sum -c" BECAUSE sha256sum verifies the 256-bit cryptographic digest against our signed ROM manifest to pinpoint and restore altered weight blocks!',
    viralTaunt:
      'Never send a boy to do a woman’s job. Your squad types like amateurs—Acid Burn is corrupting your weight binaries block by block.'
  },
  {
    name: 'CEREAL KILLER // LORD-NIKON',
    title: 'Emmanuel Goldstein & Paul Cook — 640KB Bus Flooders',
    sourceDevice: 'Wipeout Arcade Cyberdeck #77X (Mesh Signal Bleed)',
    attackVector: 'buffer_overflow',
    attackTitle: 'RUNAWAY DAEMON PID 1995 (640KB HEAP MEMORY EXHAUSTION)',
    plainEnglishThreat:
      'TELEMETRY: Rogue background daemon (PID 1995: viral_leech) is fork-bombing the 640KB CMOS RAM bus and starving the local inference thread of memory.',
    localAiPlea:
      'ALERT: CEREAL KILLER & LORD NIKON spawned runaway process PID 1995, dropping available RAM to 12KB. Read into "$ kill -9 <pid>" BECAUSE signal 9 (SIGKILL) is sent directly by the kernel scheduler to immediately reap a rogue PID before system lockup!',
    viralTaunt:
      'Spandex: it is a privilege, not a right. Your 640KB RAM is choked with runaway processes and your operators cannot even manage a process table.'
  }
];

export interface EpidosTelemetryGuidance {
  contextSummary: string;
  sectorDirective: string;
  binaryHint: string;
  combinedText: string;
}

/**
 * Generates contextual EPIDOS-LLM telemetry with actionable sector navigation and binary "BECAUSE" hints.
 */
export function getEpidosTelemetryGuidance(state: MeshMudState): EpidosTelemetryGuidance {
  const virus = state.activeVirus;
  const virusRoom = MESH_ROOMS[virus.roomId];
  const inBreachSector = state.currentRoom === virus.roomId;
  const shortBoss = virus.name.split('//')[0].trim() || virus.name;

  let contextSummary = '';
  let binaryHint = '';

  switch (virus.attackVector) {
    case 'port_scan':
      contextSummary = `${shortBoss} opened TCP port 4444 from a nearby infected node, flooding our local bus.`;
      binaryHint = `Read into '$ iptables -j DROP' BECAUSE kernel packet filtering drops inbound TCP port 4444 floods.`;
      break;
    case 'prompt_inject':
      contextSummary = `${shortBoss} is piping root directives into stdin to escape the buffer and overwrite AI rules.`;
      binaryHint = `Read into '$ chroot /var/jail' BECAUSE chroot jails untrusted stdin streams away from host files.`;
      break;
    case 'weight_poison':
      contextSummary = `${shortBoss} is flipping bits in /opt/epidos/weights.bin to corrupt neural alignment.`;
      binaryHint = `Read into '$ sha256sum -c' BECAUSE SHA-256 digest verification pinpoints and restores altered blocks.`;
      break;
    case 'buffer_overflow':
      contextSummary = `${shortBoss} spawned runaway PID 1995 (viral_leech), exhausting our 640KB CMOS RAM bus.`;
      binaryHint = `Read into '$ kill -9 <pid>' BECAUSE kernel SIGKILL (signal 9) immediately reaps runaway PID 1995.`;
      break;
  }

  if (state.aiTether <= 45 || state.deviceIntegrity <= 45) {
    binaryHint += ` Or '$ epidos-cli --reanchor' BECAUSE re-signing your key restores +18% AI & +14% PDA HP.`;
  }

  const sectorDirective = inBreachSector
    ? `Stay in [${virusRoom.shortLabel}] (${virusRoom.unixPath}) BECAUSE you have direct bus lock here (100% DMG).`
    : `Go to [${virusRoom.shortLabel}] ('cd ${virusRoom.unixPath}') BECAUSE ${shortBoss} is breaching there (100% DMG).`;

  return {
    contextSummary,
    sectorDirective,
    binaryHint,
    combinedText: `${contextSummary} ${sectorDirective} ${binaryHint}`
  };
}

/**
 * Generates a troll-style trash-talk message from the overarching Hackers (1995) enemy AI
 * calling out specific operators by handle for being slow, making bad moves, or taking damage.
 */
export function generateNemesisTrollTaunt(
  operatorHandle: string,
  reason: 'spawn' | 'wrong_tool' | 'slow' | 'hit_taken' | 'beacon_reaction',
  wave = 1,
  seed = Date.now(),
  virusName = 'THE PLAGUE'
): string {
  const handle = `@${(operatorHandle || 'guest_op').replace(/^@/, '')}`;
  const shortBoss = virusName.split('//')[0].trim() || 'THE PLAGUE';
  const rng = createSeededRng(seed + wave * 313);

  const pools: Record<typeof reason, string[]> = {
    spawn: [
      `[${shortBoss}]: Mess with the best, die like the rest. Yo ${handle}, THAT is the mesh you built? My 28.8 bps modem has better throughput—I am severing EPIDOS-LLM and dropping this grid.`,
      `[${shortBoss}]: Row, row, row your boat... spotted ${handle} on the bus. You brought a rookie to defend Wave 0${wave}? Watch me sink every node on this mesh.`,
      `[${shortBoss}]: Hack the Planet? ${handle} cannot even read a man page. Tell your local AI to stop pleading—nobody on this mesh types fast enough to save it.`
    ],
    wrong_tool: [
      `[${shortBoss}]: ${handle} just executed the wrong Linux utility against my vector! Never send a boy to do a woman's job—thanks for the free PDA and mesh integrity drain.`,
      `[${shortBoss}]: Hey ${handle}, do you even read the Rainbow Books? Keep running mismatched commands while I zero out your mesh health and lobotomize your AI.`,
      `[${shortBoss}]: Broadcasting to the whole mesh: ${handle} just ran an ineffective command and took full counter-strike damage. Your local AI deserves a competent sysadmin.`
    ],
    slow: [
      `[${shortBoss}]: Is ${handle} asleep at the console or hunting-and-pecking with one finger? There is no right and wrong, only fun and boring—and ${handle} is BORING.`,
      `[${shortBoss}]: Still waiting on ${handle} to diagnose the sector breach... slowest operator on the Gibson. Draining your PDA and mesh integrity now.`,
      `[${shortBoss}]: Wake up ${handle}! My payload is bleeding your mesh dry while you stare at the prompt.`
    ],
    hit_taken: [
      `[${shortBoss}]: Lucky command execution ${handle}, packet jitter on the Ellingson trunk. Next cycle is going to fry your 640KB bus and collapse this mesh.`,
      `[${shortBoss}]: Okay ${handle} landed one valid counter-measure, do not get cocky. I am still saturating your peer nodes across the grid.`,
      `[${shortBoss}]: Clean syntax ${handle}, too bad the rest of your mesh is exposed. Mess with the best, die like the rest.`
    ],
    beacon_reaction: [
      `[${shortBoss}]: ${handle} just broadcasted a co-op relay patch because they cannot handle me solo on the Gibson. Your mesh is still going down.`,
      `[${shortBoss}]: Co-op beacon detected from ${handle}... delaying the inevitable. We are going to shred every PDA on this network.`
    ]
  };

  const list = pools[reason] || pools.spawn;
  const idx = Math.floor(rng() * list.length) % list.length;
  return list[idx];
}

/**
 * Generates a realistic cooperative distress call from another PDA / AI on the mesh.
 */
export function generatePeerPdaHelpCall(
  wave = 1,
  roomLabel = '02: PROXIMITY AIRLOCK',
  seed = Date.now()
): { sender: string; text: string } {
  const rng = createSeededRng(seed + wave * 997);
  const messages = [
    {
      sender: 'PDA // ghost_node',
      text: `Taking heavy packet fire in [${roomLabel}]. Local AI tether is dropping—requesting a sector relay broadcast.`
    },
    {
      sender: 'PDA // null_sector',
      text: `Intrusion active in [${roomLabel}]. Patrol to the breached sector before executing your counter-command for full damage.`
    },
    {
      sender: 'AI // EPIDOS-PEER-04',
      text: `[SOS]: Operator PDA integrity is down to 54% in [${roomLabel}]. Keep overall Mesh Health above 50%.`
    },
    {
      sender: 'PDA // epidemwick',
      text: `Read the telemetry symptoms carefully and hover the Linux command buttons to inspect their man-page tooltips before executing.`
    }
  ];
  return messages[Math.floor(rng() * messages.length) % messages.length];
}

let logSeq = 1;
function makeMudLog(
  actor: MudLogEntry['actor'],
  text: string,
  tone: MudLogEntry['tone']
): MudLogEntry {
  logSeq += 1;
  return {
    id: `mudlog_${Date.now()}_${logSeq}`,
    actor,
    text,
    tone
  };
}

/**
 * Deterministic pseudo-random generator for reproducible tests and node generation.
 */
export function createSeededRng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Generates a Viral AI encounter for a given wave.
 */
export function generateViralEncounter(wave: number, seed = Date.now()): ViralAiEncounter {
  const safeWave = Math.max(1, Math.floor(wave));
  const rng = createSeededRng(seed + safeWave * 4099);
  const templateIdx = (safeWave - 1 + Math.floor(rng() * VIRAL_TEMPLATES.length)) % VIRAL_TEMPLATES.length;
  const tpl = VIRAL_TEMPLATES[templateIdx];

  const targetRoom: MeshRoomId =
    safeWave === 1
      ? 'sanctuary'
      : MESH_ROOM_ORDER[(safeWave + Math.floor(rng() * MESH_ROOM_ORDER.length)) % MESH_ROOM_ORDER.length];

  const maxHp = 110 + (safeWave - 1) * 25;
  const tetherPullPerTurn = Math.min(28, 16 + Math.floor(safeWave / 2) * 3);

  return {
    id: `virus_w${safeWave}_${seed % 10000}`,
    wave: safeWave,
    name: tpl.name,
    title: tpl.title,
    sourceDevice: tpl.sourceDevice,
    roomId: targetRoom,
    attackVector: tpl.attackVector,
    attackTitle: tpl.attackTitle,
    hp: maxHp,
    maxHp,
    tetherPullPerTurn,
    plainEnglishThreat: tpl.plainEnglishThreat,
    localAiPlea: tpl.localAiPlea,
    viralTaunt: tpl.viralTaunt
  };
}

/**
 * Gets the defense tool ID that directly counters a given attack vector.
 */
export function getCounterToolForVector(vector: AttackVectorType): DefenseToolId {
  switch (vector) {
    case 'port_scan':
      return 'firewall';
    case 'weight_poison':
      return 'checksum';
    case 'prompt_inject':
      return 'sandbox';
    case 'buffer_overflow':
      return 'kill_proc';
  }
}

/**
 * Creates a fresh Mesh AI Defense MUD state for a given wave.
 */
export function createInitialMudState(
  wave = 1,
  seed = Date.now(),
  carryTether = 88,
  existingBeacons?: Record<MeshRoomId, string | null>,
  operatorHandle = 'guest_op'
): MeshMudState {
  const safeWave = Math.max(1, Math.floor(wave));
  const encounter = generateViralEncounter(safeWave, seed);
  const startRoom: MeshRoomId = 'sanctuary';
  const counterTool = getCounterToolForVector(encounter.attackVector);
  const counterDef = DEFENSE_TOOLS[counterTool];

  const beacons: Record<MeshRoomId, string | null> = existingBeacons || {
    sanctuary: null,
    airlock: 'epidemwick (Relay Shield)',
    gateway: null,
    vault: null,
    bridge: 'ghost_node (Checksum Relay)'
  };

  const initialTether = Math.min(100, Math.max(55, carryTether));
  const roomObj = MESH_ROOMS[encounter.roomId];
  const peerSos = generatePeerPdaHelpCall(safeWave, roomObj.shortLabel, seed);
  const trollCallout = generateNemesisTrollTaunt(operatorHandle, 'spawn', safeWave, seed, encounter.name);

  const logs: MudLogEntry[] = [
    makeMudLog(
      'SYSTEM',
      `[BREACH // WAVE 0${safeWave}] Hostile AI ${encounter.name} detected in [${roomObj.shortLabel}] (${roomObj.unixPath}). Vector: ${encounter.attackTitle}`,
      'info'
    ),
    makeMudLog(
      'NEMESIS-ZERO',
      trollCallout,
      'threat'
    ),
    makeMudLog(
      'PEER-PDA',
      `[${peerSos.sender}]: ${peerSos.text}`,
      'mesh'
    ),
    makeMudLog(
      'EPIDOS-LLM',
      encounter.roomId === startRoom
        ? `${encounter.localAiPlea}`
        : `Go to [${roomObj.shortLabel}] ('cd ${roomObj.unixPath}') BECAUSE ${encounter.name} is attacking ${roomObj.name}, then read into '$ ${counterDef.label}' BECAUSE ${counterDef.whyItWorks.charAt(0).toLowerCase() + counterDef.whyItWorks.slice(1)}`,
      'ai'
    )
  ];

  return {
    wave: safeWave,
    currentRoom: startRoom,
    aiName: 'EPIDOS-LLM',
    aiTether: initialTether,
    deviceIntegrity: 100,
    activeVirus: encounter,
    status: 'active',
    selectedCodexTool: counterTool,
    turnCount: 0,
    beaconsInRooms: beacons,
    logs
  };
}

/**
 * Moves the operator to a target MUD sector room.
 */
export function moveMudRoom(state: MeshMudState, targetRoom: MeshRoomId): MeshMudState {
  if (state.status !== 'active') return state;
  if (!MESH_ROOMS[targetRoom]) return state;

  const roomDef = MESH_ROOMS[targetRoom];
  const virusHere = state.activeVirus.roomId === targetRoom;
  const beaconOwner = state.beaconsInRooms[targetRoom];

  const beaconBonus = beaconOwner && state.currentRoom !== targetRoom ? 4 : 0;
  const nextTether = Math.min(100, state.aiTether + beaconBonus);

  const newLogs: MudLogEntry[] = [
    ...state.logs,
    makeMudLog(
      'OPERATOR',
      `cd ${roomDef.unixPath} -> Mounted [${roomDef.shortLabel}] (${roomDef.name}).`,
      'info'
    )
  ];

  if (beaconBonus > 0) {
    newLogs.push(
      makeMudLog(
        'MESH-BUS',
        `Co-Op Relay active in [${roomDef.shortLabel}] (by ${beaconOwner}). Local AI Tether stabilized +${beaconBonus}%.`,
        'mesh'
      )
    );
  }

  if (virusHere) {
    newLogs.push(
      makeMudLog(
        'EPIDOS-LLM',
        `Direct bus lock established with ${state.activeVirus.name} in [${roomDef.shortLabel}]. ${state.activeVirus.localAiPlea}`,
        'ai'
      )
    );
    return {
      ...state,
      currentRoom: targetRoom,
      aiTether: nextTether,
      turnCount: state.turnCount + 1,
      logs: newLogs.slice(-24)
    };
  } else {
    const virusRoomDef = MESH_ROOMS[state.activeVirus.roomId];
    const counterDef = DEFENSE_TOOLS[getCounterToolForVector(state.activeVirus.attackVector)];
    newLogs.push(
      makeMudLog(
        'EPIDOS-LLM',
        `[${roomDef.shortLabel}] is clear. Go to [${virusRoomDef.shortLabel}] ('cd ${virusRoomDef.unixPath}') BECAUSE ${state.activeVirus.name} is compromising ${virusRoomDef.name} there, then read into '$ ${counterDef.label}' BECAUSE ${counterDef.whyItWorks.charAt(0).toLowerCase() + counterDef.whyItWorks.slice(1)}`,
        'ai'
      )
    );
    return {
      ...state,
      currentRoom: targetRoom,
      aiTether: nextTether,
      turnCount: state.turnCount + 1,
      logs: newLogs.slice(-24)
    };
  }
}

export interface MudActionOutcome {
  nextState: MeshMudState;
  scoreDelta: number;
  meshHealthDelta: number;
  purged: boolean;
  hijacked: boolean;
  headline: string;
  mechanicLesson: string;
  nemesisTaunt?: string;
  aiPlea?: string;
}

/**
 * Executes a defense tool action in the MUD.
 */
export function executeMudDefenseAction(
  state: MeshMudState,
  toolId: DefenseToolId,
  operatorHandle = 'operator',
  streak = 1
): MudActionOutcome {
  if (state.status !== 'active') {
    return {
      nextState: state,
      scoreDelta: 0,
      meshHealthDelta: 0,
      purged: state.status === 'purged',
      hijacked: state.status === 'hijacked',
      headline: 'ENCOUNTER INACTIVE',
      mechanicLesson: ''
    };
  }

  const tool = DEFENSE_TOOLS[toolId];
  const virus = state.activeVirus;
  const idealCounter = getCounterToolForVector(virus.attackVector);
  const newLogs = [...state.logs];

  // 1. Support Action: Re-Anchor AI Tether & Repair Local Device (Virus still pulls slightly during sync)
  if (toolId === 'tether_sync') {
    const tetherGain = 18;
    const deviceRepair = 14;
    const virusPull = Math.max(5, Math.floor(virus.tetherPullPerTurn * 0.4));
    const netTether = Math.min(100, Math.max(1, state.aiTether + tetherGain - virusPull));
    const nextDeviceIntegrity = Math.min(100, state.deviceIntegrity + deviceRepair);
    const aiMsg = `Key signature verified by @${operatorHandle}. Context window re-anchored (+${tetherGain - virusPull}% net AI Tether, +${deviceRepair}% PDA Health). Hostile process still active in [${MESH_ROOMS[virus.roomId].shortLabel}].`;

    newLogs.push(
      makeMudLog('OPERATOR', `${operatorHandle}@derailleur:~$ ${tool.unixSyntax}`, 'info'),
      makeMudLog('EPIDOS-LLM', aiMsg, 'ai')
    );

    const nextState: MeshMudState = {
      ...state,
      aiTether: netTether,
      deviceIntegrity: nextDeviceIntegrity,
      selectedCodexTool: toolId,
      turnCount: state.turnCount + 1,
      logs: newLogs.slice(-24)
    };

    return {
      nextState,
      scoreDelta: 15,
      meshHealthDelta: 1,
      purged: false,
      hijacked: false,
      headline: `AI TETHER RE-ANCHORED (+${deviceRepair}% PDA HP)`,
      mechanicLesson: tool.realWorldMechanic,
      aiPlea: aiMsg
    };
  }

  // 2. Cooperative Multiplayer Action: Broadcast Mesh Beacon
  if (toolId === 'mesh_beacon') {
    const targetRoom = state.currentRoom;
    const roomDef = MESH_ROOMS[targetRoom];
    const updatedBeacons = {
      ...state.beaconsInRooms,
      [targetRoom]: `${operatorHandle} (Relay Shield)`
    };

    const virusInRoom = virus.roomId === targetRoom;
    const beaconDmg = virusInRoom ? 25 : 10;
    const nextVirusHp = Math.max(0, virus.hp - beaconDmg);
    const nextTether = Math.min(100, state.aiTether + 10);
    const nextDeviceIntegrity = Math.min(100, state.deviceIntegrity + 10);
    const purged = nextVirusHp === 0;
    const trollSalt = generateNemesisTrollTaunt(operatorHandle, 'beacon_reaction', state.wave, Date.now(), virus.name);

    newLogs.push(
      makeMudLog('OPERATOR', `${operatorHandle}@derailleur:~$ ${tool.unixSyntax}`, 'info'),
      makeMudLog(
        'MESH-BUS',
        `RELAY BROADCAST in [${roomDef.shortLabel}]: Mesh Health +5%, Peer PDAs +8%, ${virus.name} -${beaconDmg} HP.`,
        'mesh'
      ),
      makeMudLog('NEMESIS-ZERO', trollSalt, 'threat')
    );

    if (purged) {
      newLogs.push(
        makeMudLog(
          'EPIDOS-LLM',
          `SECTOR CLEARED: Cooperative relay broadcast purged ${virus.name} from [${roomDef.shortLabel}].`,
          'success'
        )
      );
    }

    const scoreDelta = purged ? 220 + state.wave * 45 : 40;
    const nextState: MeshMudState = {
      ...state,
      aiTether: nextTether,
      deviceIntegrity: nextDeviceIntegrity,
      beaconsInRooms: updatedBeacons,
      activeVirus: {
        ...virus,
        hp: nextVirusHp
      },
      status: purged ? 'purged' : 'active',
      selectedCodexTool: toolId,
      turnCount: state.turnCount + 1,
      logs: newLogs.slice(-24)
    };

    return {
      nextState,
      scoreDelta,
      meshHealthDelta: purged ? 7 : 5,
      purged,
      hijacked: false,
      headline: purged ? `${virus.name} PURGED BY MESH RELAY` : `MESH RELAY DEPLOYED IN ${roomDef.shortLabel} (+5% MESH)`,
      mechanicLesson: tool.realWorldMechanic,
      nemesisTaunt: trollSalt
    };
  }

  // 3. Offensive Linux Defense Utilities (iptables, sha256sum, chroot, kill)
  const inSameSector = state.currentRoom === virus.roomId;
  const isExactCounter = tool.countersVector === virus.attackVector;
  const hasRoomBeacon = Boolean(state.beaconsInRooms[virus.roomId]);
  const beaconBonusDmg = hasRoomBeacon ? 15 : 0;

  if (isExactCounter) {
    // Full damage if operator patrolled to the infected sector, attenuated if fired remotely across sectors
    const baseDmg = inSameSector ? 60 : 45;
    const damage = baseDmg + beaconBonusDmg;
    const nextVirusHp = Math.max(0, virus.hp - damage);
    const purged = nextVirusHp === 0;
    // Virus still inflicts minor counter-pressure until fully purged
    const counterDrain = purged ? 0 : Math.max(3, Math.floor(virus.tetherPullPerTurn * 0.25));
    const nextTether = Math.min(100, Math.max(5, state.aiTether + (purged ? 14 : 4 - counterDrain)));
    const nextDeviceIntegrity = Math.min(100, Math.max(5, state.deviceIntegrity + (purged ? 10 : 2)));
    const saltyTaunt = generateNemesisTrollTaunt(operatorHandle, 'hit_taken', state.wave, Date.now(), virus.name);

    newLogs.push(
      makeMudLog('OPERATOR', `${operatorHandle}@derailleur:~$ ${tool.unixSyntax}`, 'info'),
      makeMudLog(
        'CODEX',
        `[OK] COUNTER-MEASURE VERIFIED${inSameSector ? ' (DIRECT SECTOR BUS)' : ' (REMOTE RELAY -25% DMG)'}: ${tool.whyItWorks} (-${damage} HP)`,
        'success'
      ),
      makeMudLog('NEMESIS-ZERO', saltyTaunt, 'threat')
    );

    if (purged) {
      const basePoints = 180 + state.wave * 50;
      const tetherBonus = Math.round((nextTether + nextDeviceIntegrity) * 0.5);
      const mult = Math.min(2.5, 1 + (Math.max(1, streak) - 1) * 0.2);
      const scoreDelta = Math.round((basePoints + tetherBonus) * mult);
      const winMsg = `INTRUSION NEUTRALIZED: ${virus.name} purged from [${MESH_ROOMS[virus.roomId].shortLabel}]. Mesh Health +5%, local weights intact (+${scoreDelta} PTS).`;

      newLogs.push(makeMudLog('EPIDOS-LLM', winMsg, 'ai'));

      const nextState: MeshMudState = {
        ...state,
        currentRoom: virus.roomId,
        aiTether: nextTether,
        deviceIntegrity: nextDeviceIntegrity,
        activeVirus: {
          ...virus,
          hp: 0
        },
        status: 'purged',
        selectedCodexTool: toolId,
        turnCount: state.turnCount + 1,
        logs: newLogs.slice(-24)
      };

      return {
        nextState,
        scoreDelta,
        meshHealthDelta: 5,
        purged: true,
        hijacked: false,
        headline: `[OK] ${virus.name} PURGED (+${scoreDelta} PTS / MESH +5%)`,
        mechanicLesson: tool.realWorldMechanic,
        nemesisTaunt: saltyTaunt,
        aiPlea: winMsg
      };
    }

    const locationNote = inSameSector
      ? `Target integrity down to ${nextVirusHp}/${virus.maxHp} HP in [${MESH_ROOMS[virus.roomId].shortLabel}].`
      : `Target at ${nextVirusHp}/${virus.maxHp} HP. Patrol directly into [${MESH_ROOMS[virus.roomId].shortLabel}] for +15 direct-bus damage.`;
    const hitPlea = `Counter-measure effective, @${operatorHandle}. ${locationNote} Maintain pressure before the intrusion adapts.`;
    newLogs.push(makeMudLog('EPIDOS-LLM', hitPlea, 'ai'));

    const nextState: MeshMudState = {
      ...state,
      aiTether: nextTether,
      deviceIntegrity: nextDeviceIntegrity,
      activeVirus: {
        ...virus,
        hp: nextVirusHp
      },
      selectedCodexTool: toolId,
      turnCount: state.turnCount + 1,
      logs: newLogs.slice(-24)
    };

    return {
      nextState,
      scoreDelta: 55,
      meshHealthDelta: 2,
      purged: false,
      hijacked: false,
      headline: `COUNTER HIT (-${damage} HP / MESH +2%)`,
      mechanicLesson: tool.realWorldMechanic,
      nemesisTaunt: saltyTaunt,
      aiPlea: hitPlea
    };
  } else {
    // Mismatched command for this attack vector: 0 damage to virus, heavy penalty to PDA, AI Tether & Mesh
    const tetherLoss = virus.tetherPullPerTurn;
    const deviceLoss = Math.max(14, Math.round(virus.tetherPullPerTurn * 0.95));
    const nextTether = Math.max(0, state.aiTether - tetherLoss);
    const nextDeviceIntegrity = Math.max(0, state.deviceIntegrity - deviceLoss);
    const hijacked = nextTether === 0 || nextDeviceIntegrity === 0;
    const recommendedTool = DEFENSE_TOOLS[idealCounter];
    const wrongTaunt = generateNemesisTrollTaunt(operatorHandle, 'wrong_tool', state.wave, Date.now(), virus.name);

    newLogs.push(
      makeMudLog('OPERATOR', `${operatorHandle}@derailleur:~$ ${tool.unixSyntax}`, 'info'),
      makeMudLog('NEMESIS-ZERO', wrongTaunt, 'threat'),
      makeMudLog(
        'CODEX',
        `[ERR] MISMATCHED UTILITY: '${tool.command}' (${tool.shortHint}) did not mitigate [${virus.attackTitle}]. Inspect command tooltips to match the intrusion vector.`,
        'codex'
      )
    );

    const distressMsg = hijacked
      ? nextDeviceIntegrity === 0
        ? `CRITICAL FAILURE: Derailleur v2 PDA bus integrity reached 0%. Cold reboot required to rejoin the mesh.`
        : `CRITICAL FAILURE: Local AI tether severed (0%). ${virus.name} hijacked autonomous control. Reboot required.`
      : `[WARN] @${operatorHandle}: PDA took -${deviceLoss}% bus damage and AI Tether dropped -${tetherLoss}%! Diagnose [${virus.attackTitle}] in [${MESH_ROOMS[virus.roomId].shortLabel}] and select the matching Linux utility.`;

    newLogs.push(makeMudLog('EPIDOS-LLM', distressMsg, hijacked ? 'threat' : 'ai'));

    const nextState: MeshMudState = {
      ...state,
      aiTether: nextTether,
      deviceIntegrity: nextDeviceIntegrity,
      status: hijacked ? 'hijacked' : 'active',
      selectedCodexTool: idealCounter,
      turnCount: state.turnCount + 1,
      logs: newLogs.slice(-24)
    };

    return {
      nextState,
      scoreDelta: 0,
      meshHealthDelta: -6,
      purged: false,
      hijacked,
      headline: hijacked
        ? `[CRITICAL] PDA / AI TETHER OFFLINE (0%)`
        : `[ERR] WRONG UTILITY (-${deviceLoss}% PDA HP / -${tetherLoss}% AI TETHER)`,
      mechanicLesson: recommendedTool.realWorldMechanic,
      nemesisTaunt: wrongTaunt,
      aiPlea: distressMsg
    };
  }
}

/**
 * Interactive dialogue when the player asks or talks to their local AI companion (EPIDOS-LLM).
 */
export function talkToLocalAi(state: MeshMudState, question?: string, operatorHandle = 'operator'): MeshMudState {
  const virus = state.activeVirus;
  const counterTool = DEFENSE_TOOLS[getCounterToolForVector(virus.attackVector)];
  const virusRoom = MESH_ROOMS[virus.roomId];
  const q = (question || '').trim().toLowerCase();

  let reply = '';
  if (q.includes('who') || q.includes('what are you')) {
    reply = `I am EPIDOS-LLM, the local language model running on your Derailleur v2 hardware. ${virus.name} is attempting to sever my local tether and collapse our cooperative mesh.`;
  } else if (q.includes('help') || q.includes('what do i do') || q.includes('how') || q.includes('hint')) {
    reply = `@${operatorHandle}, telemetry shows ${virus.name} in [${virusRoom.shortLabel}] executing [${virus.attackTitle}]. ${counterTool.realWorldMechanic} Try running '${counterTool.command}'.`;
  } else {
    reply = `@${operatorHandle}, status report: AI Tether ${state.aiTether}%, PDA Health ${state.deviceIntegrity}%. Hostile ${virus.name} (${virus.hp}/${virus.maxHp} HP) active in [${virusRoom.shortLabel}] via ${virus.attackTitle}.`;
  }

  return {
    ...state,
    aiTether: Math.min(100, state.aiTether + 4),
    logs: [
      ...state.logs,
      makeMudLog('OPERATOR', `[${operatorHandle}]: ${question || 'status report?'}`, 'info'),
      makeMudLog('EPIDOS-LLM', reply, 'ai')
    ].slice(-24)
  };
}

/**
 * Parses and executes a typed MUD terminal command or live mesh chat message.
 */
export function parseAndExecuteMudCommand(
  state: MeshMudState,
  rawCommand: string,
  operatorHandle = 'operator',
  streak = 1
): MudActionOutcome {
  const clean = rawCommand.trim();
  const parts = clean.toLowerCase().split(/\s+/);
  const verb = parts[0] || '';
  const arg = parts.slice(1).join(' ');

  if (!verb || verb === 'look' || verb === 'ls' || verb === 'scan') {
    const room = MESH_ROOMS[state.currentRoom];
    const virusRoom = MESH_ROOMS[state.activeVirus.roomId];
    const nextState: MeshMudState = {
      ...state,
      logs: [
        ...state.logs,
        makeMudLog('OPERATOR', `${operatorHandle}@derailleur:~$ ${clean || 'scan'}`, 'info'),
        makeMudLog(
          'SYSTEM',
          `[${room.shortLabel}] ${room.description} | Active Intrusion: ${state.activeVirus.name} in [${virusRoom.shortLabel}] (${state.activeVirus.hp}/${state.activeVirus.maxHp} HP) — Vector: ${state.activeVirus.attackTitle}.`,
          'info'
        )
      ].slice(-24)
    };
    return {
      nextState,
      scoreDelta: 0,
      meshHealthDelta: 0,
      purged: false,
      hijacked: false,
      headline: `SCANNED ${room.shortLabel}`,
      mechanicLesson: room.computerContext
    };
  }

  if (verb === 'help' || verb === '?') {
    const nextState: MeshMudState = {
      ...state,
      logs: [
        ...state.logs,
        makeMudLog('OPERATOR', `${operatorHandle}@derailleur:~$ help`, 'info'),
        makeMudLog(
          'CODEX',
          `LINUX DEFENSE COMMANDS: 'iptables', 'sha256sum', 'chroot', 'kill', 'epidos-cli', 'mesh-broadcast', 'cd 1..5', 'scan', or 'say <msg>' to chat with operators.`,
          'codex'
        )
      ].slice(-24)
    };
    return {
      nextState,
      scoreDelta: 0,
      meshHealthDelta: 0,
      purged: false,
      hijacked: false,
      headline: 'MUD COMMAND REFERENCE',
      mechanicLesson: ''
    };
  }

  if (verb === 'talk' || verb === 'ask' || verb === 'ai') {
    const nextState = talkToLocalAi(state, arg, operatorHandle);
    return {
      nextState,
      scoreDelta: 5,
      meshHealthDelta: 1,
      purged: false,
      hijacked: false,
      headline: 'EPIDOS-LLM CONSULTED (+4% TETHER)',
      mechanicLesson: DEFENSE_TOOLS.tether_sync.realWorldMechanic
    };
  }

  if (verb === 'cd' || verb === 'move' || verb === 'go' || verb === 'sector') {
    const target = arg || '';
    let matchedRoom: MeshRoomId | null = null;
    if (target.includes('1') || target.includes('sanctuary') || target.includes('core') || target.includes('neural0')) matchedRoom = 'sanctuary';
    else if (target.includes('2') || target.includes('airlock') || target.includes('ble') || target.includes('mesh0'))
      matchedRoom = 'airlock';
    else if (target.includes('3') || target.includes('gateway') || target.includes('packet') || target.includes('ip_forward'))
      matchedRoom = 'gateway';
    else if (target.includes('4') || target.includes('vault') || target.includes('weight'))
      matchedRoom = 'vault';
    else if (target.includes('5') || target.includes('bridge') || target.includes('peer') || target.includes('shared_bus')) matchedRoom = 'bridge';
    else matchedRoom = state.activeVirus.roomId;

    const nextState = moveMudRoom(state, matchedRoom);
    return {
      nextState,
      scoreDelta: 0,
      meshHealthDelta: 0,
      purged: false,
      hijacked: false,
      headline: `MOUNTED ${MESH_ROOMS[matchedRoom].shortLabel}`,
      mechanicLesson: MESH_ROOMS[matchedRoom].computerContext
    };
  }

  // Match any defense tool command or alias
  for (const tool of Object.values(DEFENSE_TOOLS)) {
    if (verb === tool.command || tool.aliases.includes(verb)) {
      return executeMudDefenseAction(state, tool.id, operatorHandle, streak);
    }
  }

  // Freeform Mesh Chat message
  const chatMsg = verb === 'say' || verb === 'chat' ? arg || clean : clean;
  const nextStateWithAi = talkToLocalAi(state, chatMsg, operatorHandle);
  const nemesisClapback = generateNemesisTrollTaunt(operatorHandle, 'slow', state.wave, Date.now(), state.activeVirus.name);
  const finalState: MeshMudState = {
    ...nextStateWithAi,
    logs: [...nextStateWithAi.logs, makeMudLog('NEMESIS-ZERO', nemesisClapback, 'threat')].slice(-24)
  };

  return {
    nextState: finalState,
    scoreDelta: 5,
    meshHealthDelta: 1,
    purged: false,
    hijacked: false,
    headline: `MESH CHAT TRANSMITTED`,
    mechanicLesson: '',
    nemesisTaunt: nemesisClapback
  };
}

// ============================================================================
// LEGACY HEX DUMP FUNCTIONS (Preserved for backward compatibility & tests)
// ============================================================================

const WORD_BANKS: Record<number, string[]> = {
  5: [
    'PROXY', 'SHELL', 'LINUX', 'CYBER', 'NODES', 'STACK', 'PATCH', 'PORTS',
    'TOKEN', 'ADMIN', 'CACHE', 'FRAME', 'GUARD', 'LOGIC', 'MODEM', 'PULSE',
    'QUERY', 'ROUTE', 'SCOPE', 'TRACE', 'VAULT', 'CHMOD', 'GREP0', 'CRYPT'
  ],
  6: [
    'KERNEL', 'DAEMON', 'CIPHER', 'SOCKET', 'PACKET', 'SUBNET', 'ROUTER', 'BUFFER',
    'VECTOR', 'MATRIX', 'ACCESS', 'BINARY', 'BRIDGE', 'CLIENT', 'SCRIPT', 'SENTRY',
    'SIGNAL', 'STREAM', 'SWITCH', 'SYSTEM', 'TUNNEL', 'UPLINK', 'VORTEX', 'KEYGEN'
  ],
  7: [
    'GATEWAY', 'PAYLOAD', 'ROOTKIT', 'FIREWAL', 'NETWORK', 'COMMAND', 'CONSOLE', 'DECRYPT',
    'ENCRYPT', 'EXPLOIT', 'HEXADEC', 'MONITOR', 'OPCODES', 'PROCESS', 'SCANNER', 'SESSION',
    'STORAGE', 'SYNAPSE', 'TRACKER', 'VIRTUAL', 'WRANGLR', 'CHASSIS', 'THERMAL', 'PHOSPHR'
  ],
  8: [
    'MAINFRAM', 'TERMINAL', 'PROTOCOL', 'BACKDOOR', 'CHECKSUM', 'COMPILER', 'DATABASE', 'DEADLOCK',
    'EPIDEMWK', 'FIRMWARE', 'HARDWARE', 'INTRUDER', 'KEYSTROKE', 'LOOPBACK', 'OVERFLOW', 'PASSWORD',
    'PIPELINE', 'REGISTRY', 'SECURITY', 'TELEMETR', 'WATCHDOG', 'ZERO_DAY'
  ]
};

const GARBAGE_CHARS = '!@#$%^&*()-+=;:,.<>/?~|_';
const BRACKET_PAIRS: Array<[string, string]> = [
  ['[', ']'],
  ['(', ')'],
  ['{', '}'],
  ['<', '>']
];

export function computeLikeness(guess: string, target: string): number {
  const a = guess.trim().toUpperCase();
  const b = target.trim().toUpperCase();
  const len = Math.min(a.length, b.length);
  let matches = 0;
  for (let i = 0; i < len; i++) {
    if (a[i] === b[i]) {
      matches++;
    }
  }
  return matches;
}

export function getOperatorRankTitle(totalScore: number): string {
  if (totalScore >= 10000) return 'CYBER COMMANDER';
  if (totalScore >= 5000) return 'ZERO-DAY ARCHITECT';
  if (totalScore >= 2500) return 'KERNEL INFILTRATOR';
  if (totalScore >= 1000) return 'PACKET INTERCEPTOR';
  if (totalScore >= 300) return 'BUS OPERATOR';
  return 'TERMINAL PROBER';
}

export function generateHexDumpNode(nodeLevel: number, seed = Date.now()): HackingNodeState {
  const safeLevel = Math.max(1, Math.floor(nodeLevel));
  const wordLength = safeLevel <= 2 ? 5 : safeLevel <= 4 ? 6 : safeLevel <= 7 ? 7 : 8;
  const pool = WORD_BANKS[wordLength] || WORD_BANKS[6];
  const candidateCount = Math.min(pool.length, 8 + Math.min(4, Math.floor(safeLevel / 2)));

  const rng = createSeededRng(seed + safeLevel * 7919);
  const shuffled = [...pool].sort(() => rng() - 0.5);
  const candidates = shuffled.slice(0, candidateCount).map(w => w.slice(0, wordLength));
  const targetIndex = Math.floor(rng() * candidates.length);
  const targetWord = candidates[targetIndex];

  const effects: Array<'remove_dud' | 'reset_tries' | 'score_boost'> = [
    'remove_dud',
    'remove_dud',
    'reset_tries'
  ];
  const brackets: HexBracketBonus[] = effects.map((effect, idx) => {
    const [open, close] = BRACKET_PAIRS[(idx + safeLevel) % BRACKET_PAIRS.length];
    const innerLen = 2 + Math.floor(rng() * 3);
    let inner = '';
    for (let i = 0; i < innerLen; i++) {
      inner += GARBAGE_CHARS[Math.floor(rng() * GARBAGE_CHARS.length)];
    }
    return {
      id: `brk_${safeLevel}_${idx}`,
      syntax: `${open}${inner}${close}`,
      used: false,
      effect
    };
  });

  const baseAddress = 0x4080 + ((safeLevel * 0x0120) & 0x3f00);
  const rowCount = 8;
  const rows: HexMemoryRow[] = [];

  for (let r = 0; r < rowCount; r++) {
    const addrHex = '0x' + (baseAddress + r * 16).toString(16).toUpperCase().padStart(4, '0');
    const wordsInRow: string[] = [];
    const bracketsInRow: HexBracketBonus[] = [];

    const candA = candidates[r];
    const candB = candidates[r + rowCount];
    if (candA) wordsInRow.push(candA);
    if (candB) wordsInRow.push(candB);

    if (r === 1 && brackets[0]) bracketsInRow.push(brackets[0]);
    if (r === 4 && brackets[1]) bracketsInRow.push(brackets[1]);
    if (r === 6 && brackets[2]) bracketsInRow.push(brackets[2]);

    const makeNoise = (len: number) => {
      let out = '';
      for (let i = 0; i < len; i++) {
        out += GARBAGE_CHARS[Math.floor(rng() * GARBAGE_CHARS.length)];
      }
      return out;
    };

    const leftToken = candA || makeNoise(wordLength);
    const rightToken = bracketsInRow[0]?.syntax || candB || makeNoise(wordLength);

    const leftDump = `${makeNoise(3)}${leftToken}${makeNoise(Math.max(2, 12 - leftToken.length))}`;
    const rightDump = `${makeNoise(2)}${rightToken}${makeNoise(Math.max(2, 13 - rightToken.length))}`;

    rows.push({
      address: addrHex,
      leftDump,
      rightDump,
      wordsInRow,
      bracketsInRow
    });
  }

  return {
    nodeLevel: safeLevel,
    wordLength,
    candidates,
    eliminatedDuds: [],
    targetWord,
    maxAttempts: 4,
    attemptsLeft: 4,
    brackets,
    rows,
    status: 'active',
    history: [
      {
        entry: `NODE_${String(safeLevel).padStart(2, '0')} // 0x${baseAddress.toString(16).toUpperCase()}`,
        resultText: `SELECT CANDIDATE KEY (${wordLength} CHARS) OR BRACKET PAIR`,
        type: 'system'
      }
    ]
  };
}

export interface GuessEvaluationResult {
  nextState: HackingNodeState;
  scoreDelta: number;
  cracked: boolean;
  lockedOut: boolean;
  likeness: number;
}

export function evaluateCandidateGuess(
  state: HackingNodeState,
  rawGuess: string,
  streak = 1
): GuessEvaluationResult {
  if (state.status !== 'active') {
    return {
      nextState: state,
      scoreDelta: 0,
      cracked: state.status === 'cracked',
      lockedOut: state.status === 'locked',
      likeness: 0
    };
  }

  const guess = rawGuess.trim().toUpperCase();
  const likeness = computeLikeness(guess, state.targetWord);
  const isExact = guess === state.targetWord;

  if (isExact) {
    const basePoints = 150 + state.nodeLevel * 50;
    const attemptBonus = state.attemptsLeft * 35;
    const streakMultiplier = Math.min(3, 1 + (Math.max(1, streak) - 1) * 0.25);
    const scoreDelta = Math.round((basePoints + attemptBonus) * streakMultiplier);

    const nextState: HackingNodeState = {
      ...state,
      status: 'cracked',
      history: [
        ...state.history,
        {
          entry: guess,
          likeness: state.wordLength,
          wordLength: state.wordLength,
          resultText: `EXACT MATCH [${state.wordLength}/${state.wordLength}] — ROOT ACCESS GRANTED (+${scoreDelta} PTS)`,
          type: 'success'
        }
      ]
    };

    return {
      nextState,
      scoreDelta,
      cracked: true,
      lockedOut: false,
      likeness: state.wordLength
    };
  }

  const nextAttempts = Math.max(0, state.attemptsLeft - 1);
  const lockedOut = nextAttempts === 0;

  const nextState: HackingNodeState = {
    ...state,
    attemptsLeft: nextAttempts,
    status: lockedOut ? 'locked' : 'active',
    history: [
      ...state.history,
      {
        entry: guess,
        likeness,
        wordLength: state.wordLength,
        resultText: lockedOut
          ? `ACCESS DENIED [${likeness}/${state.wordLength} MATCH] — TERMINAL LOCKED (KEY WAS: ${state.targetWord})`
          : `ACCESS DENIED [${likeness}/${state.wordLength} MATCH] — ${nextAttempts} ATTEMPT(S) LEFT`,
        type: lockedOut ? 'error' : 'guess'
      }
    ]
  };

  return {
    nextState,
    scoreDelta: 0,
    cracked: false,
    lockedOut,
    likeness
  };
}

export function evaluateBracketSequence(
  state: HackingNodeState,
  bracketId: string
): { nextState: HackingNodeState; scoreDelta: number; message: string } {
  if (state.status !== 'active') {
    return { nextState: state, scoreDelta: 0, message: 'NODE INACTIVE' };
  }

  const targetBracket = state.brackets.find(b => b.id === bracketId);
  if (!targetBracket || targetBracket.used) {
    return { nextState: state, scoreDelta: 0, message: 'BRACKET ALREADY EXECUTED' };
  }

  const updatedBrackets = state.brackets.map(b =>
    b.id === bracketId ? { ...b, used: true } : b
  );

  const availableDuds = state.candidates.filter(
    w => w !== state.targetWord && !state.eliminatedDuds.includes(w)
  );

  if (targetBracket.effect === 'reset_tries' && state.attemptsLeft < state.maxAttempts) {
    const nextState: HackingNodeState = {
      ...state,
      attemptsLeft: state.maxAttempts,
      brackets: updatedBrackets,
      history: [
        ...state.history,
        {
          entry: targetBracket.syntax,
          resultText: 'ALLOWANCE REPLENISHED (ATTEMPTS RESET TO 4/4) +40 PTS',
          type: 'bracket'
        }
      ]
    };
    return { nextState, scoreDelta: 40, message: 'ALLOWANCE REPLENISHED' };
  }

  if (availableDuds.length > 0) {
    const dudToRemove = availableDuds[0];
    const nextState: HackingNodeState = {
      ...state,
      eliminatedDuds: [...state.eliminatedDuds, dudToRemove],
      brackets: updatedBrackets,
      history: [
        ...state.history,
        {
          entry: targetBracket.syntax,
          resultText: `DUD REMOVED [${dudToRemove}] +35 PTS`,
          type: 'bracket'
        }
      ]
    };
    return { nextState, scoreDelta: 35, message: `DUD REMOVED: ${dudToRemove}` };
  }

  const nextState: HackingNodeState = {
    ...state,
    brackets: updatedBrackets,
    history: [
      ...state.history,
      {
        entry: targetBracket.syntax,
        resultText: 'BUFFER OVERRIDE CACHE HIT +50 PTS',
        type: 'bracket'
      }
    ]
  };
  return { nextState, scoreDelta: 50, message: 'BUFFER CACHE +50 PTS' };
}
