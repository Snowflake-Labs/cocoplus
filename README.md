# CocoPlus

**CocoPlus** is an AI-powered development lifecycle plugin for the Snowflake Cortex Code CLI. It brings structured, multi-agent workflows to data engineering projects — covering everything from project initialization through spec, plan, build, test, review, and ship phases.

Built using only Coco-native constructs: Skills, Agents, Hooks, and AGENTS.md.

---

## What It Does

- **CocoBrew** — 6-phase development lifecycle (Spec → Plan → Build → Test → Review → Ship)
- **CocoHarvest** — Parallel specialist personas working in isolated git worktrees
- **CocoFlow** — JSON pipeline orchestration for multi-stage agent execution
- **CocoGrove** — Pattern library that learns from your project over time
- **CocoMeter** — Token and cost tracking per session and phase
- **Safety Gate** — SQL intercept layer with strict/normal/off modes for production schema protection

## Specialist Personas

`$de` Data Engineer · `$ae` Analytics Engineer · `$ds` Data Scientist · `$da` Data Analyst  
`$bi` BI Analyst · `$dpm` Data Product Manager · `$dst` Data Steward · `$cdo` Chief Data Officer

---

## Getting Started

```
/pod init       — initialize CocoPlus in your project
/spec           — start the requirements phase
/cocoplus on    — activate all features
```

See [docs/index.html](https://sgsshankar.github.io/cocoplus/) for the full documentation site.

---

## Requirements

- Snowflake Cortex Code CLI (`coco`) with plugin support
- Node.js (for hooks — Windows/Mac/Linux compatible)
- Git

## License

MIT — see [LICENSE](LICENSE)
