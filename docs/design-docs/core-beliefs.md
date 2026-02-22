# Core Beliefs

This document defines the foundational design pillars of the project. These are non-negotiable architectural principles. Every feature, refactor, and implementation decision must align with these beliefs. If a change violates a core belief, the change is wrong — not the belief.

---

## Pillar 1: Backend Sovereignty & Determinism

### The Backend Owns the Game

The game's backend is the single source of truth for all game state and mechanics. No game logic, state mutation, or rule enforcement exists outside of it. The backend exposes a well-defined interface through which any frontend — CLI, GUI, web client, test harness, or AI agent — can interact with the game using the exact same set of operations.

A frontend is a **view and input layer**. It reads state and submits actions. It never decides what those actions *do*.

### Strict Separation of Concerns

- **The backend** handles: game state, turn progression, card logic, enemy behavior, player resources, event resolution, and every other mechanical aspect of the game.
- **The frontend** handles: rendering, input capture, animation, sound, and presentation. Nothing more.

If you are writing code that checks a game rule, modifies a resource, resolves an outcome, or advances the game in any way — that code belongs in the backend. There are zero exceptions.

A correct frontend could be deleted entirely and rebuilt from scratch without touching a single line of game logic. A correct backend could run a full game to completion with no frontend attached at all.

### Interface-Driven Access

The backend exposes a clean interface (API, service layer, or equivalent abstraction) that fully encapsulates the game. Frontends interact exclusively through this interface. They do not reach into backend internals, read private state directly, or make assumptions about implementation details.

Two different frontends calling the same interface method with the same arguments must always produce the same backend result.

### Full Determinism via Seeded Randomness

Despite being a game built around randomness — card draws, enemy encounters, event rolls — the backend is **fully deterministic**. Every random outcome is derived from a seeded random number generator. Given the same seed and the same sequence of player inputs, the game produces the identical result every time.

This means:

- **Replays are possible.** A seed + input log can reproduce an entire run frame-perfectly.
- **Testing is reliable.** Tests pin a seed and assert exact outcomes without flakiness.
- **Debugging is straightforward.** A bug report with a seed and action sequence is a guaranteed reproduction.

No call to `Math.random()` or any unseeded RNG should ever exist in the backend. All randomness flows through the seeded generator, and that generator's state is part of the game state.
