'use strict';

/**
 * Shared source-hash routine for CocoContract (contract-prove.js, contract-gate.js).
 * Kept in one place so evidence recording and gate checking never diverge on
 * what "the source" means for a given function name.
 */

const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');

function sourceHash(functionName) {
  try {
    const tracked = execSync(`git ls-files -- "*${functionName}*"`, { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
    if (tracked.length === 0) {
      return crypto.createHash('sha256').update(functionName).digest('hex');
    }
    const hash = crypto.createHash('sha256');
    for (const file of tracked.sort()) {
      try {
        hash.update(fs.readFileSync(file));
      } catch (_) { /* file may have been deleted since ls-files ran */ }
    }
    return hash.digest('hex');
  } catch (_) {
    return crypto.createHash('sha256').update(functionName).digest('hex');
  }
}

module.exports = { sourceHash };
