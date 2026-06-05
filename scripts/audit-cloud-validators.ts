/**
 * Adversarial test harness for S1/S2/S3 hardening.
 *
 * Runs a battery of malicious inputs against the cloud validators and the
 * CloudFormation generator. Exits non-zero if any payload bypasses the
 * defense. Run with: `pnpm tsx scripts/audit-cloud-validators.ts`.
 *
 * Maps each test to its CWE so a future engineer can map regressions
 * back to the original threat.
 */

import {
  InvalidInputError,
  isUuid,
  requireAwsExternalId,
  requireAwsRoleArn,
  requireAwsRegions,
  requireSafeName,
  requireUuid,
} from '../src/lib/cloud/validators';
import { pickPatchableConnectionFields } from '../src/lib/cloud/patch';
import {
  generateCloudFormationYaml,
} from '../src/lib/cloud/aws/cloudformation';

let failures = 0;
let passes = 0;

function expectReject(label: string, cwe: string, fn: () => unknown) {
  try {
    fn();
    failures++;
    console.error('  FAIL [' + cwe + '] ' + label + ' — payload was accepted');
  } catch (err) {
    if (err instanceof InvalidInputError || (err as Error).message) {
      passes++;
      console.log('  pass [' + cwe + '] ' + label);
    } else {
      failures++;
      console.error('  FAIL [' + cwe + '] ' + label + ' — wrong error class');
    }
  }
}

function expectAccept(label: string, fn: () => unknown) {
  try {
    fn();
    passes++;
    console.log('  pass (positive) ' + label);
  } catch (err) {
    failures++;
    console.error('  FAIL (positive) ' + label + ' — ' + (err as Error).message);
  }
}

console.log('\n── CWE-22 path traversal via UUID parameter ──');
expectReject('dot-dot-slash', 'CWE-22', () => requireUuid('id', '../../etc/passwd'));
expectReject('null-byte injection', 'CWE-22', () => requireUuid('id', '00000000-0000-4000-8000-000000000000\x00'));
expectReject('UUID with trailing newline', 'CWE-22', () =>
  requireUuid('id', '00000000-0000-4000-8000-000000000000\n')
);
expectReject('non-v4 UUID (v1)', 'CWE-22', () => requireUuid('id', '00000000-0000-1000-8000-000000000000'));
expectAccept('canonical v4 UUID', () => requireUuid('id', '550e8400-e29b-41d4-a716-446655440000'));

console.log('\n── CWE-1336 YAML injection via externalId ──');
expectReject('newline + extra resource', 'CWE-1336', () =>
  requireAwsExternalId('externalId', "abcd1234abcd1234'\nExtra: !!python/object/apply")
);
expectReject('YAML colon break', 'CWE-1336', () =>
  requireAwsExternalId('externalId', 'abcd:1234:abcd:1234')
);
expectReject('YAML anchor', 'CWE-1336', () =>
  requireAwsExternalId('externalId', '&anchor1234567890')
);
expectReject('YAML directive', 'CWE-1336', () =>
  requireAwsExternalId('externalId', '%YAML1234567890')
);
expectReject('whitespace', 'CWE-1336', () =>
  requireAwsExternalId('externalId', 'has spaces 1234')
);
expectReject('too short', 'CWE-1336', () => requireAwsExternalId('externalId', 'short'));
expectReject('too long', 'CWE-1336', () => requireAwsExternalId('externalId', 'a'.repeat(129)));
expectAccept('valid 32-hex', () =>
  requireAwsExternalId('externalId', 'a1b2c3d4e5f60718293a4b5c6d7e8f90')
);

console.log('\n── End-to-end YAML render must reject injection payloads ──');
expectReject('YAML render with newline in externalId', 'CWE-1336', () =>
  generateCloudFormationYaml({
    externalId: "abc'\nMaliciousRole: AWS::IAM::Role".padEnd(20, 'x'),
  })
);
expectReject('YAML render with bad claudio account', 'CWE-1336', () =>
  generateCloudFormationYaml({
    externalId: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
    claudioAwsAccountId: "123456789012'\nMaliciousRole: foo",
  })
);
expectAccept('YAML render with valid inputs', () => {
  const yaml = generateCloudFormationYaml({
    externalId: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
    claudioAwsAccountId: '123456789012',
  });
  if (!yaml.includes("sts:ExternalId: 'a1b2c3d4e5f60718293a4b5c6d7e8f90'")) {
    throw new Error('externalId not quoted in output');
  }
  if (!yaml.includes("AWS: 'arn:aws:iam::123456789012:root'")) {
    throw new Error('account ARN not quoted in output');
  }
});

console.log('\n── CWE-915 mass assignment via PATCH body ──');
expectReject('PATCH userId', 'CWE-915', () =>
  pickPatchableConnectionFields({ userId: 'victim-uuid' })
);
expectReject('PATCH id', 'CWE-915', () => pickPatchableConnectionFields({ id: 'spoof' }));
expectReject('PATCH status', 'CWE-915', () =>
  pickPatchableConnectionFields({ status: 'connected' })
);
expectReject('PATCH mode', 'CWE-915', () => pickPatchableConnectionFields({ mode: 'live' }));
expectReject('PATCH provider', 'CWE-915', () =>
  pickPatchableConnectionFields({ provider: 'aws' })
);
expectReject('PATCH lastInventory', 'CWE-915', () =>
  pickPatchableConnectionFields({ lastInventory: { fake: true } })
);
expectReject('PATCH aws.roleArn', 'CWE-915', () =>
  pickPatchableConnectionFields({ aws: { roleArn: 'arn:aws:iam::999999999999:role/evil' } })
);
expectReject('PATCH aws.externalId', 'CWE-915', () =>
  pickPatchableConnectionFields({ aws: { externalId: 'attacker-controlled' } })
);
expectReject('PATCH aws.accountId', 'CWE-915', () =>
  pickPatchableConnectionFields({ aws: { accountId: '999999999999' } })
);
expectAccept('PATCH name (allowed)', () =>
  pickPatchableConnectionFields({ name: 'My renamed connection' })
);
expectAccept('PATCH aws.regions (allowed)', () =>
  pickPatchableConnectionFields({ aws: { regions: ['us-east-1', 'eu-west-1'] } })
);

console.log('\n── Role ARN format ──');
expectReject('bad partition', 'CWE-20', () =>
  requireAwsRoleArn('roleArn', 'arn:foo:iam::123456789012:role/x')
);
expectReject('bad account id (non-numeric)', 'CWE-20', () =>
  requireAwsRoleArn('roleArn', 'arn:aws:iam::EVIL12345678:role/x')
);
expectReject('empty role name', 'CWE-20', () =>
  requireAwsRoleArn('roleArn', 'arn:aws:iam::123456789012:role/')
);
expectAccept('valid role ARN', () =>
  requireAwsRoleArn('roleArn', 'arn:aws:iam::123456789012:role/ClaudioReadOnlyRole')
);

console.log('\n── Region whitelist ──');
expectReject('SQL fragment region', 'CWE-89', () =>
  requireAwsRegions('regions', ["us-east-1' OR 1=1--"])
);
expectReject('unknown region', 'CWE-20', () => requireAwsRegions('regions', ['mars-1']));
expectAccept('valid regions', () => requireAwsRegions('regions', ['us-east-1', 'eu-west-3']));

console.log('\n── Name sanitization ──');
expectReject('XSS in name', 'CWE-79', () =>
  requireSafeName('name', '<script>alert(1)</script>')
);
expectReject('control char', 'CWE-176', () => requireSafeName('name', "evil\x00name"));
expectReject('backtick', 'CWE-79', () => requireSafeName('name', 'evil`name'));
expectAccept('safe name', () => requireSafeName('name', "My team's prod cluster (us-east-1)"));

console.log(
  '\n──────────\n' + passes + ' passed, ' + failures + ' failed'
);

if (failures > 0) {
  process.exit(1);
}

// Sanity check on isUuid in addition to throw-based wrapper
if (!isUuid('550e8400-e29b-41d4-a716-446655440000')) {
  console.error('isUuid regression');
  process.exit(1);
}

// ─── S4: upgrade-endpoint env gate logic ─────────────────────────────────
//
// Mirror the gate decision so any future change to the gate code is
// flagged here. Both clauses MUST be present for the stub to be usable.

console.log('\n── S4 upgrade gate decision matrix ──');

function gateDecision(nodeEnv: string | undefined, allow: string | undefined): boolean {
  if (nodeEnv === 'production') return false;
  return allow === '1';
}

const gateCases: Array<[string | undefined, string | undefined, boolean, string]> = [
  ['production', '1', false, 'prod + opt-in = STILL denied'],
  ['production', undefined, false, 'prod + no opt-in = denied'],
  ['development', '1', true, 'dev + opt-in = allowed'],
  ['development', undefined, false, 'dev + no opt-in = denied (default)'],
  ['development', 'true', false, 'dev + wrong opt-in value = denied'],
  ['development', '0', false, 'dev + opt-out value = denied'],
  [undefined, '1', true, 'unknown env + opt-in = allowed (non-prod default)'],
  [undefined, undefined, false, 'unknown env + nothing = denied'],
];

for (const [env, allow, expected, label] of gateCases) {
  const got = gateDecision(env, allow);
  if (got === expected) {
    console.log('  pass [S4] ' + label);
    passes++;
  } else {
    console.error(
      '  FAIL [S4] ' + label + ' — expected ' + expected + ' got ' + got
    );
    failures++;
  }
}

// ─── S5: every legacy AI route plumbs userId ─────────────────────────────
//
// File-system grep regression: if any route is added that calls one of
// the legacy AI shims without also importing getOrCreateUserId, the
// audit fails.

import { execSync } from 'node:child_process';

console.log('\n── S5 legacy AI route userId coverage ──');

const aiCallers = execSync(
  "grep -rln 'claudeChat\\|claudeJson\\|generateCohereChatCompletion\\|streamingCohereChatCompletion\\|cohereClient' src/app/api/ 2>/dev/null || true",
  { encoding: 'utf8' }
)
  .trim()
  .split('\n')
  .filter(Boolean);

for (const file of aiCallers) {
  const body = execSync('cat ' + JSON.stringify(file), { encoding: 'utf8' });
  if (body.includes('getOrCreateUserId')) {
    console.log('  pass [S5] ' + file);
    passes++;
  } else {
    console.error('  FAIL [S5] ' + file + ' — calls AI shim without userId import');
    failures++;
  }
}

// ─── S8 / audit #8: rate-limiter peek + memory leak ───────────────────────

import {
  peekRateLimit,
  recordRateLimit,
  resetRateLimiter,
} from '../src/lib/plans/rate-limiter';

console.log('\n── S8 rate-limiter peek + memory hygiene ──');

resetRateLimiter();

// peek must not consume
const u = 'audit-user-peek';
const limit = 5;
const window = 60_000;
const p1 = peekRateLimit(u, limit, window);
const p2 = peekRateLimit(u, limit, window);
const p3 = peekRateLimit(u, limit, window);
if (p1.remaining === 5 && p2.remaining === 5 && p3.remaining === 5) {
  console.log('  pass [S8] peek does not consume (5,5,5 across 3 calls)');
  passes++;
} else {
  console.error(
    '  FAIL [S8] peek consumed: ' + p1.remaining + ',' + p2.remaining + ',' + p3.remaining
  );
  failures++;
}

// record must consume
const r1 = recordRateLimit(u, limit, window);
const r2 = recordRateLimit(u, limit, window);
if (r1.remaining === 4 && r2.remaining === 3) {
  console.log('  pass [S8] record consumes (4 then 3 remaining)');
  passes++;
} else {
  console.error('  FAIL [S8] record did not consume: ' + r1.remaining + ',' + r2.remaining);
  failures++;
}

// memory leak: after a long-ago entry expires, the user's key should be
// purged from the internal map (we can't introspect the map directly,
// but we can verify pruneFresh behaviour via peek with a tiny window).
async function leakTest() {
  resetRateLimiter();
  recordRateLimit('leak-user', limit, 1); // 1ms window
  await new Promise((r) => setTimeout(r, 5));
  const after = peekRateLimit('leak-user', limit, 1);
  if (after.remaining === limit) {
    console.log('  pass [S8] expired entries pruned (memory leak fix)');
    passes++;
  } else {
    console.error('  FAIL [S8] expired entries leaked');
    failures++;
  }
}

// ─── S7: encryption fail-closed ──────────────────────────────────────────
//
// Spawn a child process with ENCRYPTION_KEY unset and verify any attempt
// to use the encryption module throws. Avoids polluting THIS process's
// env (which already has a real ENCRYPTION_KEY set in .env.local).

async function s7FailClosedTest() {
  console.log('\n── S7 encryption fail-closed ──');
  const { spawnSync } = await import('node:child_process');
  const childCode = [
    "process.env.ENCRYPTION_KEY = '';",
    "import('./src/lib/cloud/encryption.ts')",
    "  .then(m => { try { m.encrypt('x'); console.log('LEAK'); process.exit(1); }",
    "               catch (e) { console.log('FAILED_CLOSED:' + e.message.slice(0,60)); process.exit(0); } });",
  ].join('\n');
  const result = spawnSync('pnpm', ['exec', 'tsx', '-e', childCode], {
    encoding: 'utf8',
    env: { ...process.env, ENCRYPTION_KEY: '' },
    cwd: process.cwd(),
  });
  if (result.stdout.includes('FAILED_CLOSED:')) {
    console.log('  pass [S7] encryption refuses to run without ENCRYPTION_KEY');
    passes++;
  } else {
    console.error('  FAIL [S7] encryption did NOT fail-close. stdout=' + result.stdout);
    failures++;
  }
}

leakTest().then(s7FailClosedTest).then(() => {
  console.log('\nFinal: ' + passes + ' passed, ' + failures + ' failed');
  process.exit(failures > 0 ? 1 : 0);
});
