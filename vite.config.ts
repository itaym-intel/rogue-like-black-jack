import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';

function wishApiPlugin(): Plugin {
  return {
    name: 'wish-api',
    configureServer(server) {
      server.middlewares.use('/api/wish', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        let body = '';
        for await (const chunk of req) body += chunk;

        try {
          const { wishText, context } = JSON.parse(body);
          const { generateBlessing } = await import('./src/llm/wish-generator.js');
          const blessing = await generateBlessing(wishText, context);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(blessing));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            name: 'Minor Boon',
            description: 'A small gift from the Genie',
            effects: [{ type: 'flat_damage_bonus', value: 3 }],
          }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), wishApiPlugin()],
  base: process.env.GITHUB_PAGES === 'true' ? '/rogue-like-black-jack/' : '/',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist-gui',
  },
  server: {
    port: 3000,
    open: true,
  },
});
