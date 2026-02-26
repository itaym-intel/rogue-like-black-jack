import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

function componentApiPlugin() {
  const dataDir = path.join(process.cwd(), 'data', 'components');

  function getAllJsonFiles(dir: string): string[] {
    const files: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getAllJsonFiles(fullPath));
      } else if (entry.name.endsWith('.json') && !entry.name.startsWith('.')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  return {
    name: 'component-api',
    configureServer(server: any) {
      // GET /api/components — return all components
      server.middlewares.use('/api/components', (req: any, res: any, next: any) => {
        if (req.method === 'GET') {
          try {
            const files = getAllJsonFiles(dataDir);
            const all: any[] = [];
            for (const f of files) {
              const data = JSON.parse(fs.readFileSync(f, 'utf-8'));
              if (Array.isArray(data)) all.push(...data);
            }
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify(all));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(err) }));
          }
          return;
        }

        if (req.method === 'PUT') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', () => {
            try {
              const updated = JSON.parse(body);
              const files = getAllJsonFiles(dataDir);
              let saved = false;
              for (const f of files) {
                const data = JSON.parse(fs.readFileSync(f, 'utf-8'));
                if (!Array.isArray(data)) continue;
                const idx = data.findIndex((c: any) => c.id === updated.id);
                if (idx >= 0) {
                  data[idx] = updated;
                  fs.writeFileSync(f, JSON.stringify(data, null, 2) + '\n');
                  saved = true;
                  break;
                }
              }
              if (!saved) {
                // Place in appropriate file based on tags
                const targetFile = resolveTargetFile(updated, dataDir);
                const data = JSON.parse(fs.readFileSync(targetFile, 'utf-8'));
                data.push(updated);
                fs.writeFileSync(targetFile, JSON.stringify(data, null, 2) + '\n');
              }
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: String(err) }));
            }
          });
          return;
        }

        if (req.method === 'DELETE') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', () => {
            try {
              const { id } = JSON.parse(body);
              const files = getAllJsonFiles(dataDir);
              for (const f of files) {
                const data = JSON.parse(fs.readFileSync(f, 'utf-8'));
                if (!Array.isArray(data)) continue;
                const idx = data.findIndex((c: any) => c.id === id);
                if (idx >= 0) {
                  data.splice(idx, 1);
                  fs.writeFileSync(f, JSON.stringify(data, null, 2) + '\n');
                  break;
                }
              }
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: String(err) }));
            }
          });
          return;
        }

        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.statusCode = 204;
          res.end();
          return;
        }

        next();
      });
    },
  };
}

function resolveTargetFile(comp: any, dataDir: string): string {
  const tags: string[] = comp.tags || [];
  if (tags.includes('consumable')) return path.join(dataDir, 'consumables', 'consumables.json');
  if (tags.includes('boss')) {
    // Create in first boss file or stage-specific
    return path.join(dataDir, 'bosses', 'ancient-strix.json');
  }
  if (tags.includes('enemy')) {
    if (tags.includes('stage_2')) return path.join(dataDir, 'enemies', 'stage-2.json');
    if (tags.includes('stage_3')) return path.join(dataDir, 'enemies', 'stage-3.json');
    return path.join(dataDir, 'enemies', 'stage-1.json');
  }
  if (tags.includes('equipment')) {
    if (tags.includes('weapon')) return path.join(dataDir, 'equipment', 'weapons.json');
    if (tags.includes('helm')) return path.join(dataDir, 'equipment', 'helms.json');
    if (tags.includes('armor')) return path.join(dataDir, 'equipment', 'armor.json');
    if (tags.includes('boots')) return path.join(dataDir, 'equipment', 'boots.json');
    if (tags.includes('trinket')) return path.join(dataDir, 'equipment', 'trinkets.json');
    return path.join(dataDir, 'equipment', 'weapons.json');
  }
  if (tags.includes('rules_override')) return path.join(dataDir, 'rules', 'defaults.json');
  return path.join(dataDir, 'equipment', 'weapons.json');
}

export default defineConfig({
  plugins: [react(), componentApiPlugin()],
  root: 'src/editor',
  build: { outDir: '../../dist-editor' },
  server: { port: 3002 },
});
