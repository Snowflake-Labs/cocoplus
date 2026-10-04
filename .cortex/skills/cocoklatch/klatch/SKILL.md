---
name: klatch
description: Spawn genuinely independent parallel subagents — each assigned a distinct perspective role (Skeptic, Optimist, Pragmatist, Domain Expert, Contrarian) — to analyze a topic from independent viewpoints and synthesize divergent findings into a decision-ready roundtable output
version: 1.0.0
user-invocable: true
command: $klatch
author: "CocoPlus"
tags:
  - cocoplus
feature: CocoKlatch (Feature 34)
---

# $klatch

Run a genuine multi-perspective roundtable by spawning independent subagents — each receiving only the topic brief, with no knowledge of the other participants' identities, roles, or outputs. Independence is structural, not simulated.

## Preconditions

- `.cocoplus/` must be initialized (run `$pod init` first)

## Arguments

- `<topic>` (required): Free-text description of the decision, question, or problem to analyze
- `--participants=N` (optional): Number of participants. Range: 2–5. Default: 3.

## Step-by-Step Behavior

### `$klatch <topic> [--participants=N]`

1. **Verify initialization:** Check `.cocoplus/` exists. If not, output: "CocoPlus not initialized. Run `$pod init` first." and exit.

2. **Validate participant count:** Parse `--participants=N`. If N < 2 or N > 5, output: "Participant count must be between 2 and 5. Default is 3." and exit. If flag absent, use N=3.

3. **Produce structured topic brief** from the free-text `<topic>`:
   - Decision or question being analyzed
   - Options under consideration (if mentioned or inferable)
   - Evaluation criteria (what would make one option better than another)
   - Known constraints stated in the topic

   Write topic brief to `lifecycle/klatch/<timestamp>-<topic-slug>-brief.md` where:
   - `<timestamp>` = ISO8601 compact (e.g., `20260517T143022`)
   - `<topic-slug>` = lowercase, hyphenated, max 40 chars (e.g., `which-embedding-model-to-use`)

4. **Assign participant roles** based on N:

   | N | Roles Assigned |
   |---|----------------|
   | 2 | Skeptic, Optimist |
   | 3 | Skeptic, Optimist, Pragmatist |
   | 4 | Skeptic, Optimist, Pragmatist, Domain Expert |
   | 5 | Skeptic, Optimist, Pragmatist, Domain Expert, Contrarian |

   **Role mandates (injected into each participant's frontmatter):**
   - **Skeptic:** "Interrogate assumptions. Find what could go wrong. Do not be balanced — be adversarial to the proposal."
   - **Optimist:** "Identify what could go right. Surface opportunities being underweighted. Do not hedge — advocate for the best case."
   - **Pragmatist:** "Focus on what is actually achievable given the stated constraints. Ignore ideal outcomes — anchor on what can be delivered."
   - **Domain Expert:** "Apply deep Snowflake and Cortex technical knowledge. Correct any technical misconceptions in the brief. Surface implementation-level consequences."
   - **Contrarian:** "Take the position least supported by the initial framing. Find the hidden strengths of the least-favored option."

5. **Spawn N participant subagents simultaneously** (parallel dispatch, `background: false`, `isolation: "worktree"`):
   - Each participant receives: the topic brief (`lifecycle/klatch/<timestamp>-<topic-slug>-brief.md`) and only the topic brief
   - Each participant's system context includes its role frontmatter and role mandate
   - Participants do NOT receive: names, roles, or any outputs of other participants
   - Each participant writes output to: `lifecycle/klatch/<timestamp>-<topic-slug>-<role-slug>.md`
     where `<role-slug>` is lowercase-hyphenated (e.g., `domain-expert`)

6. **Wait for all N participants to complete.** If any participant subagent fails:
   - Note the failure in the synthesis step
   - Proceed with remaining participant outputs
   - If ALL participants fail: output error and exit; leave staging files for debugging

7. **Spawn synthesis subagent** (Sonnet model, sequential — runs after all participants complete):
   - Reads all N participant output files (only after all are available)
   - Produces `lifecycle/klatch/<timestamp>-<topic-slug>-synthesis.md` with four sections:

   ```markdown
   ## Points of Agreement
   [Positions or conclusions shared across ≥2 participants — with participant attribution]

   ## Points of Divergence
   [Positions where participants explicitly disagree — each position stated with its participant role]

   ## Open Questions
   [Questions raised by participants that no participant resolved]

   ## Recommended Decision Path
   [The synthesis agent's recommendation given the full picture, including the primary uncertainty that remains after the roundtable]
   ```

   If any participant failed: synthesis must explicitly flag: "Note: [role] participant output was unavailable — coverage of that perspective is incomplete."

8. **Create git commit:** `feat(klatch): [topic-slug] roundtable — [N] participants`

9. **Output:**
   ```
   ✓ Klatch complete. [N] participants.

   See: lifecycle/klatch/<timestamp>-<topic-slug>-synthesis.md

   Agreement on: [one-line summary of primary point of agreement]
   Key divergence: [one-line summary of primary disagreement]
   Primary uncertainty: [one-line statement from recommended decision path]
   ```

## Integration Points

- **CocoDiscuss:** When active, `discuss.md` can reference the synthesis document as a decision input. The synthesis document URL is surfaced to the developer for manual linking if desired.
- **CocoSeed:** A deferred idea with a klatch recommendation surfaces as: "This idea warrants a klatch before promotion to spec."
- **`$pod kb`:** Notes existence of klatch artifacts in the session summary.

## Error Cases

- **`<topic>` missing:** Output: "Topic is required. Usage: `$klatch <topic> [--participants=N]`"
- **`--participants` out of range:** Output: "Participant count must be 2–5."
- **Any participant fails:** Proceed with remaining outputs; synthesis flags incomplete coverage
- **All participants fail:** Output error; leave staging files at `lifecycle/klatch/<timestamp>-*/` for debugging
- **synthesis subagent fails:** Output error with path to individual participant files so developer can review manually

## Exit Criteria

This skill is complete when:
- All participant subagents have completed (or failed with documented coverage gaps)
- Synthesis document exists at `lifecycle/klatch/<timestamp>-<topic-slug>-synthesis.md`
- Git commit created with participant count and topic slug
- Summary surfaced in session with agreement, divergence, and uncertainty one-liners

## Anti-Rationalization

Do NOT:
- Spawn participants sequentially — parallel dispatch is the structural guarantee of independence
- Pass participant identities or role names to other participants — each receives only the brief
- Allow the synthesis agent to run before all participant outputs are available — partial synthesis defeats the purpose
- Reassign or rename a participant's role in the synthesis — roles must match their frontmatter exactly
- Use N > 5 — the role set is fixed at five; additional participants add no new perspectives
- Simulate independence by asking one model to play multiple roles in sequence
