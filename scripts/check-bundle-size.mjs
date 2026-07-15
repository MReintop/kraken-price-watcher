// Fails when the shipped app grows past its budget.
// Usage: node scripts/check-bundle-size.mjs [platform]
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

// Assets are counted, not just JS. A barrel import of an icon package adds
// megabytes of fonts and not one byte of JS, so a JS-only budget cannot see the
// single largest size mistake this app can make.
const BUDGET_KB = { js: 2400, assets: 700, total: 2900 };
const platform = process.argv[2] ?? 'ios';

execSync(`npx expo export --platform ${platform}`, { stdio: 'inherit' });

const kbOf = (dir) => {
  if (!existsSync(dir)) return 0;
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    total += entry.isDirectory() ? kbOf(path) * 1024 : statSync(path).size;
  }
  return Math.round(total / 1024);
};

const jsDir = join('dist', '_expo', 'static', 'js', platform);
if (!existsSync(jsDir)) {
  console.error(`No bundle found in ${jsDir}`);
  process.exit(1);
}

const shipped = { js: kbOf(jsDir), assets: kbOf(join('dist', 'assets')) };
shipped.total = shipped.js + shipped.assets;

const over = Object.keys(BUDGET_KB).filter((k) => shipped[k] >= BUDGET_KB[k]);

for (const key of ['js', 'assets', 'total']) {
  const verdict = over.includes(key) ? 'OVER BUDGET' : 'ok';
  console.log(
    `[bundle] ${platform} ${key.padEnd(6)} ${String(shipped[key]).padStart(5)}KB of ${String(BUDGET_KB[key]).padStart(5)}KB — ${verdict}`,
  );
}

if (over.length > 0) {
  console.error(
    `\nThe ${platform} build grew past its ${over.join(' and ')} budget. Find what was added before raising it:\n` +
      `  npx expo export --platform ${platform} --dump-sourcemap\n` +
      `  find dist/assets -type f -exec du -k {} \\; | sort -rn | head\n`,
  );
  process.exit(1);
}
