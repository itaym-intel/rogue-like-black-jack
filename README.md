# rogue-like-black-jack

We want a rogue-like blackjack game where the player is able to play black jack and over the course of the game modify different parts of blackjack
in a variety of ways to have a unique "run" and this will involve many modification of the basic rules of blackjack. Thus we must design in such a way
that every single thing written is modular and has the ability to change. We want a very large array of possible interactions and combinations of how
the player can choose to interact with the core game of blackjack.

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
