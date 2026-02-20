import Phaser from "phaser";
import type { GuiGameState, GuiHandResult, GuiRoundSummary } from "../adapter/index.js";
import type { GameAdapter } from "../adapter/index.js";
import { getCardKey } from "../assets/cardAssets.js";

/** Data passed to this scene via scene.launch(). */
export interface SummarySceneData {
  summary: GuiRoundSummary;
  state: GuiGameState;
  adapter: GameAdapter;
}

const RARITY_COLORS: Record<string, string> = {
  common: "#aaaaaa",
  uncommon: "#2ecc71",
  rare: "#3498db",
  legendary: "#f1c40f",
};

const OUTCOME_COLORS: Record<string, string> = {
  win: "#4ade80",
  blackjack: "#fbbf24",
  push: "#94a3b8",
  lose: "#f87171",
};

const OUTCOME_LABELS: Record<string, string> = {
  win: "WIN",
  blackjack: "BLACKJACK!",
  push: "PUSH",
  lose: "LOSE",
};

const OUTCOME_BG: Record<string, number> = {
  win: 0x16a34a,
  blackjack: 0xd97706,
  push: 0x475569,
  lose: 0xdc2626,
};

/**
 * SummaryOverlayScene
 * ──────────────────────────────────────────────────────────────────────────────
 * A semi-transparent overlay launched on top of GameScene after each round
 * concludes.
 */
export class SummaryOverlayScene extends Phaser.Scene {
  constructor() {
    super({ key: "SummaryOverlayScene" });
  }

  init(data: SummarySceneData): void {
    this.registry.set("summaryData", data);
  }

  create(): void {
    const data = this.registry.get("summaryData") as SummarySceneData;
    const { summary, state } = data;

    const { width, height } = this.scale;
    const cx = width / 2;

    // ── Backdrop ─────────────────────────────────────────────────────────────
    const backdrop = this.add.rectangle(cx, height / 2, width, height, 0x000000, 0.75);
    backdrop.setInteractive();

    // ── Panel ─────────────────────────────────────────────────────────────────
    const panelW = 700;
    const panelH = Math.min(560, height - 40);
    const panelX = cx - panelW / 2;
    const panelY = height / 2 - panelH / 2;

    const panel = this.add.graphics();
    // Main panel background with slight gradient feel
    panel.fillStyle(0x0a1a0c, 0.97);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 16);
    // Inner subtle highlight at top
    panel.fillStyle(0x1a3a1c, 0.4);
    panel.fillRoundedRect(panelX + 2, panelY + 2, panelW - 4, 50, { tl: 14, tr: 14, bl: 0, br: 0 });
    // Border
    panel.lineStyle(1.5, 0x3a5a3a, 0.7);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 16);
    // Outer glow
    panel.lineStyle(3, 0x2a4a2a, 0.15);
    panel.strokeRoundedRect(panelX - 2, panelY - 2, panelW + 4, panelH + 4, 18);

    let currentY = panelY + 24;

    // ── Round header ──────────────────────────────────────────────────────────
    // Round number badge
    const roundBadgeW = 160;
    const roundBadgeH = 28;
    const roundBadgeBg = this.add.graphics();
    roundBadgeBg.fillStyle(0xc9a84c, 0.12);
    roundBadgeBg.fillRoundedRect(cx - roundBadgeW / 2, currentY - 2, roundBadgeW, roundBadgeH, 6);
    roundBadgeBg.lineStyle(1, 0xc9a84c, 0.25);
    roundBadgeBg.strokeRoundedRect(cx - roundBadgeW / 2, currentY - 2, roundBadgeW, roundBadgeH, 6);

    this.add.text(cx, currentY + roundBadgeH / 2 - 2, `ROUND ${summary.roundNumber}`, {
      fontSize: "16px",
      fontStyle: "bold",
      color: "#c9a84c",
      stroke: "#000",
      strokeThickness: 2,
      letterSpacing: 4,
    }).setOrigin(0.5, 0.5);
    currentY += roundBadgeH + 4;

    // Stage info
    const handsThisStage = state.handsPlayed % state.handsPerStage;
    const stageStr = `Stage ${state.stage}  \u2022  Hand ${handsThisStage === 0 ? state.handsPerStage : handsThisStage}/${state.handsPerStage}`;
    this.add.text(cx, currentY, stageStr, {
      fontSize: "11px",
      color: "#5a7a5a",
      letterSpacing: 1,
    }).setOrigin(0.5, 0);
    currentY += 18;

    // ── Dealer section ────────────────────────────────────────────────────────
    this.drawDivider(panelX, panelW, currentY);
    currentY += 12;

    // Dealer header row
    const dealerScoreStr = summary.dealerBusted
      ? `${summary.dealerScore} BUST`
      : `${summary.dealerScore}`;
    const dealerColor = summary.dealerBusted ? "#f87171" : "#e2e8f0";

    this.add.text(panelX + 24, currentY, "DEALER", {
      fontSize: "11px",
      fontStyle: "bold",
      color: "#7a9a7a",
      letterSpacing: 3,
    }).setOrigin(0, 0);

    // Dealer score badge
    const dealerBadgeBg = this.add.graphics();
    const dealerBadgeColor = summary.dealerBusted ? 0xdc2626 : 0x475569;
    dealerBadgeBg.fillStyle(dealerBadgeColor, 0.25);
    dealerBadgeBg.fillRoundedRect(panelX + 90, currentY - 3, dealerScoreStr.length * 10 + 16, 22, 4);
    this.add.text(panelX + 90 + (dealerScoreStr.length * 10 + 16) / 2, currentY + 8, dealerScoreStr, {
      fontSize: "13px",
      fontStyle: "bold",
      color: dealerColor,
      stroke: "#000",
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5);
    currentY += 24;

    // Dealer cards
    const cardScale = 0.18;
    const cardW = Math.round(222 * cardScale);
    const cardH = Math.round(323 * cardScale);
    const startCardX = panelX + 24;
    for (let i = 0; i < summary.dealerCards.length; i += 1) {
      const c = summary.dealerCards[i];
      const key = getCardKey(c.rank, c.suit);
      this.add.image(startCardX + i * (cardW + 4), currentY, key)
        .setOrigin(0, 0)
        .setDisplaySize(cardW, cardH);
    }
    currentY += cardH + 14;

    // ── Hand results ──────────────────────────────────────────────────────────
    this.drawDivider(panelX, panelW, currentY);
    currentY += 10;

    for (const result of summary.handResults) {
      currentY = this.renderHandResult(result, panelX, panelW, currentY, cardScale);
    }

    currentY += 4;

    // ── Bankroll section ──────────────────────────────────────────────────────
    this.drawDivider(panelX, panelW, currentY);
    currentY += 14;

    const delta = summary.bankrollDelta;
    const deltaStr = delta >= 0 ? `+$${delta.toFixed(2)}` : `-$${Math.abs(delta).toFixed(2)}`;
    const deltaColor = delta > 0 ? "#4ade80" : delta < 0 ? "#f87171" : "#94a3b8";

    // Bankroll display with background
    const bankrollRowBg = this.add.graphics();
    bankrollRowBg.fillStyle(0x0d2d10, 0.6);
    bankrollRowBg.fillRoundedRect(panelX + 16, currentY - 6, panelW - 32, 36, 8);

    this.add.text(panelX + 28, currentY + 6, "BANKROLL", {
      fontSize: "11px",
      fontStyle: "bold",
      color: "#7a9a7a",
      letterSpacing: 3,
    }).setOrigin(0, 0.5);

    this.add.text(panelX + 130, currentY + 6, `$${summary.bankrollAfter.toFixed(2)}`, {
      fontSize: "20px",
      fontStyle: "bold",
      color: "#e2e8f0",
      stroke: "#000",
      strokeThickness: 2,
    }).setOrigin(0, 0.5);

    // Delta with background pill
    const deltaPillW = deltaStr.length * 10 + 20;
    const deltaPillBg = this.add.graphics();
    const deltaPillColor = delta > 0 ? 0x16a34a : delta < 0 ? 0xdc2626 : 0x475569;
    deltaPillBg.fillStyle(deltaPillColor, 0.2);
    deltaPillBg.fillRoundedRect(panelX + panelW - 24 - deltaPillW, currentY - 2, deltaPillW, 18, 4);
    deltaPillBg.lineStyle(1, deltaPillColor, 0.3);
    deltaPillBg.strokeRoundedRect(panelX + panelW - 24 - deltaPillW, currentY - 2, deltaPillW, 18, 4);

    this.add.text(panelX + panelW - 24 - deltaPillW / 2, currentY + 6, deltaStr, {
      fontSize: "14px",
      fontStyle: "bold",
      color: deltaColor,
      stroke: "#000",
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5);
    currentY += 36;

    // ── Item reward ───────────────────────────────────────────────────────────
    if (state.lastRewardedItem) {
      const reward = state.lastRewardedItem;
      const rarityColor = RARITY_COLORS[reward.rarity] ?? "#ffffff";

      this.drawDivider(panelX, panelW, currentY);
      currentY += 12;

      // Item found banner
      const bannerW = 220;
      const bannerH = 28;
      const bannerBg = this.add.graphics();
      bannerBg.fillStyle(0xd97706, 0.15);
      bannerBg.fillRoundedRect(cx - bannerW / 2, currentY - 2, bannerW, bannerH, 6);
      bannerBg.lineStyle(1, 0xd97706, 0.35);
      bannerBg.strokeRoundedRect(cx - bannerW / 2, currentY - 2, bannerW, bannerH, 6);

      this.add.text(cx, currentY + bannerH / 2, "ITEM FOUND", {
        fontSize: "13px",
        fontStyle: "bold",
        color: "#fbbf24",
        stroke: "#000",
        strokeThickness: 2,
        letterSpacing: 4,
      }).setOrigin(0.5, 0.5);
      currentY += bannerH + 8;

      // Item name
      this.add.text(cx, currentY, reward.item.itemName, {
        fontSize: "17px",
        fontStyle: "bold",
        color: rarityColor,
        stroke: "#000",
        strokeThickness: 3,
      }).setOrigin(0.5, 0);
      currentY += 22;

      // Rarity label
      const rarityLabel = reward.rarity.charAt(0).toUpperCase() + reward.rarity.slice(1);
      this.add.text(cx, currentY, rarityLabel, {
        fontSize: "10px",
        color: rarityColor,
        letterSpacing: 3,
      }).setOrigin(0.5, 0).setAlpha(0.7);
      currentY += 18;

      // Description
      this.add.text(cx, currentY, reward.item.itemDescription, {
        fontSize: "11px",
        color: "#94a3b8",
        wordWrap: { width: panelW - 80 },
        align: "center",
      }).setOrigin(0.5, 0);
      currentY += 24;
    }

    // ── Continue / New Game button ────────────────────────────────────────────
    this.createContinueButton(cx, panelY + panelH - 38, data);

    // ── Animate in ───────────────────────────────────────────────────────────
    const allObjects = this.children.list.slice();
    for (const obj of allObjects) {
      (obj as Phaser.GameObjects.GameObject & { setAlpha?: (a: number) => void }).setAlpha?.(0);
    }
    this.tweens.add({
      targets: allObjects,
      alpha: 1,
      duration: 300,
      ease: "Quad.easeOut",
    });
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private drawDivider(panelX: number, panelW: number, y: number): void {
    const g = this.add.graphics();
    g.lineStyle(1, 0x3a5a3a, 0.3);
    g.lineBetween(panelX + 20, y, panelX + panelW - 20, y);
    // Center accent dot
    g.fillStyle(0x3a5a3a, 0.4);
    g.fillCircle(panelX + panelW / 2, y, 2);
  }

  private renderHandResult(
    result: GuiHandResult,
    panelX: number,
    panelW: number,
    y: number,
    cardScale: number,
  ): number {
    const outcomeColor = OUTCOME_COLORS[result.outcome] ?? "#ffffff";
    const outcomeLabel = OUTCOME_LABELS[result.outcome] ?? result.outcome.toUpperCase();
    const outcomeBg = OUTCOME_BG[result.outcome] ?? 0x333333;

    // Outcome badge with improved styling
    const badgeW = outcomeLabel.length * 10 + 20;
    const badgeH = 24;
    const badge = this.add.graphics();
    badge.fillStyle(outcomeBg, 0.25);
    badge.fillRoundedRect(panelX + 22, y, badgeW, badgeH, 5);
    badge.lineStyle(1, outcomeBg, 0.4);
    badge.strokeRoundedRect(panelX + 22, y, badgeW, badgeH, 5);

    this.add.text(panelX + 22 + badgeW / 2, y + badgeH / 2, outcomeLabel, {
      fontSize: "11px",
      fontStyle: "bold",
      color: outcomeColor,
      stroke: "#000",
      strokeThickness: 2,
      letterSpacing: 2,
    }).setOrigin(0.5, 0.5);

    // Stats line
    const netStr =
      result.netChange >= 0
        ? `+$${result.netChange.toFixed(2)}`
        : `-$${Math.abs(result.netChange).toFixed(2)}`;
    const netColor = result.netChange > 0 ? "#4ade80" : result.netChange < 0 ? "#f87171" : "#94a3b8";

    // Score
    this.add.text(panelX + panelW - 24, y + badgeH / 2 - 1, `${result.score}`, {
      fontSize: "13px",
      fontStyle: "bold",
      color: "#e2e8f0",
    }).setOrigin(1, 0.5);

    this.add.text(panelX + panelW - 50, y + badgeH / 2 - 1, "|", {
      fontSize: "13px",
      color: "#3a5a3a",
    }).setOrigin(0.5, 0.5);

    this.add.text(panelX + panelW - 76, y + badgeH / 2 - 1, `$${result.wager.toFixed(2)}`, {
      fontSize: "12px",
      color: "#94a3b8",
    }).setOrigin(1, 0.5);

    this.add.text(panelX + panelW - 102, y + badgeH / 2 - 1, "|", {
      fontSize: "13px",
      color: "#3a5a3a",
    }).setOrigin(0.5, 0.5);

    this.add.text(panelX + panelW - 128, y + badgeH / 2 - 1, netStr, {
      fontSize: "12px",
      fontStyle: "bold",
      color: netColor,
    }).setOrigin(1, 0.5);

    y += badgeH + 6;

    // Card row
    const cardW = Math.round(222 * cardScale);
    const cardH = Math.round(323 * cardScale);
    const startX = panelX + 24;
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
    const { state } = data;

    const gameOver = state.metaPhase === "game_over";
    const stageFail = gameOver && state.phase !== "game_over";

    let label: string;
    let color: number;
    if (stageFail) {
      label = "END RUN";
      color = 0xdc2626;
    } else if (gameOver) {
      label = "NEW GAME";
      color = 0xdc2626;
    } else {
      label = "CONTINUE";
      color = 0x16a34a;
    }

    // Stage-fail annotation
    if (stageFail) {
      this.add.text(x, y - 28, `Stage ${state.stage} failed \u2014 needed $${state.stageMoneyThreshold.toFixed(0)}`, {
        fontSize: "11px",
        color: "#f87171",
        stroke: "#000",
        strokeThickness: 2,
      }).setOrigin(0.5, 0.5);
    }

    const w = 220;
    const h = 44;

    const bg = this.add.graphics();
    const draw = (hovered: boolean, pressed = false): void => {
      bg.clear();
      const fillColor = pressed
        ? Phaser.Display.Color.IntegerToColor(color).darken(15).color
        : hovered
        ? Phaser.Display.Color.IntegerToColor(color).lighten(15).color
        : color;
      bg.fillStyle(fillColor, 1);
      bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
      // Top highlight
      bg.fillStyle(0xffffff, hovered ? 0.15 : 0.08);
      bg.fillRoundedRect(x - w / 2 + 2, y - h / 2 + 2, w - 4, h / 2 - 2, { tl: 8, tr: 8, bl: 0, br: 0 });
      // Border
      bg.lineStyle(1.5, 0xffffff, 0.2);
      bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    };
    draw(false);

    this.add.text(x, y, label, {
      fontSize: "15px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000",
      strokeThickness: 3,
      letterSpacing: 4,
    }).setOrigin(0.5, 0.5);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on(Phaser.Input.Events.POINTER_OVER, () => draw(true));
    zone.on(Phaser.Input.Events.POINTER_OUT, () => draw(false));
    zone.on(Phaser.Input.Events.POINTER_DOWN, () => {
      draw(true, true);
      this.time.delayedCall(100, () => this.scene.stop());
    });

    // Keyboard shortcut: Enter to continue
    this.input.keyboard?.on("keydown-ENTER", () => this.scene.stop());
  }
}
