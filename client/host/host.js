'use strict';

const socket = io();
let sessionCode = null;
let sessionData = null;
let joinUrl = null;
let qrUrl = null;
let currentWaveIndex = 0;
let timerInterval = null;
let selectedScenarioId = null;
let selectedIndustryId = null;
let isPaused = false;

// ─── Restore session from localStorage ────────────────────────────────────────
const savedCode = localStorage.getItem('bcm_host_session');
if (savedCode) {
  socket.emit('host:reconnect', { code: savedCode });
}

// ─── Setup screen ─────────────────────────────────────────────────────────────
document.getElementById('create-session-btn').addEventListener('click', () => {
  const hostName = document.getElementById('host-name').value.trim();
  const orgName = document.getElementById('org-name').value.trim();
  const sessionName = document.getElementById('session-name').value.trim();
  if (!hostName || !orgName) {
    showError('setup-error', 'Please enter your name and organisation.');
    return;
  }
  socket.emit('host:create_session', { hostName, orgName, sessionName });
});

document.getElementById('reconnect-btn').addEventListener('click', () => {
  const code = document.getElementById('reconnect-code').value.trim().toUpperCase();
  if (!code) return;
  socket.emit('host:reconnect', { code });
});

// ─── Socket events ─────────────────────────────────────────────────────────────
socket.on('game:session_created', ({ code, joinUrl: jUrl, qrUrl: qUrl, session }) => {
  initDashboard(code, jUrl, qUrl, session);
});

socket.on('game:state_restore', (session) => {
  const code = session.code;
  const jUrl = `${location.origin}/join/${code}`;
  const qUrl = `${location.origin}/session/${code}/qr.png`;
  initDashboard(code, jUrl, qUrl, session);
  renderPhase(session.phase);
  updateTeamList(session.teams);
  updateLeaderboard([]);
});

socket.on('host:team_update', ({ teams }) => {
  updateTeamList(teams);
  updateSetupProgress(teams);
  updateAdjTeamSelect(teams);
});

socket.on('host:team_submitted', ({ teamId, teamName }) => {
  markTeamSubmitted(teamId);
});

socket.on('host:scenario_assigned', ({ scenario }) => {
  // do nothing extra — already reflected in session
});

socket.on('game:wave_triggered', ({ wave, waveIndex }) => {
  currentWaveIndex = waveIndex;
  showWave(wave, waveIndex);
});

socket.on('game:timer_update', ({ remaining }) => {
  updateTimer(remaining);
});

socket.on('game:round_outcome', ({ waveIndex, outcomes }) => {
  showOutcomes(outcomes);
  updateLeaderboardFromOutcomes(outcomes);
});

socket.on('game:leaderboard_update', ({ leaderboard }) => {
  updateLeaderboard(leaderboard);
});

socket.on('game:phase_update', ({ phase, session }) => {
  if (session) sessionData = session;
  renderPhase(phase);
});

socket.on('game:paused', () => {
  isPaused = true;
  document.getElementById('pause-btn').textContent = '▶ Resume';
  document.getElementById('pause-btn').classList.add('btn-green');
});

socket.on('game:resumed', () => {
  isPaused = false;
  document.getElementById('pause-btn').textContent = '⏸ Pause';
  document.getElementById('pause-btn').classList.remove('btn-green');
});

socket.on('game:final_results', ({ finalScores }) => {
  showFinalResults(finalScores);
});

socket.on('host:all_waves_complete', ({ finalScores }) => {
  document.getElementById('recovery-sprint-btn').classList.add('btn-amber');
  showNotification('All waves complete! Trigger Recovery Sprint or End Simulation.');
});

socket.on('game:error', ({ message }) => {
  showNotification(message, 'error');
});

socket.on('host:reports_generating', () => {
  showNotification('Generating reports...');
});

socket.on('host:all_disconnected', () => {
  showNotification('All participants disconnected — simulation paused.', 'warn');
});

// ─── Init dashboard ────────────────────────────────────────────────────────────
function initDashboard(code, jUrl, qUrl, session) {
  sessionCode = code;
  joinUrl = jUrl;
  qrUrl = qUrl;
  sessionData = session;

  localStorage.setItem('bcm_host_session', code);

  document.getElementById('setup-screen').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('tb-code').textContent = code;
  document.getElementById('tb-org').textContent = session.orgName + (session.sessionName ? ' — ' + session.sessionName : '');
  document.getElementById('join-url-display').innerHTML = `Join URL: <strong>${jUrl}</strong>`;
  document.getElementById('join-url-text').textContent = jUrl;
  document.getElementById('qr-image').src = qUrl;
  document.getElementById('qr-download').href = qUrl;
  document.getElementById('download-reports-btn').href = `/api/session/${code}/reports`;

  loadIndustries();
  renderPhase(session.phase || 'LOBBY');
}

// ─── Industry / scenario loading ──────────────────────────────────────────────
function loadIndustries() {
  fetch('/api/industries').then(r => r.json()).then(industries => {
    const sel = document.getElementById('industry-select');
    industries.forEach(ind => {
      const opt = document.createElement('option');
      opt.value = ind.id;
      opt.textContent = ind.name;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => {
      selectedIndustryId = sel.value;
      if (sel.value) loadScenarios(industries.find(i => i.id === sel.value));
      else document.getElementById('scenario-list').classList.add('hidden');
    });
  });
}

function loadScenarios(industry) {
  selectedScenarioId = null;
  const list = document.getElementById('scenario-list');
  const cards = document.getElementById('scenario-cards');
  cards.innerHTML = '<div class="scenario-card" data-id="random"><div class="sc-name">🎲 Random Draw</div><div class="sc-meta">Scenario selected by weighted probability</div></div>';
  industry.scenarios.forEach(s => {
    const card = document.createElement('div');
    card.className = 'scenario-card';
    card.dataset.id = s.id;
    card.innerHTML = `<div class="sc-name">${s.name} <span class="severity-badge sev-${s.severity}">${s.severity}</span></div><div class="sc-meta">${s.id}</div>`;
    cards.appendChild(card);
  });
  cards.querySelectorAll('.scenario-card').forEach(c => {
    c.addEventListener('click', () => {
      cards.querySelectorAll('.scenario-card').forEach(x => x.classList.remove('selected'));
      c.classList.add('selected');
      selectedScenarioId = c.dataset.id === 'random' ? null : c.dataset.id;
    });
  });
  list.classList.remove('hidden');
}

// ─── Phase rendering ──────────────────────────────────────────────────────────
function renderPhase(phase) {
  const phases = ['lobby', 'setup', 'briefing', 'simulation', 'recovery', 'debrief'];
  phases.forEach(p => document.getElementById(`phase-${p}`)?.classList.add('hidden'));
  document.getElementById('phase-indicator').textContent = {
    LOBBY: 'Lobby', COMPANY_SETUP: 'Company Setup', THREAT_BRIEFING: 'Threat Briefing',
    SIMULATION: 'Simulation', RECOVERY_SPRINT: 'Recovery Sprint', DEBRIEF: 'Debrief'
  }[phase] || phase;

  const map = { LOBBY: 'lobby', COMPANY_SETUP: 'setup', THREAT_BRIEFING: 'briefing', SIMULATION: 'simulation', RECOVERY_SPRINT: 'recovery', DEBRIEF: 'debrief' };
  const el = document.getElementById(`phase-${map[phase]}`);
  if (el) el.classList.remove('hidden');

  if (phase === 'THREAT_BRIEFING' && sessionData?.scenario) {
    document.getElementById('trigger-text-display').textContent = sessionData.scenario.trigger_text;
  }
}

// ─── Team list ────────────────────────────────────────────────────────────────
function updateTeamList(teams) {
  const list = document.getElementById('team-list');
  document.getElementById('team-count').textContent = teams.length;
  list.innerHTML = '';
  teams.forEach(team => {
    const div = document.createElement('div');
    const status = team.setupComplete ? 'complete' : (team.memberCount > 0 ? 'setup' : 'waiting');
    div.className = `team-card ${team.setupComplete ? 'setup-complete' : ''}`;
    div.id = `team-card-${team.id}`;
    div.innerHTML = `
      <div class="team-name">${team.name}</div>
      <div class="team-meta">${team.memberCount} member${team.memberCount !== 1 ? 's' : ''} ${team.industryId ? '· ' + team.industryId : ''} ${team.archetype ? '· ' + team.archetype : ''}</div>
      <span class="team-status status-${status}">${status === 'complete' ? '✓ Ready' : status === 'setup' ? 'Setting up…' : 'Waiting'}</span>
    `;
    list.appendChild(div);
  });
}

function markTeamSubmitted(teamId) {
  const card = document.getElementById(`team-card-${teamId}`);
  if (card) {
    card.classList.add('submitted');
    const status = card.querySelector('.team-status');
    if (status) { status.textContent = '✓ Submitted'; status.className = 'team-status status-submitted'; }
  }
  updateSubmissionStatus();
}

function updateSubmissionStatus() {
  const cards = document.querySelectorAll('.team-card');
  const submitted = document.querySelectorAll('.team-card.submitted').length;
  const el = document.getElementById('submission-status');
  if (el) el.innerHTML = `<span style="color:var(--teal-light)">${submitted}</span> / ${cards.length} teams submitted`;
}

function updateSetupProgress(teams) {
  const total = teams.length;
  const ready = teams.filter(t => t.setupComplete).length;
  const pct = total ? Math.round((ready / total) * 100) : 0;
  const fill = document.getElementById('setup-progress-fill');
  const text = document.getElementById('setup-progress-text');
  if (fill) fill.style.width = pct + '%';
  if (text) text.textContent = `${ready} of ${total} teams ready`;
}

function updateAdjTeamSelect(teams) {
  const sel = document.getElementById('adj-team-select');
  const current = sel.value;
  sel.innerHTML = '<option value="">— Team —</option>';
  teams.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    sel.appendChild(opt);
  });
  if (current) sel.value = current;
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
function updateLeaderboard(leaderboard) {
  const list = document.getElementById('leaderboard-list');
  list.innerHTML = '';
  leaderboard.forEach((team, i) => {
    const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    const div = document.createElement('div');
    div.className = 'lb-row';
    div.innerHTML = `
      <div class="lb-rank ${rankClass}">${team.rank}</div>
      <div>
        <div class="lb-name">${team.teamName}</div>
        <div class="lb-dims">
          ${['financial','regulatory','reputation','operational'].map(d =>
            `<span class="lb-dim">${d[0].toUpperCase()}${team.scores[d]}</span>`
          ).join('')}
          <span style="font-size:10px;color:var(--grey)">RM ${(team.warChest||0).toLocaleString()}</span>
        </div>
      </div>
      <div class="lb-score">${team.resilience}</div>
    `;
    list.appendChild(div);
  });
}

function updateLeaderboardFromOutcomes(outcomes) {
  const snap = outcomes.map((o, i) => ({
    rank: i + 1, teamId: o.teamId, teamName: o.teamName,
    scores: o.scores, resilience: 0, warChest: o.warChestRemaining
  }));
  // Just refresh from leaderboard update event instead
}

// ─── Wave display ─────────────────────────────────────────────────────────────
function showWave(wave, waveIndex) {
  document.getElementById('wave-progress-label').textContent = `Wave ${waveIndex + 1}`;
  document.getElementById('wave-time-label').textContent = wave.time_label;
  document.getElementById('wave-event-text').textContent = wave.event;
  document.getElementById('round-outcomes').classList.add('hidden');

  // Reset submission status
  document.querySelectorAll('.team-card').forEach(c => {
    c.classList.remove('submitted');
    const status = c.querySelector('.team-status');
    if (status && c.classList.contains('setup-complete')) {
      status.textContent = 'In round'; status.className = 'team-status status-setup';
    }
  });
  updateSubmissionStatus();
}

// ─── Outcomes ─────────────────────────────────────────────────────────────────
function showOutcomes(outcomes) {
  const container = document.getElementById('outcomes-grid');
  container.innerHTML = '';
  outcomes.forEach(o => {
    const div = document.createElement('div');
    div.className = 'outcome-team';
    const dimChanges = ['financial','regulatory','reputation','operational'].map(d => {
      const pen = o.penaltyChanges?.[d] || 0;
      const rec = o.scoreChanges?.[d] || 0;
      const net = pen + rec;
      if (net === 0) return '';
      return `<span class="dim-badge ${net > 0 ? 'dim-pos' : 'dim-neg'}">${d[0].toUpperCase()} ${net > 0 ? '+' : ''}${net}</span>`;
    }).filter(Boolean).join('');

    div.innerHTML = `
      <div class="team-hdr">${o.teamName} ${o.noActionTaken ? '<span style="color:var(--red);font-size:11px">— No actions taken</span>' : ''}</div>
      <div class="dim-badges">${dimChanges || '<span class="lb-dim">No change</span>'}</div>
      ${o.failedLevers?.length ? `<div style="font-size:11px;color:var(--amber);margin-top:4px">⚠ ${o.failedLevers.length} lever(s) failed — dept missing</div>` : ''}
      <div style="font-size:11px;color:var(--grey);margin-top:4px">War chest: RM ${o.warChestRemaining?.toLocaleString()}</div>
    `;
    container.appendChild(div);
  });
  document.getElementById('round-outcomes').classList.remove('hidden');
}

// ─── Final results ─────────────────────────────────────────────────────────────
function showFinalResults(finalScores) {
  const el = document.getElementById('final-results-summary');
  el.innerHTML = `
    <div class="form-label" style="margin-bottom:8px">Final Leaderboard</div>
    ${finalScores.map(t => `
      <div style="background:rgba(255,255,255,0.06);border-radius:8px;padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:12px">
        <div style="font-size:24px;font-weight:700;color:var(--amber)">${t.rank}</div>
        <div style="flex:1">
          <div style="font-weight:700">${t.teamName}</div>
          <div style="font-size:12px;color:var(--grey)">${['financial','regulatory','reputation','operational'].map(d=>`${d[0].toUpperCase()}:${t.scores[d]}`).join(' · ')}</div>
        </div>
        <div style="font-size:28px;font-weight:700;color:var(--teal-light)">${t.resilience}</div>
      </div>
    `).join('')}
  `;
  if (sessionData?.scenario) {
    document.getElementById('debrief-notes').textContent = sessionData.scenario.debrief_notes || sessionData.scenario.threat_summary;
  }
}

// ─── Timer ────────────────────────────────────────────────────────────────────
function updateTimer(remaining) {
  const el = document.getElementById('timer-display');
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  el.textContent = `${mins}:${String(secs).padStart(2, '0')}`;
  el.className = 'timer-display' + (remaining <= 20 ? ' red' : remaining <= 60 ? ' amber' : '');
}

// ─── Control buttons ──────────────────────────────────────────────────────────
document.getElementById('qr-btn').addEventListener('click', () => {
  document.getElementById('qr-modal').classList.remove('hidden');
});

document.getElementById('pause-btn').addEventListener('click', () => {
  if (isPaused) socket.emit('host:resume', { code: sessionCode });
  else socket.emit('host:pause', { code: sessionCode });
});

document.getElementById('lb-toggle-btn').addEventListener('click', () => {
  const visible = !document.getElementById('lb-toggle-btn').textContent.includes('✓');
  socket.emit('host:toggle_leaderboard', { code: sessionCode, visible });
  document.getElementById('lb-toggle-btn').textContent = visible ? 'Leaderboard ✓' : 'Leaderboard ✗';
});

document.getElementById('start-setup-btn').addEventListener('click', () => {
  if (!selectedIndustryId) { showNotification('Please select an industry first.', 'warn'); return; }
  socket.emit('host:assign_scenario', { code: sessionCode, industryId: selectedIndustryId, scenarioId: selectedScenarioId });
  socket.emit('host:start_phase', { code: sessionCode, phase: 'COMPANY_SETUP' });
});

document.getElementById('start-briefing-btn').addEventListener('click', () => {
  socket.emit('host:start_phase', { code: sessionCode, phase: 'THREAT_BRIEFING' });
});

document.getElementById('start-sim-btn').addEventListener('click', () => {
  socket.emit('host:start_phase', { code: sessionCode, phase: 'SIMULATION' });
  socket.emit('host:trigger_wave', { code: sessionCode, waveIndex: 0 });
});

document.getElementById('extend-btn').addEventListener('click', () => {
  socket.emit('host:extend_timer', { code: sessionCode });
});

document.getElementById('skip-wave-btn').addEventListener('click', () => {
  socket.emit('host:skip_wave', { code: sessionCode });
});

document.getElementById('lock-round-btn').addEventListener('click', () => {
  socket.emit('host:lock_round', { code: sessionCode, waveIndex: currentWaveIndex });
});

document.getElementById('send-broadcast-btn').addEventListener('click', () => {
  const msg = document.getElementById('broadcast-input').value.trim();
  if (!msg) return;
  socket.emit('host:broadcast_message', { code: sessionCode, message: msg });
  document.getElementById('broadcast-bar').textContent = msg;
  document.getElementById('broadcast-bar').classList.remove('hidden');
  document.getElementById('broadcast-input').value = '';
  setTimeout(() => document.getElementById('broadcast-bar').classList.add('hidden'), 8000);
});

document.getElementById('recovery-sprint-btn').addEventListener('click', () => {
  socket.emit('host:end_simulation', { code: sessionCode, enableRecoverySprint: true });
});

document.getElementById('end-sim-btn').addEventListener('click', () => {
  if (confirm('End the simulation now and go straight to debrief?')) {
    socket.emit('host:end_simulation', { code: sessionCode, enableRecoverySprint: false });
  }
});

document.getElementById('adj-apply-btn').addEventListener('click', () => {
  const teamId = document.getElementById('adj-team-select').value;
  const dimension = document.getElementById('adj-dim-select').value;
  const delta = parseInt(document.getElementById('adj-delta').value);
  const reason = document.getElementById('adj-reason').value.trim();
  if (!teamId || !dimension || isNaN(delta)) { showNotification('Fill all adjustment fields.', 'warn'); return; }
  socket.emit('host:adjust_score', { code: sessionCode, teamId, dimension, delta, reason });
  document.getElementById('adj-delta').value = '';
  document.getElementById('adj-reason').value = '';
});

document.getElementById('rerun-btn').addEventListener('click', () => {
  if (confirm('Re-run? Team scores will reset. Setup is kept.')) {
    socket.emit('host:rerun', { code: sessionCode, changeScenario: false });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

function showNotification(msg, type = 'info') {
  const bar = document.getElementById('broadcast-bar');
  bar.textContent = msg;
  bar.style.background = type === 'error' ? 'var(--red)' : type === 'warn' ? 'var(--amber)' : 'var(--teal)';
  bar.style.color = type === 'error' ? '#fff' : 'var(--navy)';
  bar.classList.remove('hidden');
  setTimeout(() => bar.classList.add('hidden'), 5000);
}

// Close QR modal on overlay click
document.getElementById('qr-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
});
