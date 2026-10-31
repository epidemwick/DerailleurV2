/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommandContext, CommandResult, TerminalLine } from '../types/terminal';
import { resolveFileName, resolveTargetDir } from './filesystem';

export function executeSingleCommand(rawCmd: string, context: CommandContext): CommandResult {
  const trimmed = rawCmd.trim();
  if (!trimmed) {
    return { outputLines: [] };
  }

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const arg = parts.slice(1).join(" ");
  const dirObj = context.fileSystem[context.currentDir] || { folders: [], files: {} };
  const outputLines: TerminalLine[] = [];

  const uid = () => Math.random().toString(36).substring(2, 9);

  if (cmd === "help") {
    const isOwner = context.isAdmin || 
      context.operatorName.toLowerCase() === 'epidemwick' || 
      context.operatorName.toLowerCase() === 'chadhawk';

    outputLines.push(
      { id: uid(), type: 'system', text: "--- ePidOS Terminal Handheld Help ---" },
      { id: uid(), type: 'help', text: "-   ls                List files in current directory" },
      { id: uid(), type: 'help', text: "-   cd [dir]          Change directory (~, about, resume, projects, contact)" },
      { id: uid(), type: 'help', text: "-   cat [file]        Print file content to terminal" },
      { id: uid(), type: 'help', text: "-   vim / nano [file] Open file in interactive text editor" },
      { id: uid(), type: 'help', text: "-   mail / msg        Transmit direct message to Christian Chadwick" },
      ...(isOwner
        ? [{ id: uid(), type: 'help' as const, text: "-   admin / su        Owner telemetry & visitor audit log panel" }]
        : []),
      { id: uid(), type: 'help', text: "-   ai / ask [query]  Query tactical AI assistant regarding Christian's background" },
      { id: uid(), type: 'help', text: "-   ping [host]       Transmit ICMP ECHO_REQUEST packets to network host" },
      { id: uid(), type: 'help', text: "-   cpu               Display CPU architecture, load sparkline & clock" },
      { id: uid(), type: 'help', text: "-   fan / rpm         Check chassis cooling blower & convection RPM" },
      { id: uid(), type: 'help', text: "-   net / traffic     Inspect TX/RX packet statistics and I/O buffer" },
      { id: uid(), type: 'help', text: "-   temp / thermal    Inspect CPU core thermal throttling & heatsink" },
      { id: uid(), type: 'help', text: "-   top / status      Full system telemetry overview (CPU, RAM, Fan, Net)" },
      { id: uid(), type: 'help', text: "-   battery / batt    Inspect 7.2V Ni-MH battery telemetry & charge" },
      { id: uid(), type: 'help', text: "-   flicker / crt     Toggle authentic 60Hz CRT phosphor raster flicker" },
      { id: uid(), type: 'help', text: "-   screensaver       Activate Greek terminal matrix rain screensaver" },
      { id: uid(), type: 'help', text: "-   degauss           Demagnetize CRT display coil" },
      { id: uid(), type: 'help', text: "-   pwd               Print working directory path" },
      { id: uid(), type: 'help', text: "-   clear             Clear terminal display" },
      { id: uid(), type: 'help', text: "-   reboot / restart  Cold reboot system" },
      { id: uid(), type: 'system', text: "----------------------------------------------------------------" }
    );
    return { outputLines };
  }

  if (cmd === "ai" || cmd === "ask" || cmd === "copilot" || cmd === "chat") {
    if (!arg) {
      outputLines.push(
        { id: uid(), type: 'system', text: "[TACTICAL AI CO-PROCESSOR] :: Engaging Neural AI Copilot Dialog..." }
      );
      return { triggerAiChatModal: true, outputLines };
    }

    const lower = arg.toLowerCase();
    let reply = "";
    if (lower.includes("clearance") || lower.includes("security") || lower.includes("ts/sci")) {
      reply = "2d Lt Christian Chadwick holds an active Top Secret clearance with Sensitive Compartmented Information access (TS/SCI), vetted through DoD DCSA.";
    } else if (lower.includes("military") || lower.includes("commission") || lower.includes("ots") || lower.includes("usaf") || lower.includes("officer") || lower.includes("ang")) {
      reply = "Christian completed USAF Officer Training School (OTS) at Maxwell AFB (June 14 - August 16) and serves as an Assistant Director of Operations / Warfighter Communications Operations Officer (17DX) in the 108th Wing Communications Squadron at Joint Base MDL.";
    } else if (lower.includes("dla") || lower.includes("job") || lower.includes("work") || lower.includes("experience")) {
      reply = "Christian serves dually as a civilian GS-12 Supply/Demand Analyst with the Defense Logistics Agency (DLA) in Philadelphia, and as a 17DX Cyberspace Operations Officer in the USAF ANG.";
    } else if (lower.includes("f-16") || lower.includes("qa") || lower.includes("fabrication") || lower.includes("mechanic")) {
      reply = "From 2015 to 2026, Christian served with the 177th Fighter Wing as an F-16 Sheet Metal Mechanic (WG-10) and Dual AFSC Quality Assurance Inspector, auditing structural repairs and flight readiness.";
    } else if (lower.includes("email") || lower.includes("contact") || lower.includes("hire") || lower.includes("reach")) {
      reply = "Direct transmission channels: Personal epidemwick@chadhawkcorps.com, Military christian.chadwick@us.af.mil, DoD DLA christian.chadwick@dla.mil, GitHub github.com/epidemwick.";
    } else {
      reply = `[ePidOS TACTICAL AI] :: Query '${arg}' processed. Christian Chadwick is a Warfighter Communications Operations Officer (17DX) and DLA GS-12 Analyst with active TS/SCI clearance. Type 'cat experience.txt' or 'skills' for complete files.`;
    }

    outputLines.push(
      { id: uid(), type: 'system', text: `[ePidOS AI // NEURAL QUERY] :: "${arg}"` },
      { id: uid(), type: 'output', text: reply }
    );
    return { outputLines };
  }

  if (cmd === "ping") {
    const host = (arg || "chadhawkcorps.com").trim();
    let ip = "104.21.58.122";
    if (host.includes("google")) ip = "142.250.190.46";
    else if (host.includes("github")) ip = "140.82.121.4";
    else if (host === "localhost" || host === "127.0.0.1") ip = "127.0.0.1";
    else if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) ip = host;

    outputLines.push(
      { id: uid(), type: 'output', text: `PING ${host} (${ip}): 56 data bytes` },
      { id: uid(), type: 'output', text: `64 bytes from ${ip}: icmp_seq=1 ttl=58 time=12.4 ms` },
      { id: uid(), type: 'output', text: `64 bytes from ${ip}: icmp_seq=2 ttl=58 time=11.8 ms` },
      { id: uid(), type: 'output', text: `64 bytes from ${ip}: icmp_seq=3 ttl=58 time=13.1 ms` },
      { id: uid(), type: 'output', text: `64 bytes from ${ip}: icmp_seq=4 ttl=58 time=12.0 ms` },
      { id: uid(), type: 'output', text: "" },
      { id: uid(), type: 'system', text: `--- ${host} ping statistics ---` },
      { id: uid(), type: 'output', text: `4 packets transmitted, 4 packets received, 0.0% packet loss` },
      { id: uid(), type: 'output', text: `round-trip min/avg/max = 11.8/12.3/13.1 ms` }
    );
    return { outputLines };
  }

  if (cmd === "flicker" || cmd === "crt" || cmd === "scanlines") {
    outputLines.push({
      id: uid(),
      type: 'system',
      text: "[CRT RASTER ENGINE] :: 60Hz cathode ray phosphor scanline flicker toggled."
    });
    return { triggerFlickerToggle: true, outputLines };
  }

  if (cmd === "top" || cmd === "htop" || cmd === "status") {
    const temp = Math.round(context.coreTemp ?? 38);
    const batt = context.batteryLevel ?? 94;
    outputLines.push(
      { id: uid(), type: 'system', text: "================================================================" },
      { id: uid(), type: 'output', text: "DERAILLEUR v2 SYSTEM METRICS MONITOR [ePidOS v4.09]" },
      { id: uid(), type: 'system', text: "================================================================" },
      { id: uid(), type: 'output', text: `CPU ARCH     : i486DX2 @ ${temp >= 85 ? '16' : temp >= 75 ? '33' : '66'} MHz (Load: 28% | Tasks: 14)` },
      { id: uid(), type: 'output', text: `CORE TEMP    : ${temp}°C [Nominal: 38°C, Throttle: 75°C, Critical: 85°C]` },
      { id: uid(), type: 'output', text: `BLOWER RPM   : ${temp >= 85 ? '4800 RPM (HIGH PRESSURE)' : temp >= 75 ? '3900 RPM (FORCED AIR)' : temp >= 50 ? '2800 RPM (LOW NOISE)' : '0 RPM (CONVECTIVE RADIATOR)'}` },
      { id: uid(), type: 'output', text: `BATTERY PACK : ${batt}% [7.2V Ni-MH Cell ~${((batt / 100) * 4.2).toFixed(1)}h remaining]` },
      { id: uid(), type: 'output', text: `RAM CAPACITY : 640 KB Base / 16 MB Extended (Heap Used: 4.8 MB)` },
      { id: uid(), type: 'output', text: `NETWORK LINK : eth0 UP (10BASE-T via SLIP) | Latency: ~12.3ms` },
      { id: uid(), type: 'system', text: "----------------------------------------------------------------" }
    );
    return { outputLines };
  }

  if (cmd === "fan" || cmd === "rpm" || cmd === "blower") {
    const temp = Math.round(context.coreTemp ?? 38);
    const fanRpm = temp >= 85 ? 4800 : temp >= 75 ? 3900 : temp >= 50 ? 2800 : 0;
    outputLines.push(
      { id: uid(), type: 'system', text: "================================================================" },
      { id: uid(), type: 'output', text: "CHASSIS COOLING SUBSYSTEM :: 40mm FORCED CONVECTION BLOWER" },
      { id: uid(), type: 'system', text: "================================================================" },
      { id: uid(), type: 'output', text: `BLOWER STATE : ${fanRpm > 0 ? `ACTIVE @ ${fanRpm} RPM` : 'INACTIVE (0 RPM / PASSIVE CONVECTION)'}` },
      { id: uid(), type: 'output', text: `CURRENT TEMP : ${temp}°C [Junction Threshold: 50°C Low, 75°C Med, 85°C Max]` },
      { id: uid(), type: 'output', text: `AIRFLOW RATE : ${fanRpm >= 4800 ? '4.8 CFM (HIGH PRESSURE MAX FLOW)' : fanRpm >= 3900 ? '3.4 CFM (NORMAL FORCED)' : fanRpm >= 2800 ? '2.1 CFM (LOW NOISE)' : '0.0 CFM (CONVECTIVE RADIATOR)'}` },
      { id: uid(), type: 'system', text: "----------------------------------------------------------------" }
    );
    return { outputLines };
  }

  if (cmd === "net" || cmd === "traffic" || cmd === "network") {
    outputLines.push(
      { id: uid(), type: 'system', text: "================================================================" },
      { id: uid(), type: 'output', text: "NETWORK TELEMETRY :: TACTICAL PACKET ADAPTER eth0" },
      { id: uid(), type: 'system', text: "================================================================" },
      { id: uid(), type: 'output', text: "LINK STATE   : UP (10BASE-T Half-Duplex via SLIP/PPP)" },
      { id: uid(), type: 'output', text: "TX BANDWIDTH : ~1.2 KB/s (Command Echo & Telemetry Packets)" },
      { id: uid(), type: 'output', text: "RX BANDWIDTH : ~4.8 KB/s (Weather, GeoIP & Stream Frames)" },
      { id: uid(), type: 'output', text: "PACKET LOSS  : 0.00% (CRC32 Frame Check Sequence PASS)" },
      { id: uid(), type: 'system', text: "----------------------------------------------------------------" }
    );
    return { outputLines };
  }

  if (cmd === "cpu") {
    const temp = Math.round(context.coreTemp ?? 38);
    const isCritical = temp >= 85;
    const isThrottled = temp >= 75;
    const clockMhz = isCritical ? 16 : isThrottled ? 33 : 66;
    outputLines.push(
      { id: uid(), type: 'system', text: "================================================================" },
      { id: uid(), type: 'output', text: "CPU ARCHITECTURE & LOAD TELEMETRY :: i486DX2 MICRO-CHASSIS" },
      { id: uid(), type: 'system', text: "================================================================" },
      { id: uid(), type: 'output', text: `PROCESSOR    : Intel 486DX2-66 (32-bit x86 CISC with internal FPU)` },
      { id: uid(), type: 'output', text: `CORE CLOCK   : ${clockMhz} MHz ${isThrottled ? '(THROTTLED DOWN FROM 66 MHz)' : '(Nominal 66 MHz)'}` },
      { id: uid(), type: 'output', text: `CORE LOAD    : [ ▄ ▅ ▇ █ ▅ ▃ ▆ █ ▇ ▅ ] 34% Utilization` },
      { id: uid(), type: 'output', text: `TEMPERATURE  : ${temp}°C [${isCritical ? 'CRITICAL OVERHEAT' : isThrottled ? 'THERMAL THROTTLING' : 'NOMINAL'}]` },
      { id: uid(), type: 'output', text: `BOGOMIPS     : ${(clockMhz * 0.503).toFixed(2)} BogoMIPS` },
      { id: uid(), type: 'system', text: "----------------------------------------------------------------" }
    );
    return { outputLines };
  }

  if (cmd === "temp" || cmd === "thermal") {
    const temp = Math.round(context.coreTemp ?? 38);
    const isCritical = temp >= 85;
    const isThrottled = temp >= 75;
    const isWarm = temp >= 60;
    const clockMhz = isCritical ? 16 : isThrottled ? 33 : 66;
    const fanRpm = isCritical ? 4800 : isThrottled ? 3900 : isWarm ? 2800 : 0;
    const totalBars = 20;
    const filledBars = Math.min(totalBars, Math.max(1, Math.round(((temp - 30) / (95 - 30)) * totalBars)));
    const barStr = "■".repeat(filledBars) + "░".repeat(totalBars - filledBars);

    outputLines.push(
      { id: uid(), type: 'system', text: "================================================================" },
      { id: uid(), type: 'output', text: "CPU THERMAL TELEMETRY :: 486DX2-66 MICRO-CHASSIS SENSOR" },
      { id: uid(), type: 'system', text: "================================================================" },
      { id: uid(), type: 'output', text: `DIE TEMP     : ${temp}°C [${barStr}] ${isCritical ? 'CRITICAL OVERHEAT' : isThrottled ? 'THROTTLING ACTIVE' : isWarm ? 'ELEVATED' : 'NOMINAL'}` },
      { id: uid(), type: 'output', text: `CORE CLOCK   : ${clockMhz} MHz ${isThrottled ? `(DOWNSHIFTED from 66 MHz to prevent junction failure)` : `(Standard 66 MHz)`}` },
      { id: uid(), type: 'output', text: `JUNCTION MAX : 95°C (Auto-cutoff at 105°C)` },
      { id: uid(), type: 'output', text: `HEATSINK FAN : ${fanRpm > 0 ? `${fanRpm} RPM (ACTIVE FORCED CONVECTION)` : 'PASSIVE COPPER COPING (FAN OFF)'}` },
      { id: uid(), type: 'output', text: `CHASSIS FLOW : ${fanRpm >= 4800 ? '4.8 CFM High Flow' : fanRpm > 0 ? '2.8 CFM Ambient' : '0.0 CFM Passive Convection'}` },
      { id: uid(), type: 'system', text: "----------------------------------------------------------------" },
      { id: uid(), type: 'help', text: isThrottled ? "TIP: Stop executing heavy commands to allow the heatsink to cool down." : "TIP: Run 'stress' or rapid commands to simulate intensive CPU thermal load." }
    );
    return { outputLines };
  }

  if (cmd === "stress" || cmd === "burnin" || cmd === "benchmark") {
    outputLines.push(
      { id: uid(), type: 'system', text: "[CPU BENCHMARK] :: Executing synthetic floating-point matrix FFT loops..." },
      { id: uid(), type: 'system', text: "[THERMAL SPIKE] :: CPU core load 100% — thermal dissipation exceeded." },
      { id: uid(), type: 'error', text: "[HARDWARE ALERT] :: Die temperature spiked! CRT deflection coils warming up." }
    );
    return { triggerStress: true, outputLines };
  }

  if (cmd === "battery" || cmd === "batt" || cmd === "power" || cmd === "pwr") {
    const batt = context.batteryLevel ?? 94;
    const estHours = ((batt / 100) * 4.2).toFixed(1);
    const volt = (6.0 + (batt / 100) * 1.4).toFixed(2);
    const barsCount = batt >= 81 ? 5 : batt >= 61 ? 4 : batt >= 41 ? 3 : batt >= 21 ? 2 : 1;
    const barVisual = '■ '.repeat(barsCount) + '□ '.repeat(5 - barsCount);
    outputLines.push(
      { id: uid(), type: 'system', text: "================================================================" },
      { id: uid(), type: 'output', text: "POWER SUBSYSTEM :: 7.2V 2400mAh Ni-MH BATTERY PACK" },
      { id: uid(), type: 'system', text: "================================================================" },
      { id: uid(), type: 'output', text: `CHARGE LEVEL : ${batt}% [${barVisual.trim()}]` },
      { id: uid(), type: 'output', text: `CELL VOLTAGE : ${volt}V DC (Nominal: 7.20V)` },
      { id: uid(), type: 'output', text: `DISCHARGE    : ~${estHours} hours runtime remaining at active CRT load` },
      { id: uid(), type: 'output', text: `STATUS       : ${batt <= 18 ? 'CRITICAL - RECHARGE RECOMMENDED' : 'OPTIMAL / DISCHARGING'}` },
      { id: uid(), type: 'system', text: "----------------------------------------------------------------" }
    );
    return { outputLines };
  }

  if (cmd === "screensaver" || cmd === "matrix") {
    outputLines.push({
      id: uid(),
      type: 'system',
      text: "[SCREENSAVER] :: Engaging Greek terminal phosphor matrix stream..."
    });
    return { triggerScreensaver: true, outputLines };
  }

  if (cmd === "mail" || cmd === "msg" || cmd === "message") {
    outputLines.push({
      id: uid(),
      type: 'system',
      text: "[TRANSMITTER] :: Opening secure dispatch modal for epidemwick@chadhawkcorps.com..."
    });
    return { triggerContactModal: true, outputLines };
  }

  if (cmd === "admin" || cmd === "su" || cmd === "audit") {
    const isOwner = context.isAdmin || 
      context.operatorName.toLowerCase() === 'epidemwick' || 
      context.operatorName.toLowerCase() === 'chadhawk';

    if (isOwner) {
      outputLines.push({
        id: uid(),
        type: 'system',
        text: "[CLASSIFIED] :: Requesting owner clearance for visitor telemetry & audit logs..."
      });
      return { triggerAdminModal: true, outputLines };
    } else {
      outputLines.push({
        id: uid(),
        type: 'error',
        text: "Permission denied: access restricted to system owner 'epidemwick'."
      });
      return { outputLines };
    }
  }


  if (cmd === "degauss") {
    outputLines.push({
      id: uid(),
      type: 'system',
      text: "[CRT COIL] :: Magnetic degaussing pulse discharged."
    });
    return { triggerDegauss: true, outputLines };
  }

  if (cmd === "reboot" || cmd === "restart") {
    return { triggerRestart: true, outputLines: [] };
  }

  if (cmd === "clear") {
    return { clearTerminal: true, outputLines: [] };
  }

  if (cmd === "pwd") {
    const fullPath = context.currentDir.replace("~", `/home/${context.operatorName}`);
    outputLines.push({ id: uid(), type: 'output', text: fullPath });
    return { outputLines };
  }

  if (cmd === "ls") {
    const items: string[] = [];
    dirObj.folders.forEach(f => {
      items.push(`<span class="ls-dir text-[#5bc0be] font-bold">${f}/</span>`);
    });
    Object.keys(dirObj.files).forEach(file => {
      items.push(`<span class="ls-file text-[#ffb000]">${file}</span>`);
    });
    outputLines.push({
      id: uid(),
      type: 'output',
      html: items.length > 0 ? items.join("    ") : "(empty directory)"
    });
    return { outputLines };
  }

  if (cmd === "cd") {
    const resolution = resolveTargetDir(context.currentDir, arg, context.fileSystem);
    if (resolution.exists) {
      return {
        nextDir: resolution.targetDir,
        outputLines: []
      };
    } else {
      outputLines.push({
        id: uid(),
        type: 'error',
        text: `bash: cd: ${arg}: No such directory`
      });
      return { outputLines };
    }
  }

  if (cmd === "cat") {
    if (!arg) {
      outputLines.push({
        id: uid(),
        type: 'error',
        text: "usage: cat [filename]"
      });
      return { outputLines };
    }

    let targetDirObj = dirObj;
    let fileQuery = arg;

    if (arg.includes("/")) {
      const segs = arg.split("/");
      fileQuery = segs.pop() || "";
      const folderName = segs.pop();
      if (folderName && context.fileSystem[`~/${folderName}`]) {
        targetDirObj = context.fileSystem[`~/${folderName}`];
      }
    }

    const resolved = resolveFileName(fileQuery, targetDirObj.files);
    if (resolved) {
      outputLines.push({
        id: uid(),
        type: 'output',
        html: targetDirObj.files[resolved]
      });
      return { outputLines };
    } else {
      outputLines.push({
        id: uid(),
        type: 'error',
        text: `cat: ${arg}: No such file in ${context.currentDir}`
      });
      return { outputLines };
    }
  }

  if (cmd === "vim" || cmd === "vi" || cmd === "nano") {
    if (!arg) {
      outputLines.push({
        id: uid(),
        type: 'error',
        text: `usage: ${cmd} [filename]`
      });
      return { outputLines };
    }

    let targetDirObj = dirObj;
    let fileQuery = arg;
    let targetDirName = context.currentDir;

    if (arg.includes("/")) {
      const segs = arg.split("/");
      fileQuery = segs.pop() || "";
      const folderName = segs.pop();
      if (folderName && context.fileSystem[`~/${folderName}`]) {
        targetDirName = `~/${folderName}`;
        targetDirObj = context.fileSystem[targetDirName];
      }
    }

    const resolved = resolveFileName(fileQuery, targetDirObj.files);
    if (resolved) {
      return {
        nextDir: targetDirName !== context.currentDir ? targetDirName : undefined,
        openEditor: {
          appType: cmd === 'nano' ? 'nano' : 'vim',
          fileName: resolved,
          fileContent: targetDirObj.files[resolved]
        },
        outputLines: []
      };
    } else {
      outputLines.push({
        id: uid(),
        type: 'error',
        text: `${cmd}: ${arg}: No such file in ${context.currentDir}`
      });
      return { outputLines };
    }
  }

  outputLines.push({
    id: uid(),
    type: 'error',
    text: `bash: ${cmd}: command not found (type 'help' for commands)`
  });
  return { outputLines };
}

export function executeChainedCommands(fullInput: string, context: CommandContext): CommandResult {
  const chainedCommands = fullInput.split("&&");
  let currentContext = { ...context };
  let finalResult: CommandResult = { outputLines: [] };

  for (const singleCmd of chainedCommands) {
    const res = executeSingleCommand(singleCmd, currentContext);
    finalResult.outputLines.push(...res.outputLines);

    if (res.nextDir) {
      currentContext.currentDir = res.nextDir;
      finalResult.nextDir = res.nextDir;
    }
    if (res.openEditor) {
      finalResult.openEditor = res.openEditor;
    }
    if (res.triggerDegauss) {
      finalResult.triggerDegauss = true;
    }
    if (res.triggerRestart) {
      finalResult.triggerRestart = true;
    }
    if (res.clearTerminal) {
      finalResult.clearTerminal = true;
    }
    if (res.triggerContactModal) {
      finalResult.triggerContactModal = true;
    }
    if (res.triggerAdminModal) {
      finalResult.triggerAdminModal = true;
    }
    if (res.triggerScreensaver) {
      finalResult.triggerScreensaver = true;
    }
    if (res.triggerStress) {
      finalResult.triggerStress = true;
    }
    if (res.triggerAiChatModal) {
      finalResult.triggerAiChatModal = true;
    }
    if (res.triggerFlickerToggle) {
      finalResult.triggerFlickerToggle = true;
    }
  }

  return finalResult;
}
