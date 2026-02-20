import Phaser from "phaser";
import { GameAdapter } from "../adapter/GameAdapter.js";
import type { GuiGameState, GuiPlayerAction, GuiRoundSummary } from "../adapter/index.js";
import { HandContainer } from "../components/HandContainer.js";
import { ActionPanel, ACTION_PANEL_EVENT, VR_GOGGLES_EVENT, SLEIGHT_OF_HAND_EVENT } from "../components/ActionPanel.js";
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
  private betInput!: Phaser.GameObjects.DOMElement;
  private dealerHandContainer!: HandContainer;
  private playerHandContainers: HandContainer[] = [];

  // Labels
  private dealerScoreLabel!: Phaser.GameObjects.Text;
  private seedLabel!: Phaser.GameObjects.Text;
  private phaseLabel!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;

  // State
  private isAnimating = false;

  // Unified item card-selection flow (VR Goggles, Sleight of Hand, …)
  private itemSelectState: {
    itemKey: string; // "vr_goggles" | "sleight_of_hand"
    phase: "selecting_card" | "post_select";
    selectedCardId: string | null;
  } | null = null;
  private itemSelectBanner: Phaser.GameObjects.Text | null = null;
  private itemSelectDialog: Phaser.GameObjects.Container | null = null;

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

    // Felt base — rich green gradient effect using layered rectangles
    this.add.rectangle(this.CX, this.CY, width, height, 0x0d3d1a);

    // Lighter center for depth
    const feltCenter = this.add.graphics();
    feltCenter.fillStyle(0x1a6b2a, 0.35);
    feltCenter.fillEllipse(this.CX, this.CY, width * 0.85, height * 0.75);

    // Subtle radial highlight
    const feltHighlight = this.add.graphics();
    feltHighlight.fillStyle(0x2a8a3a, 0.12);
    feltHighlight.fillEllipse(this.CX, this.CY - 40, width * 0.55, height * 0.45);

    // Vignette — dark corners
    const vignette = this.add.graphics();
    vignette.fillStyle(0x000000, 0.3);
    vignette.fillRect(0, 0, width, height);
    vignette.fillStyle(0x000000, 0);
    vignette.fillEllipse(this.CX, this.CY, width * 0.95, height * 0.9);
    // Simulate vignette with corner fills
    const cornerSize = 200;
    vignette.fillStyle(0x040e06, 0.5);
    vignette.fillTriangle(0, 0, cornerSize, 0, 0, cornerSize);
    vignette.fillTriangle(width, 0, width - cornerSize, 0, width, cornerSize);
    vignette.fillTriangle(0, height, cornerSize, height, 0, height - cornerSize);
    vignette.fillTriangle(width, height, width - cornerSize, height, width, height - cornerSize);

    // Outer rail — dark wood-like border
    const rail = this.add.graphics();
    rail.lineStyle(10, 0x1a0e06, 1);
    rail.strokeRoundedRect(4, 4, width - 8, height - 8, 12);
    rail.lineStyle(2, 0x3a2a1a, 0.6);
    rail.strokeRoundedRect(10, 10, width - 20, height - 20, 10);
    rail.lineStyle(1, 0x5a4a2a, 0.3);
    rail.strokeRoundedRect(14, 14, width - 28, height - 28, 8);

    // Felt edge — inner gold trim line
    const feltEdge = this.add.graphics();
    feltEdge.lineStyle(1.5, 0xc9a84c, 0.2);
    feltEdge.strokeRoundedRect(20, 20, width - 40, height - 40, 6);

    // Dealer arc zone — elegant dashed-look arc
    const dealerArc = this.add.graphics();
    dealerArc.lineStyle(1.5, 0x3a9a4a, 0.4);
    dealerArc.strokeEllipse(this.CX, this.DEALER_Y + 10, 480, 120);
    dealerArc.lineStyle(0.5, 0x4aba5a, 0.15);
    dealerArc.strokeEllipse(this.CX, this.DEALER_Y + 10, 500, 130);

    // Player zone arc
    const playerZone = this.add.graphics();
    playerZone.lineStyle(1.5, 0x3a9a4a, 0.35);
    playerZone.strokeEllipse(this.CX, this.PLAYER_Y + 30, 650, 140);
    playerZone.lineStyle(0.5, 0x4aba5a, 0.12);
    playerZone.strokeEllipse(this.CX, this.PLAYER_Y + 30, 670, 150);

    // Center divider — subtle gold line
    const divider = this.add.graphics();
    divider.lineStyle(1, 0xc9a84c, 0.15);
    divider.lineBetween(100, this.CY - 20, width - 100, this.CY - 20);
    // Small diamond at center
    const dmX = this.CX;
    const dmY = this.CY - 20;
    divider.fillStyle(0xc9a84c, 0.2);
    divider.fillTriangle(dmX - 6, dmY, dmX, dmY - 4, dmX + 6, dmY);
    divider.fillTriangle(dmX - 6, dmY, dmX, dmY + 4, dmX + 6, dmY);
  }

  // ── Components ────────────────────────────────────────────────────────────

  private buildComponents(): void {
    this.hud = new HudPanel(this, 20, 16);

    this.actionPanel = new ActionPanel(this, this.CX, this.PANEL_Y);
    this.betPanel = new BetPanel(this, this.CX, this.PANEL_Y);

    // Wager text input (DOM element positioned above the bet panel)
    this.betInput = this.add.dom(this.CX, this.PANEL_Y - 50).createFromHTML(
      `<input type="number" id="bet-value-input" placeholder="Enter wager..."
        min="1" step="1"
        style="width:160px;padding:8px 12px;border-radius:6px;text-align:center;
               border:1px solid #2a4a2a;background:#0d1a0e;color:#f0e68c;font-size:16px;
               font-weight:bold;font-family:monospace;outline:none;
               transition:border-color 0.2s;"
        onfocus="this.style.borderColor='#4a8a4a'"
        onblur="this.style.borderColor='#2a4a2a'" />`,
    ).setVisible(false);

    // Wire input changes to betPanel
    const inputEl = this.betInput.getChildByID("bet-value-input") as HTMLInputElement | null;
    inputEl?.addEventListener("input", () => {
      const val = parseInt(inputEl.value, 10);
      if (Number.isFinite(val) && val > 0) {
        this.betPanel.setWager(val);
      }
    });
    inputEl?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.betPanel.deal();
      }
    });

    this.dealerHandContainer = new HandContainer(this, this.CX, this.DEALER_Y);
  }

  private buildLabels(): void {
    const { width } = this.scale;

    this.add.text(this.CX, this.DEALER_Y - 120, "DEALER", {
      fontSize: "13px",
      color: "#6a9a6a",
      letterSpacing: 6,
      stroke: "#0a1a0a",
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5);

    this.dealerScoreLabel = this.add.text(this.CX, this.DEALER_Y + 80, "", {
      fontSize: "20px",
      fontStyle: "bold",
      color: "#e8e8e8",
      stroke: "#000",
      strokeThickness: 4,
    }).setOrigin(0.5, 0.5);

    this.seedLabel = this.add.text(width - 16, 16, "", {
      fontSize: "11px",
      color: "#556655",
    }).setOrigin(1, 0);

    // Inventory button (bottom-right)
    const invBtnBg = this.add.graphics();
    invBtnBg.fillStyle(0x000000, 0.4);
    invBtnBg.fillRoundedRect(width - 140, this.scale.height - 38, 124, 28, 6);
    invBtnBg.lineStyle(1, 0x4a6a4a, 0.5);
    invBtnBg.strokeRoundedRect(width - 140, this.scale.height - 38, 124, 28, 6);
    const invBtn = this.add.text(width - 78, this.scale.height - 24, "INVENTORY  [I]", {
      fontSize: "11px",
      color: "#7a9a7a",
      stroke: "#000",
      strokeThickness: 2,
      letterSpacing: 1,
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    invBtn.on("pointerover", () => invBtn.setColor("#b0d8b0"));
    invBtn.on("pointerout",  () => invBtn.setColor("#7a9a7a"));
    invBtn.on("pointerdown", () => {
      if (!this.scene.isPaused()) {
        this.scene.launch("InventoryOverlayScene", { adapter: this.adapter });
        this.scene.pause();
      }
    });

    this.phaseLabel = this.add.text(this.CX, this.PLAYER_Y - 100, "", {
      fontSize: "12px",
      color: "#c9a84c",
      stroke: "#000",
      strokeThickness: 2,
      letterSpacing: 2,
    }).setOrigin(0.5, 0.5);

    this.messageText = this.add.text(this.CX, this.CY - 60, "", {
      fontSize: "32px",
      fontStyle: "bold",
      color: "#FFD700",
      stroke: "#000",
      strokeThickness: 6,
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
      this.enterItemCardSelectMode("vr_goggles",
        "🥽 Click a card to boost its value by 1   [ESC to cancel]");
    };
    const onSleightOfHandActivated = (): void => {
      this.enterItemCardSelectMode("sleight_of_hand",
        "🃏 Click a card to discard   [ESC to cancel]");
    };

    this.events.on(BET_CONFIRMED_EVENT,   onBetConfirmed);
    this.events.on(ACTION_PANEL_EVENT,     onActionSelected);
    this.events.on(VR_GOGGLES_EVENT,       onVrGogglesActivated);
    this.events.on(SLEIGHT_OF_HAND_EVENT,  onSleightOfHandActivated);

    // Named adapter handlers — removed on SHUTDOWN to prevent stale calls into
    // destroyed GL objects if another scene holds the adapter after our shutdown.
    const onStateChanged = ({ state }: { state: GuiGameState }): void => {
      this.syncUi(state);
    };
    const onRoundSettled = ({ summary, state }: { summary: GuiRoundSummary; state: GuiGameState }): void => {
      this.showOutcomeInterstitial(summary, state);
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
      if (meta === "game_over") {
        // Run ended — stop this scene and return to the main menu.
        this.scene.stop();
        this.scene.start("MenuScene");
      }
      // meta === "playing" → betting panel shows, nothing else to do.
    };

    // InventoryOverlayScene closes → resume GameScene.
    const onInventoryShutdown = (): void => {
      if (this.scene.isPaused()) {
        this.scene.resume();
      }
    };

    this.scene.get(SUMMARY_OVERLAY_KEY)?.events.on("shutdown", onSummaryShutdown);
    this.scene.get("InventoryOverlayScene")?.events.on("shutdown", onInventoryShutdown);

    // Remove all external listeners when this scene shuts down.
    // Call removeAllListeners() on the adapter as belt-and-suspenders so the
    // old adapter is completely neutered even if a reference escapes.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.adapter.removeAllListeners();
      // Remove scene-level handlers added above. Phaser does NOT call
      // removeAllListeners() on scene.events during shutdown (only on destroy),
      // so without this they accumulate and double-fire on the next game run.
      this.events.off(BET_CONFIRMED_EVENT,   onBetConfirmed);
      this.events.off(ACTION_PANEL_EVENT,    onActionSelected);
      this.events.off(VR_GOGGLES_EVENT,      onVrGogglesActivated);
      this.events.off(SLEIGHT_OF_HAND_EVENT, onSleightOfHandActivated);
      this.scene.get(SUMMARY_OVERLAY_KEY)?.events.off("shutdown", onSummaryShutdown);
      this.scene.get("InventoryOverlayScene")?.events.off("shutdown", onInventoryShutdown);
    });

    // Inventory overlay: keyboard shortcut (I key).
    this.input.keyboard?.on("keydown-I", () => {
      if (!this.scene.isPaused()) {
        this.scene.launch("InventoryOverlayScene", { adapter: this.adapter });
        this.scene.pause();
      }
    });

    // Gameplay keyboard shortcuts: H = Hit, S = Stand, D = Double, P = Split
    this.input.keyboard?.on("keydown-H", () => {
      if (!this.scene.isPaused() && !this.isAnimating) {
        const state = this.adapter.getState();
        if (state.phase === "player_turn" && state.availableActions.includes("hit")) {
          this.safePerformAction("hit");
        }
      }
    });
    this.input.keyboard?.on("keydown-S", () => {
      if (!this.scene.isPaused() && !this.isAnimating) {
        const state = this.adapter.getState();
        if (state.phase === "player_turn" && state.availableActions.includes("stand")) {
          this.safePerformAction("stand");
        }
      }
    });
    this.input.keyboard?.on("keydown-D", () => {
      if (!this.scene.isPaused() && !this.isAnimating) {
        const state = this.adapter.getState();
        if (state.phase === "player_turn" && state.availableActions.includes("double")) {
          this.safePerformAction("double");
        }
      }
    });
    this.input.keyboard?.on("keydown-P", () => {
      if (!this.scene.isPaused() && !this.isAnimating) {
        const state = this.adapter.getState();
        if (state.phase === "player_turn" && state.availableActions.includes("split")) {
          this.safePerformAction("split");
        }
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

    // If the round ended while in item card-select mode, clean up silently
    if (this.itemSelectState !== null && state.phase !== "player_turn") {
      this.destroyItemSelectUi();
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
    this.betInput.setVisible(betting);
    this.actionPanel.setVisible(acting);

    if (betting) {
      this.betPanel.setBetLimits(state.minimumBet, state.bankroll);
      // Clear the text input for the new bet
      const inputEl = this.betInput.getChildByID("bet-value-input") as HTMLInputElement | null;
      if (inputEl) inputEl.value = "";
    }

    if (acting) {
      this.actionPanel.setAvailableActions(state.availableActions);
      // Only show item buttons when not mid-selection flow
      const notSelecting = this.itemSelectState === null;
      this.actionPanel.setVrGogglesVisible(
        state.vrGogglesAvailable && notSelecting,
      );
      this.actionPanel.setSleightOfHandVisible(
        state.sleightOfHandAvailable && notSelecting,
      );
    } else {
      this.actionPanel.setAvailableActions([]);
      this.actionPanel.setVrGogglesVisible(false);
      this.actionPanel.setSleightOfHandVisible(false);
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

  // ── Item card-selection flow (shared by VR Goggles, Sleight of Hand, …) ──

  /**
   * Enter card-selection mode for an item.
   * Hides standard action buttons, makes each card in the active hand
   * clickable, and shows an instruction banner.
   */
  private enterItemCardSelectMode(itemKey: string, bannerText: string): void {
    if (this.itemSelectState !== null) return;

    this.itemSelectState = { itemKey, phase: "selecting_card", selectedCardId: null };

    // Disable standard actions and all item buttons while selecting
    this.actionPanel.setAvailableActions([]);
    this.actionPanel.setVrGogglesVisible(false);
    this.actionPanel.setSleightOfHandVisible(false);

    // Show instruction banner
    this.itemSelectBanner = this.add.text(
      this.CX,
      this.PLAYER_Y - 130,
      bannerText,
      { fontSize: "15px", color: "#f0e68c", stroke: "#000", strokeThickness: 3 },
    ).setOrigin(0.5, 0.5).setDepth(10);

    // Make each card in the active hand clickable
    const state = this.adapter.getState();
    const activeIndex = state.activeHandIndex;
    if (activeIndex !== null) {
      const container = this.playerHandContainers[activeIndex];
      container?.setCardsInteractive(true, (cardId) => {
        this.onItemCardSelected(cardId);
      });
    }

    // ESC cancels
    this.input.keyboard?.once("keydown-ESC", () => this.cancelItemSelect());
  }

  /**
   * A card was clicked during item card-selection.
   * Routes to item-specific post-selection logic.
   */
  private onItemCardSelected(cardId: string): void {
    if (!this.itemSelectState || this.itemSelectState.phase !== "selecting_card") return;

    this.itemSelectState.selectedCardId = cardId;

    // Clear card interactivity
    for (const container of this.playerHandContainers) {
      container.setCardsInteractive(false);
    }
    this.itemSelectBanner?.destroy();
    this.itemSelectBanner = null;

    switch (this.itemSelectState.itemKey) {
      case "vr_goggles":
        this.itemSelectState.phase = "post_select";
        this.showVrGogglesDurationDialog(cardId);
        break;
      case "sleight_of_hand":
        this.confirmSleightOfHand(cardId);
        break;
      default:
        this.cancelItemSelect();
    }
  }

  /** Cancel: restore action buttons without making any engine call. */
  private cancelItemSelect(): void {
    this.destroyItemSelectUi();
    const state = this.adapter.getState();
    if (state.phase === "player_turn") {
      this.actionPanel.setAvailableActions(state.availableActions);
      this.actionPanel.setVrGogglesVisible(state.vrGogglesAvailable);
      this.actionPanel.setSleightOfHandVisible(state.sleightOfHandAvailable);
    }
  }

  private destroyItemSelectUi(): void {
    this.itemSelectState = null;
    for (const container of this.playerHandContainers) {
      container.setCardsInteractive(false);
    }
    this.itemSelectBanner?.destroy();
    this.itemSelectBanner = null;
    this.itemSelectDialog?.destroy();
    this.itemSelectDialog = null;
  }

  // ── VR Goggles: duration dialog ────────────────────────────────────────────

  /**
   * Show a small dialog: "This Hand Only" | "Permanent" | Cancel.
   * Called after the player picks a card for VR Goggles.
   */
  private showVrGogglesDurationDialog(cardId: string): void {
    const dialog = this.add.container(this.CX, this.CY).setDepth(20);

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
    cancelTxt.on("pointerdown", () => this.cancelItemSelect());

    dialog.add([bg, title, thisHandBtn, permBtn, cancelTxt]);
    this.itemSelectDialog = dialog;

    this.input.keyboard?.once("keydown-ESC", () => this.cancelItemSelect());
  }

  private confirmVrGoggles(cardId: string, permanent: boolean): void {
    this.destroyItemSelectUi();
    try {
      this.adapter.useVrGoggles(cardId, permanent);
    } catch (err) {
      this.showTemporaryMessage(errorMessage(err), 2000);
    }
  }

  // ── Sleight of Hand: immediate confirm ─────────────────────────────────────

  private confirmSleightOfHand(cardId: string): void {
    this.destroyItemSelectUi();
    try {
      this.adapter.useSleightOfHand(cardId);
    } catch (err) {
      this.showTemporaryMessage(errorMessage(err), 2000);
    }
  }

  // ── Outcome interstitial ─────────────────────────────────────────────────

  /**
   * Show a dramatic centered outcome banner (YOU WIN / YOU LOSE / PUSH / BLACKJACK!)
   * after the round settles. Waits for click or Enter, then opens SummaryOverlayScene.
   */
  private showOutcomeInterstitial(summary: GuiRoundSummary, state: GuiGameState): void {
    // Hide panels so cards stay clearly visible during the interstitial
    this.betPanel.setVisible(false);
    this.actionPanel.setVisible(false);

    // Determine aggregate outcome from hand results
    const totalDelta = summary.bankrollDelta;
    const hasBlackjack = summary.handResults.some((r) => r.outcome === "blackjack");
    const allPush = summary.handResults.every((r) => r.outcome === "push");

    let outcomeText: string;
    let outcomeColor: string;
    let glowColor: number;

    if (hasBlackjack) {
      outcomeText = "BLACKJACK!";
      outcomeColor = "#fbbf24";
      glowColor = 0xd97706;
    } else if (allPush) {
      outcomeText = "PUSH";
      outcomeColor = "#94a3b8";
      glowColor = 0x475569;
    } else if (totalDelta > 0) {
      outcomeText = "YOU WIN";
      outcomeColor = "#4ade80";
      glowColor = 0x16a34a;
    } else {
      outcomeText = "YOU LOSE";
      outcomeColor = "#f87171";
      glowColor = 0xdc2626;
    }

    // Light dim so cards stay visible underneath
    const backdrop = this.add.rectangle(this.CX, this.CY, this.scale.width, this.scale.height, 0x000000, 0)
      .setDepth(50);
    this.tweens.add({ targets: backdrop, fillAlpha: 0.25, duration: 300 });

    // Glow effect behind text
    const glow = this.add.graphics().setDepth(51).setAlpha(0);
    glow.fillStyle(glowColor, 0.3);
    glow.fillEllipse(this.CX, this.CY - 30, 400, 120);

    // Main outcome text
    const outcomeLabel = this.add.text(this.CX, this.CY - 30, outcomeText, {
      fontSize: "52px",
      fontStyle: "bold",
      color: outcomeColor,
      stroke: "#000",
      strokeThickness: 8,
      letterSpacing: 6,
    }).setOrigin(0.5, 0.5).setDepth(52).setAlpha(0).setScale(0.5);

    // Delta text
    const deltaStr = totalDelta >= 0 ? `+$${totalDelta.toFixed(2)}` : `-$${Math.abs(totalDelta).toFixed(2)}`;
    const deltaLabel = this.add.text(this.CX, this.CY + 24, deltaStr, {
      fontSize: "24px",
      fontStyle: "bold",
      color: totalDelta >= 0 ? "#4ade80" : "#f87171",
      stroke: "#000",
      strokeThickness: 4,
    }).setOrigin(0.5, 0.5).setDepth(52).setAlpha(0);

    // "Click or press Enter to continue" hint
    const hint = this.add.text(this.CX, this.CY + 70, "Click or press Enter to continue", {
      fontSize: "13px",
      color: "#6a8a6a",
      stroke: "#000",
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5).setDepth(52).setAlpha(0);

    // Animate in
    this.tweens.add({
      targets: glow,
      alpha: 1,
      duration: 400,
      ease: "Quad.easeOut",
    });
    this.tweens.add({
      targets: outcomeLabel,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: "Back.easeOut",
    });
    this.tweens.add({
      targets: deltaLabel,
      alpha: 1,
      duration: 400,
      delay: 200,
      ease: "Quad.easeOut",
    });
    this.tweens.add({
      targets: hint,
      alpha: 0.7,
      duration: 400,
      delay: 600,
      ease: "Quad.easeOut",
    });

    // Pulse the hint
    this.tweens.add({
      targets: hint,
      alpha: { from: 0.7, to: 0.3 },
      duration: 1200,
      delay: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Cleanup & proceed
    const interstitialObjects = [backdrop, glow, outcomeLabel, deltaLabel, hint];
    const proceed = (): void => {
      // Remove listeners
      backdrop.removeAllListeners();
      this.input.keyboard?.off("keydown-ENTER", proceed);
      this.input.keyboard?.off("keydown-SPACE", proceed);

      // Fade out then launch summary
      this.tweens.add({
        targets: interstitialObjects,
        alpha: 0,
        duration: 250,
        ease: "Quad.easeIn",
        onComplete: () => {
          for (const obj of interstitialObjects) obj.destroy();
          this.scene.launch(SUMMARY_OVERLAY_KEY, { summary, adapter: this.adapter, state });
          this.scene.pause();
        },
      });
    };

    // Wait for user input (with a short delay to avoid accidental skips)
    this.time.delayedCall(400, () => {
      backdrop.setInteractive();
      backdrop.on(Phaser.Input.Events.POINTER_DOWN, proceed);
      this.input.keyboard?.on("keydown-ENTER", proceed);
      this.input.keyboard?.on("keydown-SPACE", proceed);
    });
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
