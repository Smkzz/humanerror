/** Deterministic PRNG for reproducible decks. NOT suitable for secrets. */
export class Random {
  private state: number;
  constructor(seed: string) {
    let h = 2166136261;
    for (const char of seed) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
    this.state = h >>> 0;
  }
  next(): number {
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) throw new RangeError('Invalid random range');
    return min + Math.floor(this.next() * (max - min + 1));
  }
  pick<T>(items: readonly T[]): T {
    if (!items.length) throw new RangeError('Cannot pick an empty list');
    return items[this.int(0, items.length - 1)]!;
  }
  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy;
  }
}
