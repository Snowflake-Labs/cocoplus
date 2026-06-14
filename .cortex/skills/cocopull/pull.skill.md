---
name: pull
description: Distill large context files (evaluation artifacts, schema dumps, query result sets, analysis outputs) into LLM-optimized dense form or human-readable narrative (--human). Default output is machine-dense; --human produces a prose summary for stakeholder consumption.
version: 1.1.0
user-invocable: true
command: $pull
author: "CocoPlus"
tags:
  - cocoplus
feature: CocoPull (Feature 35)
---

# $pull

Distill a file or directory of files into a pull artifact (`.pull.md`) that preserves all decision-relevant information while reducing token consumption. CocoHarvest uses pull files automatically when stage inputs exceed the configured token threshold.

## Preconditions

- `.cocoplus/` must be initialized (run `$pod init` first)
- `<target>` file or directory must exist

## Arguments

| Argument | Description |
|----------|-------------|
| `<target>` (required) | File path or directory to distill. Eligible: `.md`, `.json`, `.sql`, `.txt` |
| `--validate` (optional) | Run round-trip reconstruction test after distillation |
| `--human` (optional) | Produce human-readable narrative summary instead of LLM-dense pull file |

**Two output modes:**
- **Default (no flag):** Produce `<target>.pull.md` — machine-dense, LLM-optimized, verbatim decision values. Used automatically by CocoHarvest.
- **`--human`:** Produce `<target>.pull-human.md` — prose narrative for stakeholder consumption. Not used by CocoHarvest. Never overwrites the `.pull.md` machine output.

## Step-by-Step Behavior

### `$pull <target> --human`

1. **Verify initialization and target** (same as default mode steps 1–2).

2. **Spawn Sonnet narrative subagent:**
   Reads `<target>` and produces a prose summary optimized for a non-technical stakeholder audience. Rules:
   - Lead with the most important conclusion or finding (inverted pyramid)
   - Use plain language — no SQL, no JSON field names unless unavoidable
   - Express numeric values in context: not "0.88" but "88% accuracy — above the 85% threshold set in discuss.md"
   - Maximum 500 words unless source content genuinely requires more
   - Do not include raw tables — translate to sentences or brief bullets

3. **Write output** to `<target>.pull-human.md`. Include header:
   ```markdown
   ---
   pull_source: [source file path]
   pull_timestamp: [ISO8601]
   pull_mode: human
   audience: stakeholder
   ---
   ```

4. **Do NOT update** `.cocoplus/pull/manifest.json` for human-mode output — human pull files are not CocoHarvest artifacts.

5. **Display:** "Human summary written to `<target>.pull-human.md`" and show the full output.

---

### `$pull <target> [--validate]`

1. **Verify initialization:** Check `.cocoplus/` exists. If not, output: "CocoPlus not initialized. Run `$pod init` first." and exit.

2. **Validate target:** Check `<target>` exists. If not, output: "Target not found: `<target>`. Check the path and try again." and exit.

3. **If target is a directory:** Enumerate eligible files (`.md`, `.json`, `.sql`, `.txt`). Process each file independently using steps 4–7. After all files processed, produce a directory manifest at `<target>/pull-manifest.md` listing each file, its compression ratio, and reliability (if `--validate` was used).

4. **For each target file — Structure Analysis (Haiku subagent):**

   Spawn a structure analysis subagent (Haiku model, `background: false`) that reads the target file and produces a JSON structure map identifying:
   - Sections present (headings, blocks, named groupings)
   - Content type of each section: `schema_definition`, `query_result`, `narrative_analysis`, `tabular_data`, `decision_conclusion`, `code_block`, `metadata`
   - Decision-relevance classification per section: `decision_bearing` (thresholds, field names, criteria, constraint values — must be preserved verbatim) vs `background` (context and reasoning that supports decisions but would not be directly queried)

   If the structure analysis subagent fails: proceed to step 5 with direct distillation (no structure map). Note in the pull file header: `structure_guided: false`.

5. **For each target file — Distillation (Sonnet subagent):**

   Spawn a distillation subagent (Sonnet model, `background: false`) that reads the structure map (if available) and the target file. Apply these distillation rules in order:

   **Rule 1 — Verbatim preservation (non-negotiable):**
   Content classified as `decision_bearing` — accuracy thresholds, schema field names, evaluation criteria, constraint values, model names, warehouse assignments — is copied verbatim into the pull file. No paraphrasing, no rounding, no synonym substitution.

   **Rule 2 — Narrative compression:**
   Narrative explanation sections are compressed to their conclusion:
   - Before: Three paragraphs explaining why a threshold was chosen
   - After: "The analysis determined that [conclusion — e.g., 88% accuracy threshold]."
   The conclusion must be extracted from the narrative, not inferred.

   **Rule 3 — Deduplication:**
   Content repeated across sections (e.g., a column name referenced seven times in a result set narrative) is deduplicated to a single canonical reference with a note: "[field-name] — appears [N] times in source; referenced once here."

   **Rule 4 — Tabular data compression:**
   Tabular data with more than 20 rows is replaced with:
   - First 5 rows (verbatim)
   - Statistical summary: row count, column-level min/max/mean for numeric columns, distinct-value count for categorical columns
   - Note: "Source contains [N] rows. First 5 rows shown above."

6. **Write distilled output** to `<source-name>.pull.md` alongside the source file. Include a header block at the top of the pull file:
   ```markdown
   ---
   pull_source: [source file path]
   pull_timestamp: [ISO8601]
   original_tokens_estimate: [N]
   pull_tokens_estimate: [N]
   compression_ratio: [N%]
   structure_guided: [true|false]
   reliability: [pending|high|low]  ← updated by --validate step
   ---
   ```

   **Compression check:** If the pull file is larger than the source file (no compression achieved), write a note in the header: `distillation_outcome: no_reduction`. Use the source file as-is for CocoHarvest — do not force distillation that inflates the artifact.

7. **Update pull manifest:** Append an entry to `.cocoplus/pull/manifest.json` (create file if absent):
   ```json
   {
     "source": "<source path>",
     "pull": "<pull file path>",
     "timestamp": "<ISO8601>",
     "compression_ratio": "<N%>",
     "reliability": "pending|high|low",
     "distillation_outcome": "compressed|no_reduction"
   }
   ```

---

### `--validate` — Round-Trip Reconstruction Test

Run after distillation (steps 4–7 complete). Spawns three sequential subagents:

**Step V1 — Probe Question Generator (Haiku):**
Reads the SOURCE file (not the pull file) and generates exactly 10 probe questions designed to cover:
- Primary decision-relevant facts (≥4 questions)
- Key constraints stated in the source (≥2 questions)
- At least one question from each major section of the source

Write probe questions to `<target>.pull-probes.json` (temporary file, deleted after validation).

**Step V2 — Verification Agent (Sonnet):**
Reads ONLY `<target>.pull.md` (not the source). Answers all 10 probe questions using only the pull file content. Writes answers to temporary memory (not a file).

**Step V3 — Ground Truth Extractor (Sonnet):**
Reads the SOURCE file. Answers the same 10 probe questions. Writes answers to temporary memory.

**Comparison:**
Compare V2 answers against V3 answers. A match is defined as: same numeric value (within 1% tolerance for percentages), same field/function name, same yes/no conclusion. Compute match score: `matched_answers / 10 * 100`.

**Append validation summary** to the pull file header:
```
reliability: high   ← score ≥85%
validation_score: [N]%
divergent_probes: [list of question numbers that did not match, or "none"]
```

Or if score < 85%:
```
reliability: low
validation_score: [N]%
divergent_probes: [list of question numbers with brief description of divergence]
```

**Update manifest** with final `reliability` value.

**Delete** `<target>.pull-probes.json` (temporary file).

If score < 85%, output warning:
```
⚠ Pull reliability is low ([N]%). CocoHarvest will not auto-use this file — original will be loaded instead.
  Divergent probes: [list]
  Review the pull file and re-run $pull if needed.
```

---

## Automatic Use by CocoHarvest

When CocoHarvest prepares stage inputs, it checks each input file's estimated token count:
- If estimated tokens exceed `cocoHarvest.pullThreshold` (default: 8,000 tokens) in `plugin.json`:
  1. Check for `<file>.pull.md` counterpart
  2. If found AND `reliability` is `high`: use the pull file; log: "Using pull file for [stage-id]: [source] → [pull file] ([compression]%)"
  3. If found AND `reliability` is `low`: use the source; log warning: "Pull file exists but reliability is low — loading original for [stage-id]"
  4. If not found: invoke `$pull <file>` automatically; use result; log: "Auto-pulled [file] for [stage-id]"

This behavior is transparent — stage logs always record whether source or pull file was used.

## Storage

- Pull artifacts: `<source-name>.pull.md` alongside source files
- Pull manifest: `.cocoplus/pull/manifest.json`
- Pull files are gitignored by default (they are derived artifacts)
- To commit pull files: `$pod config set pull.commit=true`

## Error Cases

- **Target not found:** Output: "Target not found: `<target>`. Check the path and try again."
- **Structure analysis subagent fails:** Proceed with direct distillation; note `structure_guided: false` in header
- **Distillation produces file larger than source:** Note `distillation_outcome: no_reduction` in header; do not write an inflated pull file — keep source as-is
- **Validation V1/V2/V3 subagent fails:** Output: "Validation could not complete — [which step failed]. Pull file written but reliability is unverified (`reliability: pending`)."
- **Cannot write pull manifest:** Log warning; do not block the distillation output

## Exit Criteria

This skill is complete when:
- `<target>.pull.md` is written alongside the source (or `distillation_outcome: no_reduction` is recorded)
- `.cocoplus/pull/manifest.json` is updated with the new artifact entry
- If `--validate`: validation summary is appended to pull file header and reliability is set to `high` or `low`
- Output is surfaced showing: original token estimate, pull token estimate, compression %, and reliability (if validated)

## Anti-Rationalization

Do NOT:
- Paraphrase numeric values, thresholds, field names, or constraint values in default mode — Rule 1 is non-negotiable
- Run the validation V2 agent before V1 has produced the probe questions
- Allow V2 to read the source file — it reads only the pull file (circular test prevention)
- Use the same agent to both generate probe questions and answer them
- Mark reliability as `high` for scores below 85%
- Auto-use a `low` reliability pull file in CocoHarvest — always fall back to source
- Delete the source file — CocoPull only writes new files alongside sources
- Use `--human` output in CocoHarvest — human pull files are stakeholder artifacts, not context files
- Overwrite an existing `.pull.md` when running `--human` — the two modes produce separate files
