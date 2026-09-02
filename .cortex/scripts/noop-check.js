#!/usr/bin/env node
'use strict';

const path = require('path');
const { appendLine, parseArgs, readJson } = require('./_script-utils.js');

const args = parseArgs(process.argv.slice(2));
const state = readJson(args.state || '', {});
const noop = (state.changed_files || []).length === 0 && (state.pending_checkpoints || []).length === 0;
appendLine(path.join('.cocoplus', 'flow', 'noop-log.jsonl'), JSON.stringify({ ts: new Date().toISOString(), noop }));
console.log(JSON.stringify({ noop }));
