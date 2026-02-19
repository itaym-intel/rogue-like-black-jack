## Progression

### Hands Counter
A global counter that increments each time a hand is fully resolved. Displayed to the player at all times.

### Stages
- Game starts at **Stage 0**.
- Every **5 hands**, the stage increments by 1.
- At the end of each stage the player must meet the money threshold: `bankroll >= stage * 500`.
- Failing the threshold ends the run.

### Shop
- Opens between stages after a successful stage check.
- Offers **3 items** from the item catalog at random prices between **90–110 money**.
- Player can purchase any affordable items or leave the shop.

### Inventory
- Starts empty at the beginning of each run.
- Items purchased from the shop are added here.
- Viewable at any time via the `i` command in the CLI.