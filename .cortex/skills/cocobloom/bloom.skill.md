---
name: bloom
description: Run a structured four-question working-backwards dialogue before $spec — commits the developer to the outcome (beneficiary, core capability, constraints, press release) before specification begins, anchoring all downstream phases to the original intent
version: 1.0.0
user-invocable: true
command: $bloom
author: "CocoPlus"
tags:
  - cocoplus
feature: CocoBloom (Feature 33)
---

# $bloom

Run a structured pre-spec working-backwards dialogue that captures the developer's commitment to the outcome before any specification is written. The bloom document anchors `$spec`, informs `$discuss` alignment checks, and is referenced at `$ship` by CocoWatch.

## Preconditions

- `.cocoplus/` must be initialized (run `$pod init` first)

## Arguments

- `--skip` (optional): Waive the bloom step and suppress all bloom advisory messages in `$spec`

## Step-by-Step Behavior

### `$bloom` — Four-Question Working Backwards Dialogue

1. **Verify initialization:** Check `.cocoplus/` exists. If not, output: "CocoPlus not initialized. Run `$pod init` first." and exit.

2. **Check existing bloom:** If `lifecycle/bloom.md` already exists, prompt:
   ```
   A bloom document already exists. Overwrite it? (The existing version will be preserved in git history.) [Y/N]
   ```
   If developer answers N: exit without changes.

3. **Open structured four-question dialogue** — ask each question in sequence, waiting for the developer's full response before proceeding:

   **Q1 — Beneficiary:**
   ```
   Who benefits from this, and what changes for them?
   (Name the beneficiary and describe the specific before/after contrast.)
   >
   ```
   Minimum acceptable answer: one sentence naming a beneficiary and stating the change. If the response is too vague (e.g., "users benefit"), prompt once: "Can you be more specific — who exactly, and what specifically changes for them?"

   **Q2 — Core Capability:**
   ```
   What is the core capability in one sentence?
   >
   ```
   If the developer provides more than one sentence, prompt once: "Can you capture that in one sentence?" Accept the compressed version or the original if they confirm it is already one sentence.

   **Q3 — Constraints:**
   ```
   What are the three constraints that bound this solution?
   (Examples: schema restrictions, cost limits, PII rules, performance requirements)
   Constraint 1: >
   Constraint 2: >
   Constraint 3: >
   ```
   If fewer than three are provided, ask for the remaining ones by number. If more than three are provided, ask the developer to prioritize to exactly three.

   **Q4 — Press Release:**
   ```
   Write the press release paragraph.
   Write as if the feature is already shipped and working: who can now do what,
   how fast, with what quality, at what cost.
   
   Example: "Snowflake data teams can now classify customer support tickets automatically
   using a fine-tuned Cortex function. The classifier processes 10,000 tickets per hour
   at under 5 credits, with 91% accuracy on labeled test data. Teams that previously
   waited overnight for sentiment reports now receive them in real-time."
   
   Write your paragraph below (the agent will not generate this for you):
   >
   ```
   Do not generate the press release paragraph from the developer's Q1–Q3 answers. The developer writes it themselves. If the developer asks the agent to write it, respond: "The press release must be written by you — it is the commitment artifact. Try writing one sentence at a time: who benefits, what they can do now, and how well it works."

4. **Assemble and write `lifecycle/bloom.md`:**
   ```markdown
   ---
   bloom_date: [ISO8601 timestamp]
   status: complete
   ---

   ## Beneficiary
   [Answer to Q1]

   ## Core Capability
   [Answer to Q2]

   ## Constraints
   - [Constraint 1]
   - [Constraint 2]
   - [Constraint 3]

   ## Press Release
   [Answer to Q4]
   ```

5. **Create git commit:** `feat(bloom): pre-commitment working backwards document`

6. **Output confirmation:**
   ```
   ✓ Bloom document created.

   lifecycle/bloom.md committed.
   Run $spec — the specification dialogue will use this as its anchor.
   ```

---

### `$bloom --skip` — Waive the Bloom Step

1. **Verify initialization:** Check `.cocoplus/` exists. If not, output error and exit.

2. **Write waiver flag:** Update `.cocoplus/lifecycle/meta.json` to include `"bloom_waived": true`. If `meta.json` does not exist, create it with `{ "bloom_waived": true }`.

3. **Output:**
   ```
   Bloom waived. Run $spec — no advisory message will appear.
   ```

**Effect:** When `$spec` subsequently runs and finds `"bloom_waived": true` in `meta.json`, it does not display the bloom advisory note and does not attempt to read any bloom document.

---

## Integration with Downstream Phases

- **`$spec`:** If `lifecycle/bloom.md` exists, reads it first as anchoring context. Begins dialogue with: "I've read your bloom document. The core capability is: [core sentence from bloom]. I'll use that as the anchor for this specification."
- **`$discuss`:** Includes `bloom.md` in its pre-plan validation — checks that the final plan still serves the beneficiary and constraint set declared in the bloom. Divergence surfaces as a Concern (not a Block).
- **`$ship`:** If bloom document exists, CocoWatch includes a one-line alignment note: "Bloom commitment [met / partially diverged] — see lifecycle/bloom.md."

## Error Cases

- **`.cocoplus/` not initialized:** Output: "CocoPlus not initialized. Run `$pod init` first."
- **bloom.md exists and developer declines overwrite:** Exit without changes
- **Cannot write bloom.md:** Output filesystem error
- **Cannot write meta.json (for --skip):** Output filesystem error

## Exit Criteria

This skill is complete when ONE of the following is true:
- `lifecycle/bloom.md` is written with all four sections populated and committed to git
- `lifecycle/meta.json` contains `"bloom_waived": true` (for `--skip` path)

## Anti-Rationalization

Do NOT:
- Generate the press release paragraph on the developer's behalf — Q4 is always developer-written
- Require more or fewer than exactly three constraints in Q3 — the number is fixed by design
- Enforce bloom before `$spec` — it is advisory only (`$spec` shows a one-line prompt, not a block)
- Modify `spec.md`, `plan.md`, or any other lifecycle artifact — bloom only writes `lifecycle/bloom.md`
- Create a git commit until all four questions are answered and the developer has confirmed the content
