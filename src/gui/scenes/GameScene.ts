import Phaser from "phaser";
import { GameAdapter } from "../adapter/GameAdapter.js";
import type { GuiGameState, GuiPlayerAction, GuiRoundSummary } from "../adapter/index.js";
import { HandContainer } from "../components/HandContainer.js";
import { ActionPanel, ACTION_PANEL_EVENT, VR_GOGGLES_EVENT } from "../components/ActionPanel.js";
import { BetPanel, BET_CONFIRMED_EVENT } from "../components/BetPanel.js";
import { HudPanel } from "../components/HudPanel.js";

/** Key used to launch the summary overlay on top of this scene. */
export const SUMMARY_OVERLAY_KEY = "SummaryOverlayScene";

/**
 * GameScene
 * ──────────────────────────────────────────────────────────────────────────────
 * The primary play scene.  It owns:
 *  - A GameAdapter (received via scene data from MenuScene)
 *  - A dealer hand area
 *  - Up to 4 player hand areas (for splits)
 *  - A HUD (bankroll / round / deck)
 *  - An ActionPanel (hit/stand/double/split)
 *  - A BetPanel (chip-based wager entry)
 *
 * The scene subscribes to adapter events and reconciles component state on
 * each `stateChanged` event.  No component ever calls the adapter directly —
 * they emit scene-level events which this scene handles.
 *
 * Layout (1280 × 720):
 *  ┌─────────────────────────────────────────────────────┐
 *  │  [HUD]                                    [SEED]    │  y≈20
 *  │                                                     │
 *  │                [DealerHand]                         │  y≈200
 *  │           dealer score label                        │  y≈270
 *  │                                                     │
 *  │          [PlayerHand(s)]                            │  y≈440
 *  │                                                     │
 *  │             [ActionPanel | BetPanel]                │  y≈620
 *  └─────────────────────────────────────────────────────┘
 */
export class GameScene extends Phaser.Scene {
  // Injected via scene data
  private adapter!: GameAdapter;

  // Table layout
  private readonly DEALER_Y = 200;
  private readonly PLAYER_Y = 440;
  private readonly PANEL_Y = 620;
  private readonly CX = 640;
  private readonly CY = 360;

  // Components
  private hud!: HudPanel;
  private actionPanel!: ActionPanel;
  private betPanel!: BetPanel;
  private dealerHandContainer!: HandContainer;
  private playerHandContainers: HandContainer[] = [];

  // Labels
  private dealerScoreLabel!: Phaser.GameObjects.Text;
  private seedLabel!: Phaser.GameObjects.Text;
  private phaseLabel!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;

  // State
  private isAnimating = false;

  // VR Goggles card-selection flow
  private vrGogglesMode: "selecting_card" | "choosing_duration" | null = null;
  private vrGogglesSelectedCardId: string | null = null;
  private vrGogglesDialog: Phaser.GameObjects.Container | null = null;
  private vrGogglesBanner: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: "GameScene" });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  init(data: { adapter: GameAdapter }): void {
    this.adapter = data.adapter;
    this.playerHandContainers = [];
    this.isAnimating = false; // reset in case scene.start() reuses this instance
  }

  create(): void {
    this.buildTable();
    this.buildComponents();
    this.buildLabels();
    this.wireEvents();

    // Initial render
    this.syncUi(this.adapter.getState());
  }

  // ── Table background ──────────────────────────────────────────────────────

  private buildTable(): void {
    const { width, height } = this.scale;

    // Felt
    this.add.rectangle(this.CX, this.CY, width, height, 0x1a5e1a);

    // Edge trim
    const trim = this.add.graphics();
    trim.lineStyle(6, 0x0e3e0e, 1);
    trim.strokeRect(8, 8, width - 16, height - 16);

    // Dealer arc zone
    const dealerArc = this.add.graphics();
    dealerArc.lineStyle(2, 0x2a7a2a, 1);
    dealerArc.strokeEllipse(this.CX, this.DEALER_Y, 520, 110);

    // Player zone
    const playerZone = this.add.graphics();
    playerZone.lineStyle(2, 0x2a7a2a, 1);
    playerZone.strokeEllipse(this.CX, this.PLAYER_Y + 40, 700, 130);

    // Divider line
    this.add.graphics()
      .lineStyle(1, 0x0e3e0e, 0.6)
      .lineBetween(80, this.CY - 20, width - 80, this.CY - 20);
  }

  // ── Components ────────────────────────────────────────────────────────────

  private buildComponents(): void {
    this.hud = new HudPanel(this, 20, 16);

    this.actionPanel = new ActionPanel(this, this.CX, this.PANEL_Y);
    this.betPanel = new BetPanel(this, this.CX, this.PANEL_Y);

    this.dealerHandContainer = new HandContainer(this, this.CX, this.DEALER_Y);
  }

  private buildLabels(): void {
    const { width } = this.scale;

    this.add.text(this.CX, this.DEALER_Y - 120, "DEALER", {
      fontSize: "14px",
      color: "#8da88d",
      letterSpacing: 4,
    }).setOrigin(0.5, 0.5);

    this.dealerScoreLabel = this.add.text(this.CX, this.DEALER_Y + 80, "", {
      fontSize: "18px",
      color: "#e8e8e8",
      stroke: "#000",
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5);

    this.seedLabel = this.add.text(width - 16, 16, "", {
      fontSize: "11px",
      color: "#556655",
    }).setOrigin(1, 0);

    // Inventory button (bottom-right)
    const invBtn = this.add.text(width - 16, this.scale.height - 16, "[I] Inventory", {
      fontSize: "13px",
      color: "#88aa88",
      stroke: "#000",
      strokeThickness: 2,
    }).setOrigin(1, 1).setInteractive({ useHandCursor: true });
    invBtn.on("pointerover", () => invBtn.setColor("#c0e8c0"));
    invBtn.on("pointerout",  () => invBtn.setColor("#88aa88"));
    invBtn.on("pointerdown", () => {
      if (!this.scene.isPaused()) {
        this.scene.launch("InventoryOverlayScene", { adapter: this.adapter });
        this.scene.pause();
      }
    });

    this.phaseLabel = this.add.text(this.CX, this.PLAYER_Y - 100, "", {
      fontSize: "13px",
      color: "#f0e68c",
      stroke: "#000",
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5);

    this.messageText = this.add.text(this.CX, this.CY - 60, "", {
      fontSize: "28px",
      fontStyle: "bold",
      color: "#FFD700",
      stroke: "#000",
      strokeThickness: 5,
    }).setOrigin(0.5, 0.5).setVisible(false);
  }

  // ── Event wiring ──────────────────────────────────────────────────────────

  private wireEvents(): void {
    // BetPanel → adapter
    // Named so they can be explicitly removed on SHUTDOWN.
    // Phaser 3's Systems.shutdown() only removes transition-specific listeners
    // from scene.events — it does NOT call removeAllListeners(). Without explicit
    // cleanup these handlers accumulate across game-restarts (same scene instance
    // is reused), causing double-calls on the second game's first bet.
    const onBetConfirmed = ({ wager }: { wager: number }): void => {
      this.safeStartRound(wager);
    };
    const onActionSelected = (action: GuiPlayerAction): void => {
      if (!this.isAnimating) {
        this.safePerformAction(action);
      }
    };
    const onVrGogglesActivated = (): void => {
      this.enterVrGogglesSelectMode();
    };

    this.events.on(BET_CONFIRMED_EVENT, onBetConfirmed);
    this.events.on(ACTION_PANEL_EVENT,  onActionSelected);
    this.events.on(VR_GOGGLES_EVENT,    onVrGogglesActivated);

    // Named adapter handlers — removed on SHUTDOWN to prevent stale calls into
    // destroyed GL objects if another scene holds the adapter after our shutdown.
    const onStateChanged = ({ state }: { state: GuiGameState }): void => {
      this.syncUi(state);
    };
    const onRoundSettled = ({ summary, state }: { summary: GuiRoundSummary; state: GuiGameState }): void => {
      this.scene.launch(SUMMARY_OVERLAY_KEY, { summary, adapter: this.adapter, state });
      this.scene.pause();
    };
    const onGameOver = ({ finalBankroll, reason }: { finalBankroll: number; reason: string }): void => {
      // Show the outcome on the table surface. Navigation is handled by
      // onSummaryShutdown so that SummaryOverlayScene always controls the
      // transition — no competing timer-based navigation paths.
      const msg = reason === "stage_fail"
        ? `STAGE FAILED  $${finalBankroll.toFixed(2)}`
        : `GAME OVER  $${finalBankroll.toFixed(2)}`;
      this.showMessage(msg);
    };
    const onStageFailed = ({ stage, threshold, bankroll }: { stage: number; threshold: number; bankroll: number }): void => {
      this.showTemporaryMessage(`Stage ${stage} failed — needed $${threshold.toFixed(0)}, had $${bankroll.toFixed(2)}`, 2500);
    };

    this.adapter.on("stateChanged", onStateChanged);
    this.adapter.on("roundSettled", onRoundSettled);
    this.adapter.on("gameOver",     onGameOver);
    this.adapter.on("stageFailed",  onStageFailed);

    // ── Overlay routing ────────────────────────────────────────────────────
    // Per docs/product-specs/game-flow.md scene-lifecycle contract:
    // Every overlay closes itself with scene.stop() only.
    // GameScene is the sole routing authority — it inspects metaPhase in each
    // overlay's shutdown listener to decide what to do next.

    // SummaryOverlayScene closes → resume, then route by metaPhase.
    const onSummaryShutdown = (): void => {
      if (this.scene.isPaused()) {
        this.scene.resume();
      }
      const meta = this.adapter.getState().metaPhase;
      if (meta === "shop") {
        // Stage cleared — launch ShopScene as an overlay on top of GameScene.
        const state = this.adapter.getState();
        this.scene.launch("ShopScene", { adapter: this.adapter, state });
        this.scene.pause();
      } else if (meta === "game_over") {
        // Run ended — stop this scene and return to the main menu.
        // The brief game-over message set by onGameOver is visible for one frame;
        // that's fine. We stop immediately so no stale adapter state lingers.
        this.scene.stop();
        this.scene.start("MenuScene");
      }
      // meta === "playing" → betting panel shows, nothing else to do.
    };

    // ShopScene closes (after adapter.leaveShop()) → just resume GameScene.
    const onShopShutdown = (): void => {
      if (this.scene.isPaused()) {
        this.scene.resume();
      }
    };

    // InventoryOverlayScene closes → resume GameScene.
    const onInventoryShutdown = (): void => {
      if (this.scene.isPaused()) {
        this.scene.resume();
      }
    };

    this.scene.get(SUMMARY_OVERLAY_KEY)?.events.on("shutdown", onSummaryShutdown);
    this.scene.get("ShopScene")?.events.on("shutdown", onShopShutdown);
    this.scene.get("InventoryOverlayScene")?.events.on("shutdown", onInventoryShutdown);

    // Remove all external listeners when this scene shuts down.
    // Call removeAllListeners() on the adapter as belt-and-suspenders so the
    // old adapter is completely neutered even if a reference escapes.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.adapter.removeAllListeners();
      // Remove scene-level handlers added above. Phaser does NOT call
      // removeAllListeners() on scene.events during shutdown (only on destroy),
      // so without this they accumulate and double-fire on the next game run.
      this.events.off(BET_CONFIRMED_EVENT, onBetConfirmed);
      this.events.off(ACTION_PANEL_EVENT,  onActionSelected);
      this.events.off(VR_GOGGLES_EVENT,    onVrGogglesActivated);
      this.scene.get(SUMMARY_OVERLAY_KEY)?.events.off("shutdown", onSummaryShutdown);
      this.scene.get("ShopScene")?.events.off("shutdown", onShopShutdown);
      this.scene.get("InventoryOverlayScene")?.events.off("shutdown", onInventoryShutdown);
    });

    // Inventory overlay: keyboard shortcut (I key).
    this.input.keyboard?.on("keydown-I", () => {
      if (!this.scene.isPaused()) {
        this.scene.launch("InventoryOverlayScene", { adapter: this.adapter });
        this.scene.pause();
      }
    });
  }

  // ── UI sync ───────────────────────────────────────────────────────────────

  /**
   * Master sync method.  This is called after every adapter state change.
   * It reconciles ALL components with the latest GuiGameState snapshot.
   * Adding new UI elements means updating this method and the relevant
   * component — GameScene itself doesn't hold game logic.
   */
  private syncUi(state: GuiGameState): void {
    this.hud.sync(state);
    this.seedLabel.setText(`seed: ${String(state.phase === "awaiting_bet" ? this.adapter.getState().bankroll : state.bankroll) !== "0" ? "●●●●" : "—"}`);

    // If the round ended while in VR Goggles mode, clean up silently
    if (this.vrGogglesMode !== null && state.phase !== "player_turn") {
      this.destroyVrGogglesUi();
    }

    // Dealer hand
    this.dealerHandContainer.syncCards(state.dealerCards, true);

    // Dealer score label
    const isPlayerTurn = state.phase === "player_turn";
    this.dealerScoreLabel.setText(
      state.dealerCards.length === 0
        ? ""
        : isPlayerTurn
        ? `${state.dealerCards[0] ? "?" : "—"}`
        : `${state.dealerScore}${state.dealerScore > state.targetScore ? " 💥" : ""}`,
    );

    // Player hands — reconcile container array
    this.reconcilePlayerHandContainers(state);

    // Phase label
    this.phaseLabel.setText(this.phaseDescription(state.phase));

    // Show/hide panels
    const betting =
      state.phase === "awaiting_bet" || state.phase === "round_settled";
    const acting = state.phase === "player_turn";

    this.betPanel.setVisible(betting);
    this.actionPanel.setVisible(acting);

    if (betting) {
      this.betPanel.setBetLimits(state.minimumBet, state.bankroll);
    }

    if (acting) {
      this.actionPanel.setAvailableActions(state.availableActions);
      // Only show VR Goggles button when not mid-selection flow
      this.actionPanel.setVrGogglesVisible(
        state.vrGogglesAvailable && this.vrGogglesMode === null,
      );
    } else {
      this.actionPanel.setAvailableActions([]);
      this.actionPanel.setVrGogglesVisible(false);
    }
  }

  private reconcilePlayerHandContainers(state: GuiGameState): void {
    const needed = state.playerHands.length;

    // Add missing containers
    while (this.playerHandContainers.length < needed) {
      const container = new HandContainer(this, 0, this.PLAYER_Y);
      this.playerHandContainers.push(container);
    }

    // Remove excess containers (from previous round)
    while (this.playerHandContainers.length > needed) {
      const old = this.playerHandContainers.pop();
      old?.destroy();
    }

    // Spread hand containers evenly around the center
    const handCount = needed;
    const spacing = Math.min(320, 600 / Math.max(1, handCount));
    const startX = this.CX - ((handCount - 1) * spacing) / 2;

    for (let i = 0; i < needed; i += 1) {
      const container = this.playerHandContainers[i];
      container.setPosition(startX + i * spacing, this.PLAYER_Y);
      container.syncHand(state.playerHands[i], true);
    }
  }

  // ── Adapter commands ──────────────────────────────────────────────────────

  private safeStartRound(wager: number): void {
    try {
      this.adapter.startRound(wager);
    } catch (err) {
      this.showTemporaryMessage(errorMessage(err), 2000);
    }
  }

  private safePerformAction(action: GuiPlayerAction): void {
    try {
      this.isAnimating = true;
      this.adapter.performAction(action);
      // Re-enable after animations settle
      this.time.delayedCall(300, () => {
        this.isAnimating = false;
      });
    } catch (err) {
      this.isAnimating = false;
      this.showTemporaryMessage(errorMessage(err), 2000);
    }
  }

  // ── VR Goggles flow ───────────────────────────────────────────────────────

  /**
   * Step 1 — Player clicks the VR Goggles button.
   * Hides standard action buttons, makes each card in the active hand clickable,
   * and shows an instruction banner.
   */
  private enterVrGogglesSelectMode(): void {
    const state = this.adapter.getState();
    if (!state.vrGogglesAvailable || this.vrGogglesMode !== null) return;

    this.vrGogglesMode = "selecting_card";

    // Disable standard actions while selecting
    this.actionPanel.setAvailableActions([]);
    this.actionPanel.setVrGogglesVisible(false);

    // Show instruction banner
    this.vrGogglesBanner = this.add.text(
      this.CX,
      this.PLAYER_Y - 130,
      "🥽 Click a card to boost its value by 1   [ESC to cancel]",
      { fontSize: "15px", color: "#f0e68c", stroke: "#000", strokeThickness: 3 },
    ).setOrigin(0.5, 0.5).setDepth(10);

    // Make each card in the active hand clickable
    const activeIndex = state.activeHandIndex;
    if (activeIndex !== null) {
      const container = this.playerHandContainers[activeIndex];
      container?.setCardsInteractive(true, (cardId) => {
        this.onVrGogglesCardSelected(cardId);
      });
    }

    // ESC cancels
    this.input.keyboard?.once("keydown-ESC", () => this.cancelVrGoggles());
  }

  /**
   * Step 2 — Player clicked a card.
   * Disable card hover, show the permanent/this-hand dialog.
   */
  private onVrGogglesCardSelected(cardId: string): void {
    if (this.vrGogglesMode !== "selecting_card") return;

    this.vrGogglesMode = "choosing_duration";
    this.vrGogglesSelectedCardId = cardId;

    // Clear card interactivity
    for (const container of this.playerHandContainers) {
      container.setCardsInteractive(false);
    }

    this.vrGogglesBanner?.destroy();
    this.vrGogglesBanner = null;

    this.showVrGogglesDurationDialog(cardId);
  }

  /**
   * Step 3 — Show a small dialog: "This Hand Only" | "Permanent" | Cancel.
   */
  private showVrGogglesDurationDialog(cardId: string): void {
    const dialogX = this.CX;
    const dialogY = this.CY;

    const dialog = this.add.container(dialogX, dialogY).setDepth(20);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.92);
    bg.fillRoundedRect(-160, -70, 320, 140, 12);
    bg.lineStyle(2, 0xffd700, 1);
    bg.strokeRoundedRect(-160, -70, 320, 140, 12);

    const title = this.add.text(0, -42, "How long should the boost last?", {
      fontSize: "14px", color: "#f0e68c", stroke: "#000", strokeThickness: 2,
    }).setOrigin(0.5, 0.5);

    const makeDialogBtn = (
      label: string,
      x: number,
      color: number,
      onClick: () => void,
    ): Phaser.GameObjects.Container => {
      const btn = this.add.container(x, 18);
      const btnBg = this.add.graphics();
      btnBg.fillStyle(color, 1);
      btnBg.fillRoundedRect(-100, -18, 200, 36, 8);
      const btnLabel = this.add.text(0, 0, label, {
        fontSize: "13px", color: "#fff", stroke: "#000", strokeThickness: 2,
      }).setOrigin(0.5, 0.5);
      const zone = this.add.zone(0, 0, 200, 36).setInteractive();
      zone.on("pointerover", () => { btnBg.setAlpha(0.75); });
      zone.on("pointerout",  () => { btnBg.setAlpha(1); });
      zone.on("pointerdown", onClick);
      btn.add([btnBg, zone, btnLabel]);
      return btn;
    };

    const thisHandBtn = makeDialogBtn("This Hand Only", -110, 0x2980b9, () => {
      this.confirmVrGoggles(cardId, false);
    });
    const permBtn = makeDialogBtn("Permanent", 110, 0x8e44ad, () => {
      this.confirmVrGoggles(cardId, true);
    });

    const cancelTxt = this.add.text(0, 55, "Cancel (ESC)", {
      fontSize: "12px", color: "#aaa",
    }).setOrigin(0.5, 0.5).setInteractive();
    cancelTxt.on("pointerdown", () => this.cancelVrGoggles());

    dialog.add([bg, title, thisHandBtn, permBtn, cancelTxt]);
    this.vrGogglesDialog = dialog;

    this.input.keyboard?.once("keydown-ESC", () => this.cancelVrGoggles());
  }

  /** Confirm with the chosen permanence and call the adapter. */
  private confirmVrGoggles(cardId: string, permanent: boolean): void {
    this.destroyVrGogglesUi();
    try {
      this.adapter.useVrGoggles(cardId, permanent);
    } catch (err) {
      this.showTemporaryMessage(errorMessage(err), 2000);
    }
    // syncUi will restore action buttons via stateChanged
  }

  /** Cancel: restore action buttons without making any engine call. */
  private cancelVrGoggles(): void {
    this.destroyVrGogglesUi();
    // Restore action panel from current state
    const state = this.adapter.getState();
    if (state.phase === "player_turn") {
      this.actionPanel.setAvailableActions(state.availableActions);
      this.actionPanel.setVrGogglesVisible(state.vrGogglesAvailable);
    }
  }

  private destroyVrGogglesUi(): void {
    this.vrGogglesMode = null;
    this.vrGogglesSelectedCardId = null;
    for (const container of this.playerHandContainers) {
      container.setCardsInteractive(false);
    }
    this.vrGogglesBanner?.destroy();
    this.vrGogglesBanner = null;
    this.vrGogglesDialog?.destroy();
    this.vrGogglesDialog = null;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private showMessage(text: string): void {
    this.messageText.setText(text).setVisible(true);
    this.tweens.add({
      targets: this.messageText,
      scaleX: { from: 0.5, to: 1 },
      scaleY: { from: 0.5, to: 1 },
      alpha: { from: 0, to: 1 },
      duration: 400,
      ease: "Back.easeOut",
    });
  }

  private showTemporaryMessage(text: string, durationMs: number): void {
    this.showMessage(text);
    this.time.delayedCall(durationMs, () => {
      this.messageText.setVisible(false);
    });
  }

  private phaseDescription(phase: GuiGameState["phase"]): string {
    switch (phase) {
      case "awaiting_bet": return "Place your bet";
      case "player_turn": return "Your turn";
      case "dealer_turn": return "Dealer's turn";
      case "round_settled": return "Round complete — place next bet";
      case "game_over": return "Game over";
    }
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
