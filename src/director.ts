import { CATEGORY, CATEGORIES, OPENING } from './games.js';
import { Random } from './random.js';
import { Category, CategoryStats, Mode, Outcome, Template } from './types.js';

const POOL: readonly Template[] = ['magnitude', 'odd', 'opposite', 'omit', 'longword', 'math', 'brakes', 'reaction', 'override', 'parity', 'server', 'position', 'lettercount', 'second', 'match', 'avoid'];
export class Director {
  readonly stats: CategoryStats = Object.fromEntries(CATEGORIES.map(c => [c, {attempts: 0, failures: 0}])) as CategoryStats;
  private recent: Template[] = [];
  private lastFailed = false;
  constructor(private seed: string, private mode: Mode) {}
  choose(ordinal: number): Template {
    const opening = OPENING[ordinal];
    if (opening) return this.remember(opening);
    // The opening stores one code, then seeded variety gets three beats before recall.
    if (ordinal === 6) return this.remember('recall');
    // Later memory beats recur with a three-screen gap, but never enter the random pool.
    if (ordinal >= 17 && (ordinal - 17) % 14 === 0) return this.remember('remember');
    if (ordinal >= 20 && (ordinal - 20) % 14 === 0) return this.remember('recall');
    const rng = new Random(`${this.seed}:director:${ordinal}`);
    let pool = POOL.filter(t => !this.recent.slice(-2).includes(t));
    // Recovery beats prevent the director from trapping a player in their worst task.
    if (this.mode === 'adaptive' && this.lastFailed) pool = pool.filter(t => ['magnitude', 'server', 'odd', 'opposite', 'lettercount'].includes(t));
    const lastCategories = this.recent.slice(-3).map(t => CATEGORY[t]);
    if (lastCategories.length === 3 && new Set(lastCategories).size === 1) pool = pool.filter(t => CATEGORY[t] !== lastCategories[0]);
    const weighted = pool.map(template => {
      const s = this.stats[CATEGORY[template]];
      const posterior = (s.failures + 1) / (s.attempts + 3);
      return {template, weight: this.mode === 'adaptive' ? 1 + 1.8 * posterior : 1};
    });
    let needle = rng.next() * weighted.reduce((a, b) => a + b.weight, 0);
    for (const x of weighted) { needle -= x.weight; if (needle <= 0) return this.remember(x.template); }
    return this.remember(weighted[weighted.length - 1]!.template);
  }
  observe(category: Category, outcome: Outcome): void {
    if (!['correct', 'wrong', 'timeout'].includes(outcome)) return;
    const s = this.stats[category]; s.attempts++;
    this.lastFailed = outcome !== 'correct';
    if (this.lastFailed) s.failures++;
  }
  target(): Category | null {
    const eligible = CATEGORIES.filter(c => this.stats[c].attempts >= 2 && this.stats[c].failures > 0);
    eligible.sort((a, b) => this.rate(b) - this.rate(a));
    return eligible[0] ?? null;
  }
  private rate(c: Category): number { const s = this.stats[c]; return (s.failures + 1) / (s.attempts + 3); }
  private remember(template: Template): Template { this.recent.push(template); if (this.recent.length > 5) this.recent.shift(); return template; }
}
