---
name: "lex-extract"
description: "Extract candidate terminology for CocoLex."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocolex
---

Your objective is to implement `$lex extract [--path <path>] [--write]`.

Scan targeted docs, lifecycle artifacts, reviews, and wisdom for repeated domain terms. Report candidate terms with examples and confidence. Write candidates only to `.cocoplus/lexicon/candidates.md` when `--write` is supplied.
