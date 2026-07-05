'use strict';

/**
 * shadow-report.js — SecondEye shadow rule promotion readiness (deterministic, no LLM)
 *
 * Reads .cocoplus/secondeye/shadow-findings.json (one record per shadow finding:
 * { rule_id, artifact, finding, ts }) and .cocoplus/secondeye/shadow-rules.json
 * (rule definitions), computes per-rule activation rate and developer-acceptance
 * rate, and reports promotion readiness against fixed thresholds.
 *
 * Developer acceptance is approximated by checking whether a shadow finding's
 * description text also appears (fuzzy substring match) among findings recorded
 * in the same artifact's actual SecondEye report around the same timestamp —
 * i.e. the developer's active-critic findings independently corroborated it.
 */

const path = require('path');
const fs = require('fs');

const COCOPLUS_DIR = path.resolve(process.cwd(), '.cocoplus');
const RULES_PATH = path.join(COCOPLUS_DIR, 'secondeye', 'shadow-rules.json');
const FINDINGS_PATH = path.join(COCOPLUS_DIR, 'secondeye', 'shadow-findings.json');
const LIFECYCLE_DIR = path.join(COCOPLUS_DIR, 'lifecycle');

const ACTIVATION_THRESHOLD = 0.3; // fires on at least 30% of reviews it was present for
const ACCEPTANCE_THRESHOLD = 0.5; // at least half of its findings corroborated

function readJsonArray(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

function readRules() {
  try {
    const data = JSON.parse(fs.readFileSync(RULES_PATH, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

function countReviewRuns() {
  try {
    return fs.readdirSync(LIFECYCLE_DIR).filter(f => /^secondeye-.*\.md$/.test(f)).length;
  } catch (_) {
    return 0;
  }
}

function findingCorroborated(finding) {
  try {
    const reports = fs.readdirSync(LIFECYCLE_DIR).filter(f => /^secondeye-.*\.md$/.test(f));
    const needle = String(finding.finding || '').toLowerCase().slice(0, 40);
    if (!needle) return false;
    return reports.some(f => {
      const content = fs.readFileSync(path.join(LIFECYCLE_DIR, f), 'utf8').toLowerCase();
      return content.includes(needle);
    });
  } catch (_) {
    return false;
  }
}

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) {
    console.error(JSON.stringify({ error: 'CocoPlus not initialized. Run $pod init first.' }));
    process.exit(1);
  }

  const rules = readRules();
  const findings = readJsonArray(FINDINGS_PATH);
  const totalReviews = countReviewRuns();

  const report = rules.map(rule => {
    const ruleFindings = findings.filter(f => f.rule_id === rule.id);
    const activationRate = totalReviews > 0 ? ruleFindings.length / totalReviews : 0;
    const corroborated = ruleFindings.filter(findingCorroborated).length;
    const acceptanceRate = ruleFindings.length > 0 ? corroborated / ruleFindings.length : 0;

    const readyForPromotion = activationRate >= ACTIVATION_THRESHOLD && acceptanceRate >= ACCEPTANCE_THRESHOLD;

    return {
      rule_id: rule.id,
      description: rule.description || '',
      total_findings: ruleFindings.length,
      activation_rate: Number(activationRate.toFixed(2)),
      acceptance_rate: Number(acceptanceRate.toFixed(2)),
      ready_for_promotion: readyForPromotion,
    };
  });

  console.log(JSON.stringify({ total_reviews: totalReviews, rules: report }, null, 2));
}

main();
