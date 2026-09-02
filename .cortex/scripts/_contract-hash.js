#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function candidateFiles(name, cwd = process.cwd()) {
  const direct = path.resolve(cwd, name);
  const candidates = [direct];
  if (!path.extname(name)) {
    for (const entry of fs.readdirSync(cwd, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.startsWith(`${name}.`)) {
        candidates.push(path.join(cwd, entry.name));
      }
    }
  }
  return candidates;
}

function sourceHash(name, cwd = process.cwd()) {
  for (const filePath of candidateFiles(name, cwd)) {
    try {
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) continue;
      return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
    } catch (_) {
      // Try the next candidate without shell expansion or command parsing.
    }
  }
  throw new Error(`Source file not found for ${name}`);
}

if (require.main === module) {
  try {
    console.log(sourceHash(process.argv[2] || ''));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { sourceHash };
