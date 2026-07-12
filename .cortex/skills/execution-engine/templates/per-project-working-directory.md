# Per-Project Working Directory Template

Use this pattern when multiple CocoPods or projects run from one workstation.

```json
{
  "id": "project-workdir",
  "type": "setup",
  "working_directory": "{{project_root}}",
  "model_tier": "smol",
  "checkpoints": [".cocoplus/project.md"]
}
```

Every command in the stage must resolve paths relative to the project root, not the plugin installation directory.
