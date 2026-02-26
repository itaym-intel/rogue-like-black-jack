# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A rogue-like blackjack game where players modify blackjack rules mid-run to create unique experiences. Every game element must be modular and swappable to support a large combinatorial space of rule modifications.

## Architecture Constraints (Core Beliefs)

- **Backend/UI separation**: All game state and mechanics live in the backend. The UI layer (CLI or GUI) consumes a shared interface — no game logic in the UI.
- **Full determinism**: Despite being randomness-based, every random interaction uses a seeded RNG. Given the same seed and player actions, the outcome must be identical.
- **Extreme modularity**: Scoring, deck composition, win conditions, payout ratios, split/double conditions — all are configurable and modifiable at runtime by the rogue-like progression system.

## Documentation Structure

This repo uses a structured `docs/` directory as the system of record:

- `docs/design-docs/` — Design philosophy and architectural decisions. `core-beliefs.md` defines non-negotiable constraints.
- `docs/design-docs/index.md` — Catalog of all design docs (keep updated when adding new ones).
- `docs/product-specs/` — Game mechanics specs. `backbone.md` defines the base blackjack rules and all modifiable interactions.
- `docs/exec-plans/active/` — Current implementation plans.
- `docs/exec-plans/completed/` — Finished plans (kept for history).
- `docs/generated/` — Auto-generated documentation (schemas, etc.).
- `docs/references/` — External reference material for LLM context.

## Development Status

The project is fully implemented. Tech stack: **TypeScript + Vite + React 19 + Vitest**. 435 tests pass.

Implemented systems:
- `src/engine/` — deterministic game engine (state machine, modifier pipeline, scoring, combatants, equipment, consumables, shop, genie/wish system, blessing builder)
- `src/engine/effects.ts` — universal modifier builder with 82+ parameterized effect types and `buildModifier()` function
- `src/engine/component-registry.ts` — builds all game objects from JSON component data
- `data/components/` — 13 JSON files defining all 102 game components (canonical source of truth)
- `src/editor/` — Component Editor GUI (`npm run dev:editor`, port 3002) for visual content editing
- `src/cli/` — full terminal interface (`npm run dev`)
- `src/gui/` — React/Vite GUI with Arabian Nights theme (`npm run dev:gui`)
- `src/sim/` — simulation runner + analytics dashboard (`npm run sim` / `npm run sim:dash`)
- `src/llm/` — Anthropic Claude Haiku integration for LLM-generated wish blessings

### Content Editing Workflow

1. Run `npm run dev:editor` to open the Component Editor at `http://localhost:3002`
2. Browse, edit, or create components visually (equipment, consumables, enemies, bosses, curses)
3. Save changes (writes to JSON files in `data/components/`)
4. Run `/apply-components` in Claude Code to regenerate TypeScript, run tests, and commit

Missing docs (noted for awareness):
- `docs/product-specs/backbone.md` — does not exist
- `docs/design-docs/index.md` — does not exist

## Skill Guides

Self-contained guides for content creation live in `.claude/skills/`:

- **`onboard-session.md`** — Run at the start of a new session: reads all docs, inspects code, patches stale documentation, outputs a session brief
- **`adding-enemies.md`** — Adding regular enemies or bosses to a stage
- **`adding-equipment.md`** — Adding weapons, helms, armor, boots, or trinkets
- **`adding-consumables.md`** — Adding potions or other usable items
- **`writing-tests.md`** — Reference for all test patterns (makeContext, modifier testing, dodge loops, autoPlay)
- **`using-seed-finder.md`** — Finding seeds with specific RNG outcomes (CLI and programmatic)
- **`apply-components.md`** — After editing components in the GUI editor: regenerate TypeScript registry, run tests, commit

Each guide is standalone — read one file and you have everything needed for that task.

# ExecPlans

When writing complex features or significant refactors, use an ExecPlan (as described in .agent/PLANS.md) from design to implementation.