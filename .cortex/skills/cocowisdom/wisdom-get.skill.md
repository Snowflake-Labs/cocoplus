---
name: wisdom-get
description: "Load a specific CocoWisdom topic on demand. Usage: $wisdom get <topic>"
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

## Success Criteria

- [ ] One requested topic is returned.
- [ ] Missing topics produce an available-topic list.
- [ ] No bulk wisdom preload happens in progressive mode.
