export type Category = 'attention' | 'reflex' | 'words' | 'numbers' | 'memory';
export type Mode = 'adaptive' | 'challenge' | 'practice';
export type Template = 'magnitude' | 'odd' | 'opposite' | 'omit' | 'longword' | 'math' | 'brakes' | 'reaction' | 'remember' | 'recall' | 'override' | 'parity' | 'server' | 'position' | 'lettercount' | 'second' | 'match' | 'avoid';
export type Kind = 'choice' | 'typing' | 'wait' | 'reaction' | 'memory' | 'override';
export type Outcome = 'correct' | 'wrong' | 'timeout' | 'observed' | 'cancelled';
export type Phase = 'ready' | 'arming' | 'active' | 'feedback' | 'finished';
export interface Option { readonly id: string; readonly label: string; readonly icon?: string; }
export interface Round {
  readonly id: string;
  readonly template: Template;
  readonly category: Category;
  readonly kind: Kind;
  readonly title: string;
  readonly hint: string;
  readonly options: readonly Option[];
  readonly correct: string;
  readonly expected: string;
  readonly explanation: string;
  readonly duration: number;
  readonly cueDelay: number;
  readonly symbol: boolean;
  readonly alphabet: readonly string[];
  readonly memoryValue: string | null;
}
export interface Receipt {
  readonly id: string;
  readonly template: Template;
  readonly category: Category;
  readonly prompt: string;
  readonly expected: string;
  readonly submitted: string | null;
  readonly explanation: string;
  readonly outcome: Outcome;
  readonly responseMs: number;
  readonly scoreDelta: number;
  readonly streak: number;
  readonly multiplier: number;
}
export interface Stat { attempts: number; failures: number; }
export type CategoryStats = Record<Category, Stat>;
export interface Summary {
  readonly correct: number;
  readonly attempted: number;
  readonly wrong: number;
  readonly observed: number;
  readonly cancelled: number;
  readonly accuracy: number | null;
  readonly score: number;
  readonly bestStreak: number;
}
