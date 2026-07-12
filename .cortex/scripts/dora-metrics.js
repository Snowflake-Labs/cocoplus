#!/usr/bin/env node
'use strict';

/**
 * dora-metrics.js — deterministic DORA metric computation for CocoOps. No LLM.
 *
 * Reads: Snowflake task execution history (via SnowflakeSqlExecute) + git log
 * Writes: .cocoplus/ops/dora-snapshot.json
 *
 * DORA Tier Thresholds (from DORA research benchmarks):
 *   Run Frequency:       Elite ≥3/day, High 1/week–1/day, Medium 1/month–1/week, Low <1/month
 *   Lead Time:           Elite <1hr,   High <1day,         Medium 1day–1week,     Low >1month
 *   Recovery Time:       Elite <1hr,   High <1day,         Medium 1day–1week,     Low >1week
 *   Quality Failure Rate: Elite <5%,  High 5–10%,         Medium 10–15%,         Low >15%
 */

const fs            = require('fs');
const path          = require('path');
const { execSync }  = require('child_process');

const COCOPLUS_DIR  = '.cocoplus';
const OPS_DIR       = path.join(COCOPLUS_DIR, 'ops');
const SNAPSHOT_FILE = path.join(OPS_DIR, 'dora-snapshot.json');
const BENCHMARKS = {
  source: 'DORA-adapted CocoOps thresholds',
  metrics: {
    run_frequency: {
      elite: '>= 3 runs/day',
      high: '>= 1 run/week and < 3 runs/day',
      medium: '>= 1 run/month and < 1 run/week',
      low: '< 1 run/month',
    },
    lead_time: {
      elite: '< 1 hour',
      high: '< 1 day',
      medium: '1 day to 1 week',
      low: '> 1 month',
    },
    recovery_time: {
      elite: '< 1 hour',
      high: '< 1 day',
      medium: '1 day to 1 week',
      low: '> 1 week',
    },
    quality_failure_rate: {
      elite: '< 5%',
      high: '5-10%',
      medium: '10-15%',
      low: '> 15%',
    },
  },
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function classifyRunFrequency(perDay) {
  if (perDay >= 3)                         return 'Elite';
  if (perDay >= 1/7)                       return 'High';
  if (perDay >= 1/30)                      return 'Medium';
  return 'Low';
}

function classifyLeadTime(hours) {
  if (hours < 1)                           return 'Elite';
  if (hours < 24)                          return 'High';
  if (hours < 24 * 7)                      return 'Medium';
  return 'Low';
}

function classifyRecoveryTime(minutes) {
  if (minutes < 60)                        return 'Elite';
  if (minutes < 24 * 60)                   return 'High';
  if (minutes < 7 * 24 * 60)              return 'Medium';
  return 'Low';
}

function classifyFailureRate(pct) {
  if (pct < 5)                             return 'Elite';
  if (pct < 10)                            return 'High';
  if (pct < 15)                            return 'Medium';
  return 'Low';
}

function overallHealth(tiers) {
  const tierOrder = ['Elite', 'High', 'Medium', 'Low'];
  const worst = tiers.reduce((w, t) => tierOrder.indexOf(t) > tierOrder.indexOf(w) ? t : w, 'Elite');
  return worst;
}

function getGitMetrics() {
  const metrics = {
    commit_count_14d:    0,
    pipeline_prs:        0,
    pr_lead_time_hours:  null,
    review_cycle_hours:  null,
  };

  try {
    // Commits in last 14 days
    const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString().split('T')[0];
    const gitLog = execSync(`git log --oneline --since="${since}" -- "*.sql" "*.py"`, {
      encoding: 'utf8', timeout: 10000,
    }).trim();
    metrics.commit_count_14d = gitLog ? gitLog.split('\n').filter(Boolean).length : 0;
  } catch (_) { /* git not available or no history */ }

  return metrics;
}

function computeDemoMetrics() {
  const demoDir = path.join(OPS_DIR, 'demo');
  if (!fs.existsSync(demoDir)) return null;

  try {
    const demoData = JSON.parse(fs.readFileSync(path.join(demoDir, 'metrics.json'), 'utf8'));
    return demoData;
  } catch (_) { return null; }
}

function isDemoMode() {
  try {
    // Resolve from process.cwd() so invocation from subdirectories still finds the file
    const tomlPath = path.resolve(process.cwd(), 'cocoplus.toml');
    const toml = fs.readFileSync(tomlPath, 'utf8');
    return /\[demo\][\s\S]*?enabled\s*=\s*true/i.test(toml);
  } catch (_) { return false; }
}

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) {
    process.stderr.write('dora-metrics: .cocoplus/ not found. Run $pod init first.\n');
    process.exit(0);
  }
  ensureDir(OPS_DIR);

  const ts = new Date().toISOString();

  // Check demo mode
  if (isDemoMode()) {
    const demo = computeDemoMetrics();
    if (demo) {
      const snapshot = { ...demo, computed_at: ts, mode: 'demo' };
      snapshot.benchmarks = snapshot.benchmarks || BENCHMARKS;
      const tmp = SNAPSHOT_FILE + '.tmp.' + process.pid;
      fs.writeFileSync(tmp, JSON.stringify(snapshot, null, 2));
      fs.renameSync(tmp, SNAPSHOT_FILE);
      process.stdout.write(JSON.stringify({ success: true, mode: 'demo', snapshot_path: SNAPSHOT_FILE }) + '\n');
      return;
    }
  }

  // Real computation — git metrics are always available, Snowflake metrics are optional
  const gitMetrics = getGitMetrics();

  // Derive pipeline run frequency from git commit cadence (proxy when Snowflake unavailable)
  const runFrequencyPerDay = gitMetrics.commit_count_14d / 14;

  // Placeholder values for Snowflake-dependent metrics
  // These will be populated by the skill when SnowflakeSqlExecute is available
  const snapshot = {
    computed_at:             ts,
    mode:                    'live',
    period_days:             14,
    metrics: {
      run_frequency: {
        value:    parseFloat(runFrequencyPerDay.toFixed(2)),
        unit:     'per_day',
        tier:     classifyRunFrequency(runFrequencyPerDay),
        source:   'git_log',
      },
      lead_time: {
        value:    null,
        unit:     'hours',
        tier:     'Unknown',
        source:   'snowflake_task_history',
        note:     'Requires SnowflakeSqlExecute — run $ops dora in a Snowflake session',
      },
      recovery_time: {
        value:    null,
        unit:     'minutes',
        tier:     'Unknown',
        source:   'snowflake_task_history',
        note:     'Requires SnowflakeSqlExecute',
      },
      quality_failure_rate: {
        value:    null,
        unit:     'percent',
        tier:     'Unknown',
        source:   'snowflake_quality_checks',
        note:     'Requires SnowflakeSqlExecute',
      },
    },
    benchmarks: BENCHMARKS,
    git_signals: {
      commits_14d:          gitMetrics.commit_count_14d,
      pipeline_prs:         gitMetrics.pipeline_prs,
    },
    overall_health: 'Partial',
  };

  const availableTiers = [snapshot.metrics.run_frequency.tier].filter(t => t !== 'Unknown');
  if (availableTiers.length > 0) {
    snapshot.overall_health = overallHealth(availableTiers);
  }

  const tmp = SNAPSHOT_FILE + '.tmp.' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(snapshot, null, 2));
  fs.renameSync(tmp, SNAPSHOT_FILE);

  process.stdout.write(JSON.stringify({
    success:       true,
    mode:          'live',
    snapshot_path: SNAPSHOT_FILE,
    overall_health: snapshot.overall_health,
  }) + '\n');
}

try {
  main();
} catch (err) {
  process.stderr.write('dora-metrics: ' + err.message + '\n');
  process.exit(1);
}
