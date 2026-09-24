export type Category = 'attention' | 'reflex' | 'words' | 'numbers' | 'memory';
export type Mode = 'adaptive' | 'challenge' | 'practice';
type ExistingTemplate = 'magnitude' | 'odd' | 'opposite' | 'omit' | 'longword' | 'math' | 'brakes' | 'reaction' | 'remember' | 'recall' | 'override' | 'parity' | 'server' | 'position' | 'lettercount' | 'second' | 'match' | 'avoid' | 'sequence' | 'vowels' | 'reverse' | 'pairtotal' | 'middle' | 'notcontain' | 'counter' | 'closest' | 'ascending' | 'initial' | 'lastletter' | 'difference' | 'duplicate' | 'alphabet' | 'mirror' | 'rotate' | 'loopcount' | 'overlap' | 'occlusion' | 'changegrid' | 'pathtrace' | 'components' | 'tilefit' | 'cubeface' | 'conflict' | 'ruleswitch' | 'ruleinfer' | 'errorcheck' | 'rulefollow' | 'queueorder' | 'stateupdate' | 'nback' | 'timeline' | 'elapsed' | 'beats' | 'sieve' | 'prime' | 'factorpairs' | 'modthree' | 'fraction' | 'ratio' | 'estimate' | 'binary' | 'balance' | 'precedence' | 'unitrate' | 'chance' | 'roman' | 'mean' | 'perimeter' | 'anagram' | 'weave' | 'rhyme' | 'analogy' | 'compound' | 'caesar' | 'homophone' | 'categorize' | 'xor' | 'implication' | 'syllogism' | 'ordering' | 'setdiff' | 'counterexample';
export type V07Template = 'raysight' | 'knightmove' | 'taxicab' | 'foldpaper' | 'stackview' | 'griddegree' | 'routeplan' | 'linecross' | 'orientation' | 'focusfilter' | 'gcd' | 'lcm' | 'percent' | 'square' | 'calendar' | 'clockangle' | 'area' | 'combinations' | 'unitconvert' | 'fractionadd' | 'signedcompare' | 'weightedmean' | 'consecutive' | 'palindrome' | 'wordladder' | 'alphabetize' | 'homograph' | 'phraseorder' | 'editdistance' | 'letterpairs' | 'acronym' | 'subsequence' | 'letterpattern' | 'codebreak' | 'assignment' | 'decisiontree' | 'causalorder' | 'setcover' | 'scheduling' | 'stateflow' | 'reachability' | 'dualtrack' | 'visualtracking' | 'suppressrepeat' | 'stopsignal' | 'taskshift' | 'crossmonitor' | 'keymap' | 'partition' | 'interval';
export type Template = ExistingTemplate | V07Template;
export type Kind = 'choice' | 'typing' | 'wait' | 'reaction' | 'memory' | 'override' | 'counter';
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
