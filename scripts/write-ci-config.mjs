// Generates tests/config/<env>.json in CI from environment variables (secrets).
// Never prints secret values. Usage: node scripts/write-ci-config.mjs <stage|uat>

import fs from 'node:fs';
import path from 'node:path';

const env = (process.argv[2] ?? '').trim().toLowerCase();
const SUPPORTED = ['stage', 'uat'];

if (!SUPPORTED.includes(env)) {
  console.error(`Usage: node scripts/write-ci-config.mjs <${SUPPORTED.join('|')}>`);
  process.exit(1);
}

const prefix = env.toUpperCase();
const read = (suffix) => process.env[`${prefix}_${suffix}`];

const origin = read('ORIGIN');
if (!origin) {
  console.error(
    `Missing ${prefix}_ORIGIN. Set the ${env} secrets in the repository settings before running CI.`,
  );
  process.exit(1);
}

const trimmedOrigin = origin.replace(/\/$/, '');

// Stage keeps the OTP / personal-details / fee-dialog flows; UAT skips them.
const stageDefaults = env !== 'uat';

const config = {
  name: env,
  origin: trimmedOrigin,
  baseUrl: `${trimmedOrigin}/login`,
  signupUrl: `${trimmedOrigin}/signup`,
  waiverUrl: `${trimmedOrigin}/settings/waiver`,
  locationUrl: `${trimmedOrigin}/settings/location`,
  username: read('USERNAME') ?? '',
  password: read('PASSWORD') ?? '',
  parentUsername: read('PARENT_USERNAME') ?? '',
  parentPassword: read('PARENT_PASSWORD') ?? '',
  requireMobileOtp: stageDefaults,
  organiserPersonalDetailsStep: stageDefaults,
  programFeePolicyDialog: stageDefaults,
};

const outDir = path.join(process.cwd(), 'tests', 'config');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `${env}.json`);
fs.writeFileSync(outFile, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

// Log only non-sensitive fields so CI output is safe.
console.log(`Wrote ${outFile} (origin=${trimmedOrigin}, requireMobileOtp=${config.requireMobileOtp}).`);
