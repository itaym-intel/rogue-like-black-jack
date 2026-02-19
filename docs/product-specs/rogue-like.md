## Rogue-Like Elements

### Items / Relics
Items are collectible relics that the player acquires during a run via the shop. Each item has:
- **ItemName** — display name
- **ItemDescription** — flavor text
- **ItemRarity** — `common`, `uncommon`, `rare`, or `legendary`
- **Effects** — an array of effect definitions, each with:
  - `trigger` — when the effect activates (`passive`, `on_hand_start`, `on_hand_end`, `on_stage_end`, `on_purchase`)
  - `modifier` — (passive only) a `BlackjackModifier` applied while the item is held
  - `apply` — (non-passive) a callback executed at the trigger point

Current placeholder items have no effects and exist to validate the system:
- **Itay** (common) — "A mysterious placeholder relic."
- **John** (uncommon) — "A worn placeholder token."
- **Noah** (rare) — "An ancient placeholder charm."

### Run Structure
Each run is a sequence of stages. The player progresses by surviving stage thresholds and collecting items that modify the rules of blackjack in their favor. The combination of items found and purchased creates the unique "build" for each run.