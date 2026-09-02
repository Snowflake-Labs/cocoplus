#!/usr/bin/env node
'use strict';

const { parseArgs, readJson } = require('./_script-utils.js');

function stripReminders(prompt) {
  return String(prompt || '').replace(/<system-reminder>[\s\S]*?<\/system-reminder>\s*/gi, '');
}

const args = parseArgs(process.argv.slice(2));
const input = args.input;
const config = readJson(input, {});
const records = [];
let excluded = 0;

for (const record of config.records || []) {
  if (record.user === 'SYSTEM' || record.surface === 'sandbox' || record.query_source === 'background_metadata') {
    excluded += 1;
    continue;
  }
  const token = Number(record.token_credits || 0);
  const warehouse = config.includeWarehouse ? Number(record.warehouse_credits || 0) : 0;
  const costCenter = (config.cost_center_map || {})[record.user] ||
    (config.user_tags || {})[record.user] ||
    (config.role_cost_centers || {})[record.role] ||
    'UNMAPPED';
  const extractedSql = (record.tool_calls || [])
    .map((call) => call.args && call.args.sql)
    .filter(Boolean);
  records.push({
    ...record,
    prompt: stripReminders(record.prompt),
    token_credits: token,
    warehouse_credits: warehouse,
    total_credits: token + warehouse,
    cost_center: costCenter,
    extracted_sql: extractedSql,
  });
}

const totalCredits = records.reduce((sum, record) => sum + record.total_credits, 0);
const invoices = records.map((record) => ({
  user: record.user,
  cost_center: record.cost_center,
  credits: record.total_credits,
  amount: record.total_credits * Number(config.creditRate || 0),
}));

console.log(JSON.stringify({
  excluded_records: excluded,
  records,
  totals: { total_credits: totalCredits },
  invoices,
  onboarding: {
    unmappedUsers: records.filter((record) => record.cost_center === 'UNMAPPED').map((record) => record.user),
    spansPresent: Array.isArray(config.spans) && config.spans.length > 0,
  },
}, null, 2));
