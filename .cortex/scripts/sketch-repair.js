#!/usr/bin/env node
'use strict';
/**
 * sketch-repair.js — Restore truncated IEND chunk from draw.io -e PNG exports (Feature 42)
 * No LLM. Must run after every final -e PNG export in the CocoSketch pipeline.
 * Usage: node sketch-repair.js <file.png>
 * Exit 0 = OK (repaired or already intact), Exit 1 = Fatal error
 *
 * Background: draw.io's -e (embed) flag embeds diagram XML in the PNG tEXt chunk,
 * but can produce a truncated IEND chunk that corrupts the PNG in some viewers.
 * This script ensures the IEND chunk is complete and valid.
 */

const fs = require('fs');

// Complete PNG IEND chunk: 4-byte length(0) + 'IEND' + CRC32
const IEND_CHUNK = Buffer.from([
  0x00, 0x00, 0x00, 0x00,  // length = 0
  0x49, 0x45, 0x4E, 0x44,  // 'IEND'
  0xAE, 0x42, 0x60, 0x82,  // CRC32 of IEND
]);

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

function repair(pngPath) {
  if (!pngPath) {
    process.stderr.write('Usage: sketch-repair.js <file.png>\n');
    process.exit(1);
  }
  if (!fs.existsSync(pngPath)) {
    process.stderr.write(`Error: File not found: ${pngPath}\n`);
    process.exit(1);
  }

  const buf = fs.readFileSync(pngPath);

  // Verify PNG signature
  if (!buf.slice(0, 8).equals(PNG_SIGNATURE)) {
    process.stderr.write(`Warning: ${pngPath} does not start with PNG signature — skipping repair\n`);
    process.exit(0);
  }

  // Find last IEND marker
  const IEND_MARKER = Buffer.from('IEND');
  let lastIendPos   = -1;
  for (let i = buf.length - 4; i >= 0; i--) {
    if (buf.slice(i, i + 4).equals(IEND_MARKER)) {
      lastIendPos = i;
      break;
    }
  }

  if (lastIendPos < 0) {
    // No IEND marker at all — append complete chunk
    const repaired = Buffer.concat([buf, IEND_CHUNK]);
    fs.writeFileSync(pngPath, repaired);
    process.stdout.write(`Repaired: appended missing IEND chunk to ${pngPath}\n`);
    return;
  }

  // IEND chunk layout: [4-byte length][4-byte 'IEND'][4-byte CRC] = 12 bytes total
  // lastIendPos points to 'IEND' — the length field is 4 bytes before it
  const chunkStart     = lastIendPos - 4;
  const chunkEnd       = lastIendPos + 8; // 'IEND' (4) + CRC (4)
  const bytesRemaining = buf.length - chunkStart;

  if (bytesRemaining < 12) {
    // Chunk is truncated — replace from chunkStart with complete IEND chunk
    const repaired = Buffer.concat([buf.slice(0, chunkStart), IEND_CHUNK]);
    fs.writeFileSync(pngPath, repaired);
    process.stdout.write(`Repaired: replaced truncated IEND chunk in ${pngPath}\n`);
    return;
  }

  // Verify the CRC bytes match expected
  const actualCrc   = buf.slice(lastIendPos + 4, lastIendPos + 8);
  const expectedCrc = IEND_CHUNK.slice(8, 12);
  if (!actualCrc.equals(expectedCrc)) {
    // CRC mismatch — replace the chunk
    const repaired = Buffer.concat([buf.slice(0, chunkStart), IEND_CHUNK]);
    fs.writeFileSync(pngPath, repaired);
    process.stdout.write(`Repaired: corrected IEND CRC in ${pngPath}\n`);
    return;
  }

  process.stdout.write(`OK: IEND chunk intact in ${pngPath}\n`);
}

try {
  repair(process.argv[2]);
} catch (err) {
  process.stderr.write(`sketch-repair: Fatal error — ${err.message}\n`);
  process.exit(1);
}
