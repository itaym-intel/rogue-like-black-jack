import Phaser from "phaser";
import type { GuiGameState, GuiHandResult, GuiRoundSummary } from "../adapter/index.js";
import type { GameAdapter } from "../adapter/index.js";
import { CARD_DISPLAY_HEIGHT, CARD_DISPLAY_WIDTH, getCardKey } from "../assets/cardAssets.js";

/** Data passed to this scene via scene.launch(). */
export interface SummarySceneData {
  summary: GuiRoundSummary;
  state: GuiGameState;
  adapter: GameAdapter;
}

const OUTCOME_COLORS: Record<string, string> = {
  win: "#27ae60",
  blackjack: "#f1c40f",
  push: "#7f8c8d",
  lose: "#e74c3c",
};

const OUTCOME_LABELS: Record<string, string> = {
  win: "WIN",
  blackjack: "BLACKJACK!",
  push: "PUSH",
  lose: "LOSE",
};

/**
 * SummaryOverlayScene
 * ──────────────────────────────────────────────────────────────────────────────
 * A semi-transparent overlay launched on top of GameScene after each round
 * concludes.  It shows:
 *  - Dealer's final hand + score
 *  - Each player hand: outcome, score, wager, net change
 *  - Total bankroll delta
 *  - A "Continue" button that shuts down this overlay and resumes GameScene
 *
 * If bankroll is now 0 (game_over), the Continue button is replaced with a
 * "New Game" button that navigates back to MenuScene.
 *
 * This scene does not modify adapter state — it only reads the summary that
 * was passed in via scene data.
 */
export class SummaryOverlayScene extends Phaser.Scene {
  constructor() {
    super({ key: "SummaryOverlayScene" });
  }

  init(data: SummarySceneData): void {
    // Store on scene registry so create() can access it
    this.registry.set("summaryData", data);
  }

  create(): void {
    const data = this.registry.get("summaryData") as SummarySceneData;
    const { summary, state } = data;

    const { width, height } = this.scale;
    const cx = width / 2;

    // ── Backdrop ─────────────────────────────────────────────────────────────
    const backdrop = this.add.rectangle(cx, height / 2, width, height, 0x000000, 0.7);
    backdrop.setInteractive(); // Swallow clicks so they don't pass to GameScene

    // ── Panel ─────────────────────────────────────────────────────────────────
    const panelW = 700;
    const panelH = Math.min(500, height - 60);
    const panelX = cx - panelW / 2;
    const panelY = height / 2 - panelH / 2;

    const panel = this.add.graphics();
    panel.fillStyle(0x0d2b0d, 0.97);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 16);
    panel.lineStyle(2, 0x446644, 1);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 16);

    let currentY = panelY + 24;

    // ── Round header ──────────────────────────────────────────────────────────
    this.add.text(cx, currentY, `Round ${summary.roundNumber} Results`, {
      fontSize: "22px",
      fontStyle: "bold",
      color: "#f0e68c",
      stroke: "#000",
      strokeThickness: 3,
    }).setOrigin(0.5, 0);
    currentY += 32;

    // ── Stage / hand progress line ────────────────────────────────────────────
    const handsLeft = state.handsPerStage - state.handsPlayed % state.handsPerStage;
    const stageColor =
      state.metaPhase === "game_over" && state.phase !== "game_over" ? "#e74c3c" :
      state.metaPhase === "shop" ? "#f1c40f" : "#88bb88";
    this.add.text(cx, currentY, `Stage ${state.stage}  ·  Hand ${state.handsPlayed % state.handsPerStage === 0 ? state.handsPerStage : state.handsPlayed % state.handsPerStage} / ${state.handsPerStage}  ·  Need $${state.stageMoneyThreshold.toFixed(0)}`, {
      fontSize: "13px",
      color: stageColor,
    }).setOrigin(0.5, 0);
    currentY += 22;

    // ── Dealer line ───────────────────────────────────────────────────────────
    const dealerLine = summary.dealerBusted
      ? `Dealer: ${summary.dealerScore} 💥 BUST`
      : `Dealer: ${summary.dealerScore}`;

    this.add.text(cx, currentY, dealerLine, {
      fontSize: "16px",
      color: summary.dealerBusted ? "#e74c3c" : "#cccccc",
      stroke: "#000",
      strokeThickness: 2,
    }).setOrigin(0.5, 0);
    currentY += 26;

    // Small dealer card images
    const cardScale = 0.18;
    const cardW = Math.round(222 * cardScale);
    const startCardX = cx - ((summary.dealerCards.length - 1) * (cardW + 4)) / 2;
    for (let i = 0; i < summary.dealerCards.length; i += 1) {
      const c = summary.dealerCards[i];
      const key = getCardKey(c.rank, c.suit);
      this.add.image(startCardX + i * (cardW + 4), currentY + 20, key)
        .setOrigin(0.5, 0)
        .setDisplaySize(cardW, Math.round(323 * cardScale));
    }
    currentY += Math.round(323 * cardScale) + 12;

    // ── Divider ───────────────────────────────────────────────────────────────
    this.add.graphics().lineStyle(1, 0x446644, 0.6).lineBetween(panelX + 20, currentY, panelX + panelW - 20, currentY);
    currentY += 10;

    // ── Hand results ──────────────────────────────────────────────────────────
    for (const result of summary.handResults) {
      currentY = this.renderHandResult(result, cx, panelX, panelW, currentY, cardScale, state.targetScore);
    }

    currentY += 8;

    // ── Bankroll delta ────────────────────────────────────────────────────────
    const delta = summary.bankrollDelta;
    const deltaStr = delta >= 0 ? `+$${delta.toFixed(2)}` : `-$${Math.abs(delta).toFixed(2)}`;
    const deltaColor = delta > 0 ? "#27ae60" : delta < 0 ? "#e74c3c" : "#aaaaaa";

    this.add.text(cx, currentY, `Bankroll: $${summary.bankrollAfter.toFixed(2)}  (${deltaStr})`, {
      fontSize: "16px",
      fontStyle: "bold",
      color: deltaColor,
      stroke: "#000",
      strokeThickness: 2,
    }).setOrigin(0.5, 0);
    currentY += 34;

    // ── Continue / New Game button ────────────────────────────────────────────
    this.createContinueButton(cx, panelY + panelH - 44, data);

    // ── Animate in ───────────────────────────────────────────────────────────
    const allObjects = this.children.list.slice();
    for (const obj of allObjects) {
      (obj as Phaser.GameObjects.GameObject & { setAlpha?: (a: number) => void }).setAlpha?.(0);
    }
    this.tweens.add({
      targets: allObjects,
      alpha: 1,
      duration: 250,
      ease: "Quad.easeOut",
    });
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private renderHandResult(
    result: GuiHandResult,
    cx: number,
    panelX: number,
    panelW: number,
    y: number,
    cardScale: number,
    targetScore: number,
  ): number {
    const outcomeColor = OUTCOME_COLORS[result.outcome] ?? "#ffffff";
    const outcomeLabel = OUTCOME_LABELS[result.outcome] ?? result.outcome.toUpperCase();

    const netStr =
      result.netChange >= 0
        ? `+$${result.netChange.toFixed(2)}`
        : `-$${Math.abs(result.netChange).toFixed(2)}`;

    const lineStr = `Score ${result.score}  |  Bet $${result.wager.toFixed(2)}  |  ${netStr}`;

    this.add.text(panelX + 20, y, outcomeLabel, {
      fontSize: "18px",
      fontStyle: "bold",
      color: outcomeColor,
      stroke: "#000",
      strokeThickness: 3,
    }).setOrigin(0, 0);

    this.add.text(panelX + panelW - 20, y, lineStr, {
      fontSize: "14px",
      color: "#cccccc",
    }).setOrigin(1, 0);

    y += 24;

    // Card row
    const cardW = Math.round(222 * cardScale);
    const cardH = Math.round(323 * cardScale);
    const startX = panelX + 20;
    for (let i = 0; i < result.cards.length; i += 1) {
      const c = result.cards[i];
      this.add.image(startX + i * (cardW + 4), y, getCardKey(c.rank, c.suit))
        .setOrigin(0, 0)
        .setDisplaySize(cardW, cardH);
    }

    return y + cardH + 10;
  }

  private createContinueButton(
    x: number,
    y: number,
    data: SummarySceneData,
  ): void {
    const { adapter, state } = data;

    // Determine destination based on meta phase
    const goToShop     = state.metaPhase === "shop";
    const gameOver     = state.metaPhase === "game_over";
    const stageFail    = gameOver && state.phase !== "game_over"; // engine still in round_settled

    let label: string;
    let color: number;
    if (goToShop) {
      label = "TO SHOP  →";
      color = 0xf39c12;
    } else if (stageFail) {
      label = "END RUN";
      color = 0xe74c3c;
    } else if (gameOver) {
      label = "NEW GAME";
      color = 0xe74c3c;
    } else {
      label = "CONTINUE";
      color = 0x27ae60;
    }

    // Stage-fail annotation
    if (stageFail) {
      this.add.text(x, y - 28, `✗  Stage ${state.stage} failed — needed $${state.stageMoneyThreshold.toFixed(0)}`, {
        fontSize: "13px",
        color: "#e74c3c",
        stroke: "#000",
        strokeThickness: 2,
      }).setOrigin(0.5, 0.5);
    } else if (goToShop) {
      this.add.text(x, y - 28, `✓  Stage ${state.stage} cleared — visit the shop!`, {
        fontSize: "13px",
        color: "#f1c40f",
        stroke: "#000",
        strokeThickness: 2,
      }).setOrigin(0.5, 0.5);
    }

    const w = 220;
    const h = 42;

    const bg = this.add.graphics();
    const draw = (hovered: boolean): void => {
      bg.clear();
      bg.fillStyle(hovered ? Phaser.Display.Color.IntegerToColor(color).lighten(20).color : color, 1);
      bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    };
    draw(false);

    this.add.text(x, y, label, {
      fontSize: "18px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000",
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on(Phaser.Input.Events.POINTER_OVER, () => draw(true));
    zone.on(Phaser.Input.Events.POINTER_OUT, () => draw(false));
    zone.on(Phaser.Input.Events.POINTER_DOWN, () => {
      // Per scene-lifecycle contract: this overlay ALWAYS only stops itself.
      // GameScene's onSummaryShutdown listener handles all routing
      // (normal continue, shop transition, and game-over navigation).
      this.scene.stop();
    });
  }
}
