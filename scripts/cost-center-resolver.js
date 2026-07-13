#!/usr/bin/env node
'use strict';

/**
 * cost-center-resolver.js - deterministic CocoMeter cost-center resolver.
 *
 * Priority order:
 *   1. explicit user map
 *   2. user object tag
 *   3. role map
 *   4. UNMAPPED
 */

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--input') args.input = argv[++i];
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

function resolveCostCenter(record, mappings = {}) {
  const user = String(record.user || '');
  const role = String(record.role || '');
  if (mappings.cost_center_map && mappings.cost_center_map[user]) {
    return { cost_center: mappings.cost_center_map[user], source: 'explicit_user_map' };
  }
  if (mappings.user_tags && mappings.user_tags[user]) {
    return { cost_center: mappings.user_tags[user], source: 'user_object_tag' };
  }
  if (mappings.role_cost_centers && mappings.role_cost_centers[role]) {
    return { cost_center: mappings.role_cost_centers[role], source: 'role_map' };
  }
  return { cost_center: 'UNMAPPED', source: 'unmapped' };
}

function resolveAll(input) {
  const records = Array.isArray(input.records) ? input.records : [];
  return records.map((record) => ({
    user: record.user,
    role: record.role,
    ...resolveCostCenter(record, input),
  }));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) fail('--input is required');
  console.log(JSON.stringify(resolveAll(readJson(path.resolve(process.cwd(), args.input))), null, 2));
}

if (require.main === module) main();

module.exports = { resolveCostCenter, resolveAll };
