# Project Instructions

## Skills: load before writing anything

- Before writing or refactoring any TypeScript in this repository, load and
  follow the **writing-clean-ts** skill
  (`~/.claude/skills/writing-clean-ts/SKILL.md`).
- Before writing any test, load and follow the **contract-testing-ts** skill
  (`~/.claude/skills/contract-testing-ts/SKILL.md`).
- Linting and formatting are done by `pnpm lint-fix`, never by hand.

## UI Conventions

- Prefer icon buttons over buttons with text labels for compact actions
  (edit, delete, add, and similar). Use `IconButton` from
  `#src/ui-component/icon-button` — never a bare paper `IconButton` — and
  always pass the `tip` prop: it renders as an on-hover tooltip on web and as
  the accessibility label on native.

## Architecture

The detailed layer mapping table and the recorded deviations live in
`docs/architecture-mapping.md`.

Route files in `app/` are thin default-export adapters that re-export the
`src/controller/expo-router/` components; they are expo-router entry points,
not barrels.
