import Phaser from "phaser";
import { GameAdapter } from "../adapter/GameAdapter.js";
import type { GuiGameState, GuiPlayerAction, GuiRoundSummary } from "../adapter/index.js";
import { HandContainer } from "../components/HandContainer.js";
import { ActionPanel, ACTION_PANEL_EVENT } from "../components/ActionPanel.js";
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

  constructor() {
    super({ key: "GameScene" });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  init(data: { adapter: GameAdapter }): void {
    this.adapter = data.adapter;
    this.playerHandContainers = [];
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
    this.events.on(BET_CONFIRMED_EVENT, ({ wager }: { wager: number }) => {
      this.safeStartRound(wager);
    });

    // ActionPanel → adapter
    this.events.on(ACTION_PANEL_EVENT, (action: GuiPlayerAction) => {
      if (!this.isAnimating) {
        this.safePerformAction(action);
      }
    });

    // Adapter events → UI
    this.adapter.on("stateChanged", ({ state }) => {
      this.syncUi(state);
    });

    this.adapter.on("roundSettled", ({ summary, state }) => {
      // Launch the summary overlay on top of this scene
      this.scene.launch(SUMMARY_OVERLAY_KEY, { summary, adapter: this.adapter, state });
      this.scene.pause();
    });

    this.adapter.on("gameOver", ({ finalBankroll, reason }) => {
      const msg = reason === "stage_fail"
        ? `STAGE FAILED  $${finalBankroll.toFixed(2)}`
        : `GAME OVER  $${finalBankroll.toFixed(2)}`;
      this.showMessage(msg);
    });

    this.adapter.on("stageFailed", ({ stage, threshold, bankroll }) => {
      this.showTemporaryMessage(`Stage ${stage} failed — needed $${threshold.toFixed(0)}, had $${bankroll.toFixed(2)}`, 2500);
    });

    // Resume from summary overlay
    this.scene.get(SUMMARY_OVERLAY_KEY)?.events.on("shutdown", () => {
      this.scene.resume();
    });

    // Inventory button: click or press I
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
    } else {
      this.actionPanel.setAvailableActions([]);
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
