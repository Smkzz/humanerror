import { Random } from './random.js';
import { Category, Kind, Option, Round, Template } from './types.js';
import { makeNovelCard, NOVEL_CATEGORY, NOVEL_TEMPLATES, NovelTemplate } from './novel.js';
import { makeV07Card, V07_CATEGORY, V07_TEMPLATES } from './v07.js';
import { OPPOSITES, WORDS } from './vocabulary.js';

const CORE_TEMPLATES: readonly Template[] = ['magnitude', 'odd', 'opposite', 'omit', 'longword', 'math', 'brakes', 'reaction', 'remember', 'recall', 'override', 'parity', 'server', 'position', 'lettercount', 'second', 'match', 'avoid', 'sequence', 'vowels', 'reverse', 'pairtotal', 'middle', 'notcontain', 'counter', 'closest', 'ascending', 'initial', 'lastletter', 'difference', 'duplicate', 'alphabet'];
export const TEMPLATES: readonly Template[] = Object.freeze([...CORE_TEMPLATES, ...NOVEL_TEMPLATES, ...V07_TEMPLATES]);
export const CATEGORIES: readonly Category[] = ['attention', 'reflex', 'words', 'numbers', 'memory'];
const CORE_CATEGORY_NAMES: readonly Category[] = ['attention','numbers','words','memory','reflex'];
const CORE_CATEGORY_CODES = '10222144332100210012212041122100';
const CORE_CATEGORY = Object.freeze(Object.fromEntries(CORE_TEMPLATES.map((t,i) => [t,CORE_CATEGORY_NAMES[+CORE_CATEGORY_CODES[i]!]!])) as Record<Template,Category>);
export const CATEGORY: Record<Template, Category> = {...CORE_CATEGORY,...NOVEL_CATEGORY,...V07_CATEGORY};
/** All content is generated from a fixed vocabulary. Exactly one correct option. */
export function makeRound(template: Template, seed: string, ordinal: number, id: string, memory: string | null, difficultyLevel=1+Math.min(3,Math.floor(ordinal/5))): Round {
  const rng = new Random(`${seed}:${ordinal}:${template}`);
  const level = Math.max(0,Math.min(3,Math.trunc(difficultyLevel)-1));
  const isV07=(V07_TEMPLATES as readonly Template[]).includes(template);
  if (isV07||(NOVEL_TEMPLATES as readonly Template[]).includes(template)) {
    const card=isV07?makeV07Card(template as (typeof V07_TEMPLATES)[number],rng,level+1):makeNovelCard(template as NovelTemplate,rng,level+1);
    const options=card.options.map((label,i)=>({id:String(i),label})),correct=String(card.options.indexOf(card.answer));
    return Object.freeze({id,template,category:card.category,kind:'choice',title:card.title,hint:card.hint,options:Object.freeze(options.map(option=>Object.freeze(option))),correct,expected:card.answer,explanation:card.explanation,duration:Math.max(2300,card.duration-level*180),cueDelay:0,symbol:false,alphabet:Object.freeze([]),memoryValue:null});
  }
  let kind: Kind = 'choice';
  let title = '', hint = '', correct = '', expected = '', explanation = '';
  let options: Option[] = [], alphabet: string[] = [], value: string | null = null;
  let duration = 3800 - level * 400, cueDelay = 0, symbol = false;
  const choices = (labels: readonly string[], answer: string): void => {
    if (labels.some(label => typeof label !== 'string' || label.length === 0)) throw new Error('Invalid visible option label');
    const unique = Array.from(new Set(labels));
    if (unique.length !== labels.length || !unique.includes(answer)) throw new Error('Ambiguous generated options');
    options = rng.shuffle(unique).map((label, i) => ({ id: String(i), label }));
    correct = options.find(o => o.label === answer)!.id;
    expected = answer;
  };
  const numericWrong = (answer: number, min = 0, max = Number.MAX_SAFE_INTEGER, step = 1): string[] => {
    const below=[1,2,3,4].map(k=>answer-k*step).filter(x=>x>=min),above=[1,2,3,4].map(k=>answer+k*step).filter(x=>x<=max),shapes:number[][]=[];
    if(above.length>=2)shapes.push(rng.shuffle(above).slice(0,2)); if(below.length>=2)shapes.push(rng.shuffle(below).slice(0,2)); if(above.length&&below.length)shapes.push([rng.pick(below),rng.pick(above)]);
    return rng.pick(shapes).map(String);
  };
  switch (CORE_TEMPLATES.indexOf(template)) {
    case 0: {
      const numbers = [rng.int(3, 15), rng.int(20, 42), rng.int(51, 90)];
      const biggest = rng.next() > .35;
      const answer = String(biggest ? Math.max(...numbers) : Math.min(...numbers));
      title = biggest ? 'BIGGEST NUMBER.' : 'SMALLEST NUMBER.';
      hint = 'One tap. You have absolutely got this.';
      choices(numbers.map(String), answer);

      break;
    }
    case 1: {
      const pair = rng.pick([['●', '○'], ['■', '□'], ['▲', '△'], ['◆', '◇'], ['★', '☆']] as const),hollowOdd=rng.next()<.5;
      const index = rng.int(0, 8),common=hollowOdd?pair[0]:pair[1],odd=hollowOdd?pair[1]:pair[0];
      title = 'FIND THE IMPOSTOR.'; hint = hollowOdd?'One shape is hollow.':'One shape is filled.'; symbol = true;
      options = Array.from({length: 9}, (_, i) => ({ id: String(i), label: i === index ? odd : common }));
      correct = String(index); expected = `Shape ${index + 1} (${hollowOdd?'hollow':'filled'})`;

      break;
    }
    case 2: {
      const pair = rng.pick(OPPOSITES);
      const index = rng.int(0, 1); const word = pair[index]!; const answer = pair[1 - index]!;
      title = `OPPOSITE OF ${word}.`; hint = 'Not the word you just read.';
      choices([word, answer, 'MAYBE'], answer);
      break;
    }
    case 3: {
      const word=rng.pick(WORDS.filter(w=>w.length>=5&&w.length<=10)),omit=rng.pick([...new Set(word)]);
      title = `${word} WITHOUT ${omit}.`; hint = 'Remove every copy. Type or tap letters, then send.'; kind = 'typing';
      correct = word.split('').filter(c => c !== omit).join(''); expected = correct;
      alphabet = Array.from(new Set(word.split(''))).sort(); duration = 5700 - level * 350;

      break;
    }
    case 4: {
      const words: string[] = [], lengths = new Set<number>();
      for (const word of rng.shuffle(WORDS.filter(w=>w.length>=3&&w.length<=10))) if (!lengths.has(word.length)) { words.push(word); lengths.add(word.length); if (words.length === 3) break; }
      const longest = rng.next() > .4;
      const sorted = [...words].sort((a, b) => a.length - b.length);
      const answer = longest ? sorted[2]! : sorted[0]!;
      title = longest ? 'LONGEST WORD.' : 'SHORTEST WORD.'; hint = 'Letter count. Not how important it sounds.';
      choices(words, answer);
      break;
    }
    case 5: {
      const a = rng.int(2, 10 + level * 10), b = rng.int(2, 10 + level * 5), result = a * b;
      title = `${a} × ${b} = ?`; hint = 'The calculator is on annual leave.'; duration += 450;
      choices([String(result), ...numericWrong(result,0,Number.MAX_SAFE_INTEGER,Math.max(1,Math.min(a,b)))], String(result));

      break;
    }
    case 6:
      title = 'DO NOT PRESS IT.'; hint = 'Let the bar empty. That button is a terrible idea.'; kind = 'wait';
      options=[{id:'press',label:`${rng.pick(['BONUS','DEPLOY','TRUST','FIX'])} ${rng.int(10,99)}`}];
      correct = '__wait__'; expected = 'Do nothing'; duration = 2200 - level * 160;
       break;
    case 7:
      title='WAIT FOR GO.';hint=rng.pick(['Hold for GO.','Wait for GO.','No early click.','GO only.']);kind='reaction';
      correct = 'go'; expected = 'Press after GO'; cueDelay = rng.int(650, 1100); duration = cueDelay + 1300 - level * 130;
      options = [{id: 'go', label: 'WAIT…'}];  break;
    case 8:
      title = 'SAVE THIS TO RAM.'; hint = 'No answer yet. I will ask you later.'; kind = 'memory'; value = String(rng.int(120, 989));
      correct = ''; expected = value; duration = 1800;  break;
    case 9: {
      if (!memory || !/^\d{3}$/.test(memory)) throw new Error('Memory recall requires a valid setup');
      title = 'WHAT WAS THE CODE?'; hint = 'Your RAM had one job.';
      const n=Number(memory),wrong=numericWrong(n,100,999,rng.int(7,31));
      choices([memory, ...wrong], memory);  break;
    }
    case 10:
      title = 'IGNORE THE NEXT ORDER.'; hint = 'Keep this rule. Do not press the button that appears.'; kind = 'override';
      correct='__wait__';expected='Ignore the bait';cueDelay=rng.int(850,1350);duration=cueDelay+2000;

      options=[{id:'press',label:rng.pick(['CLICK','PRESS','DO IT','OVERRIDE'])}];break;
    case 11: {
      const even = rng.next() > .5;
      const target = rng.int(6, 45) * 2 + (even ? 0 : 1);
      const offsets = rng.shuffle([1, 3, 5, 7, 9].filter(x => target - x > 0).flatMap(x => [-x, x])).slice(0, 2); const others = offsets.map(offset => target + offset);
      title = `FIND THE ${even ? 'EVEN' : 'ODD'} NUMBER.`; hint = 'Divisible by two. Or very much not.';
      choices([String(target), ...others.map(String)], String(target));  break;
    }
    case 12: {
      title = 'SAVE PRODUCTION.'; hint = 'Tap the server marked ON FIRE. Not the healthy ones.';
      const index=rng.int(0,2),services=rng.shuffle(['API','DATABASE','WEBSITE','CACHE','QUEUE','AUTH','SEARCH','WORKER']).slice(0,3);
      options=services.map((label,i)=>({id:String(i),label:`${label}\n${i===index?'ON FIRE':'HEALTHY'}`,icon:i===index?'fire':'server'}));
      correct=String(index);expected=options[index]!.label.replace('\n',' — ');
       break;
    }
    case 13: {
      const targetIndex = rng.int(0, 3);
      const names = ['LEFT', 'MIDDLE-LEFT', 'MIDDLE-RIGHT', 'RIGHT'] as const;
      const targetName = names[targetIndex]!;
      const labels = rng.shuffle(names);
      options = labels.map((label, i) => ({id: String(i), label}));
      correct = String(targetIndex); expected = `${targetName} button (${options[targetIndex]!.label})`;
      title = `PRESS THE ${targetName} BUTTON.`; hint = rng.pick(['Position, not the printed word.','Use the slot, ignore the label.']);

      break;
    }
    case 14: {
      const pool=WORDS.filter(w=>w.length>=4&&w.length<=11),wantRepeat=rng.next()<.5,pairs=pool.flatMap(word=>[...new Set(word)].filter(letter=>(word.split('').filter(c=>c===letter).length>=2)===wantRepeat).map(letter=>[word,letter] as const)),[word,letter]=rng.pick(pairs);
      const count = word.split('').filter(c => c === letter).length;
      title = `COUNT THE ${letter}'S.`; hint = `WORD: ${word}`; duration += 350;
      choices([String(count), ...numericWrong(count,0,9)], String(count));

      break;
    }
    case 15: {
      const numbers = rng.shuffle([rng.int(5, 18), rng.int(25, 38), rng.int(45, 58), rng.int(65, 88)]);
      const answer = [...numbers].sort((a, b) => b - a)[1]!;
      title = 'SECOND LARGEST.'; hint = 'Not first. That would be too convenient.';
      choices(numbers.map(String), String(answer));

      break;
    }
    case 16: {
      const words = rng.shuffle(WORDS.filter(w=>w.length>=4&&w.length<=8));
      const mutate = (word: string): string => word.slice(0, -1) + (word.endsWith('X') ? 'Z' : 'X');
      const exact = words[0]!;
      const answer = `${exact}\n${exact}`;
      title = 'WHICH PAIR MATCHES EXACTLY?'; hint = 'Almost is not a match.';
      choices([answer, `${words[1]}\n${mutate(words[1]!)}`, `${words[2]}\n${mutate(words[2]!)}`], answer);

      break;
    }
    case 18: {
      const start = rng.int(2, 12), step = rng.int(2, 7);
      const shown = [start, start + step, start + step * 2], answer = start + step * 3;
      title = 'WHAT COMES NEXT?'; hint = `${shown.join('  ·  ')}  ·  ?`;
      choices([String(answer), ...numericWrong(answer,0,Number.MAX_SAFE_INTEGER,step)], String(answer));

      break;
    }
    case 19: {
      const word = rng.pick(WORDS.filter(w=>w.length>=4&&w.length<=10));
      const count = [...word].filter(char => 'AEIOU'.includes(char)).length;
      title = 'COUNT THE VOWELS.'; hint = `WORD: ${word} · Count A, E, I, O, U`;
      choices([String(count), ...numericWrong(count,0,9)], String(count));

      break;
    }
    case 20: {
      const word = rng.pick(WORDS.filter(w=>w.length>=5&&w.length<=10));
      const answer = [...word].reverse().join('');
      title = `TYPE ${word} BACKWARDS.`; hint = 'Yes, every letter. No, the machine will not help.'; kind = 'typing';
      correct = answer; expected = answer; alphabet = Array.from(new Set(word.split(''))).sort(); duration = 6000 - level * 350;

      break;
    }
    case 21: {
      const target = rng.int(11, 99), a = rng.int(1, target - 1), b = target - a;
      const answer = `${a} + ${b}`;
      title = `WHICH PAIR MAKES ${target}?`; hint = 'Both numbers count. Sadly.';
      choices([answer, `${a} + ${b + 1}`, `${a + 2} + ${b}`], answer);

      break;
    }
    case 22: {
      const word=rng.pick(WORDS.filter(w=>w.length>=3&&w.length<=11&&w.length%2===1)),answer=word[Math.floor(word.length/2)]!,alternates=[...new Set(word)].filter(c=>c!==answer),pool=Array.from({length:26},(_,i)=>String.fromCharCode(65+i)).filter(c=>c!==answer&&!alternates.includes(c));
      while(alternates.length<2){const candidate=rng.pick(pool);if(!alternates.includes(candidate))alternates.push(candidate);}const [a,b]=rng.shuffle(alternates).slice(0,2) as [string,string];
      title = 'MIDDLE LETTER.'; hint = `WORD: ${word}`;
      choices([answer, a, b], answer);

      break;
    }
    case 23: {
      const letters=Array.from({length:26},(_,i)=>String.fromCharCode(65+i)),letter=rng.pick(letters.filter(c=>WORDS.some(w=>!w.includes(c))&&WORDS.filter(w=>w.includes(c)).length>=2)),safe=rng.pick(WORDS.filter(w=>!w.includes(letter))),traps=rng.shuffle(WORDS.filter(w=>w.includes(letter))).slice(0,2),[trapA,trapB]=traps as [string,string];
      title = `PICK THE WORD WITHOUT ${letter}.`; hint = 'One word is innocent.';
      choices([safe, trapA, trapB], safe);

      break;
    }
    case 24: {
      const taps=rng.int(2,12);
      title=`TAP ${taps} TIMES.`;hint=rng.pick(['Then press SEND.','Exact count, then SEND.','Count carefully, then SEND.','No bonus taps. Then SEND.']);kind='counter';
      correct = String(taps); expected = `${taps} taps`; options = [{id: 'tap', label: 'TAP'}]; duration = 5000 - level * 250;

      break;
    }
    case 25: {
      const target=rng.int(20,999),near=rng.int(1,4),answer=target+(rng.next()<.5?-near:near),farA=near+rng.int(3,6),farB=farA+rng.int(2,5),wrong=[target+(rng.next()<.5?-farA:farA),target+(rng.next()<.5?-farB:farB)];
      title=`CLOSEST TO ${target}.`;hint='Pick nearest.';
      choices([String(answer),...wrong.map(String)],String(answer));break;
    }
    case 26: {
      const a=rng.int(1,300),d1=rng.int(1,8),d2=rng.int(1,8),answer=`${a} < ${a+d1} < ${a+d1+d2}`;
      title='WHICH ORDER IS ASCENDING?';hint='Low to high.';
      choices([answer,`${a+5} < ${a+2} < ${a}`,`${a} < ${a+5} < ${a+2}`],answer);break;
    }
    case 27:
    case 28: {
      const first=template==='initial',safe=rng.pick(WORDS.filter(w=>w.length>=3&&w.length<=10)),letter=first?safe[0]!:safe[safe.length-1]!,wrong=rng.shuffle(WORDS.filter(w=>w!==safe&&(first?!w.startsWith(letter):!w.endsWith(letter)))).slice(0,2),[a,b]=wrong as [string,string];
      title=`${first?'STARTS':'ENDS'} WITH ${letter}.`;hint=first?'First letter.':'Last letter.';
      choices([safe,a,b],safe);break;
    }
    case 29: {
      const gap=rng.int(1,40),a=rng.int(10,999),answer=`${a} ↔ ${a+gap}`;
      title=`WHICH PAIR IS ${gap} APART?`;hint='Check the gap.';
      choices([answer,`${a} ↔ ${a+gap+1}`,`${a+1} ↔ ${a+gap+3}`],answer);break;
    }
    case 30: {
      const digit=rng.int(0,9),others=rng.shuffle(Array.from({length:10},(_,i)=>String(i)).filter(x=>Number(x)!==digit)).slice(0,2),repeated=rng.shuffle([String(digit),String(digit),...others]).join('');
      title='FIND THE REPEATED DIGIT CODE.';hint='One digit repeats.';
      let uniqueA=rng.shuffle(Array.from({length:10},(_,i)=>String(i))).slice(0,4).join(''),uniqueB=rng.shuffle(Array.from({length:10},(_,i)=>String(i))).slice(0,4).join('');while(uniqueA===uniqueB)uniqueB=rng.shuffle(Array.from({length:10},(_,i)=>String(i))).slice(0,4).join('');
      choices([repeated,uniqueA,uniqueB],repeated);break;
    }
    case 31: {
      const step=rng.int(1,4),start=rng.int(0,24-step*3),letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const shown=[letters[start]!,letters[start+step]!,letters[start+step*2]!],i=start+step*3,answer=letters[i]!,wrong=rng.shuffle([i-2,i-1,i+1,i+2].filter(x=>x>=0&&x<letters.length).map(x=>letters[x]!)).slice(0,2);
      title='NEXT LETTER.';hint=`${shown.join(' · ')} · ?`;
      choices([answer,...wrong],answer);break;
    }
    case 17: {
      const forbidden = rng.int(10, 999),offset=rng.int(1,9);
      const safe = forbidden + (rng.next()<.5 ? offset : -offset);
      const labels = rng.shuffle([String(forbidden), String(forbidden), String(safe)]);
      options = labels.map((label, i) => ({id: String(i), label}));
      correct = String(labels.findIndex(label => label !== String(forbidden))); expected = String(safe);
      title = `DO NOT PICK ${forbidden}.`; hint = 'Two buttons are bait. One is not.';

      break;
    }
  }
  explanation = expected ? `Answer: ${expected}.` : 'Noted.';
  const round: Round = {id, template, category: CATEGORY[template], kind, title, hint, options: Object.freeze(options.map(option => Object.freeze(option))), correct, expected, explanation, duration, cueDelay, symbol, alphabet: Object.freeze(alphabet), memoryValue: value};
  if (!title || !explanation || duration <= cueDelay) throw new Error('Invalid question contract');
  if (kind === 'choice' && options.filter(o => o.id === correct).length !== 1) throw new Error('Question must have exactly one correct option');
  return Object.freeze(round);
}
