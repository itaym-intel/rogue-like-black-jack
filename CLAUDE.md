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

No tech stack has been chosen yet. All source code is simple prototyping. The project is in the design/specification phase. When implementation begins:

1. Consult `docs/product-specs/backbone.md` for base game rules
2. Respect the core beliefs in `docs/design-docs/core-beliefs.md`
3. Design the engine as a deterministic state machine that accepts a seed
4. Expose game actions through an interface that both CLI and GUI can consume

## Skill Guides

Self-contained guides for content creation live in `.claude/skills/`:

- **`onboard-session.md`** — Run at the start of a new session: reads all docs, inspects code, patches stale documentation, outputs a session brief
- **`adding-enemies.md`** — Adding regular enemies or bosses to a stage
- **`adding-equipment.md`** — Adding weapons, helms, armor, boots, or trinkets
- **`adding-consumables.md`** — Adding potions or other usable items
- **`writing-tests.md`** — Reference for all test patterns (makeContext, modifier testing, dodge loops, autoPlay)

Each guide is standalone — read one file and you have everything needed for that task.

# ExecPlans

When writing complex features or significant refactors, use an ExecPlan (as described in .agent/PLANS.md) from design to implementation.