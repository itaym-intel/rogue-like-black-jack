import Phaser from "phaser";
import { BootScene } from "../scenes/BootScene.js";
import { MenuScene } from "../scenes/MenuScene.js";
import { GameScene } from "../scenes/GameScene.js";
import { SummaryOverlayScene } from "../scenes/SummaryOverlayScene.js";
import { ShopScene } from "../scenes/ShopScene.js";
import { InventoryOverlayScene } from "../scenes/InventoryOverlayScene.js";

/**
 * Phaser game configuration.
 *
 * Scenes are listed here once.  Adding a new scene (e.g. ModifierSelectScene
 * for the rogue-like upgrade screen) requires only two changes:
 *  1. Import the scene class
 *  2. Add it to the `scene` array below
 *
 * Nothing else in the codebase needs to change for scene registration.
 */
export const PHASER_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  backgroundColor: "#0a1c0b",
  parent: document.body,
  dom: {
    // Required for Phaser DOM elements (used in MenuScene text inputs)
    createContainer: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    BootScene,
    MenuScene,
    GameScene,
    SummaryOverlayScene,
    ShopScene,
    InventoryOverlayScene,
  ],
};
