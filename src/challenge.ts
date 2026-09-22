import { Mode } from './types.js';
export interface Challenge { seed: string; mode: Mode; valid: boolean; }
export const SEED_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
export const CHALLENGE_VERSION = '3';

/** Only version, mode and a bounded seed can cross the URL boundary. */
export function parseChallenge(hash: string): Challenge | null {
  if (!hash) return null;
  if (hash.length > 200) return {seed: '', mode: 'challenge', valid: false};
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const seed = p.get('seed') ?? '', mode = p.get('mode');
  const keys = [...p.keys()];
  const valid = keys.length === 3 && new Set(keys).size === 3 && keys.every(k => ['v', 'seed', 'mode'].includes(k))
    && p.get('v') === CHALLENGE_VERSION && mode === 'challenge' && SEED_PATTERN.test(seed);
  return {seed: valid ? seed : '', mode: 'challenge', valid};
}
export function challengeLink(location: string, seed: string): string | null {
  if (!SEED_PATTERN.test(seed)) throw new Error('Invalid seed');
  const url = new URL(location);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  url.search = ''; url.hash = new URLSearchParams({v: CHALLENGE_VERSION, seed, mode: 'challenge'}).toString();
  return url.href;
}
export interface Preferences { sound: boolean; best: number; }
export function readPreferences(raw: string | null): Preferences {
  if (!raw || raw.length > 200) return {sound: false, best: 0};
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) throw new Error();
    const p = data as Record<string, unknown>;
    return {sound: p['sound'] === true, best: typeof p['best'] === 'number' && Number.isInteger(p['best']) && p['best'] >= 0 && p['best'] <= 1_000_000 ? p['best'] : 0};
  } catch { return {sound: false, best: 0}; }
}
