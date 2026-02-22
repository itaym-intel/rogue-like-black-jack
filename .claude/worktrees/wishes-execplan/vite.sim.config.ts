import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

function serveSimData() {
  return {
    name: 'serve-sim-data',
    configureServer(server: any) {
      server.middlewares.use('/sim-data', (req: any, res: any, next: any) => {
        const filePath = path.join(process.cwd(), 'sim-data', req.url);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          fs.createReadStream(filePath).pipe(res);
        } else {
          res.statusCode = 404;
          res.end('Not found');
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), serveSimData()],
  root: 'src/sim-dash',
  build: { outDir: '../../dist-sim-dash' },
  server: { port: 3001 },
});
