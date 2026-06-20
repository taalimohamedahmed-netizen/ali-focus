// Writes a fresh build id to public/version.json on every build. The running
// app polls this file and reloads itself when the value changes (new deploy).
import { writeFileSync } from 'node:fs';

const v = String(Date.now());
writeFileSync(new URL('../public/version.json', import.meta.url), JSON.stringify({ v }) + '\n');
console.log('[gen-version] version.json =', v);
