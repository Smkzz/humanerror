export interface LeaderboardEntry {
  readonly name: string;
  readonly score: number;
  readonly correct: number;
  readonly attempted: number;
  readonly bestStreak: number;
  readonly recordedAt: number;
}
export interface PlayerProfile {
  readonly name: string;
  /** Browser-only scores. These may be legacy or unverified local results. */
  readonly leaderboard: readonly LeaderboardEntry[];
  /** Last server-confirmed top ten, kept separately from local scores. */
  readonly sharedLeaderboard: readonly LeaderboardEntry[];
  readonly lastKnownRank: number | null;
  readonly lastKnownRankAt: number | null;
  readonly gamesPlayed: number;
}
export const PLAYER_NAME_MAX = 18;
const MAX_SCORE = 2_000_000;
const MAX_ATTEMPTS = 500;
const MAX_TIME = 4_102_444_800_000;
const EMPTY_PROFILE: PlayerProfile = Object.freeze({name: '', leaderboard: Object.freeze([]), sharedLeaderboard: Object.freeze([]), lastKnownRank: null, lastKnownRankAt: null, gamesPlayed: 0});

export function sanitizePlayerName(input: string): string {
  const cleaned = input.normalize('NFKC').replace(/[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}]/gu, '').replace(/\s+/gu, ' ').trim();
  const bounded = [...cleaned].slice(0, PLAYER_NAME_MAX).join('');
  return /[\p{L}\p{N}\p{P}\p{S}]/u.test(bounded) ? bounded : '';
}
function validEntry(value: unknown): LeaderboardEntry | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const name = typeof v['name'] === 'string' ? sanitizePlayerName(v['name']) : '';
  const score = v['score'], correct = v['correct'], attempted = v['attempted'], bestStreak = v['bestStreak'], recordedAt = v['recordedAt'];
  if (!name || typeof score !== 'number' || !Number.isSafeInteger(score) || score < 0 || score > MAX_SCORE) return null;
  if (typeof correct !== 'number' || !Number.isSafeInteger(correct) || correct < 0 || correct > MAX_ATTEMPTS) return null;
  if (typeof attempted !== 'number' || !Number.isSafeInteger(attempted) || attempted < correct || attempted > MAX_ATTEMPTS) return null;
  if (typeof bestStreak !== 'number' || !Number.isSafeInteger(bestStreak) || bestStreak < 0 || bestStreak > correct) return null;
  if (typeof recordedAt !== 'number' || !Number.isSafeInteger(recordedAt) || recordedAt < 0 || recordedAt > MAX_TIME) return null;
  return Object.freeze({name, score, correct, attempted, bestStreak, recordedAt});
}
function order(a: LeaderboardEntry, b: LeaderboardEntry): number {
  if (b.score !== a.score) return b.score - a.score;
  const accuracy = b.correct * a.attempted - a.correct * b.attempted;
  if (accuracy !== 0) return accuracy;
  if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak;
  return a.recordedAt - b.recordedAt;
}
function normalizeEntries(source: unknown): readonly LeaderboardEntry[] {
  const byName = new Map<string, LeaderboardEntry>();
  if (!Array.isArray(source)) return Object.freeze([]);
  for (const rawEntry of source.slice(0, 50)) {
    const entry = validEntry(rawEntry); if (!entry) continue;
    const key = entry.name.toLowerCase();
    const previous = byName.get(key);
    if (!previous || order(entry, previous) < 0) byName.set(key, entry);
  }
  return Object.freeze([...byName.values()].sort(order).slice(0, 10));
}
export function readPlayerProfile(raw: string | null): PlayerProfile {
  if (!raw || raw.length > 24_000) return EMPTY_PROFILE;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return EMPTY_PROFILE;
    const obj = data as Record<string, unknown>;
    const name = typeof obj['name'] === 'string' ? sanitizePlayerName(obj['name']) : '';
    const rank = obj['lastKnownRank'];
    const rankAt = obj['lastKnownRankAt'];
    const gamesPlayed = obj['gamesPlayed'];
    return Object.freeze({
      name,
      leaderboard: normalizeEntries(obj['leaderboard']),
      sharedLeaderboard: normalizeEntries(obj['sharedLeaderboard']),
      lastKnownRank: typeof rank === 'number' && Number.isSafeInteger(rank) && rank >= 1 && rank <= 10 ? rank : null,
      lastKnownRankAt: typeof rankAt === 'number' && Number.isSafeInteger(rankAt) && rankAt >= 0 && rankAt <= MAX_TIME ? rankAt : null,
      gamesPlayed: typeof gamesPlayed === 'number' && Number.isSafeInteger(gamesPlayed) && gamesPlayed >= 0 && gamesPlayed <= 10_000_000 ? gamesPlayed : 0
    });
  } catch { return EMPTY_PROFILE; }
}
export function recordAdaptiveScore(profile: PlayerProfile, entry: LeaderboardEntry): PlayerProfile {
  const valid = validEntry(entry);
  if (!valid) return profile;
  const entries = [...profile.leaderboard];
  const key = valid.name.toLowerCase();
  const index = entries.findIndex(item => item.name.toLowerCase() === key);
  if (index >= 0) {
    if (order(valid, entries[index]!) < 0) entries[index] = valid;
  } else entries.push(valid);
  entries.sort(order);
  return Object.freeze({...profile, name: valid.name, leaderboard: Object.freeze(entries.slice(0, 10))});
}
export function recordSharedLeaderboard(profile: PlayerProfile, entries: unknown, rank: number | null, recordedAt = Date.now()): PlayerProfile {
  const sharedLeaderboard = normalizeEntries(entries);
  const lastKnownRank = typeof rank === 'number' && Number.isSafeInteger(rank) && rank >= 1 && rank <= 10 ? rank : null;
  const lastKnownRankAt = Number.isSafeInteger(recordedAt) && recordedAt >= 0 && recordedAt <= MAX_TIME ? recordedAt : null;
  return Object.freeze({...profile, sharedLeaderboard, lastKnownRank, lastKnownRankAt});
}
export function incrementGamesPlayed(profile: PlayerProfile): PlayerProfile {
  return Object.freeze({...profile, gamesPlayed: Math.min(10_000_000, profile.gamesPlayed + 1)});
}
export function leaderboardRank(entries: readonly LeaderboardEntry[], name: string): number | null {
  const key = sanitizePlayerName(name).toLowerCase();
  const index = entries.findIndex(entry => entry.name.toLowerCase() === key);
  return index < 0 ? null : index + 1;
}
export function localRank(profile: PlayerProfile, name: string): number | null {
  return leaderboardRank(profile.leaderboard, name);
}
