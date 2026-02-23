# Session Onboarding

Run this at the start of a new session to get fully up to speed on the codebase and patch any stale documentation.

---

## Phase 1: Read All Documentation

Read every file in these locations **in order**. Do not skip any.

### Foundation docs
- `CLAUDE.md` — project overview, architecture constraints, skill registry
- `DESIGN.md` — top-level design notes (if it exists)
- `docs/design-docs/core-beliefs.md` — non-negotiable architectural pillars
- `docs/design-docs/index.md` — catalog of design docs (may be missing; note if absent)
- `docs/design-docs/item-catalog.md` — all player items: equipment, consumables, curses
- `docs/product-specs/backbone.md` — base blackjack rules (may be missing; note if absent)
- `docs/product-specs/cli-guide.md` — CLI usage reference
- `docs/product-specs/user-interface-wiki.md` — UI specification

### Execution plans
- `docs/exec-plans/active/` — read every file; these are in-progress features
- `docs/exec-plans/completed/` — read every file; completed work gives implementation history

### Skills
- `.claude/skills/README.md`
- `.claude/skills/adding-enemies.md`
- `.claude/skills/adding-equipment.md`
- `.claude/skills/adding-consumables.md`
- `.claude/skills/writing-tests.md`

After reading all docs, write a short mental summary:
- What is the project?
- What is implemented vs. planned?
- What active exec plans are in progress?
- What docs appear to be missing?

---

## Phase 2: Read the Codebase

Read the following source files to understand what is **actually** implemented. Cross-reference against what the docs say.

### Engine (game logic — read all of these)
- `src/engine/types.ts` — every type interface; single source of truth for the data model
- `src/engine/rng.ts` — seeded RNG implementation
- `src/engine/cards.ts` — deck and card logic
- `src/engine/scoring.ts` — hand scoring logic
- `src/engine/modifiers.ts` — modifier pipeline: `collectModifiers`, `applyDamageModifiers`, `getDefaultRules`
- `src/engine/game.ts` — `GameEngine` class: state machine, all phases, `performAction`, `getView`
- `src/engine/combatants.ts` — all enemies and bosses; STAGES and BOSSES arrays
- `src/engine/equipment.ts` — all equipment items and their modifiers
- `src/engine/consumables.ts` — all consumables and active effects
- `src/engine/genie.ts` — genie encounter and wish system
- `src/engine/shop.ts` — shop item pool and selection
- `src/engine/blessings.ts` — blessing system (may not exist yet; note if absent)

### CLI layer
- `src/cli/index.ts` — main game loop
- `src/cli/display.ts` — rendering
- `src/cli/input.ts` — input handling

### GUI layer (skim for structure, read key files fully)
- `src/gui/App.tsx` — screen routing
- `src/gui/hooks/useGameEngine.ts` — bridge between engine and React
- `src/gui/screens/GenieScreen.tsx` — genie phase UI (relevant to wishes exec plan)

### Sim module (if `src/sim/` exists)
- `src/sim/types.ts` — strategy and run result types
- `src/sim/strategies.ts` — play strategies
- `src/sim/runner.ts` — instrumented game runner

### LLM module (if `src/llm/` exists)
- `src/llm/wish-generator.ts`
- `src/llm/wish-api.ts`

### Config / build
- `package.json` — scripts, dependencies, package name
- `tsconfig.json` — TypeScript config

---

## Phase 3: Reconcile Docs Against Code

After reading both docs and code, identify every discrepancy. Use this checklist:

### CLAUDE.md audit
Check each claim in CLAUDE.md against what you found in the code:

- [ ] **Tech stack**: Does CLAUDE.md accurately describe the tech stack (TypeScript, Vite, Vitest, React, tsx)?
- [ ] **Development status**: Does it accurately describe whether the project is in design phase or has implemented code?
- [ ] **Architecture constraints**: Are the three pillars (backend sovereignty, full determinism, extreme modularity) reflected in the actual code structure?
- [ ] **Docs structure**: Do all the referenced files (`docs/design-docs/index.md`, `docs/product-specs/backbone.md`, etc.) actually exist?
- [ ] **Skill guides**: Does the list of skill guides match the files in `.claude/skills/`?

### Item catalog audit (`docs/design-docs/item-catalog.md`)
Compare the listed items against the actual implementations in `src/engine/equipment.ts` and `src/engine/consumables.ts`:

- [ ] Are all listed equipment items actually implemented?
- [ ] Are there implemented items missing from the catalog?
- [ ] Do the listed stats (damage values, percentages, effect descriptions) match the code?
- [ ] Are listed consumables accurate?
- [ ] Are listed curses (from boss `curse` properties in `combatants.ts`) accurate?

### Exec plan status audit
For each active exec plan in `docs/exec-plans/active/`:

- [ ] Check the **Progress** section's checkboxes against the actual code: are milestones marked `[x]` actually implemented?
- [ ] Are there features described as planned that are already fully implemented?
- [ ] Should any exec plans be moved from `active/` to `completed/`?

---

## Phase 4: Update Stale Documentation

For each discrepancy found in Phase 3, make the targeted fix. Apply all changes before reporting. Follow these guidelines:

**CLAUDE.md updates:**
- Update the **Development Status** section to reflect the actual state of the codebase
- Fix any references to missing files (note them as missing or remove stale references)
- Update the **Skill Guides** list if new skills were added
- Do not change the **Architecture Constraints** section unless a core belief has genuinely been violated in the code

**Item catalog updates (`docs/design-docs/item-catalog.md`):**
- Add any missing items with accurate stats pulled from the code
- Fix any stats that don't match the implementation
- Organize the same way as the existing catalog format

**Exec plan updates:**
- If all milestones of an active plan are implemented and the Outcomes & Retrospective section is filled, it is a candidate for moving to `completed/`. Do NOT move it automatically — flag it in your report instead.
- If a plan's Progress checkboxes are wrong, update them to match reality

**Do NOT:**
- Create new documentation files that weren't asked for
- Rewrite content that is not stale
- Change design decisions or add opinions — only fix factual inaccuracies

---

## Phase 5: Report

Output a concise session brief in this format:

```
## Session Brief

### Codebase State
- Tech stack: [list]
- What's implemented: [summary]
- Active features in progress: [list from exec plans]

### Documentation Changes Made
- [file]: [what was fixed]
- [file]: [what was fixed]
- (none if everything was accurate)

### Documentation Gaps (not auto-fixed)
- [file or feature] is missing: [brief description of what's absent]
- [exec plan] may be ready to move to completed/

### Key Facts for This Session
- Engine entry point: src/engine/game.ts (GameEngine class)
- Test command: npm test
- CLI command: npm run dev
- GUI command: npm run dev:gui
- Sim command: npm run sim (if implemented)
- [any other critical session-specific facts]
```

This brief is the deliverable. After outputting it, the session is ready.
