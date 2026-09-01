---
name: wisdom-get
description: "Load a specific CocoWisdom topic on demand. Usage: $wisdom get <topic>"
version: "2.0.2"
author: "CocoPlus"
tags:
  - cocoplus
---

# CocoWisdom Get

Use this skill when a session needs one CocoWisdom topic without preloading the whole wisdom store.

## Objective

Support progressive disclosure by returning only the requested wisdom category.

## Procedure

1. Require a topic argument. Normalize spaces to hyphens and lowercase for file lookup, but display the original topic in the response.
2. Look for the topic in `.cocoplus/wisdom/<topic>.md` and `.cocoplus/wisdom/topics/<topic>.md`.
3. If the file exists, output its content and the evidence/source fields it contains.
4. If the file does not exist, list available topic files and stop.
5. Do not load unrelated wisdom files unless the user asks for them.

## Notes

The default `[wisdom].injection_mode = "progressive"` means CocoPilot and other orchestrators should list available topics and counts in preamble context, then call `$wisdom get <topic>` only when a topic is relevant.

When `.cocoplus/wisdom/SCHEMA.md` contains a `## Stage Mappings` table, orchestrators may preload only the positive topics mapped to the current stage role. `do-not-use.md` is outside this routing table and remains universal negative memory.

## Success Criteria

- [ ] One requested topic is returned.
- [ ] Missing topics produce an available-topic list.
- [ ] No bulk wisdom preload happens in progressive mode.

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Treat the skill as complete because the file exists | Skill contracts must describe observable behavior and verification, not just command names. |
| Skip artifact and safety checks for a small command | Small commands still mutate state or guide execution; preserve the same gates. |

## Exit Criteria

- [ ] Command behavior matches the owning feature contract.
- [ ] Required reads, writes, and user-visible outputs are described.
- [ ] Safety, governance, and artifact constraints are preserved.
- [ ] Missing state produces a clear, non-destructive result.
