// Fails when the shipped bundle grows past its budget.
// Usage: node scripts/check-bundle-size.mjs [platform]
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const BUDGET_KB = 2900;
const platform = process.argv[2] ?? 'ios';
const bundleDir = join('dist', '_expo', 'static', 'js', platform);

execSync(`npx expo export --platform ${platform}`, { stdio: 'inherit' });

const bundles = readdirSync(bundleDir).filter(
  (file) => file.endsWith('.hbc') || file.endsWith('.js'),
);
if (bundles.length === 0) {
  console.error(`No bundle found in ${bundleDir}`);
  process.exit(1);
}

const totalKb = Math.round(
  bundles.reduce(
    (total, file) => total + statSync(join(bundleDir, file)).size,
    0,
  ) / 1024,
);

const verdict = totalKb < BUDGET_KB ? 'ok' : 'OVER BUDGET';
console.log(
  `\n[bundle] ${platform}: ${totalKb}KB of ${BUDGET_KB}KB — ${verdict}`,
);

if (totalKb >= BUDGET_KB) {
  console.error(
    `\nThe ${platform} bundle grew past its budget. Find what was added before raising it:\n` +
      `  npx expo export --platform ${platform} --dump-sourcemap\n`,
  );
  process.exit(1);
}
