// Stamp public/version.json with a unique version per build, so
// VersionCheck.jsx can actually detect new deploys (a hand-maintained
// version number never changes, so the "new version ready" toast never
// fired). Runs automatically as part of `npm run build`.
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

let sha = 'local';
try {
  sha = execSync('git rev-parse --short HEAD').toString().trim();
} catch { /* not a git checkout (CI tarball) — timestamp alone still works */ }

const version = `${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}-${sha}`;
const target = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/version.json');
writeFileSync(target, JSON.stringify({ version }, null, 2) + '\n');
console.log(`[stamp-version] public/version.json -> ${version}`);
