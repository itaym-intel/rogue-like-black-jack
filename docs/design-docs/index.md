# Design Documents Index

## Repository Structure

```
rogue-like-black-jack/
├── package.json
├── tsconfig.json
├── README.md
├── DESIGN.md
├── docs/
│   ├── design-docs/
│   │   ├── index.md              ← this file
│   │   ├── core-beliefs.md       — backend/frontend separation, determinism
│   │   └── elevator-pitch.md     — project vision
│   ├── product-specs/
│   │   ├── backbone.md           — base game setup, modifiable interactions
│   │   ├── game-flow.md          — game loop phases
│   │   ├── progression.md        — hands, stages, shop, inventory
│   │   ├── rogue-like.md         — items/relics, run structure
│   │   └── endgame.md            — (future) endgame design
│   ├── exec-plans/
│   ├── generated/
│   └── references/
└── src/
    ├── index.ts                  — CLI entry point, arg parsing
    ├── cli/
    │   └── game-loop.ts          — text-mode game loop (betting, actions, shop, inventory)
    └── engine/
        ├── types.ts              — core type definitions (Card, GameState, etc.)
        ├── engine.ts             — BlackjackEngine: card game mechanics
        ├── deck.ts               — deck building, shuffling, card values
        ├── rng.ts                — SeededRng: deterministic random number generator
        ├── modifiers.ts          — BlackjackModifier interface and contexts
        ├── item.ts               — Item type, ItemRarity, ItemEffect, ITEM_CATALOG
        ├── inventory.ts          — Inventory class for player item storage
        ├── shop.ts               — Shop class: generates offerings, handles purchases
        └── game-manager.ts       — GameManager: meta-game orchestration (hands, stages, shop, inventory)
```

## Design Documents

- **[Core Beliefs](core-beliefs.md)** — Backend must be fully separated from presentation. All state and mechanics live in the engine. Everything is deterministic from a seed.
- **[Elevator Pitch](elevator-pitch.md)** — Rogue-like blackjack with modular rule modifications creating unique runs.

## Product Specs

- **[Backbone](../product-specs/backbone.md)** — Base blackjack rules, hands/stage/item/inventory/shop systems, modifiable interactions.
- **[Game Flow](../product-specs/game-flow.md)** — Step-by-step game loop from start to game over.
- **[Progression](../product-specs/progression.md)** — Hands counter, stage system, shop, inventory.
- **[Rogue-Like](../product-specs/rogue-like.md)** — Item/relic system, effect triggers, run structure.
- **[Endgame](../product-specs/endgame.md)** — (Future) endgame design.