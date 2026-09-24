import { CATEGORY, CATEGORIES, TEMPLATES } from './games.js';
import { Random } from './random.js';
import { Category, CategoryStats, Mode, Outcome, Template } from './types.js';

const WARM_START: readonly Template[] = Object.freeze([
  'magnitude','odd','opposite','parity','position','sequence','vowels','closest',
  'ascending','initial','lastletter','duplicate','alphabet','prime','estimate','categorize'
]);

export class Director {
  readonly stats: CategoryStats = Object.fromEntries(CATEGORIES.map(c => [c, {attempts: 0, failures: 0}])) as CategoryStats;
  private recent: Template[] = [];
  private used = new Set<Template>();
  private lastFailed = false;
  private rememberOrdinal: number | null = null;
  private rememberTarget: number;
  private recallGap: number;
  constructor(private seed: string, private mode: Mode) {
    const schedule=new Random(`${seed}:memory-schedule`);
    this.rememberTarget=schedule.int(2,12);
    this.recallGap=schedule.int(2,7);
  }
  get usedTemplates(): readonly Template[] { return Object.freeze(TEMPLATES.filter(t => this.used.has(t))); }
  get remainingTemplates(): readonly Template[] { return Object.freeze(TEMPLATES.filter(t => !this.used.has(t))); }
  choose(ordinal: number): Template | null {
    const recallDue = this.rememberOrdinal !== null && !this.used.has('recall') && ordinal >= this.rememberOrdinal + this.recallGap + 1;
    if (recallDue) return this.remember('recall', ordinal);
    const forceRemember = !this.used.has('remember') && ordinal >= this.rememberTarget;
    if (forceRemember) return this.remember('remember', ordinal);

    let remaining = TEMPLATES.filter(t => !this.used.has(t) && t !== 'recall' && (this.used.has('remember') || t !== 'remember'));
    if (!remaining.length) return null;
    const rng = new Random(`${this.seed}:director:${ordinal}`);
    let pool = remaining;
    if (ordinal === 0) {
      const warm = pool.filter(t => WARM_START.includes(t));
      if (warm.length) pool = warm;
    }
    if (this.mode === 'adaptive' && this.lastFailed && ordinal > 0) {
      const easy = pool.filter(t => ['magnitude', 'server', 'odd', 'opposite', 'lettercount', 'vowels', 'middle', 'closest', 'initial', 'alphabet', 'estimate', 'categorize'].includes(t));
      if (easy.length) pool = easy;
    }
    const lastCategories = this.recent.slice(-3).map(t => CATEGORY[t]);
    if (lastCategories.length === 3 && new Set(lastCategories).size === 1) {
      const balanced = pool.filter(t => CATEGORY[t] !== lastCategories[0]);
      if (balanced.length) pool = balanced;
    }
    const target = this.mode === 'adaptive' ? this.target() : null;
    const weighted = pool.map(template => {
      const s = this.stats[CATEGORY[template]];
      const posterior = (s.failures + 1) / (s.attempts + 3);
      return {template, weight: this.mode === 'adaptive' ? 1 + 1.8 * posterior + (CATEGORY[template] === target ? 1.5 : 0) : 1};
    });
    let needle = rng.next() * weighted.reduce((a, b) => a + b.weight, 0);
    for (const x of weighted) { needle -= x.weight; if (needle <= 0) return this.remember(x.template, ordinal); }
    return this.remember(weighted[weighted.length - 1]!.template, ordinal);
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
  private remember(template: Template, ordinal: number): Template | null {
    if (this.used.has(template)) return null;
    this.used.add(template);
    if (template === 'remember') this.rememberOrdinal = ordinal;
    this.recent.push(template);
    if (this.recent.length > 5) this.recent.shift();
    return template;
  }
}
