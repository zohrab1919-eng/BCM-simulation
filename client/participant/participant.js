'use strict';

const socket = io();

let sessionCode = null;
let teamId = null;
let memberId = null;
let myDepartments = [];
let selectedLevers = new Set();
let currentWaveIndex = null;
let warChest = 0;
let isSubmitted = false;
let isWarChestDepleted = false;
let currentLevers = [];

// ─── Restore from localStorage ────────────────────────────────────────────────
const saved = JSON.parse(localStorage.getItem('bcm_participant') || '{}');
if (saved.code && saved.teamId && saved.memberId) {
  sessionCode = saved.code;
  teamId = saved.teamId;
  memberId = saved.memberId;
  const codeInput = document.getElementById('session-code-input');
  if (codeInput) codeInput.value = saved.code;
}

// Pre-fill from URL path /join/BCM-XXXX
const pathCode = window.location.pathname.split('/join/')[1];
if (pathCode) document.getElementById('session-code-input').value = pathCode.toUpperCase();

// ─── Join ──────────────────────────────────────────────────────────────────────
document.getElementById('join-btn').addEventListener('click', () => {
  const code = document.getElementById('session-code-input').value.trim().toUpperCase();
  const memberName = document.getElementById('member-name-input').value.trim();
  const teamName = document.getElementById('team-name-input').value.trim();
  if (!code || !memberName) { showError('join-error', 'Please enter your session code and name.'); return; }
  sessionCode = code;
  socket.emit('participant:join', { code, teamName, memberName, memberId: saved.memberId || null });
});

// ─── Socket events ─────────────────────────────────────────────────────────────
socket.on('participant:joined', ({ teamId: tId, memberId: mId, role, session, team }) => {
  teamId = tId;
  memberId = mId;
  localStorage.setItem('bcm_participant', JSON.stringify({ code: sessionCode, teamId, memberId }));

  document.getElementById('header-team-name').textContent = team?.name || 'Your Team';
  document.getElementById('sticky-header').classList.remove('hidden');
  warChest = team?.warChest || 0;
  updateWarChestDisplay();

  if (role === 'observer') {
    showScreen('lobby-screen');
    document.querySelector('#lobby-screen #waiting-display h3').textContent = 'Joined as Observer';
    document.querySelector('#lobby-screen #waiting-display p').textContent = 'Team is full. You can watch but not make decisions.';
    return;
  }

  renderPhase(session.phase, session, team);
  populateSetupDepts(team);
});

socket.on('game:phase_update', ({ phase, session }) => {
  const team = session?.teams?.find(t => t.id === teamId);
  if (team) {
    warChest = team.warChest;
    updateWarChestDisplay();
  }
  renderPhase(phase, session, team);
});

socket.on('team:available_levers', ({ levers, wave, waveIndex }) => {
  currentWaveIndex = waveIndex;
  currentLevers = levers;
  isSubmitted = false;
  selectedLevers.clear();
  showWaveDecision(wave, levers);
});

socket.on('team:decisions_confirmed', () => {
  isSubmitted = true;
  document.getElementById('submission-badge').classList.remove('hidden');
  showScreen('simulation-screen');
  document.getElementById('lever-section').classList.add('hidden');
  document.getElementById('submitted-wait').classList.remove('hidden');
});

socket.on('team:round_outcome', (outcome) => {
  isSubmitted = false;
  document.getElementById('submission-badge').classList.add('hidden');
  showRoundOutcome(outcome);
  updateScores(outcome.scores);
  warChest = outcome.warChestRemaining;
  updateWarChestDisplay();
  if (outcome.warChestDepleted) {
    isWarChestDepleted = true;
    document.getElementById('depleted-banner').style.display = 'block';
  }
});

socket.on('game:round_outcome', ({ outcomes }) => {
  const myOutcome = outcomes?.find(o => o.teamId === teamId);
  if (myOutcome) {
    updateScores(myOutcome.scores);
    warChest = myOutcome.warChestRemaining;
    updateWarChestDisplay();
  }
});

socket.on('game:wave_triggered', ({ wave, waveIndex, teamLevers }) => {
  currentWaveIndex = waveIndex;
  const myLevers = teamLevers?.[teamId] || [];
  currentLevers = myLevers;
  isSubmitted = false;
  selectedLevers.clear();
  document.getElementById('submission-badge').classList.add('hidden');
  showWaveDecision(wave, myLevers);
});

socket.on('game:paused', ({ remaining }) => {
  document.getElementById('timer-label').textContent = '⏸ Paused';
  document.getElementById('countdown').style.color = 'var(--grey)';
});

socket.on('game:resumed', () => {
  document.getElementById('timer-label').textContent = 'Decision Window';
});

socket.on('game:timer_update', ({ remaining }) => {
  updateCountdown(remaining);
});

socket.on('game:broadcast', ({ message }) => {
  showBroadcast(message);
});

socket.on('game:leaderboard_visibility', ({ visible }) => {
  // No-op on participant — scores always visible
});

socket.on('game:war_chest_depleted', () => {
  isWarChestDepleted = true;
  document.getElementById('depleted-banner').style.display = 'block';
  document.getElementById('submit-decisions-btn').disabled = true;
});

socket.on('game:recovery_sprint_start', ({ teamLevers }) => {
  const myLevers = teamLevers?.[teamId] || [];
  showRecoverySprint(myLevers);
});

socket.on('game:final_results', ({ finalScores }) => {
  const myResult = finalScores?.find(r => r.teamId === teamId);
  showDebrief(myResult);
});

socket.on('game:state_restore', (session) => {
  const team = session?.teams?.find(t => t.id === teamId);
  if (team) {
    warChest = team.warChest;
    updateWarChestDisplay();
    document.getElementById('header-team-name').textContent = team.name;
    document.getElementById('sticky-header').classList.remove('hidden');
  }
  renderPhase(session.phase, session, team);
});

socket.on('game:error', ({ message }) => {
  showError('join-error', message);
});

// ─── Phase rendering ──────────────────────────────────────────────────────────
function renderPhase(phase, session, team) {
  document.getElementById('phase-label').textContent = {
    LOBBY: 'Lobby', COMPANY_SETUP: 'Company Setup', THREAT_BRIEFING: 'Threat Briefing',
    SIMULATION: 'Simulation', RECOVERY_SPRINT: 'Recovery Sprint', DEBRIEF: 'Debrief & Results'
  }[phase] || phase;

  switch (phase) {
    case 'LOBBY':
      showScreen('lobby-screen');
      break;
    case 'COMPANY_SETUP':
      showScreen('setup-screen');
      if (team) populateSetupDepts(team);
      break;
    case 'THREAT_BRIEFING':
      showScreen('briefing-screen');
      if (session?.scenario) {
        document.getElementById('briefing-trigger-text').textContent = session.scenario.trigger_text;
        showDisruptionOverlay(session.scenario.trigger_text);
      }
      break;
    case 'SIMULATION':
      showScreen('simulation-screen');
      document.getElementById('timer-bar').classList.remove('hidden');
      document.getElementById('score-dashboard-wrap').classList.remove('hidden');
      if (team) updateScores(team.scores);
      break;
    case 'RECOVERY_SPRINT':
      showScreen('recovery-screen');
      break;
    case 'DEBRIEF':
      showScreen('debrief-screen');
      document.getElementById('timer-bar').classList.add('hidden');
      break;
  }
}

// ─── Company setup ────────────────────────────────────────────────────────────
function populateSetupDepts(team) {
  const defaultDepts = team?.departments || [];
  myDepartments = [...defaultDepts];
  renderDeptChips();
  updateMyDeptSelect();
}

function renderDeptChips() {
  const container = document.getElementById('dept-chips');
  container.innerHTML = '';
  myDepartments.forEach((dept, idx) => {
    const chip = document.createElement('span');
    chip.className = 'dept-chip selected';
    chip.innerHTML = `${dept} <span class="remove" data-idx="${idx}" style="cursor:pointer;font-size:14px">✕</span>`;
    chip.querySelector('.remove').addEventListener('click', (e) => {
      e.stopPropagation();
      myDepartments.splice(idx, 1);
      renderDeptChips();
      updateMyDeptSelect();
    });
    container.appendChild(chip);
  });
  updateWarChestPreview();
}

function updateMyDeptSelect() {
  const sel = document.getElementById('my-dept-select');
  const current = sel.value;
  sel.innerHTML = '<option value="">— Select your department —</option>';
  myDepartments.forEach(dept => {
    const opt = document.createElement('option');
    opt.value = dept;
    opt.textContent = dept;
    sel.appendChild(opt);
  });
  if (current && myDepartments.includes(current)) sel.value = current;
}

function updateWarChestPreview() {
  const archetype = document.getElementById('archetype-select').value;
  const headcount = document.getElementById('headcount-select').value;
  const preview = document.getElementById('war-chest-preview');
  if (archetype && headcount) {
    preview.textContent = 'War Chest will be calculated once you save.';
    preview.classList.remove('hidden');
  }
}

document.getElementById('add-dept-btn').addEventListener('click', () => {
  const input = document.getElementById('custom-dept-input');
  const val = input.value.trim();
  if (!val) return;
  if (myDepartments.length >= 10) { alert('Maximum 10 departments.'); return; }
  if (!myDepartments.includes(val)) {
    myDepartments.push(val);
    renderDeptChips();
    updateMyDeptSelect();
  }
  input.value = '';
});

document.getElementById('custom-dept-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('add-dept-btn').click();
});

document.getElementById('archetype-select').addEventListener('change', updateWarChestPreview);
document.getElementById('headcount-select').addEventListener('change', updateWarChestPreview);

document.getElementById('save-setup-btn').addEventListener('click', () => {
  const companyName = document.getElementById('company-name-input').value.trim();
  const archetype = document.getElementById('archetype-select').value;
  const headcount = document.getElementById('headcount-select').value;
  const myDept = document.getElementById('my-dept-select').value;

  if (!companyName || !archetype || !headcount) {
    showError('setup-error', 'Please fill in Company Name, Archetype, and Size.');
    return;
  }
  if (myDepartments.length === 0) {
    showError('setup-error', 'Please select at least one department.');
    return;
  }

  const memberAssignments = {};
  if (memberId && myDept) memberAssignments[memberId] = myDept;

  socket.emit('team:update_setup', {
    sessionCode,
    teamId,
    setupData: { name: companyName, archetype, headcount, departments: myDepartments, memberAssignments }
  });

  document.getElementById('setup-saved').classList.remove('hidden');
  document.getElementById('save-setup-btn').textContent = '✓ Saved';
  document.getElementById('save-setup-btn').style.background = 'var(--green)';
});

socket.on('team:setup_updated', ({ team }) => {
  warChest = team?.warChest || warChest;
  updateWarChestDisplay();
  if (team?.warChest) {
    document.getElementById('war-chest-preview').textContent = `War Chest: RM ${team.warChest.toLocaleString()}`;
    document.getElementById('war-chest-preview').classList.remove('hidden');
  }
});

// ─── Wave & levers ────────────────────────────────────────────────────────────
function showWaveDecision(wave, levers) {
  showScreen('simulation-screen');
  document.getElementById('timer-bar').classList.remove('hidden');
  document.getElementById('score-dashboard-wrap').classList.remove('hidden');

  // Show wave
  const waveDisplay = document.getElementById('wave-display');
  waveDisplay.classList.remove('hidden');
  document.getElementById('wave-badge').textContent = `WAVE ${wave.wave} — ${wave.time_label}`;
  document.getElementById('wave-event').textContent = wave.event;

  // Show levers
  const leverSection = document.getElementById('lever-section');
  if (isWarChestDepleted) {
    leverSection.classList.add('hidden');
    return;
  }
  leverSection.classList.remove('hidden');
  document.getElementById('submitted-wait').classList.add('hidden');
  document.getElementById('outcome-panel').classList.add('hidden');
  renderLevers(levers);
}

function renderLevers(levers) {
  const list = document.getElementById('lever-list');
  list.innerHTML = '';
  selectedLevers.clear();
  updateSpendSummary();

  levers.forEach(lever => {
    const card = document.createElement('div');
    card.className = `lever-card ${lever.available ? '' : 'unavailable'}`;
    card.dataset.id = lever.id;

    const recoveryTags = Object.entries(lever.score_recovery)
      .map(([dim, val]) => `<span class="recovery-tag">+${val} ${dim}</span>`).join('');

    card.innerHTML = `
      <div class="lever-label">${lever.label}</div>
      <div class="lever-desc">${lever.description}</div>
      <div class="lever-cost">RM ${lever.war_chest_cost.toLocaleString()}</div>
      <div class="lever-recovery">${recoveryTags}</div>
      <div class="lever-dept">Requires: ${lever.departments_required.join(', ')}</div>
      ${!lever.available ? `<div class="lever-unavail-msg">⚠ Missing required department — lever will fail if activated</div>` : ''}
    `;

    card.addEventListener('click', () => {
      if (isWarChestDepleted) return;
      const isSelected = selectedLevers.has(lever.id);
      if (isSelected) {
        selectedLevers.delete(lever.id);
        card.classList.remove('selected');
      } else {
        // Check if can afford all selected + this
        const currentSpend = [...selectedLevers].reduce((sum, id) => {
          const l = levers.find(x => x.id === id);
          return sum + (l?.war_chest_cost || 0);
        }, 0);
        if (currentSpend + lever.war_chest_cost > warChest) {
          showBroadcast('Not enough War Chest for this action!');
          return;
        }
        selectedLevers.add(lever.id);
        card.classList.add('selected');
      }
      updateSpendSummary();
    });

    list.appendChild(card);
  });
}

function updateSpendSummary() {
  const total = [...selectedLevers].reduce((sum, id) => {
    const lever = currentLevers.find(l => l.id === id);
    return sum + (lever?.war_chest_cost || 0);
  }, 0);
  document.getElementById('spend-summary').textContent = `Total spend: RM ${total.toLocaleString()} | Remaining after: RM ${Math.max(0, warChest - total).toLocaleString()}`;
}

document.getElementById('submit-decisions-btn').addEventListener('click', () => {
  if (isSubmitted) return;
  isSubmitted = true;
  socket.emit('team:submit_decisions', {
    sessionCode, teamId, levers: [...selectedLevers], waveIndex: currentWaveIndex
  });
  document.getElementById('lever-section').classList.add('hidden');
  document.getElementById('submitted-wait').classList.remove('hidden');
  document.getElementById('submission-badge').classList.remove('hidden');
});

// ─── Round outcome ────────────────────────────────────────────────────────────
function showRoundOutcome(outcome) {
  document.getElementById('submitted-wait').classList.add('hidden');
  document.getElementById('lever-section').classList.add('hidden');
  document.getElementById('wave-display').classList.add('hidden');

  const panel = document.getElementById('outcome-panel');
  const content = document.getElementById('outcome-content');
  panel.classList.remove('hidden');

  const successItems = (outcome.successfulLevers || []).map(id => {
    const lever = currentLevers.find(l => l.id === id);
    return `<div class="outcome-lever outcome-success">✓ ${lever?.label || id}</div>`;
  });

  const failItems = (outcome.failedLevers || []).map(f =>
    `<div class="outcome-lever outcome-fail">✗ ${f.label} — ${f.reason}</div>`
  );

  const noAction = outcome.noActionTaken
    ? '<div class="outcome-lever outcome-missed">No actions taken this wave.</div>' : '';

  const dimChanges = ['financial', 'regulatory', 'reputation', 'operational'].map(dim => {
    const pen = outcome.penaltyChanges?.[dim] || 0;
    const rec = outcome.scoreChanges?.[dim] || 0;
    const net = pen + rec;
    if (net === 0) return '';
    const col = net > 0 ? '#34D399' : '#F87171';
    return `<span style="font-size:13px;color:${col};margin-right:8px">${dim[0].toUpperCase()}: ${net > 0 ? '+' : ''}${net}</span>`;
  }).filter(Boolean).join('');

  content.innerHTML = `
    <div style="margin-bottom:12px">${dimChanges || '<span style="color:var(--grey)">No score changes</span>'}</div>
    ${successItems.join('')}
    ${failItems.join('')}
    ${noAction}
    <div style="margin-top:10px;font-size:13px;color:var(--grey)">War Chest remaining: RM ${(outcome.warChestRemaining || 0).toLocaleString()}</div>
    <div style="font-size:12px;color:var(--grey);margin-top:6px">Next wave loading…</div>
  `;
}

// ─── Recovery sprint ──────────────────────────────────────────────────────────
function showRecoverySprint(levers) {
  showScreen('recovery-screen');
  document.getElementById('timer-bar').classList.remove('hidden');
  const list = document.getElementById('recovery-lever-list');
  const selectedRecovery = new Set();

  list.innerHTML = '';
  levers.forEach(lever => {
    const card = document.createElement('div');
    card.className = `lever-card ${lever.available ? '' : 'unavailable'}`;
    card.dataset.id = lever.id;
    card.innerHTML = `
      <div class="lever-label">${lever.label}</div>
      <div class="lever-desc">${lever.description}</div>
      <div class="lever-cost">RM ${lever.war_chest_cost.toLocaleString()}</div>
      <div class="lever-dept">Requires: ${lever.departments_required.join(', ')}</div>
    `;
    card.addEventListener('click', () => {
      const sel = selectedRecovery.has(lever.id);
      if (sel) { selectedRecovery.delete(lever.id); card.classList.remove('selected'); }
      else { selectedRecovery.add(lever.id); card.classList.add('selected'); }
      const total = [...selectedRecovery].reduce((s, id) => {
        const l = levers.find(x => x.id === id);
        return s + (l?.war_chest_cost || 0);
      }, 0);
      document.getElementById('recovery-spend-summary').textContent = `Total spend: RM ${total.toLocaleString()}`;
    });
    list.appendChild(card);
  });

  document.getElementById('submit-recovery-btn').addEventListener('click', () => {
    socket.emit('team:submit_decisions', {
      sessionCode, teamId, levers: [...selectedRecovery], waveIndex: currentWaveIndex
    });
    document.getElementById('submit-recovery-btn').disabled = true;
    document.getElementById('submit-recovery-btn').textContent = '✓ Submitted';
  });
}

// ─── Debrief ──────────────────────────────────────────────────────────────────
function showDebrief(result) {
  if (!result) return;
  showScreen('debrief-screen');
  document.getElementById('timer-bar').classList.add('hidden');

  document.getElementById('final-resilience').textContent = result.resilience;
  document.getElementById('debrief-company-name').textContent = result.teamName;

  const dimScores = document.getElementById('final-dim-scores');
  const dimLabels = { financial: 'Financial Health', regulatory: 'Regulatory Standing', reputation: 'Reputation Index', operational: 'Operational Continuity' };
  dimScores.innerHTML = '';
  ['financial', 'regulatory', 'reputation', 'operational'].forEach(dim => {
    const val = result.scores[dim] ?? 0;
    const pct = Math.round((val / 25) * 100);
    const colour = val >= 15 ? 'var(--teal)' : val >= 8 ? 'var(--amber)' : 'var(--red)';
    dimScores.innerHTML += `
      <div class="dim-row">
        <span class="dim-lbl">${dimLabels[dim]}</span>
        <div class="bar-wrap"><div class="bar-fill" style="width:${pct}%;background:${colour}"></div></div>
        <span class="dim-val" style="color:${colour}">${val}</span>
      </div>
    `;
  });

  const wc = result.warChest;
  document.getElementById('final-war-chest').innerHTML = `
    Started: RM ${wc.starting.toLocaleString()} &nbsp;·&nbsp;
    Spent: RM ${wc.spent.toLocaleString()} &nbsp;·&nbsp;
    Remaining: RM ${wc.remaining.toLocaleString()}
    ${result.warChestBonus ? ` &nbsp;·&nbsp; <span style="color:#34D399">+${result.warChestBonus} bonus points</span>` : ''}
  `;

  const scenario = window.__scenario;
  const wellItems = (result.successfulLevers || []).slice(0, 3);
  document.getElementById('final-well').innerHTML = wellItems.length
    ? wellItems.map(id => `<div style="color:#34D399">✓ ${id}</div>`).join('')
    : '<div style="color:var(--grey)">No actions successfully taken.</div>';

  const gapIds = result.failedLevers?.map(f => f.label) || [];
  document.getElementById('final-gaps').innerHTML = gapIds.length
    ? gapIds.map(l => `<div style="color:#F87171">✗ ${l}</div>`).join('')
    : '<div style="color:#34D399">All activated levers succeeded — well done!</div>';
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
function showScreen(id) {
  const screens = ['join-screen', 'lobby-screen', 'setup-screen', 'briefing-screen', 'simulation-screen', 'recovery-screen', 'debrief-screen'];
  screens.forEach(s => document.getElementById(s)?.classList.add('hidden'));
  document.getElementById(id)?.classList.remove('hidden');
  if (id !== 'join-screen') document.getElementById('sticky-header').classList.remove('hidden');
}

function updateWarChestDisplay() {
  const el = document.getElementById('war-chest-display');
  el.textContent = `RM ${warChest.toLocaleString()}`;
  el.className = 'war-chest-display';
  const pct = warChest > 0 ? warChest / (warChest + 1) : 0; // simple check
  if (warChest <= 0) el.className += ' depleted';
  else if (warChest < 200000) el.className += ' low';
}

function updateScores(scores) {
  if (!scores) return;
  ['financial', 'regulatory', 'reputation', 'operational'].forEach(dim => {
    const val = scores[dim] ?? 25;
    const el = document.getElementById(`sv-${dim}`);
    const bar = document.getElementById(`sb-${dim}`);
    const card = document.getElementById(`sc-${dim}`);
    if (el) el.textContent = val;
    if (bar) bar.style.width = Math.round((val / 25) * 100) + '%';
    if (card) {
      card.className = 'score-card' + (val <= 5 ? ' critical' : val <= 12 ? ' low' : '');
      if (bar) bar.style.background = val <= 5 ? 'var(--red)' : val <= 12 ? 'var(--amber)' : 'var(--teal)';
    }
  });
}

function updateCountdown(remaining) {
  const el = document.getElementById('countdown');
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  el.textContent = `${mins}:${String(secs).padStart(2, '0')}`;
  el.className = remaining <= 20 ? 'red' : remaining <= 60 ? 'amber' : '';
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

function showBroadcast(msg) {
  const el = document.getElementById('broadcast-overlay');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 5000);
}

function showDisruptionOverlay(text) {
  const overlay = document.getElementById('disruption-overlay');
  document.getElementById('disruption-text').textContent = text;
  overlay.classList.remove('hidden');
  const dismiss = () => overlay.classList.add('hidden');
  overlay.addEventListener('click', dismiss, { once: true });
  setTimeout(dismiss, 15000);
}

// Show join screen on load
if (saved.code && saved.teamId) {
  // Will attempt reconnect via socket
} else {
  showScreen('join-screen');
}
