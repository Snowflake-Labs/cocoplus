/**
 * CocoPlus shared utility: AGENTS.md hot-layer updater
 *
 * Called by any hook that needs to write to .cocoplus/AGENTS.md.
 * Enforces the ≤200 line hard limit by compressing oldest entries first.
 * All writes are atomic (temp file → rename).
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const MAX_LINES = 200;

/**
 * Update .cocoplus/AGENTS.md with current session state.
 * Enforces ≤200 line limit — compresses oldest "Recent Decisions" entries if needed.
 *
 * @param {string} cocoplusDir   Path to .cocoplus/ directory
 * @param {object} state         Fields to write:
 *   - phase:           Current CocoBrew phase string
 *   - sessionId:       Session ID
 *   - ts:              ISO 8601 timestamp
 *   - activeModes:     Array of mode flag names (e.g. ['memory.on', 'safety.normal'])
 *   - recentDecisions: Array of ≤3 decision strings
 *   - event:           Short description of what happened (e.g. 'session-end', 'pre-compact')
 */
function updateAgentsMd(cocoplusDir, state) {
  const { phase, sessionId, ts, activeModes, recentDecisions, event } = state;

  const modesBlock = (activeModes && activeModes.length)
    ? activeModes.map(m => `- ${m}`).join('\n')
    : '- (none active)';

  const decisionsBlock = (recentDecisions && recentDecisions.length)
    ? recentDecisions.slice(-3).join('\n')
    : '(None recorded)';

  const lines = [
    '# AGENTS.md — CocoPlus Session State',
    '# Managed by CocoPlus hooks. Keep ≤200 lines. Do not edit by hand.',
    `# Last updated: ${ts} (${event || 'hook'})`,
    '',
    '## CocoBrew Lifecycle',
    `Phase: ${phase || 'unknown'}`,
    '',
    '## Current Session',
    `Session ID: ${sessionId || 'unknown'}`,
    `Updated at: ${ts}`,
    '',
    '## Active Modes',
    modesBlock,
    '',
    '## Recent Decisions',
    decisionsBlock,
    '',
    '## Quick Links',
    '- Project: .cocoplus/project.md',
    '- Flow:    .cocoplus/flow.json',
    '- Memory:  .cocoplus/memory/',
    '- Patterns: .cocoplus/grove/patterns/',
  ];

  // Check for existing content to preserve (e.g. additional sections)
  const agentsMdPath = path.join(cocoplusDir, 'AGENTS.md');
  let existing = '';
  try { existing = fs.readFileSync(agentsMdPath, 'utf8'); } catch (_) { }

  // Extract any developer-added sections (those starting with ## that we don't own)
  const ownedHeaders = new Set(['## CocoBrew Lifecycle', '## Current Session', '## Active Modes', '## Recent Decisions', '## Quick Links']);
  const extraSections = [];
  if (existing) {
    let inExtra = false;
    let buffer = [];
    for (const line of existing.split('\n')) {
      if (line.startsWith('## ')) {
        if (inExtra && buffer.length) extraSections.push(...buffer, '');
        inExtra = !ownedHeaders.has(line);
        buffer = inExtra ? [line] : [];
      } else if (inExtra) {
        buffer.push(line);
      }
    }
    if (inExtra && buffer.length) extraSections.push(...buffer);
  }

  if (extraSections.length) {
    lines.push('', ...extraSections);
  }

  // Enforce 200-line limit: trim oldest "Recent Decisions" lines if needed
  let finalLines = lines;
  while (finalLines.length > MAX_LINES) {
    const decIdx = finalLines.indexOf('## Recent Decisions');
    if (decIdx === -1) break;
    // Remove the last line before the next section
    let cutIdx = decIdx + 1;
    while (cutIdx < finalLines.length && !finalLines[cutIdx].startsWith('##')) cutIdx++;
    if (cutIdx - decIdx > 2) {
      finalLines.splice(cutIdx - 1, 1); // remove one decision line
    } else {
      break; // nothing left to trim
    }
  }

  // Atomic write
  const tmp = agentsMdPath + '.tmp.' + process.pid;
  try {
    fs.mkdirSync(path.dirname(agentsMdPath), { recursive: true });
    fs.writeFileSync(tmp, finalLines.join('\n') + '\n', 'utf8');
    fs.renameSync(tmp, agentsMdPath);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch (_) { }
    throw err;
  }
}

/**
 * Read current modes from .cocoplus/modes/ directory.
 * Returns array of flag file names (e.g. ['memory.on', 'safety.normal']).
 */
function readActiveModes(cocoplusDir) {
  const modesDir = path.join(cocoplusDir, 'modes');
  try {
    return fs.readdirSync(modesDir).filter(f =>
      fs.statSync(path.join(modesDir, f)).isFile()
    );
  } catch (_) {
    return [];
  }
}

/**
 * Read last N decision lines from .cocoplus/memory/decisions.md.
 */
function readRecentDecisions(cocoplusDir, n = 3) {
  const decisionsPath = path.join(cocoplusDir, 'memory', 'decisions.md');
  try {
    const content = fs.readFileSync(decisionsPath, 'utf8');
    return content.split('\n')
      .filter(l => l.startsWith('-') || l.startsWith('##'))
      .slice(-n);
  } catch (_) {
    return [];
  }
}

module.exports = { updateAgentsMd, readActiveModes, readRecentDecisions };
