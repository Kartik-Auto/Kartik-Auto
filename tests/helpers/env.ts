import fs from 'node:fs';
import path from 'node:path';

export type EnvName = 'stage' | 'uat';

export type EnvConfig = {
  name: EnvName;
  /** App origin, e.g. https://stage.futureonesports.com */
  origin: string;
  /** Login URL used by most specs */
  baseUrl: string;
  signupUrl: string;
  waiverUrl: string;
  locationUrl: string;
  username: string;
  password: string;
  parentUsername: string;
  parentPassword: string;
  /**
   * Stage requires mobile OTP; UAT currently does not.
   * Defaults: stage=true, uat=false (overridable in config JSON).
   */
  requireMobileOtp: boolean;
  /**
   * Stage organiser onboarding has a Personal Details step before Organization
   * Details; UAT goes straight to "Step-1: Basic Information".
   * Defaults: stage=true, uat=false (overridable in config JSON).
   */
  organiserPersonalDetailsStep: boolean;
  /**
   * Stage shows "Confirm Transaction Fee Policy" after Create New Program;
   * UAT navigates straight to the create form.
   * Defaults: stage=true, uat=false (overridable in config JSON).
   */
  programFeePolicyDialog: boolean;
};

type RawEnvConfig = Partial<Omit<EnvConfig, 'name'>> & {
  name?: string;
};

const SUPPORTED_ENVS: EnvName[] = ['stage', 'uat'];

function testsDir(): string {
  return path.join(process.cwd(), 'tests');
}

function readJsonFile(filePath: string): RawEnvConfig {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as RawEnvConfig;
}

function resolveOrigin(raw: RawEnvConfig): string {
  if (raw.origin?.trim()) return raw.origin.replace(/\/$/, '');
  if (raw.baseUrl?.trim()) return new URL(raw.baseUrl).origin;
  if (raw.signupUrl?.trim()) return new URL(raw.signupUrl).origin;
  throw new Error('Env config must include origin, baseUrl, or signupUrl');
}

function normalize(name: EnvName, raw: RawEnvConfig): EnvConfig {
  const origin = resolveOrigin(raw);

  return {
    name,
    origin,
    baseUrl: raw.baseUrl?.trim() || `${origin}/login`,
    signupUrl: raw.signupUrl?.trim() || `${origin}/signup`,
    waiverUrl: raw.waiverUrl?.trim() || `${origin}/settings/waiver`,
    locationUrl: raw.locationUrl?.trim() || `${origin}/settings/location`,
    username: raw.username ?? '',
    password: raw.password ?? '',
    parentUsername: raw.parentUsername ?? '',
    parentPassword: raw.parentPassword ?? '',
    // Stage keeps OTP / personal-details / fee dialog; UAT skips unless enabled.
    requireMobileOtp: raw.requireMobileOtp ?? name !== 'uat',
    organiserPersonalDetailsStep: raw.organiserPersonalDetailsStep ?? name !== 'uat',
    programFeePolicyDialog: raw.programFeePolicyDialog ?? name !== 'uat',
  };
}

function missingConfigMessage(name: EnvName): string {
  return [
    `Missing config for TEST_ENV=${name}.`,
    `Copy tests/config/${name}.example.json → tests/config/${name}.json and fill credentials.`,
    name === 'stage'
      ? 'Or keep using the legacy tests/config.json (Stage default).'
      : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Active environment. Defaults to Stage so existing runs stay unchanged.
 * Override with: TEST_ENV=uat npx playwright test
 */
export function getEnvName(): EnvName {
  const raw = (process.env.TEST_ENV ?? 'stage').trim().toLowerCase();
  if ((SUPPORTED_ENVS as string[]).includes(raw)) return raw as EnvName;
  throw new Error(`Unsupported TEST_ENV="${raw}". Use one of: ${SUPPORTED_ENVS.join(', ')}`);
}

/**
 * Load env config without breaking Stage.
 * Resolution order:
 * 1. tests/config/<env>.json
 * 2. Stage only: legacy tests/config.json (current setup)
 */
export function getEnvConfig(): EnvConfig {
  const name = getEnvName();
  const envFile = path.join(testsDir(), 'config', `${name}.json`);
  const legacyFile = path.join(testsDir(), 'config.json');

  if (fs.existsSync(envFile)) {
    return normalize(name, readJsonFile(envFile));
  }

  if (name === 'stage' && fs.existsSync(legacyFile)) {
    return normalize('stage', readJsonFile(legacyFile));
  }

  throw new Error(missingConfigMessage(name));
}

/** Singleton — safe to import from specs and page objects. */
export const config = getEnvConfig();
