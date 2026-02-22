# Genini Blackjack

## Core loop

- All opponents and the player have health points
- Health points are reset after every boss fight
- If the player reaches 0 health, the game is over and all progression is reset. Rogue-like system.
- If the "dealer" reaches 0 health, the player wins and moves on
- At the end of each regular battle, the player visits a shop where they may buy equipment and consumables
- After an arbritary number of battles, the player visits a boss, after a boss they visit a genini which is where the player gets wishes.

There are three major systems that are the "rogue-like" systems that progress throughout the course of a run.
- Wishes: 
- Equipment: Permament items that last throughout a run. There are 5 core slots for equipment.
    - Weapon: Provides a modifier to the player's damage
    - Helm: Modifies the first instance of damage recieved
        - Cloth (weakest): Prevents 3 incoming damage
        - Bronze: Prevents 7 incoming damage
        - Iron (strongest): Prevents 15 incoming damage
    - Armor: Modifies all instances of damage recieved
        - Cloth (weakest): Prevents 10% incoming damage
        - Bronze: Prevents 25% incoming damage
        - Iron (strongest): Prevents 50% incoming damage
    - Boots: Modifies you chances ability to dodge incoming damage
        - Cloth (weakest): 
        - Bronze: 
        - Iron (strongest): 
    - Trinket: Special abilities that have gameplay modifiers
        - Cloth (weakest): 
        - Bronze: 
        - Iron (strongest): 


    - Cloth (weakest): 
    - Copper: 
    - Brass: 
    - Bronze: 
    - Iron (strongest): 

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


## Progression

Shop system: 
- After every non-boss combat

Genini:
- After defeating a boss