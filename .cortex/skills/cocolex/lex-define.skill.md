---
name: "lex-define"
description: "Define or update a CocoLex project term."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocolex
---

Your objective is to implement `$lex define <term> "<definition>" [--source <path>]`.

Append or update the term in `.cocoplus/lexicon.md` with definition, aliases, source evidence, owner when known, and timestamp. If a conflicting definition exists, report the conflict instead of overwriting silently.
