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
          res.end();
          return;
        }
        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk; });
        req.on('end', async () => {
          try {
            const { wishText, context } = JSON.parse(body);
            const { generateBlessing } = await import('./src/llm/wish-generator.js');
            const blessing = await generateBlessing(wishText, context);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(blessing));
          } catch {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to generate blessing' }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), wishApiPlugin()],
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
