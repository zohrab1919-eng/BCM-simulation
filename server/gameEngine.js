'use strict';

const path = require('path');
const { PHASES, SCORING, LIMITS } = require('../shared/constants');

const scenarioDb = require('./data/scenario_database.json');

// ─── Session store (in-memory) ───────────────────────────────────────────────
const sessions = new Map();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateSessionCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = 'BCM-' + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (sessions.has(code));
  return code;
}

function getIndustry(industryId) {
  return scenarioDb.industries.find(i => i.id === industryId) || null;
}

function getScenario(industryId, scenarioId) {
  const industry = getIndustry(industryId);
  if (!industry) return null;
  return industry.scenarios.find(s => s.id === scenarioId) || null;
}

function getAllIndustries() {
  return scenarioDb.industries.map(i => ({
    id: i.id,
    name: i.name,
    archetype: i.archetype,
    sub_types: i.sub_types,
    default_departments: i.default_departments,
    scenarios: i.scenarios.map(s => ({ id: s.id, name: s.name, severity: s.severity, probability_weight: s.probability_weight }))
  }));
}

function randomScenario(industryId) {
  const industry = getIndustry(industryId);
  if (!industry || !industry.scenarios.length) return null;
  const total = industry.scenarios.reduce((sum, s) => sum + s.probability_weight, 0);
  let roll = Math.random() * total;
  for (const s of industry.scenarios) {
    roll -= s.probability_weight;
    if (roll <= 0) return s;
  }
  return industry.scenarios[industry.scenarios.length - 1];
}

function calculateWarChest(industryId, archetype, headcount) {
  const industry = getIndustry(industryId);
  if (!industry) return 500000;
  const base = industry.war_chest_base[headcount] || industry.war_chest_base.medium;
  const multiplier = industry.archetype_modifiers[archetype]?.war_chest_multiplier || 1.0;
  return Math.round(base * multiplier);
}

function makeInitialScores() {
  return { ...SCORING.STARTING_POINTS };
}

function clamp(val, min = 0, max = 100) {
  return Math.max(min, Math.min(max, val));
}

// ─── Session CRUD ─────────────────────────────────────────────────────────────

function createSession({ hostName, orgName, sessionName }) {
  const code = generateSessionCode();
  const now = Date.now();
  const session = {
    code,
    hostName,
    orgName,
    sessionName,
    createdAt: now,
    expiresAt: now + LIMITS.SESSION_EXPIRY_HOURS * 3600 * 1000,
    phase: PHASES.LOBBY,
    teams: new Map(),
    scenarioId: null,
    industryId: null,
    scenario: null,
    currentWaveIndex: 0,
    timerEndsAt: null,
    timerPaused: false,
    timerPausedRemaining: null,
    leaderboardVisible: true,
    hostSocketId: null,
    roundHistory: [],
    recoverySprint: false,
    recoverySprintDecisions: new Map(),
    gameEnded: false,
    broadcastMessage: null
  };
  sessions.set(code, session);
  scheduleExpiry(code);
  return session;
}

function scheduleExpiry(code) {
  const session = sessions.get(code);
  if (!session) return;
  const ttl = session.expiresAt - Date.now();
  if (ttl > 0) {
    setTimeout(() => sessions.delete(code), ttl);
  }
}

function getSession(code) {
  return sessions.get(code) || null;
}

function deleteSession(code) {
  sessions.delete(code);
}

// ─── Team management ─────────────────────────────────────────────────────────

function addTeam(sessionCode, teamData) {
  const session = getSession(sessionCode);
  if (!session) throw new Error('Session not found');
  if (session.teams.size >= LIMITS.MAX_TEAMS) throw new Error('Maximum teams reached');
  const teamId = 'T' + (session.teams.size + 1).toString().padStart(2, '0');
  const team = {
    id: teamId,
    name: teamData.name || `Team ${teamId}`,
    industryId: null,
    archetype: null,
    headcount: null,
    departments: [],
    members: new Map(),
    scores: makeInitialScores(),
    warChest: 0,
    startingWarChest: 0,
    spentWarChest: 0,
    setupComplete: false,
    currentDecisions: null,
    submittedWaves: new Set(),
    leverHistory: [],
    failedLevers: [],
    activatedDepartments: new Set()
  };
  session.teams.set(teamId, team);
  return team;
}

function addMember(sessionCode, teamId, memberData) {
  const session = getSession(sessionCode);
  if (!session) throw new Error('Session not found');
  const team = session.teams.get(teamId);
  if (!team) throw new Error('Team not found');
  if (team.members.size >= LIMITS.MAX_PLAYERS_PER_TEAM) return { role: 'observer', memberId: null };
  const memberId = 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  const member = {
    id: memberId,
    name: memberData.name || 'Participant',
    department: memberData.department || null,
    socketId: memberData.socketId || null,
    isObserver: false,
    connected: true
  };
  team.members.set(memberId, member);
  return { role: 'member', memberId, member };
}

function updateTeamSetup(sessionCode, teamId, setupData) {
  const session = getSession(sessionCode);
  if (!session) throw new Error('Session not found');
  const team = session.teams.get(teamId);
  if (!team) throw new Error('Team not found');

  if (setupData.name) team.name = setupData.name.slice(0, 60);
  if (setupData.industryId) team.industryId = setupData.industryId;
  if (setupData.archetype) team.archetype = setupData.archetype;
  if (setupData.headcount) team.headcount = setupData.headcount;
  if (setupData.departments) {
    team.departments = setupData.departments.slice(0, LIMITS.MAX_DEPARTMENTS);
  }
  if (setupData.memberAssignments) {
    for (const [memberId, dept] of Object.entries(setupData.memberAssignments)) {
      const member = team.members.get(memberId);
      if (member) member.department = dept;
    }
  }

  if (team.industryId && team.archetype && team.headcount && team.departments.length > 0) {
    team.warChest = calculateWarChest(team.industryId, team.archetype, team.headcount);
    team.startingWarChest = team.warChest;
    team.setupComplete = true;
  }

  return team;
}

// ─── Scenario selection ───────────────────────────────────────────────────────

function assignScenario(sessionCode, industryId, scenarioId) {
  const session = getSession(sessionCode);
  if (!session) throw new Error('Session not found');
  const scenario = scenarioId ? getScenario(industryId, scenarioId) : randomScenario(industryId);
  if (!scenario) throw new Error('Scenario not found');
  session.industryId = industryId;
  session.scenarioId = scenario.id;
  session.scenario = scenario;
  session.currentWaveIndex = 0;
  return scenario;
}

// ─── Phase advancement ────────────────────────────────────────────────────────

function advancePhase(sessionCode, toPhase) {
  const session = getSession(sessionCode);
  if (!session) throw new Error('Session not found');
  session.phase = toPhase;
  return session;
}

// ─── Wave / round processing ──────────────────────────────────────────────────

function getCurrentWave(session) {
  if (!session.scenario) return null;
  return session.scenario.escalation_waves[session.currentWaveIndex] || null;
}

function getAvailableLevers(teamDepartments, scenario) {
  if (!scenario) return [];
  return scenario.recovery_levers.map(lever => {
    const canActivate = lever.departments_required.every(d => teamDepartments.includes(d));
    return { ...lever, available: canActivate };
  });
}

function processRoundDecisions(session, waveIndex) {
  const wave = session.scenario.escalation_waves[waveIndex];
  if (!wave) return null;

  const outcomes = [];

  for (const [teamId, team] of session.teams) {
    const decisions = team.currentDecisions || { levers: [], waveIndex };
    const teamOutcome = processTeamRound(team, wave, decisions, session.scenario);
    outcomes.push({ teamId, teamName: team.name, ...teamOutcome });

    // Record history
    team.leverHistory.push({
      wave: waveIndex + 1,
      time_label: wave.time_label,
      leversSelected: decisions.levers,
      ...teamOutcome
    });

    // Reset current decisions
    team.currentDecisions = null;
    team.submittedWaves.add(waveIndex);
  }

  session.roundHistory.push({ waveIndex, wave, outcomes });
  return outcomes;
}

function processTeamRound(team, wave, decisions, scenario) {
  const selectedLeverIds = decisions.levers || [];
  const successfulLevers = [];
  const failedLevers = [];
  let totalSpent = 0;
  const scoreChanges = { financial: 0, regulatory: 0, reputation: 0, operational: 0 };

  // Track departments activated this wave
  for (const dept of wave.departments_activated) {
    team.activatedDepartments.add(dept);
  }

  // Process each selected lever
  for (const leverId of selectedLeverIds) {
    const lever = scenario.recovery_levers.find(l => l.id === leverId);
    if (!lever) continue;

    const cost = lever.war_chest_cost;
    if (team.warChest < cost) continue; // cannot afford (UI should prevent, but safety check)

    team.warChest -= cost;
    team.spentWarChest += cost;
    totalSpent += cost;

    const hasAllDepts = lever.departments_required.every(d => team.departments.includes(d));

    if (hasAllDepts) {
      successfulLevers.push(lever.id);
      for (const [dim, val] of Object.entries(lever.score_recovery)) {
        scoreChanges[dim] = (scoreChanges[dim] || 0) + val;
      }
    } else {
      failedLevers.push({ id: lever.id, label: lever.label, reason: lever.if_department_missing });
      team.failedLevers.push({ wave: wave.wave, id: lever.id, label: lever.label, reason: lever.if_department_missing });
    }
  }

  // Apply wave penalties
  const penaltyChanges = {
    financial: wave.financial_loss > 0 ? -Math.round(wave.financial_loss / 1000000 * 2) : 0,
    regulatory: -wave.regulatory_score_penalty,
    reputation: -wave.reputation_score_penalty,
    operational: -wave.operational_score_penalty
  };

  // Apply recovery to offset penalties
  for (const dim of ['financial', 'regulatory', 'reputation', 'operational']) {
    const net = (penaltyChanges[dim] || 0) + (scoreChanges[dim] || 0);
    team.scores[dim] = clamp(team.scores[dim] + net);
  }

  const warChestDepleted = team.warChest <= 0;

  return {
    successfulLevers,
    failedLevers,
    totalSpent,
    warChestRemaining: team.warChest,
    warChestDepleted,
    penaltyChanges,
    scoreChanges,
    scores: { ...team.scores },
    noActionTaken: selectedLeverIds.length === 0
  };
}

// ─── Final scoring ────────────────────────────────────────────────────────────

function calculateFinalScores(session) {
  const results = [];
  const totalWaves = session.scenario?.escalation_waves.length || 1;

  for (const [teamId, team] of session.teams) {
    const wavesWithAction = team.leverHistory.filter(h => h.successfulLevers.length > 0).length;
    const recoveryTurnaround = Math.round((wavesWithAction / totalWaves) * 100);

    // War chest bonus
    const remainingHundreds = Math.floor(team.warChest / 100000);
    const warChestBonus = Math.min(remainingHundreds * SCORING.WAR_CHEST_BONUS_PER_100K * 100, SCORING.WAR_CHEST_BONUS_MAX);
    const adjustedFinancial = clamp(team.scores.financial + warChestBonus);

    const resilience = Math.round(
      adjustedFinancial * 0.25 +
      team.scores.regulatory * 0.25 +
      team.scores.reputation * 0.25 +
      team.scores.operational * 0.15 +
      recoveryTurnaround * 0.10
    );

    results.push({
      teamId,
      teamName: team.name,
      scores: { ...team.scores, financial: adjustedFinancial },
      recoveryTurnaround,
      warChestBonus: Math.round(warChestBonus),
      warChest: { starting: team.startingWarChest, spent: team.spentWarChest, remaining: team.warChest },
      resilience,
      successfulLevers: team.leverHistory.flatMap(h => h.successfulLevers),
      failedLevers: team.failedLevers,
      activatedDepartments: Array.from(team.activatedDepartments)
    });
  }

  results.sort((a, b) => b.resilience - a.resilience);
  results.forEach((r, i) => { r.rank = i + 1; });

  return results;
}

// ─── Leaderboard snapshot ─────────────────────────────────────────────────────

function getLeaderboard(sessionCode) {
  const session = getSession(sessionCode);
  if (!session) return [];
  const snap = [];
  for (const [teamId, team] of session.teams) {
    const wavesWithAction = team.leverHistory.filter(h => h.successfulLevers.length > 0).length;
    const totalWaves = session.scenario?.escalation_waves.length || 1;
    const recoveryTurnaround = Math.round((wavesWithAction / totalWaves) * 100);
    const warChestBonus = Math.min(Math.floor(team.warChest / 100000) * 5, SCORING.WAR_CHEST_BONUS_MAX);
    const fin = clamp(team.scores.financial + warChestBonus);
    const resilience = Math.round(
      fin * 0.25 + team.scores.regulatory * 0.25 + team.scores.reputation * 0.25 +
      team.scores.operational * 0.15 + recoveryTurnaround * 0.10
    );
    snap.push({ teamId, teamName: team.name, scores: { ...team.scores }, resilience, warChest: team.warChest });
  }
  snap.sort((a, b) => b.resilience - a.resilience);
  snap.forEach((r, i) => { r.rank = i + 1; });
  return snap;
}

// ─── Serialise session for client ────────────────────────────────────────────

function serialiseSession(session) {
  const teams = [];
  for (const [id, t] of session.teams) {
    teams.push({
      id,
      name: t.name,
      industryId: t.industryId,
      archetype: t.archetype,
      headcount: t.headcount,
      departments: t.departments,
      memberCount: t.members.size,
      members: Array.from(t.members.values()).map(m => ({ id: m.id, name: m.name, department: m.department, isObserver: m.isObserver })),
      setupComplete: t.setupComplete,
      scores: t.scores,
      warChest: t.warChest,
      startingWarChest: t.startingWarChest
    });
  }
  return {
    code: session.code,
    hostName: session.hostName,
    orgName: session.orgName,
    sessionName: session.sessionName,
    phase: session.phase,
    industryId: session.industryId,
    scenarioId: session.scenarioId,
    scenario: session.scenario ? {
      id: session.scenario.id,
      name: session.scenario.name,
      severity: session.scenario.severity,
      trigger_text: session.scenario.trigger_text,
      threat_summary: session.scenario.threat_summary,
      totalWaves: session.scenario.escalation_waves.length
    } : null,
    currentWaveIndex: session.currentWaveIndex,
    timerEndsAt: session.timerEndsAt,
    timerPaused: session.timerPaused,
    timerPausedRemaining: session.timerPausedRemaining,
    leaderboardVisible: session.leaderboardVisible,
    teams,
    gameEnded: session.gameEnded,
    broadcastMessage: session.broadcastMessage
  };
}

module.exports = {
  sessions,
  generateSessionCode,
  getIndustry,
  getScenario,
  getAllIndustries,
  randomScenario,
  calculateWarChest,
  createSession,
  getSession,
  deleteSession,
  addTeam,
  addMember,
  updateTeamSetup,
  assignScenario,
  advancePhase,
  getCurrentWave,
  getAvailableLevers,
  processRoundDecisions,
  processTeamRound,
  calculateFinalScores,
  getLeaderboard,
  serialiseSession
};
