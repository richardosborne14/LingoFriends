# Documentation Organization

This folder contains task documentation for each phase of development.

## Structure

```
docs/
├── README.md           # This file
├── phase-1/            # MVP tasks
│   ├── task-1-1-code-audit.md
│   ├── task-1-2-environment-setup.md
│   ├── task-2-1-pocketbase-schema.md
│   └── ...
├── phase-2/            # v1.0 tasks
│   └── ...
└── phase-3/            # Future phases
    └── ...
```

## Naming Convention

Task documents follow this pattern:
```
task-[MAJOR]-[MINOR]-[short-description].md
```

Examples:
- `task-1-1-code-audit.md`
- `task-2-3-profile-sync.md`
- `task-5-2-friend-management.md`

## When to Create a Task Doc

Create a task doc when you **complete** a task (or significant subtask). The doc should capture:

1. What was built
2. Decisions made and why
3. Any gotchas discovered
4. Confidence score

Use the template from `/TASK_TEMPLATE.md`.

## Cross-References

- **ROADMAP.md** — Master list of all tasks and their status
- **LEARNINGS.md** — Solutions that apply across tasks
- **CLAUDE_RULES.md** — Coding standards to follow

## Tips

- Keep docs concise (under 200 lines ideally)
- Include code snippets for non-obvious implementations
- Always note confidence score
- Add discoveries to LEARNINGS.md
