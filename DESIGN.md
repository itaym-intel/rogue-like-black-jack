# Geniejack

## Core loop
- All opponents and the player have health points
- Health points are reset after every boss fight
- If the player reaches 0 health, the game is over and all progression is reset. Rogue-like system.
- If the "dealer" reaches 0 health, the player wins and moves on
- At the end of each regular battle, the player visits a shop where they may buy equipment and consumables
- After an arbritary number of battles, the player visits a boss, after a boss they visit a genini which is where the player gets wishes.

There are three major systems that are the "rogue-like" systems that progress throughout the course of a run.
- Wishes:
    Wishes are granted by the Genie, which is a special shop-like event after the player defeats a boss. The player is granted 1 "Wish", which is just a very strong dynamically-generated item comprised of the following:
    - Blessing: The player is given a textbox-input from the Genie to Wish for a blessing.
        - Similarly to infinite crafter, the result the player is given will be dynamically generated from an LLM and unique.
        - The prompt provided to the LLM will include background context on the player's situation (a log of all game events in the Player's run) and the "wish" the player made in the textbox input. Additionally, the LLM is given a API reference it can request with parameters for which represent the "Blessing" effects of the wish. The API reference will include a list of all modifier functions we have implemented within the game (some of which are used by Equipment and Consumables) and additional modifiers functions which cover the rest of the mechanics we can modify. The full API reference will have a modifier function for every possible modifiable game element. 
    - Curse:
        - Based on the Boss combatant defeated to attain this Wish, the player will also receive a Curse.
        - Curses correspond to the unique abilities of the Boss combatants, described below.

- Equipment: Permament items that last throughout a run. There are 5 core slots for equipment.
    - Weapon: Provides a modifier to the player's damage
        - Flint Spear (weakest): +5 Damage for player
        - Bronze Saif (Arabian Sword): +10 Damage for player
        - Iron Scimitar (Arabian Sword): +25 Damage for player
    - Helm: Lowers incoming damage when player busts
        - Cloth (weakest): Prevents 30% incoming damage on bust
        - Bronze: Prevents 50% incoming damage on bust
        - Iron (strongest): Prevents 80% incoming damage on bust
    - Armor: Modifies all instances of damage recieved
        - Cloth (weakest): Prevents 20% incoming damage
        - Bronze: Prevents 40% incoming damage
        - Iron (strongest): Prevents 60% incoming damage
    - Boots: Grants the player a chance ability to dodge incoming damage
        - Cloth (weakest): 10% Dodge chance
        - Bronze: 25% Dodge chance
        - Iron (strongest): 40% Dodge chance
    - Trinket: Special abilities that have gameplay modifiers
        - Cloth (weakest): +10 gold per battle.
        - Bronze: Player takes 25% less damage from a random suit, changes each battle.
        - Iron (strongest): Player bust counts as a score of 10.

- Consumables: One time use items
    - Health potion: increases health by 5
    - Damage potion: Deals 5 damage
    - Strength potion: increases damage by 30%
    - Poison potion: deals 3 damage after every hand. This damage is deal after core combat. Lasts 3 turns

## Combat

Blackjack core

Damage:
- The difference between the winning hand and the losing hand is dealt as damage to the loser
    - Ex: dealer 21, player 18, player takes 3 damage
    - Ex1: dealer 25, player 16, dealer takes 16 damage
- There may be modifiers beyond the base damage dealt

Combatants:
- All combatants have health points, and may have equipment and comsumables, similarly to the player.
    - Ex Stage 1 Combatant: Vampire Bat - 18 HP - Trinkets: Takes 50% less damage from Spade cards.

Boss Combatants:
- Boss Combatants inherit all the same abilities from normal combatants, but have generally more HP, deal more damage and can carry a Wish.
    - Ex Stage 1 Boss: Ancient Strix - 50 HP - Special Weapon, Night Fang: Deal 10 extra damage on blackjack (21) - Trinkets: Takes +2 damage from each Red colored card (Diamonds, Hearts) 

## Progression

Shop system: 
- After every non-boss combat
Genie:
- After defeating a boss