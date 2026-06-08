'use strict';

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const QRCode = require('qrcode');

const engine = require('./gameEngine');
const { generateReports } = require('./templateGenerator');
const { PHASES, TIMERS, SOCKET_EVENTS, LIMITS } = require('../shared/constants');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// ─── Static files ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use('/host', express.static(path.join(__dirname, '../client/host')));
app.use('/participant', express.static(path.join(__dirname, '../client/participant')));
app.use('/leaderboard', express.static(path.join(__dirname, '../client/leaderboard')));
app.use('/shared', express.static(path.join(__dirname, '../shared')));

// ─── REST routes ───────────────────────────────────────────────────────────────

app.get('/', (req, res) => res.redirect('/host'));

app.get('/join/:code?', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/participant/index.html'));
});

app.get('/api/industries', (req, res) => {
  res.json(engine.getAllIndustries());
});

app.get('/api/session/:code', (req, res) => {
  const session = engine.getSession(req.params.code.toUpperCase());
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(engine.serialiseSession(session));
});

app.get('/session/:code/qr.png', async (req, res) => {
  const code = req.params.code.toUpperCase();
  const session = engine.getSession(code);
  if (!session) return res.status(404).send('Not found');
  try {
    const url = `${BASE_URL}/join/${code}`;
    const png = await QRCode.toBuffer(url, { type: 'png', width: 400, margin: 2 });
    res.set('Content-Type', 'image/png');
    res.send(png);
  } catch (e) {
    res.status(500).send('QR error');
  }
});

app.post('/api/session/:code/reports', async (req, res) => {
  const session = engine.getSession(req.params.code.toUpperCase());
  if (!session) return res.status(404).json({ error: 'Session not found' });
  try {
    const finalScores = engine.calculateFinalScores(session);
    const zipBuffer = await generateReports(session, finalScores);
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="BCM_Reports_${session.code}.zip"`
    });
    res.send(zipBuffer);
  } catch (e) {
    console.error('Report generation error:', e);
    res.status(500).json({ error: 'Report generation failed', detail: e.message });
  }
});

// ─── Timer helpers ─────────────────────────────────────────────────────────────

const activeTimers = new Map();

function startTimer(sessionCode, durationSeconds, onExpire) {
  clearTimer(sessionCode);
  const endsAt = Date.now() + durationSeconds * 1000;
  const session = engine.getSession(sessionCode);
  if (session) {
    session.timerEndsAt = endsAt;
    session.timerPaused = false;
  }
  const handle = setInterval(() => {
    const remaining = endsAt - Date.now();
    io.to(sessionCode).emit(SOCKET_EVENTS.GAME_TIMER_UPDATE, { remaining: Math.max(0, Math.ceil(remaining / 1000)), endsAt });
    if (remaining <= 0) {
      clearTimer(sessionCode);
      onExpire();
    }
  }, 1000);
  activeTimers.set(sessionCode, { handle, endsAt, onExpire });
}

function clearTimer(sessionCode) {
  const t = activeTimers.get(sessionCode);
  if (t) { clearInterval(t.handle); activeTimers.delete(sessionCode); }
  const session = engine.getSession(sessionCode);
  if (session) { session.timerEndsAt = null; session.timerPaused = false; }
}

function pauseTimer(sessionCode) {
  const t = activeTimers.get(sessionCode);
  const session = engine.getSession(sessionCode);
  if (!t || !session || session.timerPaused) return;
  clearInterval(t.handle);
  const remaining = Math.max(0, Math.ceil((t.endsAt - Date.now()) / 1000));
  session.timerPaused = true;
  session.timerPausedRemaining = remaining;
  activeTimers.set(sessionCode, { ...t, handle: null });
}

function resumeTimer(sessionCode) {
  const session = engine.getSession(sessionCode);
  if (!session || !session.timerPaused) return;
  const remaining = session.timerPausedRemaining || 60;
  const t = activeTimers.get(sessionCode);
  const onExpire = t?.onExpire || (() => {});
  session.timerPaused = false;
  session.timerPausedRemaining = null;
  startTimer(sessionCode, remaining, onExpire);
}

function extendTimer(sessionCode) {
  const t = activeTimers.get(sessionCode);
  const session = engine.getSession(sessionCode);
  if (!t || !session || session.timerPaused) return;
  clearInterval(t.handle);
  const remaining = Math.max(0, Math.ceil((t.endsAt - Date.now()) / 1000));
  startTimer(sessionCode, remaining + TIMERS.EXTEND_AMOUNT, t.onExpire);
}

// ─── Socket.io ────────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  // ── Host creates session ──────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.HOST_CREATE_SESSION, ({ hostName, orgName, sessionName }) => {
    try {
      const session = engine.createSession({ hostName, orgName, sessionName });
      session.hostSocketId = socket.id;
      socket.join(session.code);
      socket.join(session.code + ':host');
      socket.emit(SOCKET_EVENTS.GAME_SESSION_CREATED, {
        code: session.code,
        joinUrl: `${BASE_URL}/join/${session.code}`,
        qrUrl: `${BASE_URL}/session/${session.code}/qr.png`,
        session: engine.serialiseSession(session)
      });
    } catch (e) {
      socket.emit(SOCKET_EVENTS.GAME_ERROR, { message: e.message });
    }
  });

  // ── Host reconnects ────────────────────────────────────────────────────────
  socket.on('host:reconnect', ({ code }) => {
    const session = engine.getSession(code?.toUpperCase());
    if (!session) return socket.emit(SOCKET_EVENTS.GAME_ERROR, { message: 'Session not found' });
    session.hostSocketId = socket.id;
    socket.join(session.code);
    socket.join(session.code + ':host');
    socket.emit(SOCKET_EVENTS.GAME_STATE_RESTORE, engine.serialiseSession(session));
  });

  // ── Participant joins ──────────────────────────────────────────────────────
  socket.on('participant:join', ({ code, teamId, teamName, memberName, memberId }) => {
    const uCode = code?.toUpperCase();
    const session = engine.getSession(uCode);
    if (!session) return socket.emit(SOCKET_EVENTS.GAME_ERROR, { message: 'Session not found. Check your code and try again.' });

    let team = teamId ? session.teams.get(teamId) : null;

    // New team
    if (!team && teamName) {
      if (session.teams.size >= LIMITS.MAX_TEAMS) return socket.emit(SOCKET_EVENTS.GAME_ERROR, { message: 'This session has reached the maximum number of teams.' });
      team = engine.addTeam(uCode, { name: teamName });
      // Pre-seed default departments if industry is already assigned
      if (session.industryId && team.departments.length === 0) {
        const industry = engine.getIndustry(session.industryId);
        if (industry?.default_departments?.length) {
          team.departments = [...industry.default_departments];
        }
      }
    }
    if (!team) return socket.emit(SOCKET_EVENTS.GAME_ERROR, { message: 'No team found. Please create or select a team.' });

    // Returning member
    let member = memberId ? team.members.get(memberId) : null;
    let role = 'member';

    if (!member) {
      const result = engine.addMember(uCode, team.id, { name: memberName || 'Participant', socketId: socket.id });
      role = result.role;
      member = result.member;
    } else {
      member.socketId = socket.id;
      member.connected = true;
    }

    socket.join(uCode);
    socket.join(`${uCode}:${team.id}`);
    socket.data = { sessionCode: uCode, teamId: team.id, memberId: member?.id, role };

    socket.emit('participant:joined', {
      teamId: team.id,
      memberId: member?.id,
      role,
      session: engine.serialiseSession(session),
      team: engine.serialiseSession(session).teams.find(t => t.id === team.id)
    });

    // Notify host
    io.to(uCode + ':host').emit('host:team_update', { teams: engine.serialiseSession(session).teams });
  });

  // ── Team setup update ──────────────────────────────────────────────────────
  socket.on('team:update_setup', ({ sessionCode, teamId, setupData }) => {
    const code = sessionCode?.toUpperCase();
    const session = engine.getSession(code);
    if (!session) return socket.emit(SOCKET_EVENTS.GAME_ERROR, { message: 'Session not found' });
    try {
      engine.updateTeamSetup(code, teamId, setupData);
      const serialised = engine.serialiseSession(session);
      socket.emit('team:setup_updated', { team: serialised.teams.find(t => t.id === teamId) });
      io.to(code + ':host').emit('host:team_update', { teams: serialised.teams });
    } catch (e) {
      socket.emit(SOCKET_EVENTS.GAME_ERROR, { message: e.message });
    }
  });

  // ── Host assigns scenario ──────────────────────────────────────────────────
  socket.on('host:assign_scenario', ({ code, industryId, scenarioId }) => {
    const session = engine.getSession(code?.toUpperCase());
    if (!session) return;
    try {
      const scenario = engine.assignScenario(code.toUpperCase(), industryId, scenarioId || null);
      io.to(code.toUpperCase() + ':host').emit('host:scenario_assigned', { scenario });
    } catch (e) {
      socket.emit(SOCKET_EVENTS.GAME_ERROR, { message: e.message });
    }
  });

  // ── Host advances phase ────────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.HOST_START_PHASE, ({ code, phase }) => {
    const uCode = code?.toUpperCase();
    const session = engine.getSession(uCode);
    if (!session) return;

    // Seed default departments into teams that haven't set up yet
    if (phase === PHASES.COMPANY_SETUP && session.industryId) {
      const industry = engine.getIndustry(session.industryId);
      if (industry?.default_departments?.length) {
        for (const [, team] of session.teams) {
          if (team.departments.length === 0) {
            team.departments = [...industry.default_departments];
          }
        }
      }
    }

    engine.advancePhase(uCode, phase);
    io.to(uCode).emit(SOCKET_EVENTS.GAME_PHASE_UPDATE, { phase, session: engine.serialiseSession(session) });

    if (phase === PHASES.THREAT_BRIEFING) {
      // Start briefing countdown then auto-advance to simulation after 3 min
      startTimer(uCode, TIMERS.THREAT_BRIEFING_PHASE, () => {
        engine.advancePhase(uCode, PHASES.SIMULATION);
        io.to(uCode).emit(SOCKET_EVENTS.GAME_PHASE_UPDATE, { phase: PHASES.SIMULATION, session: engine.serialiseSession(session) });
        triggerWave(uCode, 0);
      });
    }
  });

  // ── Host triggers wave manually ────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.HOST_TRIGGER_WAVE, ({ code, waveIndex }) => {
    const uCode = code?.toUpperCase();
    triggerWave(uCode, waveIndex);
  });

  // ── Team submits decisions ─────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.TEAM_SUBMIT_DECISIONS, ({ sessionCode, teamId, levers, waveIndex }) => {
    const uCode = sessionCode?.toUpperCase();
    const session = engine.getSession(uCode);
    if (!session) return;
    const team = session.teams.get(teamId);
    if (!team) return;
    team.currentDecisions = { levers: levers || [], waveIndex };
    io.to(uCode + ':host').emit('host:team_submitted', { teamId, teamName: team.name });
    socket.emit('team:decisions_confirmed', { teamId, levers });
  });

  // ── Host locks round (process all decisions) ───────────────────────────────
  socket.on('host:lock_round', ({ code, waveIndex }) => {
    const uCode = code?.toUpperCase();
    lockRound(uCode, waveIndex);
  });

  // ── Host pause/resume ──────────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.HOST_PAUSE, ({ code }) => {
    const uCode = code?.toUpperCase();
    pauseTimer(uCode);
    const session = engine.getSession(uCode);
    if (session) io.to(uCode).emit('game:paused', { remaining: session.timerPausedRemaining });
  });

  socket.on(SOCKET_EVENTS.HOST_RESUME, ({ code }) => {
    const uCode = code?.toUpperCase();
    resumeTimer(uCode);
    io.to(uCode).emit('game:resumed', {});
  });

  // ── Host extends timer ─────────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.HOST_EXTEND_TIMER, ({ code }) => {
    extendTimer(code?.toUpperCase());
    io.to(code.toUpperCase()).emit('game:timer_extended', { added: TIMERS.EXTEND_AMOUNT });
  });

  // ── Host skips wave ────────────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.HOST_SKIP_WAVE, ({ code }) => {
    const uCode = code?.toUpperCase();
    const session = engine.getSession(uCode);
    if (!session) return;
    clearTimer(uCode);
    advanceToNextWave(uCode);
  });

  // ── Host broadcast message ─────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.HOST_BROADCAST_MESSAGE, ({ code, message }) => {
    const uCode = code?.toUpperCase();
    const session = engine.getSession(uCode);
    if (session) session.broadcastMessage = message;
    io.to(uCode).emit(SOCKET_EVENTS.GAME_BROADCAST, { message });
  });

  // ── Host adjust score ──────────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.HOST_ADJUST_SCORE, ({ code, teamId, dimension, delta, reason }) => {
    const uCode = code?.toUpperCase();
    const session = engine.getSession(uCode);
    if (!session) return;
    const team = session.teams.get(teamId);
    if (!team) return;
    if (team.scores[dimension] !== undefined) {
      team.scores[dimension] = Math.max(0, Math.min(100, team.scores[dimension] + delta));
    }
    io.to(uCode).emit(SOCKET_EVENTS.GAME_LEADERBOARD_UPDATE, {
      leaderboard: engine.getLeaderboard(uCode),
      reason: `Host adjusted ${dimension} for ${team.name}: ${delta > 0 ? '+' : ''}${delta} (${reason})`
    });
  });

  // ── Host toggle leaderboard ────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.HOST_TOGGLE_LEADERBOARD, ({ code, visible }) => {
    const session = engine.getSession(code?.toUpperCase());
    if (session) session.leaderboardVisible = visible;
    io.to(code.toUpperCase()).emit('game:leaderboard_visibility', { visible });
  });

  // ── Host end simulation ────────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.HOST_END_SIMULATION, ({ code, enableRecoverySprint }) => {
    const uCode = code?.toUpperCase();
    clearTimer(uCode);
    const session = engine.getSession(uCode);
    if (!session) return;
    if (enableRecoverySprint) {
      startRecoverySprint(uCode);
    } else {
      endGame(uCode);
    }
  });

  // ── Host re-run ────────────────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.HOST_RERUN, ({ code, changeScenario }) => {
    const uCode = code?.toUpperCase();
    const session = engine.getSession(uCode);
    if (!session) return;
    clearTimer(uCode);
    // Reset team scores but keep setup
    for (const [, team] of session.teams) {
      team.scores = { financial: 25, regulatory: 25, reputation: 25, operational: 25 };
      team.warChest = team.startingWarChest;
      team.spentWarChest = 0;
      team.currentDecisions = null;
      team.submittedWaves = new Set();
      team.leverHistory = [];
      team.failedLevers = [];
      team.activatedDepartments = new Set();
    }
    session.currentWaveIndex = 0;
    session.roundHistory = [];
    session.gameEnded = false;
    session.phase = changeScenario ? PHASES.COMPANY_SETUP : PHASES.THREAT_BRIEFING;
    io.to(uCode).emit(SOCKET_EVENTS.GAME_PHASE_UPDATE, { phase: session.phase, session: engine.serialiseSession(session) });
  });

  // ── Host generate reports ──────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.HOST_GENERATE_REPORTS, ({ code }) => {
    socket.emit('host:reports_generating', {});
  });

  // ── Disconnect ─────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const { sessionCode, teamId, memberId } = socket.data || {};
    if (!sessionCode) return;
    const session = engine.getSession(sessionCode);
    if (!session) return;
    const team = session.teams.get(teamId);
    if (team && memberId) {
      const member = team.members.get(memberId);
      if (member) member.connected = false;
    }
    // Check if all participants disconnected
    let anyConnected = false;
    for (const [, t] of session.teams) {
      for (const [, m] of t.members) {
        if (m.connected) { anyConnected = true; break; }
      }
    }
    if (!anyConnected && !session.timerPaused) {
      pauseTimer(sessionCode);
      io.to(sessionCode + ':host').emit('host:all_disconnected', {});
    }
  });
});

// ─── Wave management helpers ──────────────────────────────────────────────────

function triggerWave(sessionCode, waveIndex) {
  const session = engine.getSession(sessionCode);
  if (!session || !session.scenario) return;
  const wave = session.scenario.escalation_waves[waveIndex];
  if (!wave) return;

  session.currentWaveIndex = waveIndex;

  // Build available levers per team (filtered by their departments)
  const teamLevers = {};
  for (const [teamId, team] of session.teams) {
    teamLevers[teamId] = engine.getAvailableLevers(team.departments, session.scenario);
  }

  io.to(sessionCode).emit('game:wave_triggered', {
    wave: { ...wave, waveNumber: waveIndex + 1, totalWaves: session.scenario.escalation_waves.length },
    waveIndex,
    teamLevers
  });

  // Send levers per team (room-specific)
  for (const [teamId, levers] of Object.entries(teamLevers)) {
    io.to(`${sessionCode}:${teamId}`).emit('team:available_levers', { levers, wave, waveIndex });
  }

  // Decision window timer
  startTimer(sessionCode, TIMERS.DECISION_WINDOW_DEFAULT, () => {
    lockRound(sessionCode, waveIndex);
  });
}

function lockRound(sessionCode, waveIndex) {
  const session = engine.getSession(sessionCode);
  if (!session) return;
  clearTimer(sessionCode);

  const outcomes = engine.processRoundDecisions(session, waveIndex);
  if (!outcomes) return;

  const leaderboard = engine.getLeaderboard(sessionCode);

  io.to(sessionCode).emit(SOCKET_EVENTS.GAME_ROUND_OUTCOME, { waveIndex, outcomes });
  io.to(sessionCode).emit(SOCKET_EVENTS.GAME_LEADERBOARD_UPDATE, { leaderboard });

  // Send team-specific outcome
  for (const outcome of outcomes) {
    io.to(`${sessionCode}:${outcome.teamId}`).emit('team:round_outcome', outcome);
    if (outcome.warChestDepleted) {
      io.to(`${sessionCode}:${outcome.teamId}`).emit(SOCKET_EVENTS.GAME_WAR_CHEST_DEPLETED, {});
    }
  }

  // Inter-round pause then advance
  setTimeout(() => advanceToNextWave(sessionCode), TIMERS.INTER_ROUND_PAUSE * 1000);
}

function advanceToNextWave(sessionCode) {
  const session = engine.getSession(sessionCode);
  if (!session || !session.scenario) return;

  const nextIndex = session.currentWaveIndex + 1;
  const totalWaves = session.scenario.escalation_waves.length;

  if (nextIndex >= totalWaves) {
    // All waves done — check if recovery sprint
    io.to(sessionCode + ':host').emit('host:all_waves_complete', {
      finalScores: engine.calculateFinalScores(session)
    });
  } else {
    triggerWave(sessionCode, nextIndex);
  }
}

function startRecoverySprint(sessionCode) {
  const session = engine.getSession(sessionCode);
  if (!session) return;
  session.phase = PHASES.RECOVERY_SPRINT;
  session.recoverySprint = true;

  const teamLevers = {};
  for (const [teamId, team] of session.teams) {
    teamLevers[teamId] = engine.getAvailableLevers(team.departments, session.scenario);
  }

  io.to(sessionCode).emit(SOCKET_EVENTS.GAME_PHASE_UPDATE, { phase: PHASES.RECOVERY_SPRINT });
  io.to(sessionCode).emit('game:recovery_sprint_start', { teamLevers });

  startTimer(sessionCode, TIMERS.RECOVERY_SPRINT_WINDOW, () => {
    // Process sprint decisions (use last wave index as placeholder)
    engine.processRoundDecisions(session, session.currentWaveIndex);
    endGame(sessionCode);
  });
}

function endGame(sessionCode) {
  const session = engine.getSession(sessionCode);
  if (!session) return;
  clearTimer(sessionCode);
  session.gameEnded = true;
  session.phase = PHASES.DEBRIEF;
  const finalScores = engine.calculateFinalScores(session);
  io.to(sessionCode).emit(SOCKET_EVENTS.GAME_PHASE_UPDATE, { phase: PHASES.DEBRIEF });
  io.to(sessionCode).emit('game:final_results', { finalScores, leaderboard: finalScores });
}

// ─── Start server ─────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`\nEnablerz BCM Simulation running on port ${PORT}`);
  console.log(`Host dashboard: http://localhost:${PORT}/host`);
  console.log(`Participant join: http://localhost:${PORT}/join`);
  console.log(`Leaderboard: http://localhost:${PORT}/leaderboard\n`);
});
