// Recovered from the exact compiled v0.6 module after a bounded-edit truncation; behavior is covered by independent generator oracles.
// @ts-nocheck
import { Random } from './random.js';
import { Category } from './types.js';
import { ANALOGIES, CATEGORIES_OF_THINGS, COMPOUNDS, HOMOPHONES, RHYME_FAMILIES, WORDS } from './vocabulary.js';
export type NovelTemplate = 'mirror' | 'rotate' | 'loopcount' | 'overlap' | 'occlusion' | 'changegrid' | 'pathtrace' | 'components' | 'tilefit' | 'cubeface' | 'conflict' | 'ruleswitch' | 'ruleinfer' | 'errorcheck' | 'rulefollow' | 'queueorder' | 'stateupdate' | 'nback' | 'timeline' | 'elapsed' | 'beats' | 'prime' | 'factorpairs' | 'modthree' | 'fraction' | 'ratio' | 'estimate' | 'binary' | 'balance' | 'precedence' | 'unitrate' | 'chance' | 'roman' | 'mean' | 'perimeter' | 'anagram' | 'weave' | 'rhyme' | 'analogy' | 'compound' | 'caesar' | 'homophone' | 'categorize' | 'xor' | 'implication' | 'syllogism' | 'ordering' | 'setdiff' | 'counterexample' | 'sieve';
export interface NovelCard { readonly category: Category; readonly title: string; readonly hint: string; readonly answer: string; readonly options: readonly string[]; readonly explanation: string; readonly duration: number; }
export const NOVEL_GROUPS: Readonly<Record<Category, readonly NovelTemplate[]>> = {
    attention: ['mirror', 'rotate', 'loopcount', 'overlap', 'occlusion', 'changegrid', 'pathtrace', 'components', 'tilefit', 'cubeface', 'conflict', 'ruleswitch', 'ruleinfer', 'errorcheck', 'rulefollow', 'xor', 'implication', 'syllogism', 'ordering', 'setdiff', 'counterexample'],
    reflex: [],
    words: ['anagram', 'weave', 'rhyme', 'analogy', 'compound', 'caesar', 'homophone', 'categorize'],
    numbers: ['prime', 'factorpairs', 'modthree', 'fraction', 'ratio', 'estimate', 'binary', 'balance', 'precedence', 'unitrate', 'chance', 'roman', 'mean', 'perimeter', 'sieve'],
    memory: ['queueorder', 'stateupdate', 'nback', 'timeline', 'elapsed', 'beats']
};
export const NOVEL_TEMPLATES: readonly NovelTemplate[] = Object.freeze(Object.values(NOVEL_GROUPS).flat());
export const NOVEL_CATEGORY: Readonly<Record<NovelTemplate, Category>> = Object.freeze(Object.fromEntries(Object.entries(NOVEL_GROUPS).flatMap(([category, templates]) => templates.map(template => [template, category]))) as Record<NovelTemplate, Category>);
const DURATIONS: readonly number[] = Object.freeze([4700,4300,4000,4200,4300,4200,5000,4300,4500,4400,3900,4600,4800,4700,4500,4100,4500,4500,4500,4300,4700,4700,4500,3900,4300,4500,4800,4300,4200,4100,4600,4000,4700,4500,4100,4300,4600,4700,4700,4400,4300,4400,4300,4300,4800,4800,4600,4500,4700,4400]);
export function makeNovelCard(template: NovelTemplate, rng: Random, difficultyLevel = 1): NovelCard {
    const category = NOVEL_CATEGORY[template];
    if (!category)
        throw new Error(`Unknown novel template: ${template}`);
    const card = (t: string, h: string, yes: string, no: readonly string[], duration?: number): NovelCard => {
        const options = rng.shuffle([yes, ...no]);
        if (new Set(options).size !== 3)
            throw new Error(`Ambiguous generated options: ${template}`);
        return Object.freeze({ category, title: t, hint: h, answer: yes, options: Object.freeze(options), explanation: `Answer: ${yes}.`, duration: duration ?? DURATIONS[NOVEL_TEMPLATES.indexOf(template)] ?? 4200 });
    };
    const n = (lo: number, hi: number): number => rng.int(lo, hi);
    const numericWrong = (answer: number, min = 0, max = Number.MAX_SAFE_INTEGER, step = 1): string[] => {
        const below=[1,2,3,4].map(k=>answer-k*step).filter(x=>x>=min),above=[1,2,3,4].map(k=>answer+k*step).filter(x=>x<=max),shapes:number[][]=[];
        if(above.length>=2)shapes.push(rng.shuffle(above).slice(0,2)); if(below.length>=2)shapes.push(rng.shuffle(below).slice(0,2)); if(above.length&&below.length)shapes.push([rng.pick(below),rng.pick(above)]);
        return rng.pick(shapes).map(String);
    };
    const words = WORDS.filter(word => word.length >= 3 && word.length <= 10);
    switch (NOVEL_TEMPLATES.indexOf(template)) {
        case 0: {
            let g = '', m = '', v = '';
            do {
                g = Array.from({ length: 9 }, () => rng.next() < .45 ? '#' : '.').join('');
                m = [...g.slice(0, 3)].reverse().join('') + [...g.slice(3, 6)].reverse().join('') + [...g.slice(6)].reverse().join('');
                v = g.slice(6) + g.slice(3, 6) + g.slice(0, 3);
            } while (m === g || v === g || m === v);
            return card('MIRROR LEFT ↔ RIGHT.', `Grid: ${g.slice(0, 3)} / ${g.slice(3, 6)} / ${g.slice(6)}`, m, [g, v]);
        }
        case 1: {
            const g = [n(1, 9), n(10, 19), n(20, 29), n(30, 39)];
            const cw = `${g[2]} ${g[0]} / ${g[3]} ${g[1]}`, ccw = `${g[1]} ${g[3]} / ${g[0]} ${g[2]}`, orig = `${g[0]} ${g[1]} / ${g[2]} ${g[3]}`;
            return card('ROTATE THE TILE CLOCKWISE.', `Tile: ${orig}`, cw, [ccw, orig]);
        }
        case 2: {
            let code = '', count = 0;
            do {
                code = Array.from({ length: 4 }, () => rng.pick(['0', '1', '2', '3', '5', '6', '8', '9'])).join('');
                count = [...code].reduce((s, d) => s + (d === '8' ? 2 : '069'.includes(d) ? 1 : 0), 0);
            } while (!count);
            return card('COUNT ENCLOSED LOOPS.', `Digits: ${code}`, String(count), numericWrong(count,0,8));
        }
        case 3: {
            const pool = rng.shuffle([...`ABCDEFGH`]), shared = pool.slice(0, 2), onlyA = pool.slice(2, 4), onlyB = pool.slice(4, 6), left = rng.shuffle([...shared, ...onlyA]), right = rng.shuffle([...shared, ...onlyB]);
            const answer = shared.slice().sort().join(''), wrongA = onlyA.slice().sort().join(''), wrongB = onlyB.slice().sort().join('');
            return card('KEEP ONLY SHARED SYMBOLS.', `Set A: ${left.join('')} · Set B: ${right.join('')}`, answer, [wrongA, wrongB]);
        }
        case 4: {
            const order = rng.shuffle(['A', 'B', 'C', 'D', 'E', 'F']).slice(0,3);
            const front = order[0], mid = order[1], back = order[2];
            return card('WHICH OBJECT IS BEHIND BOTH?', `Layer order, front → back: ${front} > ${mid} > ${back}`, back, [front, mid]);
        }
        case 5: {
            const before = Array.from({ length: 5 }, () => rng.pick(['A', 'B', 'C', 'D']));
            const after = before.slice();
            const at = n(0, 4);
            const old = before[at];
            after[at] = ['A', 'B', 'C', 'D'].find(x => x !== old);
            const x = before.join(''), y = after.join('');
            const picks = rng.shuffle([String(at + 1), ...Array.from({ length: 4 }, (_, i) => String(i + 1)).filter(i => i !== String(at + 1))]).slice(0, 3);
            return card('FIND THE CHANGED CELL.', `Before ${x} · After ${y} · Position?`, String(at + 1), picks.filter(i => i !== String(at + 1)).slice(0, 2));
        }
        case 6: {
            let x = n(1, 4), y = n(1, 4), moves = '';
            const sx = x, sy = y;
            const dirs = [['N', 0, -1], ['E', 1, 0], ['S', 0, 1], ['W', -1, 0]];
            for (let i = 0; i < 4; i++) {
                const fits = dirs.filter(([, dx, dy]) => x + dx >= 1 && x + dx <= 4 && y + dy >= 1 && y + dy <= 4);
                const [d, dx, dy] = rng.pick(fits);
                moves += d;
                x += dx;
                y += dy;
            }
            const pos = `${'ABCD'[x - 1]}${y}`, others = [`${'ABCD'[(x + 1) % 4]}${y}`, `${'ABCD'[x - 1]}${y % 4 + 1}`];
            return card('TRACE THE PATH.', `Grid columns A–D left→right; rows 1–4 top→bottom · Start ${'ABCD'[sx - 1]}${sy} · Moves ${moves} (N moves toward row 1)`, pos, others);
        }
        case 7: {
            let rows=[],count=0;
            do {
                rows=Array.from({length:4},()=>Array.from({length:4},()=>rng.next()<.38?'#':'.').join(''));
                const seen=new Set();count=0;
                for(let y=0;y<4;y++)for(let x=0;x<4;x++){const k=y*4+x;if(rows[y][x]!=='#'||seen.has(k))continue;count++;const q=[k];seen.add(k);while(q.length){const p=q.pop(),px=p%4,py=Math.floor(p/4);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=px+dx,ny=py+dy,j=ny*4+nx;if(nx>=0&&nx<4&&ny>=0&&ny<4&&rows[ny][nx]==='#'&&!seen.has(j)){seen.add(j);q.push(j);}}}}
            }while(count<2||count>4);
            const grid=rows.join(' / ');
            return card('COUNT EDGE-CONNECTED PATCHES.', `Grid (# = filled cell): ${grid}`, String(count), numericWrong(count,0,8));
        }
        case 8: {
            const [a0, b0, c0] = rng.shuffle(['A', 'B', 'C', 'D', 'E', 'F']).slice(0,3);
            return card('COMPLETE THE TILE GRID.', `Rows ${a0}${b0}${c0} / ${b0}${c0}${a0} / ${c0}${a0}?`, b0, [a0, c0]);
        }
        case 9: {
            const [a, b, c, d, e, f] = rng.shuffle(['A', 'B', 'C', 'D', 'E', 'F']);
            return card('FOLD THE CUBE NET.', `Net: ${a} above ${c} · ${b}-${c}-${d}-${e} in a row · ${f} below ${c} · Opposite ${c}?`, e, [a, b]);
        }
        case 10: {
            const dirs=[['LEFT','←'],['RIGHT','→'],['UP','↑'],['DOWN','↓']],word=rng.pick(dirs.map(x=>x[0])),[answer,arrow]=rng.pick(dirs);
            return card('FOLLOW THE ARROW, IGNORE THE WORD.', `Word ${word} · Arrow ${arrow}`, answer, dirs.map(x=>x[0]).filter(x=>x!==answer).slice(0,2));
        }
        case 11: {
            const cue = rng.pick(['A', 'B']), nums = rng.shuffle([n(11, 29), n(31, 49), n(51, 69)]), answer = cue === 'A' ? Math.min(...nums) : Math.max(...nums);
            return card(`RULE ${cue}: ${cue === 'A' ? 'LOW' : 'HIGH'}.`, `${cue === 'A' ? 'A = lowest' : 'B = highest'} · Numbers ${nums.join(' / ')}`, String(answer), nums.filter(x => x !== answer).map(String));
        }
        case 12: {
            const op = rng.pick([2, 3, 4]), x = n(2, 7), samples = [x, x + 1, x + 2].map(k => `${k}→${k * op}`).join('  '), value = (x + 3) * op, answer = String(value);
            return card('INFER THE MAPPING.', `${samples} · ${x + 3}→?`, answer, numericWrong(value,0));
        }
        case 13: {
            const parity = rng.pick(['EVEN', 'ODD']), base = n(10, 40) * 2, good = parity === 'EVEN' ? [base, base + 2] : [base + 1, base + 3], bad = parity === 'EVEN' ? base + (rng.next()<.5?-1:3) : base + (rng.next()<.5?0:4);
            const rows = rng.shuffle([String(good[0]), String(good[1]), String(bad)]), answer = String(bad);
            return card(`RULE: VALUES MUST BE ${parity}. FIND THE ERROR.`, `Values: ${rows.join(' · ')}`, answer, rows.filter(x => x !== answer));
        }
        case 14: {
            const x = n(1, 9), y = n(1, 9), cue = rng.pick(['SUM', 'PRODUCT']), z = cue === 'SUM' ? x + y : x * y;
            return card(`APPLY ${cue}, THEN ADD 1.`, `Values ${x} and ${y}`, String(z + 1), numericWrong(z+1,0));
        }
        case 44: {
            const q = rng.shuffle(['A', 'B', 'C', 'D']), first = q[0], last = q[3], start = q.join(' ');
            q[0] = last;
            q[3] = first;
            const c = q.indexOf('C');
            q.splice(c, 1);
            q.unshift('C');
            const answer = q.join(' ');
            const d1 = answer.split(' '), d2 = answer.split(' ');
            [d1[0], d1[1]] = [d1[1], d1[0]];
            [d2[2], d2[3]] = [d2[3], d2[2]];
            return card('UPDATE THE QUEUE.', `Start ${start} · Swap ends · Move C to front`, answer, [d1.join(' '), d2.join(' ')]);
        }
        case 45: {
            const s = n(2, 8), a = n(2, 5), b = n(2, 4), sign = rng.pick(['+', '-']), final = sign === '+' ? s + a + b : s + a - b;
            return card('UPDATE THE RUNNING TOTAL.', `Start ${s} · +${a} · ${sign}${b}`, String(final), numericWrong(final,0));
        }
        case 46: {
            const seq = Array.from({ length: 5 }, () => rng.pick(['A', 'B', 'C', 'D']));
            while (seq[4] === seq[2]) seq[4] = rng.pick(['A', 'B', 'C', 'D']);
            const answer = seq[2];
            return card('TWO-BACK CHECK.', `Sequence ${seq.join(' · ')} · What was two places before the last?`, answer, ['A', 'B', 'C', 'D'].filter(x => x !== answer).slice(0, 2));
        }
        case 47: {
            const values = rng.shuffle([n(1, 15), n(20, 35), n(40, 55)]), times = [['A', values[0]], ['B', values[1]], ['C', values[2]]];
            const answer = [...times].sort((a, b) => a[1] - b[1])[1][0];
            return card('WHICH EVENT HAPPENED SECOND?', `Elapsed minutes: ${times.map(([id, t]) => `${id}=${t}`).join(' · ')}`, answer, ['A', 'B', 'C'].filter(x => x !== answer));
        }
        case 48: {
            const start = n(0, 22) * 60 + n(0, 59), span = n(20, 180), end = (start + span) % 1440, fmt = (v) => `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
            return card('ELAPSED MINUTES?', `From ${fmt(start)} to ${fmt(end)} (same day unless midnight passes)`, String(span), numericWrong(span,0,240,5));
        }
        case 49: {
            const gaps = [n(150, 200), n(300, 350), n(220, 250)], starts = [0, gaps[0], gaps[0] + gaps[1], gaps.reduce((a, b) => a + b, 0)];
            return card('WHICH GAP IS LONGEST?', `Beat times (ms): ${starts.join(' · ')}`, String(gaps[1]), numericWrong(gaps[1],100,500,25));
        }
        case 29: {
            const primes = Array.from({ length: 189 }, (_, i) => i + 11).filter(x => Array.from({ length: Math.floor(Math.sqrt(x)) - 1 }, (_, i) => i + 2).every(d => x % d !== 0));
            const p = rng.pick(primes), wrong = rng.shuffle(Array.from({length:31},(_,i)=>p-15+i).filter(x=>x>=11&&x<=199&&x!==p&&!primes.includes(x))).slice(0,2);
            return card('WHICH NUMBER IS PRIME?', `Candidates: ${rng.shuffle([p,...wrong]).join(' · ')}`, String(p), wrong.map(String),5200);
        }
        case 30: {
            const x = n(24, [80,110,145,180][Math.max(0,Math.min(3,difficultyLevel-1))]); let pairs = 0;
            for (let i = 1; i * i <= x; i++) if (x % i === 0) pairs++;
            return card(`FACTOR PAIRS OF ${x}.`, `Count positive unordered factor pairs; count a×b and b×a once.`, String(pairs), numericWrong(pairs,0,12),5800);
        }
        case 31: {
            const x = n(111, 899), answer = String(x % 3);
            return card(`REMAINDER AFTER DIVIDING BY 3.`, `Number ${x}`, answer, [String((x + 1) % 3), String((x + 2) % 3)]);
        }
        case 32: {
            const fractions: Array<{ text: string; numerator: number; denominator: number }> = [];
            while (fractions.length < 3) {
                const denominator = n(2, 20), numerator = n(1, denominator - 1), value = numerator / denominator;
                if (fractions.some(x => x.numerator / x.denominator === value)) continue;
                fractions.push({ text: `${numerator}/${denominator}`, numerator, denominator });
            }
            const values = rng.shuffle(fractions), largest = fractions.reduce((best, x) => x.numerator / x.denominator > best.numerator / best.denominator ? x : best);
            return card('PICK THE LARGEST FRACTION.', values.map(x => x.text).join('  ·  '), largest.text, fractions.filter(x => x !== largest).map(x => x.text));
        }
        case 33: {
            const a = n(2, 19), b = n(2, 19), mult = n(2, 12), answer = `${a * mult}:${b * mult}`;
            return card('CHOOSE THE EQUIVALENT RATIO.', `Base ratio  ${a}:${b}`, answer, [`${a + 1}:${b}`, `${a * mult}:${b}`]);
        }
        case 34: {
            const raw = n(101, 899), x = raw % 10 === 5 ? raw + 1 : raw, near = Math.round(x / 10) * 10;
            return card('ROUND TO THE NEAREST TEN.', `Number ${x}`, String(near), numericWrong(near,0,1000,10));
        }
        case 35: {
            const bitCount = difficultyLevel <= 2 ? 6 : 8, bits = Array.from({ length: bitCount }, () => rng.pick(['0', '1'])).join(''), value = parseInt(bits, 2),wrong=rng.shuffle([...new Set([value-2,value-1,value+1,value+2].filter(x=>x>=0&&x!==value))]).slice(0,2).map(String);
            return card('DECODE THE BINARY NUMBER.', `Binary ${bits}`, String(value), wrong,5200);
        }
        case 36: {
            const x = n(2, 12), a = n(2, 9), sign = rng.pick(['+', '-']), total = sign === '+' ? x + a : x - a;
            return card(`SOLVE: X ${sign} ${a} = ${total}.`, 'Keep both sides balanced.', String(x), numericWrong(x,0,30));
        }
        case 37: {
            const a0 = n(2, 6), b0 = n(2, 5), c0 = n(2, 4), value = a0 + b0 * c0;
            const common=(a0+b0)*c0,other=rng.pick(numericWrong(value,0).map(Number).filter(x=>x!==common));return card('FOLLOW OPERATOR PRECEDENCE.', `Compute ${a0} + ${b0} × ${c0}`, String(value), [String(common), String(other)]);
        }
        case 38: {
            const rate = n(3, 12), hours = n(2, 5), distance = rate * hours;
            return card('DISTANCE PER HOUR.', `${distance} km in ${hours} hours`, String(rate), numericWrong(rate,0,30));
        }
        case 39: {
            const red = n(1, 50); let blue = n(1, 50); while (blue === red) blue = n(1, 50); const total = red + blue, answer = `${red}/${total}`;
            return card('PROBABILITY OF RED?', `Bag: ${red} red + ${blue} blue`, answer, [`${blue}/${total}`, `${red}/${total + 1}`]);
        }
        case 40: {
            const x = n(1, 399), toRoman = (v) => { let out = ''; for (const [value, symbol] of [[100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']])
                while (v >= value) {
                    out += symbol;
                    v -= value;
                } return out; };
            const numeral = toRoman(x);
            return card('DECODE THE ROMAN NUMERAL.', `${numeral} · I=1 V=5 X=10 L=50 C=100`, String(x), numericWrong(x,1,420),5200);
        }
        case 41: {
            let values: number[];
            do { const base = n(10, 99), a = n(-20, 20), b = n(-20, 20); values = [base + a, base + b, base - a - b]; } while (values.some(x => x < 1 || x > 150));
            const answer = values.reduce((sum, x) => sum + x, 0) / values.length;
            return card('FIND THE MEAN.', `Values ${values.join(', ')}`, String(answer), numericWrong(answer,0,160));
        }
        case 42: {
            const x = n(2, 12), y = n(2, 9), answer = 2 * (x + y);
            const wrong=rng.shuffle([answer-8,answer-4,answer+4,answer+8].filter(v=>v>0&&v!==answer)).slice(0,2).map(String);return card('RECTANGLE PERIMETER.', `Length ${x} · Width ${y}`, String(answer), wrong);
        }
        case 21: {
            const word = rng.pick(words.filter(w=>w.length>=5&&w.length<=6&&new Set(w).size>=3)), scrambled = rng.shuffle([...word]).join(''), wrong=[];
            while(wrong.length<2){const candidate=rng.pick(words.filter(w=>w.length===word.length&&[...w].sort().join('')!==[...scrambled].sort().join('')));if(!wrong.includes(candidate))wrong.push(candidate);}
            return card('UNSCRAMBLE THE LETTERS.', scrambled, word, wrong);
        }
        case 22: {
            const left = rng.shuffle(['A', 'B', 'C', 'D', 'E', 'F']).slice(0, 4).join(''), right = rng.shuffle(['1', '2', '3', '4', '5', '6']).slice(0, 4).join(''), answer = [...left].map((x, i) => x + right[i]).join('');
            const d1 = answer.slice(0, -2) + answer[answer.length - 1] + answer[answer.length - 2], d2 = [...right].map((x, i) => x + left[i]).join('');
            return card('INTERLEAVE THE TWO STRINGS.', `First ${left} · Second ${right}`, answer, [d1, d2]);
        }
        case 23: {
            const family=rng.pick(RHYME_FAMILIES),target=rng.pick(family),yes=rng.pick(family.filter(w=>w!==target)),wrong=rng.shuffle(RHYME_FAMILIES.filter(x=>x!==family).flat()).slice(0,2);
            return card(`WHICH WORD RHYMES WITH ${target}?`, 'Match the ending sound.', yes, wrong);
        }
        case 24: {
            const [a0,b0,c0,d0]=rng.pick(ANALOGIES),wrong=rng.shuffle([...new Set(ANALOGIES.filter(x=>x[3]!==d0).map(x=>x[3]))]).slice(0,2);
            return card(`${a0} : ${b0} :: ${c0} : ?`, 'Complete the same relationship.', d0, wrong);
        }
        case 25: {
            const [x,y,yes]=rng.pick(COMPOUNDS),wrong=rng.shuffle(COMPOUNDS.filter(c=>c[2]!==yes).map(c=>c[2])).slice(0,2);
            return card('JOIN BOTH PARTS INTO ONE WORD.', `Part 1 ${x} · Part 2 ${y}`, yes, wrong);
        }
        case 26: {
            const word = rng.pick(words.filter(w=>w.length>=3&&w.length<=8)), shift = n(1, 7), code = [...word].map(ch => String.fromCharCode(65 + (ch.charCodeAt(0) - 65 + shift) % 26)).join(''),wrong=[];
            while(wrong.length<2){const i=n(0,word.length-1),c=String.fromCharCode(65+n(0,25)),candidate=[...word].map((x,j)=>j===i?c:x).join('');if(candidate!==word&&!wrong.includes(candidate))wrong.push(candidate);}
            return card(`DECODE SHIFT −${shift}.`, code, word, wrong);
        }
        case 27: {
            const [sentence,yes,no1,no2]=rng.pick(HOMOPHONES);
            return card('CHOOSE THE WORD THAT FITS THE MEANING.', sentence, yes, [no1, no2]);
        }
        case 28: {
            const categories=Object.keys(CATEGORIES_OF_THINGS),category=rng.pick(categories),yes=rng.pick(CATEGORIES_OF_THINGS[category]),other=categories.filter(c=>c!==category).flatMap(c=>CATEGORIES_OF_THINGS[c]),wrong=rng.shuffle(other).slice(0,2);
            return card(`WHICH IS A ${category}?`, 'Choose the item in that category.', yes, wrong);
        }
        case 15: {
            const [a,b]=rng.shuffle(words).slice(0,2),x=!!n(0,1),y=!!n(0,1),answer=String(x!==y);
            return card('EXACTLY ONE STATEMENT IS TRUE.', `${a} is ${x} · ${b} is ${y}`, answer.toUpperCase(), ['TRUE','FALSE','CANNOT TELL'].filter(v=>v!==answer.toUpperCase()).slice(0,2));
        }
        case 16: {
            const [pName,qName]=rng.shuffle(words).slice(0,2),wantTrue=rng.next()<.5,[p,q]=wantTrue?rng.pick([[false,false],[false,true],[true,true]] as const):[true,false],answer=String(!p||q);
            return card(`IF ${pName}, THEN ${qName}. IS THE RULE TRUE?`, `${pName} is ${p} · ${qName} is ${q}`, answer.toUpperCase(), ['TRUE','FALSE','CANNOT TELL'].filter(v=>v!==answer.toUpperCase()).slice(0,2));
        }
        case 17: {
            const names=rng.shuffle(['ZOR','MIP','TAV','LUX','NER','VEX']),a=names[0],b=names[1],c=names[2],other=names[3],linked=rng.next()<.5,second=linked?b:other,answer=linked?'YES':'CANNOT INFER';
            return card('USING ONLY THESE TWO FACTS.', `All ${a} are ${b}. All ${second} are ${c}. Are all ${a} ${c}?`, answer, linked?['NO','CANNOT INFER']:['YES','NO']);
        }
        case 18: {
            const [a, b, c, d] = rng.shuffle(['A', 'B', 'C', 'D']), answer = c;
            return card('WHO MUST BE LAST?', `${a} before ${b} · ${b} before ${c} · ${d} before ${a}`, answer, [a, b]);
        }
        case 19: {
            const pool = rng.shuffle([...'ABCDEFGH']), A = pool.slice(0, 5).sort().join(''), shared = pool.slice(1, 3), B = [...shared, ...pool.slice(5, 7)].sort().join(''), answer = [...A].filter(x => !B.includes(x)).join(''),bOnly=[...B].filter(x=>!A.includes(x)),wrong2=[...answer.slice(1),bOnly[0]].sort().join('');
            return card('A MINUS B: KEEP A-ONLY SYMBOLS.', `A ${A} · B ${B} · Order does not matter`, answer, [B, wrong2]);
        }
        case 20: {
            const x = n(101, 999),odd = x % 2 ? x : x + 1,evens=rng.shuffle([-7,-5,-3,-1,1,3,5,7].map(d=>odd+d).filter(v=>v>0&&v%2===0)).slice(0,2);
            return card('DISPROVE: “EVERY CODE IS EVEN.”', 'Choose one odd counterexample.', String(odd), evens.map(String));
        }
        case 43: {
            const target = n(2, 298) * 6 + 3,even=target+(rng.next()<.5?-3:3),odd=target+(rng.next()<.5?-2:2),wrong=[even,odd];
            return card('KEEP ODD MULTIPLES OF THREE.', `Candidates: ${rng.shuffle([target,...wrong]).join(' · ')}`, String(target), wrong.map(String));
        }
    }
    throw new Error(`Missing novel generator: ${template}`);
}
