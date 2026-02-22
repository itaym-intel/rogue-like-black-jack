import fs from 'fs';
import path from 'path';
import type { AggregateStats, RunResult, SimProgress } from './types.js';

export function writeSimResults(stats: AggregateStats, rawResults: RunResult[], outputDir: string): void {
  const currentDir = path.join(outputDir, 'current');
  fs.mkdirSync(currentDir, { recursive: true });

  // Write aggregate stats
  fs.writeFileSync(
    path.join(currentDir, 'aggregate.json'),
    JSON.stringify(stats, null, 2),
  );

  // Write runs without events array (to reduce file size)
  const strippedResults = rawResults.map(r => {
    const { events, ...rest } = r;
    return rest;
  });
  fs.writeFileSync(
    path.join(currentDir, 'runs.json'),
    JSON.stringify(strippedResults, null, 2),
  );
}

export function archiveCurrentResults(outputDir: string): void {
  const currentDir = path.join(outputDir, 'current');
  if (!fs.existsSync(currentDir)) return;

  const files = fs.readdirSync(currentDir);
  if (files.length === 0) return;

  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/T/, '_')
    .replace(/:/g, '-')
    .replace(/\..+/, '');
  const archiveDir = path.join(outputDir, 'archive', timestamp);
  fs.mkdirSync(archiveDir, { recursive: true });

  for (const file of files) {
    fs.renameSync(
      path.join(currentDir, file),
      path.join(archiveDir, file),
    );
  }
}

export function writeProgress(progress: SimProgress, outputDir: string): void {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, 'progress.json'),
    JSON.stringify(progress, null, 2),
  );
}

export function clearProgress(outputDir: string): void {
  const progressPath = path.join(outputDir, 'progress.json');
  if (fs.existsSync(progressPath)) {
    fs.unlinkSync(progressPath);
  }
}

export function readAggregateStats(dir: string): AggregateStats | null {
  const filePath = path.join(dir, 'aggregate.json');
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as AggregateStats;
}
