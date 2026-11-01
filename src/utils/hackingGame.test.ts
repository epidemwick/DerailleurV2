/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeLikeness,
  generateHexDumpNode,
  evaluateCandidateGuess,
  evaluateBracketSequence,
  getOperatorRankTitle,
  createInitialMudState,
  moveMudRoom,
  executeMudDefenseAction,
  getCounterToolForVector,
  parseAndExecuteMudCommand,
  talkToLocalAi,
  generateNemesisTrollTaunt,
  generatePeerPdaHelpCall,
  getEpidosTelemetryGuidance
} from './hackingGame';

test('getEpidosTelemetryGuidance provides context, sector directive, and binary BECAUSE hint', () => {
  const mud = createInitialMudState(1, 101, 88, undefined, 'cyberwolf');
  const inSectorGuidance = getEpidosTelemetryGuidance(mud);
  assert.ok(inSectorGuidance.contextSummary.length > 20);
  assert.ok(inSectorGuidance.sectorDirective.includes('BECAUSE'));
  assert.ok(inSectorGuidance.binaryHint.includes('Read into'));
  assert.ok(inSectorGuidance.binaryHint.includes('BECAUSE'));

  const movedAway = moveMudRoom(mud, 'bridge');
  const remoteGuidance = getEpidosTelemetryGuidance(movedAway);
  assert.ok(remoteGuidance.sectorDirective.includes('Go to [01: AI SANCTUARY]'));
  assert.ok(remoteGuidance.sectorDirective.includes('BECAUSE'));
  assert.ok(remoteGuidance.binaryHint.includes('BECAUSE'));
});

test('createInitialMudState initializes Wave 1 in sanctuary with Hackers (1995) bad AI and active local AI tether', () => {
  const mud = createInitialMudState(1, 101, 88, undefined, 'cyberwolf');
  assert.equal(mud.wave, 1);
  assert.equal(mud.currentRoom, 'sanctuary');
  assert.equal(mud.activeVirus.roomId, 'sanctuary');
  assert.equal(mud.status, 'active');
  assert.ok(mud.aiTether >= 80);
  assert.ok(mud.logs.length >= 4);
  assert.ok(
    mud.activeVirus.name.includes('THE PLAGUE') ||
      mud.activeVirus.name.includes('CRASH OVERRIDE') ||
      mud.activeVirus.name.includes('ACID BURN') ||
      mud.activeVirus.name.includes('CEREAL KILLER')
  );
});

test('generateNemesisTrollTaunt calls out individual operator handle with Hackers troll language', () => {
  const taunt = generateNemesisTrollTaunt('chadwick', 'wrong_tool', 1, 42, 'THE PLAGUE // DA-VINCI-VIRUS');
  assert.ok(taunt.includes('@chadwick'));
  assert.ok(taunt.includes('THE PLAGUE'));

  const peerHelp = generatePeerPdaHelpCall(1, '02: PROXIMITY AIRLOCK', 42);
  assert.ok(peerHelp.sender.length > 3);
  assert.ok(peerHelp.text.includes('02: PROXIMITY AIRLOCK'));
});

test('executeMudDefenseAction with matching counter tool damages and purges viral AI', () => {
  let mud = createInitialMudState(1, 202);
  const counterTool = getCounterToolForVector(mud.activeVirus.attackVector);

  const step1 = executeMudDefenseAction(mud, counterTool, 'epidemwick', 1);
  assert.ok(step1.nextState.activeVirus.hp < mud.activeVirus.hp);
  assert.ok(step1.scoreDelta > 0);
  assert.ok(step1.nemesisTaunt && step1.nemesisTaunt.includes('@epidemwick'));

  const step2 = executeMudDefenseAction(step1.nextState, counterTool, 'epidemwick', 1);
  assert.equal(step2.purged, true);
  assert.equal(step2.nextState.status, 'purged');
  assert.equal(step2.nextState.activeVirus.hp, 0);
  assert.ok(step2.scoreDelta >= 200);
});

test('executeMudDefenseAction with wrong tool deals 0 virus damage, reduces AI tether and PDA health, and roasts player', () => {
  const mud = createInitialMudState(1, 303);
  const counterTool = getCounterToolForVector(mud.activeVirus.attackVector);
  const wrongTool = counterTool === 'firewall' ? 'checksum' : 'firewall';

  const res = executeMudDefenseAction(mud, wrongTool, 'guest_op', 1);
  assert.equal(res.purged, false);
  assert.equal(res.nextState.activeVirus.hp, mud.activeVirus.hp);
  assert.ok(res.nextState.aiTether < mud.aiTether);
  assert.ok(res.nextState.deviceIntegrity < mud.deviceIntegrity);
  assert.ok(res.mechanicLesson.length > 10);
  assert.ok(res.nemesisTaunt && res.nemesisTaunt.includes('@guest_op'));
});

test('moveMudRoom and mesh_beacon work across the 5 PDA mesh rooms', () => {
  const mud = createInitialMudState(2, 404);
  const moved = moveMudRoom(mud, 'bridge');
  assert.equal(moved.currentRoom, 'bridge');

  const beaconRes = executeMudDefenseAction(moved, 'mesh_beacon', 'cyberwolf', 1);
  assert.ok(beaconRes.nextState.beaconsInRooms.bridge?.includes('cyberwolf'));
  assert.ok(beaconRes.scoreDelta >= 35);
});

test('parseAndExecuteMudCommand supports typed Linux commands, freeform mesh chat, and talkToLocalAi', () => {
  const mud = createInitialMudState(1, 505);
  const talked = talkToLocalAi(mud, 'what do i do?', 'epidemwick');
  assert.ok(talked.aiTether >= mud.aiTether);

  const chatRes = parseAndExecuteMudCommand(mud, 'say hey squad need backup in airlock!', 'epidemwick', 1);
  assert.ok(chatRes.nemesisTaunt && chatRes.nemesisTaunt.includes('@epidemwick'));

  const counterTool = getCounterToolForVector(mud.activeVirus.attackVector);
  const cmdRes = parseAndExecuteMudCommand(mud, counterTool, 'epidemwick', 1);
  assert.ok(cmdRes.nextState.activeVirus.hp < mud.activeVirus.hp);
});

test('computeLikeness counts exact positional character matches', () => {
  assert.equal(computeLikeness('PACKET', 'PACKET'), 6);
  assert.equal(computeLikeness('PACKET', 'SOCKET'), 4);
  assert.equal(computeLikeness('LINUX', 'ADMIN'), 0);
});

test('generateHexDumpNode creates valid candidates including targetWord', () => {
  const node = generateHexDumpNode(1, 12345);
  assert.equal(node.nodeLevel, 1);
  assert.equal(node.wordLength, 5);
  assert.equal(node.attemptsLeft, 4);
  assert.equal(node.status, 'active');
  assert.ok(node.candidates.includes(node.targetWord));
  assert.equal(node.brackets.length, 3);
});

test('evaluateCandidateGuess handles exact match and awards points', () => {
  const node = generateHexDumpNode(2, 999);
  const res = evaluateCandidateGuess(node, node.targetWord, 2);
  assert.equal(res.cracked, true);
  assert.equal(res.lockedOut, false);
  assert.equal(res.nextState.status, 'cracked');
  assert.ok(res.scoreDelta > 200);
});

test('evaluateCandidateGuess decrements attempts and locks out after 4 wrong tries', () => {
  let node = generateHexDumpNode(1, 42);
  const wrongWord = node.candidates.find(w => w !== node.targetWord) || 'WRONG';

  for (let i = 1; i <= 3; i++) {
    const step = evaluateCandidateGuess(node, wrongWord, 1);
    assert.equal(step.cracked, false);
    assert.equal(step.lockedOut, false);
    assert.equal(step.nextState.attemptsLeft, 4 - i);
    node = step.nextState;
  }

  const finalStep = evaluateCandidateGuess(node, wrongWord, 1);
  assert.equal(finalStep.lockedOut, true);
  assert.equal(finalStep.nextState.attemptsLeft, 0);
  assert.equal(finalStep.nextState.status, 'locked');
});

test('evaluateBracketSequence removes a dud candidate or resets tries', () => {
  const node = generateHexDumpNode(1, 777);
  const firstBracket = node.brackets[0];
  const res = evaluateBracketSequence(node, firstBracket.id);
  assert.equal(res.nextState.eliminatedDuds.length, 1);
  assert.notEqual(res.nextState.eliminatedDuds[0], node.targetWord);
  assert.ok(res.scoreDelta > 0);
});

test('getOperatorRankTitle scales with totalScore without 17DX prefix', () => {
  assert.equal(getOperatorRankTitle(0), 'TERMINAL PROBER');
  assert.equal(getOperatorRankTitle(1200), 'PACKET INTERCEPTOR');
  assert.equal(getOperatorRankTitle(12000), 'CYBER COMMANDER');
});
