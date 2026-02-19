# rogue-like-black-jack

We want a rogue-like blackjack game where the player is able to play black jack and over the course of the game modify different parts of blackjack
in a variety of ways to have a unique "run" and this will involve many modification of the basic rules of blackjack. Thus we must design in such a way
that every single thing written is modular and has the ability to change. We want a very large array of possible interactions and combinations of how
the player can choose to interact with the core game of blackjack.

## Web GUI (Phaser 3)

A browser-based graphical interface built with **Phaser 3** + **Vite**.

### Run GUI (dev server)

```bash
npm install
npm run dev:gui
```

Opens at `http://localhost:3000`.

### Build GUI (production)

```bash
npm run build:gui    # outputs to dist-gui/
npm run preview:gui  # serve the build locally
```

### GUI Architecture

```
src/gui/
  adapter/          ← The ONLY place that imports from the engine
    GameAdapter.ts    Wraps BlackjackEngine; emits typed events to the GUI
    ViewTypes.ts      GUI-facing view models (decoupled from engine types)
    GameEvents.ts     Event payload type definitions
    TypedEmitter.ts   Framework-agnostic typed event emitter
    index.ts          Barrel re-export
  assets/
    cardAssets.ts     Card image URLs (Deck of Cards API) + Phaser texture keys
  components/         Reusable Phaser GameObjects (no game logic)
    CardSprite.ts     Individual card with flip animation
    HandContainer.ts  Row of CardSprites; reconciles against state snapshots
    ActionPanel.ts    Hit / Stand / Double / Split buttons
    BetPanel.ts       Chip-stack wager entry UI
    HudPanel.ts       Bankroll / round / deck count display
  config/
    phaserConfig.ts   Phaser.Game configuration + scene registration
  scenes/
    BootScene.ts      Preloads all 52 card images from the web
    MenuScene.ts      Seed & bankroll input; creates GameAdapter
    GameScene.ts      Main blackjack table
    SummaryOverlayScene.ts  Round results overlay
  main.ts             Vite entry point
```

**Design principle:** `GameAdapter` is the sole import boundary.  All scenes
and components consume only `src/gui/adapter/` types (`GuiGameState`,
`GuiHand`, `GuiCard`, etc.).  A full engine rewrite requires changes only in
`GameAdapter.ts`.

**Adding a new scene** (e.g. rogue-like modifier selection screen):
1. Create `src/gui/scenes/ModifierSelectScene.ts`
2. Register it in `src/gui/config/phaserConfig.ts`
3. Launch it from `GameScene` after a round settles

Card graphics are fetched at runtime from
[deckofcardsapi.com](https://deckofcardsapi.com). To switch providers, edit
`src/gui/assets/cardAssets.ts` only.

---

## Text-based prototype (TypeScript)

This repository now includes a text-based blackjack prototype with:

- Deterministic gameplay from a seed
- Backend engine separate from CLI interaction
- Single player vs dealer
- Hit / Stand / Double / Split
- Dealer stands on soft 17
- Win returns `2x` wager total, blackjack returns `2.5x` wager total
- Modifier hook interfaces for deck, scoring, split/double rules, and payouts

### Rogue-Like Systems

- **Hands counter** — tracks total hands played across the run
- **Stage system** — stage increments every 5 hands; player must have `bankroll >= stage × 500` to continue
- **Item / Relic system** — extensible items with rarity, description, and effect triggers (passive, on_hand_start, on_hand_end, on_stage_end, on_purchase)
- **Inventory** — stores collected items, viewable at any time with `i`
- **Shop** — appears between stages offering 3 randomly priced items (90–110 money)

### Run

```bash
npm install
npm run dev
```

Optional args:

```bash
npm run dev -- --seed=1234 --bankroll=100
```
