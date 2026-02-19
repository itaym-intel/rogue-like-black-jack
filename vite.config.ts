import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  base: "./",
  resolve: {
    // Vite handles .ts → .js alias so engine imports like "./deck.js" resolve correctly
    extensions: [".ts", ".js"],
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: "dist-gui",
    // Phaser is ~1.5 MB; raise the warning threshold accordingly.
    // Future work: split Phaser into its own chunk via manualChunks.
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: "index.html",
    },
  },
  optimizeDeps: {
    include: ["phaser"],
  },
});
