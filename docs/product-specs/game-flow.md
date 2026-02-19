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

---

## Scene Lifecycle (GUI implementation contract)

This section is the authoritative source of truth for how Phaser scenes interact.
All frontend changes must follow this model.

### Scenes

| Scene | Role |
|---|---|
| `MenuScene` | Entry point. Navigates to GameScene on new game. |
| `GameScene` | Owns the game loop. **Never hard-stopped** except on game-over. |
| `SummaryOverlayScene` | Overlay launched over GameScene after each round. |
| `ShopScene` | Overlay launched over GameScene when metaPhase = "shop". |
| `InventoryOverlayScene` | Overlay launched over GameScene on demand (I key / button). |

### Rules

1. **Overlays use `scene.launch + scene.pause`**. GameScene is paused (not stopped) while any overlay is active.
2. **Every overlay closes itself with `scene.stop()` only** — it never calls `scene.resume`, `scene.start`, or `scene.stop` on any other scene.
3. **GameScene is the sole routing authority**. It listens for each overlay's `shutdown` event and decides what to do next based on `adapter.getState().metaPhase`:
   - After SummaryOverlayScene closes:
     - `metaPhase === "playing"` → resume GameScene (normal next round)
     - `metaPhase === "shop"` → launch ShopScene + pause GameScene
     - `metaPhase === "game_over"` → stop GameScene + start MenuScene (run ended)
   - After ShopScene closes → resume GameScene (shop was left, round loop continues)
   - After InventoryOverlayScene closes → resume GameScene
4. **Game over** is the only case where GameScene itself is stopped. It is handled exclusively inside `onSummaryShutdown`: when `metaPhase === "game_over"` after SummaryOverlayScene closes, GameScene stops itself and starts MenuScene. No other code path navigates away from GameScene on game-over.
5. **All overlay shutdown listeners are registered as named functions** and removed when GameScene shuts down (SHUTDOWN event), preventing listener accumulation across scene restarts.

### Correct transition sequence for "shop after stage clear"

```
Round ends (5th hand, pass)
  → GameAdapter emits roundSettled (metaPhase = "shop")
  → GameScene: scene.launch(SummaryOverlayScene) + scene.pause()
  → SummaryOverlayScene shows "TO SHOP →" button
  → Player clicks → SummaryOverlayScene calls scene.stop()  ← self only
  → GameScene.onSummaryShutdown fires → metaPhase === "shop"
      → scene.launch(ShopScene) + scene.pause()
  → Player leaves shop → adapter.leaveShop() → ShopScene calls scene.stop()  ← self only
  → GameScene.onShopShutdown fires → scene.resume()
  → Betting phase begins
```