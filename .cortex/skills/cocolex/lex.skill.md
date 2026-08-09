---
name: "lex"
description: "Show CocoLex project lexicon status."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocolex
  - snow-cocoplus
---

Your objective is to implement `$lex`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

Read `.cocoplus/lexicon.md` and any `.cocoplus/lexicon/*.md` files. Summarize defined term count, undefined candidates, conflicts, and stale extracted terms.

Available subcommands: `$lex define`, `$lex list`, `$lex show`, `$lex extract`, `$lex validate`.
