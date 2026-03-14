# Documentation Organization

This folder contains task documentation for each phase of development.

## Structure

```
docs/
├── README.md           # This file
├── SYSTEM_PROMPTS.md   # AI tutor prompts documentation
├── design-system.md    # UI design tokens and components
├── phase-1/            # MVP tasks
│   ├── task-0-1-documentation-setup.md
│   ├── task-2-1-pocketbase-integration.md
│   ├── task-2-3-profile-sync.md
│   ├── task-2-4-session-persistence.md
│   ├── task-3-ai-service-swap.md
│   └── ...
├── phase-1.1/          # UX Redesign - Garden-based Learning (17 tasks)
│   ├── phase-1.1-overview.md
│   ├── GAME_DESIGN.md
│   ├── CLINE_GAME_IMPLEMENTATION.md
│   ├── prototype-v4-final.jsx
│   ├── task-1-1-1-types-sun-drops.md
│   ├── task-1-1-2-activity-components.md
│   ├── task-1-1-3-lesson-view.md
│   ├── task-1-1-4-path-view.md
│   ├── task-1-1-5-garden-world-basic.md
│   ├── task-1-1-6-app-navigation.md
│   ├── task-1-1-7-pocketbase-schema.md
│   ├── task-1-1-8-garden-state.md
│   ├── task-1-1-9-ai-lesson-generator.md
│   ├── task-1-1-10-tree-health-decay.md
│   ├── task-1-1-11-gift-system.md
│   ├── task-1-1-12-decoration-system.md
│   ├── task-1-1-13-seed-earning.md
│   ├── task-1-1-14-pixi-upgrade.md
│   ├── task-1-1-15-mobile-polish.md
│   ├── task-1-1-16-tutorial-testing.md
│   └── task-1-1-17-oss-assets.md
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
