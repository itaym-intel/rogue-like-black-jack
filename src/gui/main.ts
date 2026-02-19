/**
 * GUI Entry Point
 * ──────────────────────────────────────────────────────────────────────────────
 * This is the Vite/browser entry point for the Phaser game.
 * It is completely independent of src/index.ts (the CLI entry point).
 *
 * To add a new scene, register it in src/gui/config/phaserConfig.ts.
 * To change game-engine options or rules, update the GameAdapter instantiation
 * in MenuScene — nothing here needs to change.
 */

import Phaser from "phaser";
import { PHASER_CONFIG } from "./config/phaserConfig.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const game = new Phaser.Game(PHASER_CONFIG);
