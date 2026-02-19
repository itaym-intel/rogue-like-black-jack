## Game Flow

1. **Game Start** — Player begins with a starting bankroll at Stage 0, Hands 0, empty inventory.
2. **Betting Phase** — Player places a wager from their bankroll.
3. **Hand Phase** — Standard blackjack: hit, stand, double, split. Dealer auto-plays.
4. **Hand Resolution** — Outcome settled, bankroll updated, Hands counter increments.
5. **Stage Check** — Every 5 hands, the Stage increments. Player must have `bankroll >= stage * 500`.
   - **Pass** → Shop phase opens with 3 items for purchase.
   - **Fail** → Game over.
6. **Shop Phase** — Player can buy items (90–110 money each) or leave. Purchased items go to inventory.
7. **Loop** — Return to Betting Phase until game over (bankroll too low or stage check failed).