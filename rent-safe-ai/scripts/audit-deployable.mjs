import { spawnSync } from 'node:child_process';

const result = spawnSync(
  'pnpm',
  ['audit', '--prod', '--audit-level', 'high'],
  {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: process.platform === 'win32',
  },
);

if (result.error) {
  console.error('Unable to run pnpm audit:', result.error);
  process.exit(2);
}

const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
process.stdout.write(output);

if (result.status === 0) {
  console.log('\nNo high/critical production dependency advisories detected.');
  process.exit(0);
}

// pnpm's human-readable audit output groups each advisory in a box.
// We deliberately gate the deployable web/API paths and keep the legacy
// Expo mobile prototype visible as separate remediation work.
const advisoryBlocks = output
  .split(/(?=┌[─┬]+┐)/u)
  .filter((block) => /Vulnerable versions|Patched versions/u.test(block));

const deployableFindings = advisoryBlocks.filter((block) =>
  /apps\/(?:api|web)\s*>/u.test(block),
);

if (deployableFindings.length > 0) {
  console.error(
    `\nBlocking: found ${deployableFindings.length} high/critical advisory block(s) in deployed API/Web dependency paths.\n`,
  );
  for (const block of deployableFindings) {
    console.error(block);
  }
  process.exit(1);
}

console.warn(
  '\nHigh/critical advisories remain outside the deployed API/Web paths (currently the legacy mobile prototype). They are reported above and tracked separately, but do not block the web/API release.',
);
process.exit(0);
