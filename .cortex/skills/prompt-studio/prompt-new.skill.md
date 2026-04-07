---
name: "prompt-new"
description: "Create a new Cortex ML prompt through a guided workflow. Asks for task description, few-shot examples, and anti-patterns to avoid. Versions the prompt file and runs anti-pattern review."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - prompt-studio
---

Your objective is to guide the developer in creating a well-structured Cortex ML prompt.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

## Guided Prompt Creation Workflow

Ask questions in sequence:

**Q1:** What task should this prompt perform? (e.g., "classify customer sentiment from support tickets")

**Q2:** What is the input format? (e.g., "a single SQL string from the TICKET_TEXT column")

**Q3:** What should the output be? (e.g., "one of: positive, negative, neutral")

**Q4:** Provide 2-3 few-shot examples (input → expected output pairs):

**Q5:** What are the edge cases or failure modes to handle?

**Q6:** What version is this? (e.g., v1, defaults to v1)

## Generate Prompt File

Generate prompt name from task description (kebab-case).
Write `.cocoplus/prompts/cortex-[name]-v[version].md`:

```markdown
---
name: "cortex-[name]"
version: "[version]"
created: "[ISO 8601 timestamp]"
task: "[task description]"
---

# Prompt: [task description]

## Instruction
[Clear instruction derived from Q1-Q3]

## Input Format
[From Q2]

## Output Format
[From Q3]

## Examples

### Example 1
Input: [example input]
Output: [expected output]

### Example 2
Input: [example input]
Output: [expected output]

## Edge Cases
[From Q5]
```

## Anti-Pattern Review

Check the generated prompt for:
- Ambiguous output format (more than one interpretation possible)
- Missing negative examples
- Instructions that contradict the output format
- Overly long instructions (>500 words)

Report any anti-patterns found.

Output: "Prompt created: `.cocoplus/prompts/cortex-[name]-v[version].md`. Use `/prompt compare` to test variants."

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Skip few-shot examples | Uncalibrated prompts drift on edge cases and become hard to evaluate |
| Leave output format vague | Ambiguity causes inconsistent downstream parsing and weak comparisons |
| Skip anti-pattern review because prompt "looks fine" | Subtle contradictions remain hidden until runtime failures |

## Exit Criteria

- [ ] `.cocoplus/prompts/cortex-[name]-v[version].md` exists with frontmatter fields `name`, `version`, `created`, and `task`
- [ ] Prompt file contains `## Instruction`, `## Input Format`, `## Output Format`, `## Examples`, and `## Edge Cases` sections
- [ ] Anti-pattern review ran and reported any ambiguous output format, contradictions, missing negative examples, or excessive length
- [ ] Output confirms the created prompt path and suggests `/prompt compare`
