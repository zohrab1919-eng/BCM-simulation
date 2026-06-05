const PHASES = {
  LOBBY: 'LOBBY',
  COMPANY_SETUP: 'COMPANY_SETUP',
  THREAT_BRIEFING: 'THREAT_BRIEFING',
  SIMULATION: 'SIMULATION',
  RECOVERY_SPRINT: 'RECOVERY_SPRINT',
  DEBRIEF: 'DEBRIEF'
};

const PHASE_LABELS = {
  LOBBY: 'Waiting Room',
  COMPANY_SETUP: 'Company Setup',
  THREAT_BRIEFING: 'Threat Briefing',
  SIMULATION: 'Simulation',
  RECOVERY_SPRINT: 'Recovery Sprint',
  DEBRIEF: 'Debrief & Results'
};

const ARCHETYPES = {
  STARTUP: 'startup',
  MID_MARKET: 'mid_market',
  ENTERPRISE: 'enterprise'
};

const ARCHETYPE_LABELS = {
  startup: 'Startup',
  mid_market: 'Mid-Market',
  enterprise: 'Enterprise'
};

const HEADCOUNT_BANDS = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large'
};

const HEADCOUNT_LABELS = {
  small: 'Small (under 100 staff)',
  medium: 'Medium (100–500 staff)',
  large: 'Large (500+ staff)'
};

const SCORING = {
  STARTING_POINTS: { financial: 25, regulatory: 25, reputation: 25, operational: 25 },
  WEIGHTS: { financial: 0.25, regulatory: 0.25, reputation: 0.25, operational: 0.15, recovery_turnaround: 0.10 },
  DIMENSIONS: ['financial', 'regulatory', 'reputation', 'operational'],
  WAR_CHEST_BONUS_PER_100K: 0.05,
  WAR_CHEST_BONUS_MAX: 10,
  WAR_CHEST_BONUS_DIMENSION: 'financial'
};

const TIMERS = {
  DECISION_WINDOW_DEFAULT: 240,
  INTER_ROUND_PAUSE: 60,
  RECOVERY_SPRINT_WINDOW: 300,
  THREAT_BRIEFING_DISPLAY: 15,
  THREAT_BRIEFING_PHASE: 180,
  EXTEND_AMOUNT: 120
};

const LIMITS = {
  MAX_TEAMS: 10,
  MAX_PLAYERS_PER_TEAM: 6,
  MAX_DEPARTMENTS: 10,
  SESSION_EXPIRY_HOURS: 4
};

const SOCKET_EVENTS = {
  HOST_CREATE_SESSION: 'host:create_session',
  HOST_START_PHASE: 'host:start_phase',
  HOST_TRIGGER_WAVE: 'host:trigger_wave',
  HOST_PAUSE: 'host:pause',
  HOST_RESUME: 'host:resume',
  HOST_EXTEND_TIMER: 'host:extend_timer',
  HOST_SKIP_WAVE: 'host:skip_wave',
  HOST_BROADCAST_MESSAGE: 'host:broadcast_message',
  HOST_GENERATE_REPORTS: 'host:generate_reports',
  HOST_ADJUST_SCORE: 'host:adjust_score',
  HOST_TOGGLE_LEADERBOARD: 'host:toggle_leaderboard',
  HOST_END_SIMULATION: 'host:end_simulation',
  HOST_RERUN: 'host:rerun',
  TEAM_SUBMIT_DECISIONS: 'team:submit_decisions',
  GAME_PHASE_UPDATE: 'game:phase_update',
  GAME_ROUND_OUTCOME: 'game:round_outcome',
  GAME_LEADERBOARD_UPDATE: 'game:leaderboard_update',
  GAME_TIMER_UPDATE: 'game:timer_update',
  GAME_BROADCAST: 'game:broadcast',
  GAME_STATE_RESTORE: 'game:state_restore',
  GAME_WAR_CHEST_DEPLETED: 'game:war_chest_depleted',
  GAME_SESSION_CREATED: 'game:session_created',
  GAME_ERROR: 'game:error'
};

const SEVERITY_COLOURS = {
  Critical: '#DC2626',
  High: '#D97706',
  Medium: '#2563EB',
  Low: '#059669'
};

if (typeof module !== 'undefined') {
  module.exports = { PHASES, PHASE_LABELS, ARCHETYPES, ARCHETYPE_LABELS, HEADCOUNT_BANDS, HEADCOUNT_LABELS, SCORING, TIMERS, LIMITS, SOCKET_EVENTS, SEVERITY_COLOURS };
}
