'use strict';

/**
 * chargeback-refresh.js - deterministic CocoMeter chargeback normalizer.
 *
 * This local helper mirrors the v1.2.0 FinOps rules without requiring a live
 * Snowflake connection: strip system reminders, exclude non-billable records,
 * resolve cost centers, combine token and warehouse credits when enabled, and
 * emit invoice-ready user totals.
 */

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--input') args.input = argv[++i];
    else if (argv[i] === '--emit-sql') args.emitSql = true;
  }
  return args;
}

function fail(message) {
  console.error(JSON.stringify({ error: message }));
  process.exit(1);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    fail(`Could not read ${filePath}: ${err.message}`);
  }
}

function stripSystemReminders(text) {
  return String(text || '').replace(/<system-reminder>[\s\S]*?<\/system-reminder>\s*/gi, '').trim();
}

function extractSql(toolCalls) {
  const calls = Array.isArray(toolCalls) ? toolCalls : [];
  const statements = [];
  for (const call of calls) {
    const args = call && call.args;
    if (!args) continue;
    if (typeof args.sql === 'string') statements.push(args.sql);
    if (Array.isArray(args)) {
      for (const item of args) {
        if (item && typeof item.sql === 'string') statements.push(item.sql);
      }
    }
  }
  return statements;
}

function shouldExclude(record) {
  if (/^SYSTEM$/i.test(String(record.user || ''))) return true;
  if (/sandbox/i.test(String(record.surface || ''))) return true;
  if (/background_metadata/i.test(String(record.query_source || ''))) return true;
  return false;
}

function costCenterFor(record, input) {
  const user = String(record.user || '');
  const role = String(record.role || '');
  if (input.cost_center_map && input.cost_center_map[user]) return input.cost_center_map[user];
  if (input.user_tags && input.user_tags[user]) return input.user_tags[user];
  if (input.role_cost_centers && input.role_cost_centers[role]) return input.role_cost_centers[role];
  return 'UNMAPPED';
}

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function normalize(input) {
  const includeWarehouse = input.includeWarehouse !== false;
  const rate = Number(input.creditRate || 1);
  const records = [];
  let excluded = 0;

  for (const record of input.records || []) {
    if (shouldExclude(record)) {
      excluded += 1;
      continue;
    }
    const tokenCredits = Number(record.token_credits || 0);
    const warehouseCredits = includeWarehouse ? Number(record.warehouse_credits || 0) : 0;
    const totalCredits = round2(tokenCredits + warehouseCredits);
    records.push({
      user: record.user,
      role: record.role,
      surface: record.surface,
      cost_center: costCenterFor(record, input),
      prompt: stripSystemReminders(record.prompt),
      extracted_sql: extractSql(record.tool_calls),
      token_credits: round2(tokenCredits),
      warehouse_credits: round2(warehouseCredits),
      total_credits: totalCredits,
      amount: round2(totalCredits * rate),
    });
  }

  const byUser = new Map();
  for (const record of records) {
    const current = byUser.get(record.user) || { user: record.user, cost_center: record.cost_center, total_credits: 0, amount: 0 };
    current.total_credits = round2(current.total_credits + record.total_credits);
    current.amount = round2(current.amount + record.amount);
    byUser.set(record.user, current);
  }

  const unmappedUsers = [...new Set(records.filter(r => r.cost_center === 'UNMAPPED').map(r => r.user))].sort();
  return {
    records,
    excluded_records: excluded,
    totals: {
      token_credits: round2(records.reduce((sum, r) => sum + r.token_credits, 0)),
      warehouse_credits: round2(records.reduce((sum, r) => sum + r.warehouse_credits, 0)),
      total_credits: round2(records.reduce((sum, r) => sum + r.total_credits, 0)),
      amount: round2(records.reduce((sum, r) => sum + r.amount, 0)),
    },
    invoices: Array.from(byUser.values()).sort((a, b) => String(a.user).localeCompare(String(b.user))),
    onboarding: {
      schemaReady: true,
      factHasData: records.length > 0,
      costCentersMapped: unmappedUsers.length === 0,
      unmappedUsers,
      spansPresent: (input.spans || []).some(span => span.name === 'CodingAgent.Step-0'),
    },
  };
}

function emitSql() {
  return [
    'select * from snowflake.account_usage.cortex_code_cli_usage_history',
    'union all select * from snowflake.account_usage.cortex_code_desktop_usage_history',
    'union all select * from snowflake.account_usage.cortex_code_snowsight_usage_history',
    'join snowflake.account_usage.query_attribution_history using (query_id)',
    'left join lateral flatten(input => tool_arguments) args',
    'where user_name <> \'SYSTEM\'',
  ].join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.emitSql) {
    console.log(emitSql());
    return;
  }
  if (!args.input) fail('--input is required');
  const input = readJson(path.resolve(process.cwd(), args.input));
  console.log(JSON.stringify(normalize(input), null, 2));
}

if (require.main === module) main();

module.exports = { normalize, stripSystemReminders, extractSql };
