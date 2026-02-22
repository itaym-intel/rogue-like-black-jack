# Initial React Frontend for Geniejack

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds. This document must be maintained in accordance with `PLANS.md` at the repository root.


## Purpose / Big Picture

After this work is complete, a player can open a browser and play Geniejack — a rogue-like blackjack game — through a rich, visually themed React interface styled after Arabian Nights and the 10th-century Islamic Golden Age. The player will see ornate pointed arches, geometric tile mosaics, warm golden lighting, desert landscapes, and luxurious silk-and-gold UI elements. They will fight enemies across three stages, buy equipment and consumables from an animated souk marketplace, defeat bosses, receive curses from a genie hovering above a moonlit oasis, and either die or conquer the Sultan's Palace — all rendered in a painterly, cinematic style.

The frontend consumes the exact same `GameEngine` API that the existing CLI uses. No game logic lives in the frontend. The engine runs entirely in the browser (it is pure TypeScript with zero Node-specific dependencies). The frontend calls `GameEngine.getView()` to read state and `GameEngine.performAction(action)` to advance the game. Every screen described in `docs/product-specs/user-interface-wiki.md` is implemented. No new gameplay functionality is added.

To see it working, run `npm run dev:gui` from the repository root. A browser window opens showing the Geniejack title. Click "New Game" (optionally entering a seed) to begin. The game plays identically to the CLI — same seed, same actions, same outcomes — but rendered with the full Arabian Nights visual treatment.


## Progress

- [x] Milestone 0: Tech stack setup — Vite + React + TypeScript scaffolding.
- [x] Milestone 1: Application shell — layout scaffolding, routing between screens, GameEngine integration hook.
- [x] Milestone 2: Main game screen — player status, enemy status, card table, action buttons, event log.
- [x] Milestone 3: Shop screen — souk marketplace with item grid, purchase flow, skip button.
- [x] Milestone 4: Genie encounter screen — curse display, wish input, genie illustration.
- [x] Milestone 5: Terminal screens — game over, victory, pre-hand consumable use.
- [x] Milestone 6: Visual polish — Arabian Nights theme, animations, responsive layout.
- [x] Milestone 7: Playwright end-to-end tests + unit tests for React components.


## Surprises & Discoveries

- **`environmentMatchGlobs` does not work on Windows**: Vitest's `environmentMatchGlobs` config option with glob patterns like `['tests/gui/**', 'jsdom']` failed to match on Windows, resulting in "document is not defined" errors in GUI tests. The fix was to add `// @vitest-environment jsdom` directives at the top of each GUI test file instead.

- **React Testing Library requires explicit cleanup in Vitest**: Unlike Jest, Vitest does not auto-cleanup between tests with React Testing Library. Without `afterEach(cleanup)`, multiple renders accumulated in the DOM causing "multiple elements found" query failures. Every GUI test file needs an explicit `afterEach(cleanup)` call.

- **Game Over "New Game" needed a `resetGame` function**: The initial `useGameEngine` hook only had `startGame` and `performAction`. The Game Over and Victory screens need to return to the start screen, which requires setting the view back to `null`. A `resetGame` method was added to the hook.

- **Vite 7 installed instead of Vite 6**: Running `npm install vite` installed Vite 7, which is the latest major version. It works identically for our purposes — no config changes were needed.

- **Pre-existing engine test failure**: The `Djinn curse: onHandStart fires through engine` test in `tests/full-game.test.ts` fails independently of the frontend work. This is a pre-existing engine issue, not caused by any frontend changes.


## Decision Log

- Decision: Use Vite as the build tool for the React frontend.
  Rationale: Vite offers fast hot-module replacement, native TypeScript support, and zero-config React setup via `@vitejs/plugin-react`. It integrates seamlessly with the existing TypeScript project. The Vite dev server runs on a different port than the CLI, so both can coexist.
  Date/Author: 2026-02-21 / Plan Author

- Decision: Use plain CSS modules (`.module.css` files) rather than Tailwind CSS or a CSS-in-JS library for styling.
  Rationale: CSS modules provide scoped styles without adding build complexity. The Arabian Nights theme requires custom gradients, shadows, borders, and background images that are easier to express in plain CSS than utility classes. CSS modules keep styles colocated with components and avoid global style leakage.
  Date/Author: 2026-02-21 / Plan Author

- Decision: Use React `useState` and a custom `useGameEngine` hook for state management rather than Redux or Zustand.
  Rationale: The game state is a single `GameView` object returned by `GameEngine.getView()`. There is no need for a global store or complex state transitions — the engine handles all state internally. A single `useState<GameView>` at the top level, updated after each `performAction` call, is sufficient. This keeps the frontend simple and avoids unnecessary dependencies.
  Date/Author: 2026-02-21 / Plan Author

- Decision: Place all frontend source code under `src/gui/` to mirror the existing `src/cli/` structure.
  Rationale: The CLAUDE.md architecture requires backend/UI separation. The `src/gui/` directory is a peer to `src/cli/`, both consuming `src/engine/`. This makes the separation visible in the directory tree and allows both interfaces to coexist.
  Date/Author: 2026-02-21 / Plan Author

- Decision: Use CSS custom properties (variables) for the Arabian Nights color palette, defined in a single theme file.
  Rationale: A shared theme file (`src/gui/styles/theme.css`) makes it easy to maintain color consistency across all components. Every component references `var(--color-gold)`, `var(--color-indigo)`, etc. If the palette changes, only one file needs updating.
  Date/Author: 2026-02-21 / Plan Author

- Decision: Include card face images via CSS-rendered playing cards (Unicode suit symbols + styled divs) rather than image sprites.
  Rationale: The engine already provides `Card` objects with `suit` and `rank`. Rendering cards as styled divs with Unicode symbols (♠♥♦♣) matches the reference screenshots, which show simple card representations. This avoids needing an image asset pipeline for 52+ card faces. The cards in the reference screenshots are minimalist — white rectangles with suit and rank text.
  Date/Author: 2026-02-21 / Plan Author

- Decision: Use Playwright via the MCP (Model Context Protocol) server for end-to-end testing, and Vitest with React Testing Library for component-level tests.
  Rationale: The user explicitly requested Playwright MCP tests. Playwright tests will navigate the actual running app in a browser, interacting with elements and asserting visual state. Vitest + React Testing Library tests will cover component rendering logic and state updates without a browser. This two-layer approach gives both fast unit feedback and real browser confidence.
  Date/Author: 2026-02-21 / Plan Author


## Outcomes & Retrospective

**Completed: 2026-02-21**

All 7 milestones are complete. The Geniejack React frontend is fully functional and styled.

### What was built
- 13 React components under `src/gui/components/` with CSS Modules
- 9 screen components under `src/gui/screens/` with CSS Modules
- 1 custom hook (`useGameEngine`) for engine integration
- 2 global style files (theme.css, global.css)
- Vite 7 + React 19 build configuration with separate tsconfig for GUI
- 6 Vitest component test files (37 tests total) under `tests/gui/`
- Full Playwright E2E verification of all game flows

### Test results
- **170 total tests**: 169 pass, 1 pre-existing engine failure (Djinn curse test)
- **37 GUI tests**: All pass (PlayingCard: 6, PlayerStatus: 8, EnemyStatus: 6, ShopItemCard: 6, EventLog: 4, useGameEngine: 7)
- **6 Playwright E2E tests**: All pass (full game flow, shop interaction, game over, genie encounter, consumable use, determinism verification)

### Visual verification
Screenshots captured for all major screens confirm the Arabian Nights theme:
- Start screen: Gold Cinzel title, centered panel, deep navy background
- Main game screen: Three-panel layout, playing cards with suit symbols, cityscape silhouette
- Hand result: LOSS/WIN overlay between dealer and player cards
- Shop screen: Souk marketplace background, 2-column item grid, affordability indicators
- Genie screen: Three-panel with CSS genie art, curse info, wish input
- Game Over: Crimson title, red vignette, run summary stats

### What went well
- The GameEngine API was clean and complete — no engine modifications needed
- CSS Modules + custom properties made theming consistent across all components
- The `useGameEngine` hook pattern (useRef for engine, useState for view) was simple and effective

### What could be improved
- Card animations (dealing, flipping) are minimal CSS transitions rather than full animation sequences
- Background illustrations use CSS gradients and simple SVG shapes rather than detailed artwork
- No responsive breakpoint handling below 1024px viewport width


## Context and Orientation

This section describes the current state of the repository as it pertains to building the frontend. A reader with no prior knowledge of the project should be able to understand the landscape after reading this section.

### Repository Structure (relevant files)

The repository root is `D:\rouguelike-blackjack\rogue-like-black-jack`. The key directories and files are:

    src/
      engine/           ← Complete game backend (DO NOT MODIFY)
        types.ts        ← All TypeScript interfaces (Card, GameView, PlayerAction, etc.)
        game.ts         ← GameEngine class: getView(), performAction(), constructor(seed?)
        cards.ts        ← cardToString() for display formatting
        (+ combat.ts, scoring.ts, modifiers.ts, combatants.ts, equipment.ts,
           consumables.ts, shop.ts, genie.ts, rng.ts)
      cli/              ← Existing CLI frontend (DO NOT MODIFY)
        index.ts        ← CLI entry point
        display.ts      ← CLI rendering
        input.ts        ← CLI input handling
    tests/              ← Existing engine tests (DO NOT MODIFY)
    docs/
      references/       ← Three PNG screenshots showing visual design targets
        main-game-screen.png
        shop-screen.png
        genie-encounter-screen.png
      product-specs/
        user-interface-wiki.md  ← Complete specification of every screen and field
    package.json        ← Currently: tsx, typescript, vitest
    tsconfig.json       ← ES2022, NodeNext, strict
    vitest.config.ts    ← Test configuration

### The GameEngine API

The frontend interacts with the backend exclusively through three methods on the `GameEngine` class (defined in `src/engine/game.ts`):

1. `new GameEngine(seed?: string)` — Creates a new game. If no seed is provided, one is generated from the current timestamp. The game starts in the `pre_hand` phase with the first enemy of Stage 1 loaded.

2. `engine.getView(): GameView` — Returns a read-only snapshot of the entire game state. The `GameView` interface (defined in `src/engine/types.ts`) contains everything the UI needs to render any screen: the current phase, player stats, enemy stats, cards, shop items, genie data, hand results, available actions, and an event log. The full shape of `GameView` is documented in `docs/product-specs/user-interface-wiki.md`.

3. `engine.performAction(action: PlayerAction): ActionResult` — Executes a player action and advances the game state. Returns `{ success: boolean; message: string; newPhase: GamePhase }`. After calling this, call `getView()` again to get the updated state.

The `GameView.availableActions` array always contains exactly the actions valid for the current phase. The frontend should only offer buttons/inputs for actions present in this array.

### Game Phases and Screens

The game has 8 phases, each corresponding to a screen (or screen variant):

- `pre_hand` — Before cards are dealt. Player can use consumables or continue. Shows the card table empty or with previous cards cleared.
- `player_turn` — Cards dealt, player chooses hit/stand/double-down. The dealer has one face-down card (shown as `null` in `visibleCards`).
- `hand_result` — Both hands revealed. Shows winner, damage, updated HP. Player continues to next hand or battle result.
- `battle_result` — Enemy defeated. Shows victory banner and gold earned. Player continues to shop or genie.
- `shop` — Post-battle marketplace. Shows items with prices and affordability. Player buys items or skips.
- `genie` — Post-boss encounter. Shows curse received, accumulated curses, and a text input for the blessing wish.
- `game_over` — Terminal state. Player died. Shows run summary.
- `victory` — Terminal state. Player won. Shows run summary.

### Key Data Types

All types are defined in `src/engine/types.ts`. The most important for the frontend are:

- `Card` has `suit` ('hearts'|'diamonds'|'clubs'|'spades') and `rank` ('2'..'10'|'J'|'Q'|'K'|'A'). The function `cardToString(card)` from `src/engine/cards.ts` produces strings like "A♠", "K♥", "10♦".
- `HandScore` has `value` (number), `soft` (boolean, ace counted as 11), `busted` (boolean), `isBlackjack` (boolean).
- `Equipment` has `id`, `name`, `slot` (weapon|helm|armor|boots|trinket), `tier` (cloth|bronze|iron), `description`, `cost`.
- `Consumable` has `id`, `name`, `type` (health_potion|damage_potion|strength_potion|poison_potion), `description`, `cost`.
- `ShopItem` has `index` (for purchase action), `item` (Equipment or Consumable), `type` ('equipment'|'consumable'), `affordable` (boolean).
- `HandResult` has `winner`, `damageDealt`, `damageTarget`, `dodged`, `damageBreakdown` (human-readable string).
- `PlayerAction` is a discriminated union: `{type:'hit'}`, `{type:'stand'}`, `{type:'double_down'}`, `{type:'use_consumable', itemIndex:number}`, `{type:'buy_item', itemIndex:number}`, `{type:'skip_shop'}`, `{type:'enter_wish', text:string}`, `{type:'continue'}`.

### Visual Design Target

Three reference screenshots in `docs/references/` define the visual design. The theme is Arabian Nights / 10th-Century Islamic Golden Age:

**Main Game Screen** (`main-game-screen.png`): A three-panel layout. The left panel ("PLAYER STATUS") shows HP, gold, and an equipment list. The center area is a dark-blue card table framed in an ornate border, showing the dealer's cards above and the player's cards below, each with a "SCORE" label. Below the table are HIT and STAND buttons. The right panel has "ENEMY STATUS" showing the enemy name, HP, description, and ability descriptions, plus an "EVENT LOG" below it. The background is a deep navy blue with silhouetted Arabian architecture — minarets, horseshoe arches, domes — against a moonlit sky.

**Shop Screen** (`shop-screen.png`): A marketplace scene. The background shows a souk with red canopy market stalls on both sides and a blue sky with clouds. The left side shows "PLAYER GOLD" with the gold count. The center is a "SHOP INVENTORY" panel with a grid of item cards (2 columns, 4 rows). Each item card has an icon area, name, short description, cost in gold, and a "BUY" button. Items are displayed in dark-blue bordered cards. Below the grid is a "SKIP SHOP" button. A merchant character stands on the right side.

**Genie Encounter Screen** (`genie-encounter-screen.png`): Three-panel layout. The left panel ("GENIE ENCOUNTER") shows the defeated boss name, the new curse with description, and a list of accumulated curses. The center shows a genie character floating above a moonlit oasis/desert scene. The right panel has "ENTER YOUR WISH:" with a text input area and a "GRANT WISH" button. The background is a nighttime desert with sand dunes, an oasis, and stars.

### Color Palette and Styling Constants

Derived from the reference screenshots and the Arabian Nights theme description:

- **Background**: Deep navy/indigo (#0a1628 to #1a2744)
- **Panel backgrounds**: Dark blue-grey with slight transparency (#1a2744 / rgba(26,39,68,0.9))
- **Panel borders**: Gold/amber (#c9a84c, #d4af37)
- **Primary text**: Off-white (#e8dcc8)
- **Accent text (headings, labels)**: Gold (#d4af37, #c9a84c)
- **Card table felt**: Dark blue-green (#0d2137)
- **Card faces**: White (#ffffff) with black/red suit colors
- **Buttons**: Dark slate with gold border, gold text. Hover: slightly lighter.
- **HP bar**: Green-to-red gradient based on percentage
- **Gold icon**: Bright gold circle (#d4af37)
- **Affordable item highlight**: Subtle gold glow
- **Unaffordable item**: Dimmed/greyed out
- **Event log text**: Light grey (#b8b0a0)
- **Boss indicator**: Red/crimson accent (#8b0000)


## Plan of Work

The work proceeds in seven milestones. Each milestone builds on the previous and produces an independently verifiable result. The frontend is built entirely under `src/gui/` and tested via a separate Vite dev server (`npm run dev:gui`). The existing CLI and engine tests remain untouched and must continue passing at every milestone.

### Milestone 0: Tech Stack Setup

This milestone adds Vite and React to the project without disturbing the existing CLI or engine code. At the end, `npm run dev:gui` opens a browser showing a blank React page with "Geniejack" as the title and the existing `npm test` still passes all engine tests.

Add these dev dependencies to `package.json`:
- `react` (^19) and `react-dom` (^19) as runtime dependencies
- `@types/react` and `@types/react-dom` as dev dependencies
- `vite` (^6) and `@vitejs/plugin-react` (^4) as dev dependencies

Create `vite.config.ts` at the repository root. This file configures Vite to serve the React app from `src/gui/`. It must:
- Import `react` from `@vitejs/plugin-react`
- Set `root` to `'.'` (repository root)
- Set `publicDir` to `'public'` (for static assets like background images)
- Configure the dev server to open on port 3000
- Set the build output to `dist-gui/` (separate from any future CLI build output)

Create `index.html` at the repository root (Vite's entry point). This file is a minimal HTML shell:
- `<!DOCTYPE html>` with `<html lang="en">`
- `<head>` with meta charset, viewport, title "Geniejack"
- A `<link>` to Google Fonts for a thematic font: `Cinzel` (for headings — an ornate serif) and `Noto Sans` (for body text — clean and readable)
- `<body>` with a single `<div id="root"></div>`
- `<script type="module" src="/src/gui/main.tsx"></script>`

Create `src/gui/main.tsx` as the React entry point:
- Import React and ReactDOM
- Import `App` from `./App`
- Import `./styles/global.css`
- Call `ReactDOM.createRoot(document.getElementById('root')!).render(<App />)`

Create `src/gui/App.tsx` as a placeholder:
- A functional component that renders `<div className="app">Geniejack</div>`

Create `src/gui/styles/global.css`:
- Reset basic styles (margin, padding, box-sizing)
- Set `body` background to the deep navy (#0a1628)
- Set default font to `'Noto Sans', sans-serif`
- Set default text color to off-white (#e8dcc8)

Create `src/gui/styles/theme.css` with all CSS custom properties:
- `--color-bg-deep: #0a1628`
- `--color-bg-panel: #1a2744`
- `--color-bg-panel-translucent: rgba(26, 39, 68, 0.92)`
- `--color-border-gold: #c9a84c`
- `--color-border-gold-bright: #d4af37`
- `--color-text-primary: #e8dcc8`
- `--color-text-gold: #d4af37`
- `--color-text-muted: #b8b0a0`
- `--color-card-table: #0d2137`
- `--color-card-white: #ffffff`
- `--color-suit-red: #c0392b`
- `--color-suit-black: #2c3e50`
- `--color-btn-bg: #1a2744`
- `--color-btn-hover: #243352`
- `--color-btn-text: #d4af37`
- `--color-hp-high: #27ae60`
- `--color-hp-mid: #f39c12`
- `--color-hp-low: #c0392b`
- `--color-gold-icon: #d4af37`
- `--color-boss-accent: #8b0000`
- `--color-affordable-glow: rgba(212, 175, 55, 0.3)`
- `--font-heading: 'Cinzel', serif`
- `--font-body: 'Noto Sans', sans-serif`
- `--border-ornate: 2px solid var(--color-border-gold)`
- `--shadow-panel: 0 4px 20px rgba(0, 0, 0, 0.5)`
- `--shadow-glow-gold: 0 0 15px rgba(212, 175, 55, 0.3)`

Add a new script to `package.json`: `"dev:gui": "vite"`. This starts the Vite dev server which serves the React app.

Because the project uses `"type": "module"` and the existing `tsconfig.json` targets `NodeNext` (which is Node-specific), create a separate `tsconfig.gui.json` that extends the base config but overrides module resolution for the browser:
- `"extends": "./tsconfig.json"`
- Override `"module": "ESNext"`, `"moduleResolution": "bundler"`, `"jsx": "react-jsx"`
- Set `"include": ["src/gui/**/*", "src/engine/**/*"]`

In `vite.config.ts`, reference this tsconfig if needed (Vite's React plugin handles JSX automatically, but the TypeScript language server in the editor should use `tsconfig.gui.json` for GUI files).

Verification: Run `npm install` then `npm run dev:gui`. A browser opens showing "Geniejack" in off-white text on a deep navy background. Run `npm test` and confirm all existing engine tests still pass with 0 failures.


### Milestone 1: Application Shell and GameEngine Integration

This milestone builds the core application structure: a `useGameEngine` hook that wraps the `GameEngine` class, a screen router that selects the correct component based on `GameView.phase`, and placeholder components for every screen. At the end, starting a new game shows the pre-hand phase with real game data from the engine.

Create `src/gui/hooks/useGameEngine.ts`:

This is a custom React hook that manages the GameEngine instance and exposes the current GameView plus an action dispatcher. It works as follows:

    import { useState, useCallback, useRef } from 'react';
    import { GameEngine } from '../../engine/game.js';
    import type { GameView, PlayerAction } from '../../engine/types.js';

    export function useGameEngine() {
      const engineRef = useRef<GameEngine | null>(null);
      const [view, setView] = useState<GameView | null>(null);

      const startGame = useCallback((seed?: string) => {
        const engine = new GameEngine(seed);
        engineRef.current = engine;
        setView(engine.getView());
      }, []);

      const performAction = useCallback((action: PlayerAction) => {
        if (!engineRef.current) return;
        const result = engineRef.current.performAction(action);
        setView(engineRef.current.getView());
        return result;
      }, []);

      return { view, startGame, performAction };
    }

The hook stores the engine in a ref (so it persists across re-renders without causing them) and the view in state (so re-renders happen when the view changes). The `startGame` function creates a new engine and sets the initial view. The `performAction` function dispatches an action and updates the view.

Create `src/gui/screens/` directory with one file per screen:
- `StartScreen.tsx` — Title screen with "New Game" button and optional seed input
- `PreHandScreen.tsx` — Pre-hand phase (consumable use or continue)
- `PlayerTurnScreen.tsx` — Active blackjack hand (hit/stand/double)
- `HandResultScreen.tsx` — Hand outcome display
- `BattleResultScreen.tsx` — Enemy defeated summary
- `ShopScreen.tsx` — Marketplace
- `GenieScreen.tsx` — Genie encounter
- `GameOverScreen.tsx` — Death screen
- `VictoryScreen.tsx` — Win screen

Each screen component receives `view: GameView` and `onAction: (action: PlayerAction) => void` as props. In this milestone, each renders a minimal placeholder showing the phase name and basic data.

Create `src/gui/components/` directory for shared UI modules:
- `HeaderBar.tsx` — Stage/battle/hand counter (persistent module)
- `PlayerStatus.tsx` — HP, gold, equipment, consumables, effects, curses (persistent module)
- `EnemyStatus.tsx` — Enemy name, HP, description, abilities (persistent module)
- `EventLog.tsx` — Last 5 log entries (persistent module)
- `CardTable.tsx` — Card display area (used by pre-hand, player turn, hand result)
- `PlayingCard.tsx` — Single card rendering (suit symbol, rank, face-down state)

Update `src/gui/App.tsx` to:
1. Use the `useGameEngine` hook
2. If `view` is null, render `StartScreen` with `onStart={(seed) => startGame(seed)}`
3. If `view` is not null, render a layout wrapper containing: `HeaderBar`, the phase-specific screen component (selected by `view.phase`), and persistent modules (`PlayerStatus`, `EnemyStatus`, `EventLog`) arranged in the three-panel layout

The screen router is a simple switch on `view.phase`:
- `'pre_hand'` → `PreHandScreen`
- `'player_turn'` → `PlayerTurnScreen`
- `'hand_result'` → `HandResultScreen`
- `'battle_result'` → `BattleResultScreen`
- `'shop'` → `ShopScreen`
- `'genie'` → `GenieScreen`
- `'game_over'` → `GameOverScreen`
- `'victory'` → `VictoryScreen`

Verification: Run `npm run dev:gui`. The start screen appears with a "New Game" button. Click it. The screen transitions to the pre-hand phase. The header shows "Stage 1 Battle 1 Hand 1". The player status shows HP 50/50, Gold 0. The enemy status shows the first enemy's name and HP. Clicking "Continue" deals cards and transitions to the player turn. All data comes from the real engine — not mock data.


### Milestone 2: Main Game Screen — Card Table, Combat UI, and Persistent Modules

This milestone fully implements the main game screen — the screen the player spends most time on. It covers the `pre_hand`, `player_turn`, and `hand_result` phases with a fully styled card table, action buttons, and all persistent modules. At the end, the player can play a full blackjack hand with visual feedback.

The layout for the main game screen matches the reference screenshot (`main-game-screen.png`):

    ┌─────────────────────────────────────────────────────────┐
    │                      GENIEJACK                          │
    ├───────────┬─────────────────────────┬───────────────────┤
    │  PLAYER   │                         │  ENEMY STATUS     │
    │  STATUS   │     CARD TABLE          │  HP: 15/18        │
    │           │                         │  Description...   │
    │  HP:50/50 │  Dealer: [??] [7♦]     │  Abilities...     │
    │  GOLD:120 │        SCORE            │                   │
    │           │                         ├───────────────────┤
    │ EQUIPMENT │  Player: [A♠] [5♣]     │  EVENT LOG        │
    │  Wpn:...  │        SCORE            │  - msg1           │
    │  Hlm:...  │                         │  - msg2           │
    │  Arm:...  │   [HIT]    [STAND]      │  - msg3           │
    │  Bts:...  │                         │                   │
    │  Trk:...  │                         │                   │
    └───────────┴─────────────────────────┴───────────────────┘

**Component: PlayingCard** (`src/gui/components/PlayingCard.tsx`)

Renders a single playing card. Props: `card: Card | null` (null means face-down). The card is a white rounded rectangle with:
- If face-down: dark blue/indigo back with a decorative arabesque pattern (using CSS gradients and repeating patterns to evoke geometric Islamic tilework). No rank or suit is shown.
- If face-up: white background, rank in top-left and bottom-right corners, large suit symbol in the center. Red suits (hearts, diamonds) use `var(--color-suit-red)`. Black suits (clubs, spades) use `var(--color-suit-black)`. The suit symbols are the Unicode characters: ♠ ♥ ♦ ♣.
- Card dimensions: approximately 80px wide × 112px tall (maintain 5:7 ratio).
- Subtle shadow and 4px rounded corners.

**Component: CardTable** (`src/gui/components/CardTable.tsx`)

The card table is the center panel. It has a dark background (`var(--color-card-table)`) with an ornate gold border (double-line border with decorative corners). Inside:
- **Dealer row** (top): Shows the dealer's visible cards from `view.enemy.visibleCards`. Null entries render as face-down cards. Below the cards, show "SCORE" label and the visible score from `view.enemy.visibleScore` (or "?" if null). If `view.enemy.allRevealed` is true, show the full score.
- **Player row** (bottom): Shows the player's cards from `view.player.hand`. Below them, show "SCORE" label and `view.player.handScore.value`. If the hand is soft, append "(soft)". If busted, show "BUST" in red. If blackjack, show "BLACKJACK!" in gold.
- Between the two rows, during `hand_result` phase, show the hand result overlay: winner announcement ("WIN!", "LOSS!", or "PUSH"), damage dealt, and the damage breakdown string from `view.lastHandResult.damageBreakdown`.

**Component: ActionButtons** (`src/gui/components/ActionButtons.tsx`)

Renders action buttons appropriate to the current phase. Buttons are styled as dark rectangles with gold borders and gold text, matching the reference. The component reads `view.availableActions` and renders only the actions present:
- `player_turn`: "HIT" and "STAND" buttons always shown. "DOUBLE DOWN" shown only if `double_down` is in available actions.
- `hand_result` / `battle_result` / `pre_hand`: "CONTINUE" button.
- `pre_hand` with consumables: "USE ITEM" button (opens a consumable selection panel showing the player's consumables, each clickable to dispatch `use_consumable` with the correct `itemIndex`).

**Component: PlayerStatus** (`src/gui/components/PlayerStatus.tsx`)

The left panel. Has a gold-bordered header reading "PLAYER STATUS". Contents:
- **HP display**: "HP: {current}/{max}" with an HP bar (a horizontal bar that fills green-to-red based on HP percentage). Use a gradient: above 50% = green, 25-50% = amber, below 25% = red.
- **Gold display**: "GOLD: {amount}" with a small gold circle icon (●) next to it.
- **Equipment section**: Labeled "EQUIPMENT". Lists all 5 slots. For each slot, show an icon prefix (sword for weapon, helmet for helm, shield for armor, boot for boots, ring for trinket — use simple Unicode or emoji characters) followed by the item name and a brief effect summary. Empty slots show a dash (—).
- **Consumable section**: Shown only if `view.player.consumables.length > 0`. Lists consumables grouped by type with counts (e.g., "Health Potion x2").
- **Active effects section**: Shown only if `view.player.activeEffects.length > 0`. Lists each effect with remaining hands (e.g., "Strength (1 hand)").
- **Curse list**: Shown only if any wishes have curses. Lists curse names in a distinct red-tinged style.

**Component: EnemyStatus** (`src/gui/components/EnemyStatus.tsx`)

The right panel (top half). Has a gold-bordered header reading "ENEMY STATUS". Contents:
- Enemy name (large, gold text). If `view.enemy.isBoss`, prefix with a "BOSS" badge in crimson.
- "HP: {current}/{max}" with an HP bar (same style as player).
- Description text in muted color.
- Modifier descriptions listed below (enemy abilities like "Takes 50% less damage from Spades").

**Component: EventLog** (`src/gui/components/EventLog.tsx`)

The right panel (bottom half). Has a gold-bordered header reading "EVENT LOG". Shows the last entries from `view.log` as a scrollable list in muted text. Most recent entry at the top.

**Component: HeaderBar** (`src/gui/components/HeaderBar.tsx`)

Spans the full width at the top. Shows the game title "Geniejack" in large Cinzel font, gold color. Below it (or to the right), show: "Stage {n}" | "Battle {n}" | "Hand {n}". If the current enemy is a boss, show "BOSS" in crimson. On the far right, show "Seed: {seed}" in small muted text.

**Background**:

The main game screen background should evoke the Arabian Nights setting. Use CSS to create a layered background:
- Base: deep navy gradient
- Silhouetted architecture (minarets, arches, domes) along the bottom as a CSS background image or SVG. If an SVG silhouette is complex, create a simplified one with basic path shapes (pointed arches, round domes, thin minarets). Store it as an inline SVG in a CSS `background-image: url("data:image/svg+xml,...")` or as a separate file in `public/`.
- A moon glow in the upper portion (radial gradient of pale white/blue, positioned upper-center).

Verification: Run `npm run dev:gui`. Start a new game. The main game screen shows the three-panel layout matching the reference. Cards render with suit symbols. The player can click HIT to draw cards (cards appear in the player row, score updates). Click STAND to end the turn (dealer cards reveal, hand result overlay shows). Click CONTINUE to advance. All persistent modules update in real-time. The Arabian Nights theme is visible in colors, borders, and typography.


### Milestone 3: Shop Screen

This milestone implements the shop screen that appears after regular (non-boss) battles. The layout matches the reference screenshot (`shop-screen.png`).

The shop screen replaces the three-panel layout with a single marketplace scene:

    ┌─────────────────────────────────────────────────────────┐
    │                      GENIEJACK                          │
    ├─────────┬───────────────────────────────────────────────┤
    │ PLAYER  │              SHOP INVENTORY                   │
    │ GOLD    │  ┌──────────────┐  ┌──────────────┐          │
    │         │  │ Item 1       │  │ Item 2       │          │
    │ 180 ●   │  │ desc  [BUY] │  │ desc  [BUY] │          │
    │         │  ├──────────────┤  ├──────────────┤          │
    │         │  │ Item 3       │  │ Item 4       │          │
    │         │  │ desc  [BUY] │  │ desc  [BUY] │          │
    │         │  ├──────────────┤  ├──────────────┤          │
    │         │  │ Item 5       │  │ Item 6       │          │
    │         │  │ desc  [BUY] │  │ desc  [BUY] │          │
    │         │  ├──────────────┤  ├──────────────┤          │
    │         │  │ Item 7       │  │ Item 8       │          │
    │         │  │ desc  [BUY] │  │ desc  [BUY] │          │
    │         │  └──────────────┘  └──────────────┘          │
    │         │          [ SKIP SHOP ]                        │
    └─────────┴───────────────────────────────────────────────┘

**Component: ShopScreen** (`src/gui/screens/ShopScreen.tsx`)

The shop screen reads from `view.shop.items`. It renders:
- **Left sidebar**: "PLAYER GOLD" panel showing current gold amount with gold icon.
- **Center**: "SHOP INVENTORY" header, then a 2-column grid of item cards.
- **Bottom center**: "SKIP SHOP" button.

**Component: ShopItemCard** (`src/gui/components/ShopItemCard.tsx`)

Each shop item is rendered as a card in the grid. Props: `shopItem: ShopItem`, `onBuy: (index: number) => void`. The card contains:
- **Icon area** (left side): A small icon representing the item type. For equipment, show a thematic icon based on the slot (use simple Unicode or stylized text: ⚔ for weapon, ⛑ for helm, 🛡 for armor, 👢 for boots, 💎 for trinket). For consumables, use potion-style icons (🧪 for potions). These are placeholder representations; the reference shows small illustrative icons.
- **Item name** (bold, gold text).
- **Description** (muted text, smaller font, in parentheses like the reference: "(+10 Dmg, Weapon)").
- **Cost**: "{cost} Gold" below the description.
- **BUY button**: Right-aligned. If `shopItem.affordable` is true, the button is active with gold border. If false, the button is greyed out and disabled. Clicking an active BUY button calls `onBuy(shopItem.index)`.

After a purchase, the frontend calls `performAction({ type: 'buy_item', itemIndex: shopItem.index })` and the view updates, reflecting the new gold amount and the item either disappearing (if consumable) or becoming unaffordable/equipped.

The "SKIP SHOP" button calls `performAction({ type: 'skip_shop' })`.

**Background**: The shop screen has a different background from the main game screen. It should evoke a bustling souk marketplace:
- Sandy/warm ground tones at the bottom
- Blue sky with clouds at the top
- Market stall awnings (red/terracotta canopies) on the sides (can be rendered as CSS shapes or a simple SVG background)

Verification: Run `npm run dev:gui`. Play through a battle until it ends. The shop screen appears with the item grid. The player gold is shown. Items display names, descriptions, costs, and BUY buttons. Affordable items have active buttons; unaffordable ones are greyed out. Clicking BUY deducts gold and updates the view. Clicking SKIP SHOP advances to the next battle.


### Milestone 4: Genie Encounter Screen

This milestone implements the genie encounter screen shown after defeating a boss. The layout matches the reference screenshot (`genie-encounter-screen.png`).

    ┌─────────────────────────────────────────────────────────┐
    │                      GENIEJACK                          │
    ├───────────────┬──────────────────┬──────────────────────┤
    │ GENIE         │                  │  ENTER YOUR WISH:    │
    │ ENCOUNTER     │   (Genie         │                      │
    │               │    illustration)  │  ┌────────────────┐ │
    │ BOSS DEFEATED │                  │  │ I wish for...   │ │
    │  Ancient Strix│                  │  └────────────────┘ │
    │               │                  │                      │
    │ NEW CURSE:    │                  │  [ GRANT WISH ]      │
    │  Night Fang   │                  │                      │
    │  -description │                  │                      │
    │               │                  │                      │
    │ ACCUMULATED   │                  │                      │
    │ CURSES:       │                  │                      │
    │  - curse 1    │                  │                      │
    │  - curse 2    │                  │                      │
    └───────────────┴──────────────────┴──────────────────────┘

**Component: GenieScreen** (`src/gui/screens/GenieScreen.tsx`)

Three-panel layout. Data comes from `view.genie` and `view.player.wishes`.

- **Left panel** ("GENIE ENCOUNTER"):
  - "BOSS DEFEATED:" followed by `view.genie.bossName` with a skull/boss icon.
  - "NEW CURSE:" followed by `view.genie.curseDescription` in a distinct red-tinged style.
  - "ACCUMULATED CURSES:" listing all curse names from `view.player.wishes` where the wish has a non-null curse. Each curse listed with a bullet and its name.

- **Center panel**: A decorative illustration area representing the genie. Since we are building with CSS/HTML (not a game engine), create a stylized genie using CSS art or a placeholder SVG. At minimum, show a tall gradient shape (blue/turquoise) suggesting a genie form, with a golden lamp at the base. The background of this panel should show a moonlit desert/oasis scene (dark sky, sand dunes, water reflection).

- **Right panel** ("ENTER YOUR WISH:"):
  - A header "ENTER YOUR WISH:" in gold.
  - A text input (or textarea) with placeholder text "I wish for...". Styled with a dark background, gold border, and off-white text.
  - A "GRANT WISH" button below the input. Clicking it calls `performAction({ type: 'enter_wish', text: inputText })`. The button is disabled if the input is empty.
  - After the wish is entered (`view.genie.blessingEntered` becomes true), the input and button are replaced with a confirmation message: "Your wish has been recorded" and a "CONTINUE" button that calls `performAction({ type: 'continue' })`.

**Background**: Nighttime desert scene — dark sky with stars, sand dunes in warm amber tones, possibly an oasis with water reflections. This is distinct from both the main game and shop backgrounds.

Verification: Run `npm run dev:gui`. Play through Stage 1 (3 battles + boss). After defeating the boss, the genie screen appears. The left panel shows the boss name and curse. The right panel has a text input. Type "I wish for strength" and click GRANT WISH. The wish is stored, HP resets, and the game advances to Stage 2. The accumulated curses section shows the curse from Stage 1.


### Milestone 5: Terminal Screens and Pre-Hand Consumable Use

This milestone implements the remaining screens: game over, victory, battle result, and the consumable-use flow during pre-hand.

**Component: GameOverScreen** (`src/gui/screens/GameOverScreen.tsx`)

A dramatic full-screen overlay showing the player has died.
- Large "GAME OVER" title in crimson/red, Cinzel font.
- Summary stats: "Defeated at Stage {n}, Battle {n}".
- "Final Gold: {gold}".
- "Wishes Earned: {count}".
- "Seed: {seed}" for replay.
- A "NEW GAME" button that resets the application state (sets view to null, showing the start screen again).
- Background: dark, muted, possibly with a vignette effect.

**Component: VictoryScreen** (`src/gui/screens/VictoryScreen.tsx`)

A celebratory full-screen overlay.
- Large "VICTORY!" title in gold, Cinzel font, with a golden glow effect.
- Summary: "You conquered the Sultan's Palace!"
- "Wishes Earned: {count}".
- "Final Gold: {gold}".
- "Seed: {seed}".
- A "NEW GAME" button.
- Background: warm golden tones, maybe with subtle sparkle animation.

**Component: BattleResultScreen** (`src/gui/screens/BattleResultScreen.tsx`)

Shown when an enemy reaches 0 HP.
- Victory banner: "{enemy.name} Defeated!" in gold.
- "Gold Earned: +{amount}" (the gold reward).
- Updated player gold shown.
- "CONTINUE" button that advances to shop or genie.
- Background: same as main game screen.

**Pre-Hand Consumable Use**:

The `PreHandScreen` is similar to the `PlayerTurnScreen` layout but with different actions. If the player has consumables, show a "USE ITEM" button alongside "CONTINUE". When "USE ITEM" is clicked, expand a consumable selection panel:
- List each consumable in the player's inventory with its name, description, and a "USE" button.
- Clicking "USE" calls `performAction({ type: 'use_consumable', itemIndex: idx })`.
- After using, the view updates (consumable removed, effect applied or HP changed).
- The selection panel closes after use, but the player can use another or continue.

**Start Screen refinements**:

Update `StartScreen.tsx` to be more thematic:
- Large "GENIEJACK" title in gold Cinzel font.
- A decorative border or frame evoking Arabian architecture (horseshoe arch shape).
- Subtitle: "A Rogue-Like Blackjack Adventure".
- A seed input field (optional, placeholder: "Enter seed or leave blank").
- A "NEW GAME" button that calls `startGame(seed)`.

Verification: Run `npm run dev:gui`. Start a game. Lose on purpose (keep hitting until bust repeatedly). The game over screen appears with correct stats and a NEW GAME button. Start a new game with seed `--seed=42` (enter "42" in the seed field). Play through normally. Use a consumable during pre-hand by clicking USE ITEM, selecting a potion. Verify the effect applies (HP changes for health potion, effect appears for strength potion). If you win the game, the victory screen appears with correct stats.


### Milestone 6: Visual Polish — Arabian Nights Theme

This milestone is dedicated to visual refinement. All screens should feel cohesive, atmospheric, and true to the Arabian Nights reference. This is where the theme comes alive.

**Backgrounds**:

Create background SVG artwork (or elaborate CSS gradient compositions) for each screen type. Store reusable SVG files in `public/backgrounds/`:

1. `main-game-bg.svg` — Night sky with a large moon (upper right), silhouetted Arabian cityscape (minarets, domes, arches) along the bottom, stars scattered across the sky. Color: deep navy to indigo gradients. The architecture silhouettes are darker navy/black shapes.

2. `shop-bg.svg` — Daytime souk scene. Sandy ground, blue sky with white clouds, market stall framework on the sides (wooden posts with draped canopy shapes in terracotta/red). This is more of a warm, inviting scene.

3. `genie-bg.svg` — Night desert with an oasis. Deep blue sky, sand dunes in warm amber, a pool of water reflecting moonlight, scattered palm trees as silhouettes, and stars.

If creating SVGs is too complex, use layered CSS gradients and `clip-path` shapes to approximate the silhouettes. The key is that each screen has a distinct atmospheric background that sets the mood.

**Panel Styling**:

All panels (Player Status, Enemy Status, Event Log, Shop Inventory, Genie Encounter) share a consistent style:
- Background: `var(--color-bg-panel-translucent)` with a subtle backdrop blur (CSS `backdrop-filter: blur(4px)`)
- Border: `var(--border-ornate)` — 2px solid gold
- Rounded corners: 8px
- Box shadow: `var(--shadow-panel)`
- Header bar inside each panel: gold background gradient (subtle, dark gold to slightly lighter), with the panel title in uppercase, letter-spaced Cinzel font.

**Card Styling**:

Playing cards should have:
- Subtle inner shadow for depth
- A very slight rotation/spread when multiple cards are displayed (each card offset by -2deg to +2deg, overlapping slightly) to look like a real hand of cards fanned out
- The face-down card has an ornate back design: a repeating geometric pattern in deep indigo and gold, resembling Islamic zellige tilework. This can be achieved with CSS: a repeating `background-image` using `linear-gradient` at multiple angles to create a cross-hatch or star pattern.

**Button Styling**:

All buttons (HIT, STAND, CONTINUE, BUY, SKIP SHOP, GRANT WISH, etc.) share a consistent style:
- Background: dark slate with a subtle gradient
- Border: 1.5px solid gold
- Text: gold, uppercase, Cinzel font, letter-spaced
- Hover: background lightens slightly, border brightens, subtle glow appears
- Active/pressed: background darkens, border brightens fully
- Disabled: text and border become grey, no hover effect
- Padding: 10px 24px minimum
- Border-radius: 4px

**HP Bars**:

The HP bar for both player and enemy is a horizontal bar:
- Container: 200px wide, 12px tall, dark background (#111), 1px gold border, 2px rounded
- Fill: width proportional to current/max HP. Color transitions smoothly:
  - Above 60%: green (`var(--color-hp-high)`)
  - 30-60%: amber (`var(--color-hp-mid)`)
  - Below 30%: red (`var(--color-hp-low)`)
- The current HP and max HP numbers are shown next to or above the bar.

**Animations** (subtle, not distracting):

- Card dealing: when cards appear, animate them sliding in from off-screen (CSS `@keyframes` with `transform: translateY(-50px)` to `translateY(0)` and `opacity: 0` to `1`, duration 300ms).
- Damage flash: when HP changes, briefly flash the HP bar or the HP number (quick red flash for damage, green flash for healing).
- Screen transitions: a subtle fade (200ms) when switching between phases. Use CSS `opacity` transitions on the main content area.
- Gold change: when gold amount changes, briefly animate the number (scale up slightly then back to normal).
- Button hover: smooth transition on background-color and box-shadow (150ms).

**Typography**:

- Game title "Geniejack": Cinzel, 2.5rem, gold, letter-spacing 0.15em
- Panel headers: Cinzel, 1rem, gold, uppercase, letter-spacing 0.1em
- Body text: Noto Sans, 0.875rem, off-white
- Card rank/suit: System font or monospace, bold, 1.25rem for center symbol, 0.75rem for corners
- HP/Gold numbers: Noto Sans, bold, 1rem
- Buttons: Cinzel, 0.875rem, uppercase, letter-spacing 0.05em
- Event log: Noto Sans, 0.8rem, muted color

**Responsive Layout**:

The game should be playable at a minimum viewport of 1024x600. At larger viewports, the layout scales proportionally. The three-panel layout uses CSS Grid with `grid-template-columns: 250px 1fr 250px` for the main game screen. On narrower viewports (below 1024px), the side panels stack below the card table.

Verification: Run `npm run dev:gui`. The game should look and feel like the reference screenshots. Check: (1) backgrounds are atmospheric and match the Arabian Nights theme; (2) panels have consistent ornate borders; (3) cards look like playing cards with decorative backs; (4) buttons have consistent gold styling; (5) HP bars change color based on health percentage; (6) animations are present but subtle; (7) the game is playable at 1024x600 without scrolling on the main game area.


### Milestone 7: Playwright End-to-End Tests and Component Tests

This milestone adds comprehensive tests for the frontend. There are two testing layers:

1. **Playwright E2E tests** using the Playwright MCP — These tests launch the actual app in a real browser, interact with it (clicking buttons, typing text), and verify the visual state by reading the accessibility tree (using `browser_snapshot`) or taking screenshots.

2. **Vitest + React Testing Library component tests** — These test individual React components in isolation by rendering them with known props and asserting on the output DOM.

**Playwright E2E Tests** (run via the Playwright MCP tools):

The Playwright MCP provides browser automation tools. The E2E test flow is:

Test 1: Full game start and first hand
- Navigate to `http://localhost:3000`
- Verify the start screen shows "Geniejack" and a "New Game" button (use `browser_snapshot` to check accessibility tree)
- Type "test-seed-1" into the seed input
- Click "New Game"
- Verify the game transitions to the pre-hand phase (header shows "Stage 1 Battle 1 Hand 1")
- Click "Continue" to deal cards
- Verify the player turn screen shows cards and HIT/STAND buttons
- Click "HIT" — verify a new card appears in the player's hand
- Click "STAND" — verify the hand result shows with a winner, damage, and continue button
- Click "CONTINUE" to proceed

Test 2: Shop interaction
- Play through enough hands to defeat an enemy (use a known seed where this is predictable)
- Verify the shop screen appears with "SHOP INVENTORY" heading
- Verify shop items are displayed with names, costs, and BUY buttons
- Check that affordable items have active BUY buttons and unaffordable ones are greyed out
- Click a BUY button — verify the gold amount decreases
- Click "SKIP SHOP" — verify the game advances to the next battle

Test 3: Game over
- Start a game with a seed known to result in player death quickly (or manipulate by always hitting until bust)
- Verify the game over screen appears with "GAME OVER" text
- Verify the summary shows stage, battle, gold, and seed
- Click "NEW GAME" — verify the start screen reappears

Test 4: Genie encounter
- Play a full stage with a seed where the player survives (may need to find an appropriate seed by trial)
- After defeating the boss, verify the genie screen appears
- Verify the left panel shows the boss name and curse description
- Type "I wish for power" in the wish input
- Click "GRANT WISH"
- Verify the game advances to Stage 2

Test 5: Consumable use
- Start a game where the player has purchased consumables (requires playing through a shop first)
- During pre-hand phase, click "USE ITEM"
- Verify the consumable selection panel appears
- Click a consumable — verify the effect is applied (HP changes or effect appears in active effects)
- Click "CONTINUE" to proceed normally

Test 6: Determinism verification
- Start two games with the same seed "determinism-test"
- Play the same sequence of actions in both
- Verify the outcomes match (same hand results, same damage)

**Vitest Component Tests** (`tests/gui/` directory):

Create test files for key components:

`tests/gui/PlayingCard.test.tsx`:
- Renders a face-up card with correct suit symbol and rank
- Renders hearts/diamonds in red, clubs/spades in black
- Renders a face-down card with no visible rank or suit
- Renders an Ace of Spades as "A" and "♠"
- Renders a 10 correctly (two-digit rank)

`tests/gui/PlayerStatus.test.tsx`:
- Renders HP correctly (current/max)
- Shows gold amount
- Lists equipment slots with names (or dashes for empty)
- Shows consumables grouped with counts
- Shows active effects with remaining hands
- Shows curses from wishes

`tests/gui/EnemyStatus.test.tsx`:
- Renders enemy name and HP
- Shows BOSS badge for boss enemies
- Lists modifier descriptions

`tests/gui/ShopItemCard.test.tsx`:
- Renders item name, description, cost
- BUY button is active when affordable
- BUY button is disabled when not affordable
- Calls onBuy with correct index when clicked

`tests/gui/EventLog.test.tsx`:
- Renders log entries
- Shows most recent entries
- Handles empty log

`tests/gui/useGameEngine.test.ts`:
- `startGame` initializes with a view in pre_hand phase
- `performAction` updates the view
- Engine state persists across re-renders (useRef)

For the Vitest component tests, add `@testing-library/react` and `@testing-library/jest-dom` as dev dependencies. Configure Vitest to handle JSX in `vitest.config.ts` by adding the appropriate environment setting (`environment: 'jsdom'`) for test files in `tests/gui/`. Keep the existing engine test configuration unchanged.

Update `vitest.config.ts` to distinguish between engine tests (which run in Node) and GUI tests (which need jsdom). This can be done with Vitest's `workspace` feature or by using different `include` patterns with environment overrides:

    // In vitest.config.ts, add:
    test: {
      include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
      environmentMatchGlobs: [
        ['tests/gui/**', 'jsdom']
      ]
    }

Verification: Run `npm test`. All existing engine tests pass AND all new component tests pass. For the Playwright E2E tests, start the dev server with `npm run dev:gui`, then use the Playwright MCP tools (`browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`) to execute each test scenario. Each test should end with the expected state confirmed by accessibility tree inspection or screenshot comparison.


## Concrete Steps

All commands are run from the repository root: `D:\rouguelike-blackjack\rogue-like-black-jack`.

**Milestone 0 — Setup:**

    npm install react react-dom
    npm install --save-dev @types/react @types/react-dom vite @vitejs/plugin-react

Then create the files described in Milestone 0 (vite.config.ts, index.html, src/gui/main.tsx, src/gui/App.tsx, src/gui/styles/global.css, src/gui/styles/theme.css, tsconfig.gui.json). After creating all files:

    npm run dev:gui

Expected: Browser opens at http://localhost:3000 showing "Geniejack" text on dark navy background.

    npm test

Expected: All existing engine tests pass (13 test files, 80+ test cases).

**Milestone 1 — App Shell:**

Create all component and screen files listed in Milestone 1. After creating:

    npm run dev:gui

Expected: Start screen appears with seed input and New Game button. Clicking New Game shows the pre-hand phase with real engine data (Stage 1, Battle 1, enemy name, HP values).

**Milestone 2 — Main Game Screen:**

Create/update all component files described in Milestone 2. After:

    npm run dev:gui

Expected: Three-panel layout visible. Cards render as styled rectangles with suit symbols. HIT/STAND buttons work. Full hand of blackjack is playable. Hand result shows damage and winner.

**Milestone 3 — Shop Screen:**

Create ShopScreen and ShopItemCard components. After:

    npm run dev:gui

Expected: After defeating an enemy, shop appears with item grid. BUY and SKIP SHOP buttons function correctly.

**Milestone 4 — Genie Screen:**

Create GenieScreen component. After:

    npm run dev:gui

Expected: After defeating a boss (battle 4 in Stage 1), genie screen appears. Wish input works. Game advances to Stage 2.

**Milestone 5 — Terminal Screens:**

Create GameOverScreen, VictoryScreen, update BattleResultScreen and PreHandScreen. After:

    npm run dev:gui

Expected: All phases have complete UI. Game over and victory screens display correctly.

**Milestone 6 — Visual Polish:**

Update all component styles. Create background assets. After:

    npm run dev:gui

Expected: Game matches the reference screenshots in visual quality. Backgrounds, borders, cards, buttons, and animations all present.

**Milestone 7 — Tests:**

    npm install --save-dev @testing-library/react @testing-library/jest-dom jsdom

Create all test files. After:

    npm test

Expected: All engine tests + all GUI component tests pass.

For Playwright E2E tests, ensure the dev server is running:

    npm run dev:gui

Then use the Playwright MCP tools to execute each test scenario. Navigate to http://localhost:3000, interact with the game, and verify states via `browser_snapshot`.


## Validation and Acceptance

The implementation is complete when all of the following are true:

1. Running `npm run dev:gui` opens a browser showing the Geniejack start screen. The player can:
   - Start a new game with or without a seed
   - Play through a full blackjack hand (deal, hit, stand, see result)
   - Visit the shop and buy items or skip
   - Defeat a boss and interact with the genie
   - Reach game over or victory
   - Start a new game from any terminal screen

2. Every screen from `docs/product-specs/user-interface-wiki.md` is implemented:
   - Pre-hand with consumable use option
   - Player turn with hit/stand/double-down
   - Hand result with damage breakdown
   - Battle result with gold earned
   - Shop with item grid and purchase flow
   - Genie encounter with curse display and wish input
   - Game over with run summary
   - Victory with run summary

3. All persistent modules are visible on appropriate screens:
   - Header bar (every screen)
   - Player status with HP, gold, equipment, consumables, effects, curses (every screen)
   - Enemy status with HP, description, abilities (combat screens)
   - Event log (combat screens)

4. The visual theme matches the reference screenshots:
   - Deep navy/indigo backgrounds with Arabian architecture silhouettes
   - Gold ornate borders on all panels
   - Cinzel serif font for headings, Noto Sans for body text
   - Playing cards with suit symbols and decorative backs
   - Gold-themed buttons with hover states
   - HP bars that change color based on health percentage
   - Distinct backgrounds for main game (night city), shop (souk), and genie (desert oasis)

5. The same seed produces the same game in both CLI and GUI. Run `npm run dev -- --seed=42` and `npm run dev:gui` with seed "42", make the same choices, and observe identical outcomes.

6. Running `npm test` passes all tests — both existing engine tests (13 files, 80+ cases) and new GUI component tests.

7. Playwright E2E tests (run via MCP) confirm that:
   - A full game can be played from start to game over
   - Shop purchases work correctly
   - Genie wish input works
   - The start screen, game over screen, and victory screen all function

8. No game logic exists in `src/gui/`. All gameplay state comes from `GameEngine.getView()` and all actions go through `GameEngine.performAction()`.


## Idempotence and Recovery

All steps can be run repeatedly without causing damage:

- `npm install` is idempotent.
- `npm run dev:gui` starts a fresh dev server each time (kills any previous instance on the same port).
- `npm test` is a read-only operation.
- Creating/overwriting files with the Write tool is idempotent.
- Playwright tests are read-only (they interact with the app but do not modify files).

If a milestone fails:
- Check the browser console for errors (`browser_console_messages` via Playwright MCP or browser DevTools).
- Check `npm test` output for component test failures.
- Fix the source files and reload the dev server (Vite hot-reloads automatically on file save).
- The engine code in `src/engine/` must never be modified. If the frontend appears to need engine changes, the frontend is wrong — re-read the `GameView` interface and `user-interface-wiki.md`.

If the Vite dev server fails to start:
- Check that port 3000 is available. If not, Vite will suggest an alternative port.
- Check `vite.config.ts` for syntax errors.
- Check that `index.html` exists at the repo root with the correct script tag.


## Artifacts and Notes

Example of the useGameEngine hook in action:

    function App() {
      const { view, startGame, performAction } = useGameEngine();

      if (!view) {
        return <StartScreen onStart={(seed) => startGame(seed)} />;
      }

      switch (view.phase) {
        case 'player_turn':
          return <PlayerTurnScreen view={view}
                   onAction={(a) => performAction(a)} />;
        case 'shop':
          return <ShopScreen view={view}
                   onAction={(a) => performAction(a)} />;
        // ... etc
      }
    }

Example of a Playwright E2E test flow using MCP tools:

    // 1. Navigate to the app
    browser_navigate({ url: 'http://localhost:3000' })

    // 2. Snapshot to find elements
    browser_snapshot()
    // Look for "New Game" button ref

    // 3. Type seed
    browser_type({ ref: 'seed-input-ref', text: 'test-42' })

    // 4. Click New Game
    browser_click({ ref: 'new-game-button-ref' })

    // 5. Snapshot to verify game started
    browser_snapshot()
    // Verify "Stage 1 Battle 1 Hand 1" is present
    // Verify enemy name and HP are shown
    // Verify CONTINUE button is present

    // 6. Click Continue to deal
    browser_click({ ref: 'continue-button-ref' })

    // 7. Snapshot to verify cards dealt
    browser_snapshot()
    // Verify player has cards
    // Verify HIT and STAND buttons are present

Example of a component test:

    // tests/gui/PlayingCard.test.tsx
    import { render, screen } from '@testing-library/react';
    import { PlayingCard } from '../../src/gui/components/PlayingCard';

    test('renders a face-up Ace of Spades', () => {
      render(<PlayingCard card={{ suit: 'spades', rank: 'A' }} />);
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('♠')).toBeInTheDocument();
    });

    test('renders a face-down card without rank or suit', () => {
      render(<PlayingCard card={null} />);
      expect(screen.queryByText('♠')).not.toBeInTheDocument();
      expect(screen.queryByText('♥')).not.toBeInTheDocument();
    });

CSS custom property usage example:

    /* PlayerStatus.module.css */
    .container {
      background: var(--color-bg-panel-translucent);
      border: var(--border-ornate);
      border-radius: 8px;
      box-shadow: var(--shadow-panel);
      padding: 16px;
    }

    .header {
      font-family: var(--font-heading);
      color: var(--color-text-gold);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-size: 1rem;
      margin-bottom: 12px;
    }

    .hpBar {
      width: 100%;
      height: 12px;
      background: #111;
      border: 1px solid var(--color-border-gold);
      border-radius: 2px;
      overflow: hidden;
    }

    .hpFill {
      height: 100%;
      transition: width 300ms ease, background-color 300ms ease;
    }


## Interfaces and Dependencies

**New dependencies to add:**

Runtime:
- `react` ^19 — React framework
- `react-dom` ^19 — React DOM renderer

Dev:
- `@types/react` — TypeScript definitions for React
- `@types/react-dom` — TypeScript definitions for ReactDOM
- `vite` ^6 — Build tool and dev server
- `@vitejs/plugin-react` ^4 — Vite plugin for React JSX/HMR support
- `@testing-library/react` — Component testing utilities
- `@testing-library/jest-dom` — DOM assertion matchers
- `jsdom` — DOM environment for Vitest component tests

**File structure to create:**

    src/gui/
      main.tsx                              ← React entry point
      App.tsx                               ← Root component with screen router
      hooks/
        useGameEngine.ts                    ← Custom hook wrapping GameEngine
      screens/
        StartScreen.tsx                     ← Title/new game screen
        StartScreen.module.css
        PreHandScreen.tsx                   ← Pre-hand phase
        PreHandScreen.module.css
        PlayerTurnScreen.tsx                ← Active hand phase
        PlayerTurnScreen.module.css
        HandResultScreen.tsx                ← Hand outcome
        HandResultScreen.module.css
        BattleResultScreen.tsx              ← Battle victory
        BattleResultScreen.module.css
        ShopScreen.tsx                      ← Shop phase
        ShopScreen.module.css
        GenieScreen.tsx                     ← Genie encounter
        GenieScreen.module.css
        GameOverScreen.tsx                  ← Game over terminal
        GameOverScreen.module.css
        VictoryScreen.tsx                   ← Victory terminal
        VictoryScreen.module.css
      components/
        HeaderBar.tsx                       ← Persistent: stage/battle/hand info
        HeaderBar.module.css
        PlayerStatus.tsx                    ← Persistent: HP, gold, equipment
        PlayerStatus.module.css
        EnemyStatus.tsx                     ← Persistent: enemy info
        EnemyStatus.module.css
        EventLog.tsx                        ← Persistent: recent events
        EventLog.module.css
        CardTable.tsx                       ← Card display area
        CardTable.module.css
        PlayingCard.tsx                     ← Single playing card
        PlayingCard.module.css
        ActionButtons.tsx                   ← Phase-appropriate buttons
        ActionButtons.module.css
        ShopItemCard.tsx                    ← Single shop item
        ShopItemCard.module.css
        HpBar.tsx                           ← Reusable HP bar
        HpBar.module.css
        ConsumablePanel.tsx                 ← Consumable selection during pre-hand
        ConsumablePanel.module.css
        GameLayout.tsx                      ← Three-panel layout wrapper
        GameLayout.module.css
      styles/
        global.css                          ← Global resets and base styles
        theme.css                           ← CSS custom properties (color palette)
    public/
      backgrounds/                          ← Background SVG/images
    index.html                              ← Vite entry HTML
    vite.config.ts                          ← Vite configuration
    tsconfig.gui.json                       ← TypeScript config for GUI
    tests/gui/
      PlayingCard.test.tsx
      PlayerStatus.test.tsx
      EnemyStatus.test.tsx
      ShopItemCard.test.tsx
      EventLog.test.tsx
      useGameEngine.test.ts

**Key component interfaces:**

In `src/gui/hooks/useGameEngine.ts`:

    export function useGameEngine(): {
      view: GameView | null;
      startGame: (seed?: string) => void;
      performAction: (action: PlayerAction) => ActionResult | undefined;
    }

In every screen component (e.g., `src/gui/screens/PlayerTurnScreen.tsx`):

    interface ScreenProps {
      view: GameView;
      onAction: (action: PlayerAction) => void;
    }

    export function PlayerTurnScreen({ view, onAction }: ScreenProps): JSX.Element;

In `src/gui/components/PlayingCard.tsx`:

    interface PlayingCardProps {
      card: Card | null;  // null = face-down
    }

    export function PlayingCard({ card }: PlayingCardProps): JSX.Element;

In `src/gui/components/ShopItemCard.tsx`:

    interface ShopItemCardProps {
      shopItem: ShopItem;
      onBuy: (index: number) => void;
    }

    export function ShopItemCard({ shopItem, onBuy }: ShopItemCardProps): JSX.Element;

In `src/gui/components/HpBar.tsx`:

    interface HpBarProps {
      current: number;
      max: number;
    }

    export function HpBar({ current, max }: HpBarProps): JSX.Element;

In `src/gui/components/CardTable.tsx`:

    interface CardTableProps {
      playerCards: Card[] | null;
      playerScore: HandScore | null;
      dealerCards: (Card | null)[];
      dealerScore: number | null;
      dealerAllRevealed: boolean;
      handResult: HandResult | null;
      phase: GamePhase;
    }

    export function CardTable(props: CardTableProps): JSX.Element;

**Imports from engine (used by GUI code):**

The GUI imports ONLY from `src/engine/types.ts` (for type definitions) and `src/engine/game.ts` (for `GameEngine` class), plus `src/engine/cards.ts` (for `cardToString` utility). No other engine modules are imported directly — all game data flows through `GameView`.

    // In useGameEngine.ts:
    import { GameEngine } from '../../engine/game.js';
    import type { GameView, PlayerAction, ActionResult } from '../../engine/types.js';

    // In PlayingCard.tsx:
    import type { Card } from '../../engine/types.js';
    import { cardToString } from '../../engine/cards.js';

    // In ShopItemCard.tsx:
    import type { ShopItem } from '../../engine/types.js';


---

*Revision log:*

- 2026-02-21: Initial plan created. Covers full React frontend implementation with Arabian Nights theme, 7 milestones from scaffolding through E2E tests, consuming the existing GameEngine API without modification. Visual design based on three reference screenshots in docs/references/.
