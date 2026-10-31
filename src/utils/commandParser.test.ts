/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { executeSingleCommand, executeChainedCommands } from './commandParser';
import { INITIAL_FILESYSTEM, resolveFileName, resolveTargetDir } from './filesystem';
import { CommandContext } from '../types/terminal';

const baseContext: CommandContext = {
  operatorName: 'chadwick',
  currentDir: '~',
  fileSystem: INITIAL_FILESYSTEM
};

test('filesystem filename resolver handles fuzzy matches and aliases', () => {
  const resumeFiles = INITIAL_FILESYSTEM['~/resume'].files;
  assert.equal(resolveFileName('experience.txt', resumeFiles), 'experience.txt');
  assert.equal(resolveFileName('experience', resumeFiles), 'experience.txt');
  assert.equal(resolveFileName('exp', resumeFiles), 'experience.txt');
  assert.equal(resolveFileName('education', resumeFiles), 'education.txt');
  assert.equal(resolveFileName('skills', resumeFiles), 'skills.txt');

  const aboutFiles = INITIAL_FILESYSTEM['~/about'].files;
  assert.equal(resolveFileName('about_me.txt', aboutFiles), 'about_me.txt');
  assert.equal(resolveFileName('about', aboutFiles), 'about_me.txt');
  assert.equal(resolveFileName('about-me', aboutFiles), 'about_me.txt');

  assert.equal(resolveFileName('nonexistent', aboutFiles), null);
});

test('filesystem target dir resolver handles root, shortcuts, and relatives', () => {
  assert.deepEqual(resolveTargetDir('~', 'about', INITIAL_FILESYSTEM), { targetDir: '~/about', exists: true });
  assert.deepEqual(resolveTargetDir('~', '~/resume', INITIAL_FILESYSTEM), { targetDir: '~/resume', exists: true });
  assert.deepEqual(resolveTargetDir('~/resume', '..', INITIAL_FILESYSTEM), { targetDir: '~', exists: true });
  assert.deepEqual(resolveTargetDir('~/resume', '~', INITIAL_FILESYSTEM), { targetDir: '~', exists: true });
  assert.deepEqual(resolveTargetDir('~', 'unknown_folder', INITIAL_FILESYSTEM), { targetDir: 'unknown_folder', exists: false });
});

test('command parser handles pwd', () => {
  const res = executeSingleCommand('pwd', baseContext);
  assert.equal(res.outputLines.length, 1);
  assert.equal(res.outputLines[0].text, '/home/chadwick');
});

test('command parser handles ls in root and subdirectories', () => {
  const resRoot = executeSingleCommand('ls', baseContext);
  assert.equal(resRoot.outputLines.length, 1);
  assert.ok(resRoot.outputLines[0].html?.includes('about/'));
  assert.ok(resRoot.outputLines[0].html?.includes('resume/'));

  const resumeContext: CommandContext = { ...baseContext, currentDir: '~/resume' };
  const resResume = executeSingleCommand('ls', resumeContext);
  assert.ok(resResume.outputLines[0].html?.includes('experience.txt'));
  assert.ok(resResume.outputLines[0].html?.includes('education.txt'));
  assert.ok(resResume.outputLines[0].html?.includes('skills.txt'));
});

test('command parser handles cd and command chaining', () => {
  const res = executeChainedCommands('cd ~/resume && ls', baseContext);
  assert.equal(res.nextDir, '~/resume');
  assert.ok(res.outputLines[0].html?.includes('experience.txt'));
});

test('command parser handles cat with content rendering', () => {
  const resumeContext: CommandContext = { ...baseContext, currentDir: '~/resume' };
  const res = executeSingleCommand('cat experience.txt', resumeContext);
  assert.ok(res.outputLines[0].html?.includes('PROFESSIONAL EXPERIENCE RECORD'));
  assert.ok(res.outputLines[0].html?.includes('Warfighter Communications Operations Officer'));
  assert.ok(res.outputLines[0].html?.includes('108th Wing - Communications Squadron'));
});

test('command parser handles vim/nano editor launching', () => {
  const resumeContext: CommandContext = { ...baseContext, currentDir: '~/resume' };
  const res = executeSingleCommand('vim experience.txt', resumeContext);
  assert.ok(res.openEditor);
  assert.equal(res.openEditor?.appType, 'vim');
  assert.equal(res.openEditor?.fileName, 'experience.txt');
  assert.ok(res.openEditor?.fileContent.includes('PROFESSIONAL EXPERIENCE RECORD'));
});

test('command parser triggers mail, admin and screensaver', () => {
  const mailRes = executeSingleCommand('mail', baseContext);
  assert.equal(mailRes.triggerContactModal, true);

  // Non-owner gets permission denied
  const guestContext: CommandContext = { ...baseContext, operatorName: 'guest' };
  const guestAdminRes = executeSingleCommand('admin', guestContext);
  assert.ok(guestAdminRes.outputLines[0].text?.includes('Permission denied'));

  // Owner gets admin modal trigger
  const ownerContext: CommandContext = { ...baseContext, operatorName: 'Chadhawk', isAdmin: true };
  const adminRes = executeSingleCommand('admin', ownerContext);
  assert.equal(adminRes.triggerAdminModal, true);

  const ssRes = executeSingleCommand('screensaver', baseContext);
  assert.equal(ssRes.triggerScreensaver, true);
});

test('command parser triggers degauss and handles clear and unknown commands', () => {
  const deg = executeSingleCommand('degauss', baseContext);
  assert.equal(deg.triggerDegauss, true);

  const clr = executeSingleCommand('clear', baseContext);
  assert.equal(clr.clearTerminal, true);

  const unk = executeSingleCommand('foobar', baseContext);
  assert.ok(unk.outputLines[0].text?.includes('command not found'));
});

test('command parser reports battery status and voltage', () => {
  const battRes = executeSingleCommand('battery', { ...baseContext, batteryLevel: 88 });
  assert.ok(battRes.outputLines.some(l => l.text?.includes('CHARGE LEVEL : 88%')));
  assert.ok(battRes.outputLines.some(l => l.text?.includes('7.2V 2400mAh Ni-MH')));
});

test('command parser reports CPU thermal telemetry and throttling downshift', () => {
  // Nominal temperature test
  const tempNominal = executeSingleCommand('temp', { ...baseContext, coreTemp: 42 });
  assert.ok(tempNominal.outputLines.some(l => l.text?.includes('DIE TEMP     : 42°C')));
  assert.ok(tempNominal.outputLines.some(l => l.text?.includes('CORE CLOCK   : 66 MHz')));
  assert.ok(tempNominal.outputLines.some(l => l.text?.includes('PASSIVE COPPER COPING')));

  // Throttled temperature test (78°C)
  const tempThrottled = executeSingleCommand('temp', { ...baseContext, coreTemp: 78 });
  assert.ok(tempThrottled.outputLines.some(l => l.text?.includes('THROTTLING ACTIVE')));
  assert.ok(tempThrottled.outputLines.some(l => l.text?.includes('CORE CLOCK   : 33 MHz')));
  assert.ok(tempThrottled.outputLines.some(l => l.text?.includes('3900 RPM')));

  // Critical overheat test (88°C)
  const tempCritical = executeSingleCommand('temp', { ...baseContext, coreTemp: 88 });
  assert.ok(tempCritical.outputLines.some(l => l.text?.includes('CRITICAL OVERHEAT')));
  assert.ok(tempCritical.outputLines.some(l => l.text?.includes('CORE CLOCK   : 16 MHz')));
  assert.ok(tempCritical.outputLines.some(l => l.text?.includes('4800 RPM')));

  // Stress / burnin command test
  const stressRes = executeSingleCommand('stress', baseContext);
  assert.equal(stressRes.triggerStress, true);
  assert.ok(stressRes.outputLines.some(l => l.text?.includes('CPU BENCHMARK')));
});

test('command parser handles ping, flicker, cpu, fan, net, and top commands', () => {
  const pingRes = executeSingleCommand('ping google.com', baseContext);
  assert.ok(pingRes.outputLines.some(l => l.text?.includes('PING google.com')));
  assert.ok(pingRes.outputLines.some(l => l.text?.includes('packets transmitted')));

  const flickerRes = executeSingleCommand('flicker', baseContext);
  assert.equal(flickerRes.triggerFlickerToggle, true);

  const cpuRes = executeSingleCommand('cpu', { ...baseContext, coreTemp: 40 });
  assert.ok(cpuRes.outputLines.some(l => l.text?.includes('Intel 486DX2-66')));

  const fanRes = executeSingleCommand('fan', { ...baseContext, coreTemp: 78 });
  assert.ok(fanRes.outputLines.some(l => l.text?.includes('3900 RPM')));

  const netRes = executeSingleCommand('net', baseContext);
  assert.ok(netRes.outputLines.some(l => l.text?.includes('10BASE-T')));

  const topRes = executeSingleCommand('top', baseContext);
  assert.ok(topRes.outputLines.some(l => l.text?.includes('SYSTEM METRICS MONITOR')));

  const aiRes = executeSingleCommand('ai What is your military background?', baseContext);
  assert.ok(aiRes.outputLines.some(l => l.text?.includes('Officer Training School') || l.text?.includes('Warfighter Communications')));
});

