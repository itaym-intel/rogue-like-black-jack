## Basic Game Setup

black table that the player views from the top down dealer in front of the player's view

player has X (1 by default) card to start in their "hand", placed in front of them open
dealer has X (1 by default) visible card and X (1 by default) turned over card in front of them,
the cards in front of the dealer are facing the player

player can hit, stand, double or split

the player starts with some X "money" (starting point can be changed)

player can wager up to their entire sum of "money", if the player is out of "money" the player use the double action

if the player wins, by scoring a hand closer to 21 than the dealer, the player earns 200% the money wagered
if the player scores a black jack (any face card + an ace) then the player wins 250% of their wager

## Hands System

Every time a hand is played (dealt and resolved), the global "Hands" counter increments.
The counter is displayed to the player throughout the game.

## Stage System

The game begins at Stage 0. Every 5 hands played, the Stage increments.
At the end of each stage the player must have `total_money >= stage * 500` to pass.
If the player fails the threshold, the game ends.

## Item / Relic System

Items (relics) can be collected and stored in the player's inventory.
Each item has: `ItemName`, `ItemDescription`, `ItemRarity` (common / uncommon / rare / legendary).
Items support an extensible effect system with triggers:
- `passive` — always active as a BlackjackModifier while held
- `on_hand_start` / `on_hand_end` — fires per hand
- `on_stage_end` — fires at stage boundaries
- `on_purchase` — fires once on acquisition

Current placeholder items (no effects): Itay, John, Noah.

## Inventory System

The player has an inventory that starts empty and accumulates items over the run.
The inventory is viewable at any prompt by typing `i`.

## Shop System

Between each stage (after the stage threshold is met), a shop appears offering 3 items.
Each item is priced randomly between 90–110 money.
The player can purchase items (deducted from bankroll, added to inventory) or leave the shop.

## Modifiable interactions

modifying the deck (?)
modifying the resulting score of the player's hand
modifying the resulting score of the dealer's hand
modifying the resulting score of one card in the player's or dealer's hand
modifying the target score (default 21)
modifying the conditions to split
modifying the conditions to double
modifying the earnings a player makes from winning
modifying the earnings a player makes from winning with a certain hand