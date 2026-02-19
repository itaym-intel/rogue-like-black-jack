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
- Indefinite rounds until bankroll cannot cover the minimum bet
- Modifier hook interfaces for deck, scoring, split/double rules, and payouts

### Run

```bash
npm install
npm run dev
```

Optional args:

```bash
npm run dev -- --seed=1234 --bankroll=100
```
