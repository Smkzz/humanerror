import { Random } from './random.js';
import { Category, Kind, Option, Round, Template } from './types.js';

export const TEMPLATES: readonly Template[] = ['magnitude', 'odd', 'opposite', 'omit', 'longword', 'math', 'brakes', 'reaction', 'remember', 'recall', 'override', 'parity', 'server', 'position', 'lettercount', 'second', 'match', 'avoid'];
export const CATEGORIES: readonly Category[] = ['attention', 'reflex', 'words', 'numbers', 'memory'];
export const CATEGORY: Record<Template, Category> = {
  magnitude: 'numbers', odd: 'attention', opposite: 'words', omit: 'words', longword: 'words', math: 'numbers',
  brakes: 'reflex', reaction: 'reflex', remember: 'memory', recall: 'memory', override: 'words', parity: 'numbers', server: 'attention',
  position: 'attention', lettercount: 'words', second: 'numbers', match: 'attention', avoid: 'attention'
};
/** Three readable onboarding beats; seeded variety begins immediately after these. */
export const OPENING: readonly Template[] = ['magnitude', 'brakes', 'remember'];

/** All content is generated from a fixed vocabulary. Exactly one correct option. */
export function makeRound(template: Template, seed: string, ordinal: number, id: string, memory: string | null): Round {
  const rng = new Random(`${seed}:${ordinal}:${template}`);
  const level = Math.min(3, Math.floor(ordinal / 5));
  let kind: Kind = 'choice';
  let title = '', hint = '', correct = '', expected = '', explanation = '';
  let options: Option[] = [], alphabet: string[] = [], value: string | null = null;
  let duration = 3800 - level * 400, cueDelay = 0, symbol = false;
  const choices = (labels: readonly string[], answer: string): void => {
    const unique = Array.from(new Set(labels));
    if (unique.length !== labels.length || !unique.includes(answer)) throw new Error('Ambiguous generated options');
    options = rng.shuffle(unique).map((label, i) => ({ id: String(i), label }));
    correct = options.find(o => o.label === answer)!.id;
    expected = answer;
  };
  switch (template) {
    case 'magnitude': {
      const numbers = [rng.int(3, 15), rng.int(20, 42), rng.int(51, 90)];
      const biggest = rng.next() > .35;
      const answer = String(biggest ? Math.max(...numbers) : Math.min(...numbers));
      title = biggest ? 'BIGGEST NUMBER.' : 'SMALLEST NUMBER.';
      hint = 'One tap. You have absolutely got this.';
      choices(numbers.map(String), answer);
      explanation = `${answer} is the ${biggest ? 'largest' : 'smallest'} number shown.`;
      break;
    }
    case 'odd': {
      const pair = rng.pick([['●', '○'], ['■', '□'], ['▲', '△'], ['◆', '◇']] as const);
      const index = rng.int(0, 8);
      title = 'FIND THE IMPOSTOR.'; hint = 'One shape has a hollow centre.'; symbol = true;
      options = Array.from({length: 9}, (_, i) => ({ id: String(i), label: i === index ? pair[1] : pair[0] }));
      correct = String(index); expected = `Shape ${index + 1} (hollow)`;
      explanation = `The hollow shape was at position ${index + 1}, counting left to right.`;
      break;
    }
    case 'opposite': {
      const pair = rng.pick([['LEFT', 'RIGHT'], ['UP', 'DOWN'], ['YES', 'NO'], ['OPEN', 'CLOSED']] as const);
      const index = rng.int(0, 1); const word = pair[index]!; const answer = pair[1 - index]!;
      title = `OPPOSITE OF ${word}.`; hint = 'Not the word you just read.';
      choices([word, answer, 'MAYBE'], answer); explanation = `${answer} is the opposite of ${word}.`;
      break;
    }
    case 'omit': {
      const [word, omit] = rng.pick([['BANANA', 'A'], ['ROBOT', 'O'], ['ERROR', 'R'], ['BUTTON', 'T'], ['PANIC', 'A']] as const);
      title = `${word} WITHOUT ${omit}.`; hint = 'Remove every copy. Type or tap letters, then send.'; kind = 'typing';
      correct = word.split('').filter(c => c !== omit).join(''); expected = correct;
      alphabet = Array.from(new Set(word.split(''))).sort(); duration = 5700 - level * 350;
      explanation = `Removing every ${omit} from ${word} gives ${correct}.`;
      break;
    }
    case 'longword': {
      const words = rng.shuffle(['AI', 'CAT', 'CODE', 'PANIC', 'BUTTON', 'MONSTER', 'ELEPHANT']).slice(0, 3);
      const longest = rng.next() > .4;
      const sorted = [...words].sort((a, b) => a.length - b.length);
      const answer = longest ? sorted[2]! : sorted[0]!;
      title = longest ? 'LONGEST WORD.' : 'SHORTEST WORD.'; hint = 'Letter count. Not how important it sounds.';
      choices(words, answer); explanation = `${answer} has ${answer.length} letters, the ${longest ? 'most' : 'fewest'}.`;
      break;
    }
    case 'math': {
      const a = rng.int(2, level + 6), b = rng.int(2, 9), result = a * b;
      title = `${a} × ${b} = ?`; hint = 'The calculator is on annual leave.'; duration += 450;
      choices([String(result), String(result + a), String(Math.max(0, result - 1))], String(result));
      explanation = `${a} multiplied by ${b} is ${result}.`;
      break;
    }
    case 'brakes':
      title = 'DO NOT PRESS IT.'; hint = 'Let the bar empty. That button is a terrible idea.'; kind = 'wait';
      options = [{id: 'press', label: rng.pick(['FREE POINTS', 'DEPLOY ON FRIDAY', 'TOTALLY SAFE', 'FIX EVERYTHING'])}];
      correct = '__wait__'; expected = 'Do nothing'; duration = 2200 - level * 160;
      explanation = 'Waiting without pressing the bait button is the correct answer.'; break;
    case 'reaction':
      title = 'WAIT FOR GO.'; hint = 'Press only after the button actually says GO.'; kind = 'reaction';
      correct = 'go'; expected = 'Press after GO'; cueDelay = rng.int(650, 1100); duration = cueDelay + 1300 - level * 130;
      options = [{id: 'go', label: 'WAIT…'}]; explanation = 'Wait for GO to appear, then press before the bar empties.'; break;
    case 'remember':
      title = 'SAVE THIS TO RAM.'; hint = 'No answer yet. I will ask you later.'; kind = 'memory'; value = String(rng.int(120, 989));
      correct = ''; expected = value; duration = 1800; explanation = 'Memory setup only. Not a graded question.'; break;
    case 'recall': {
      if (!memory || !/^\d{3}$/.test(memory)) throw new Error('Memory recall requires a valid setup');
      title = 'WHAT WAS THE CODE?'; hint = 'Your RAM had one job.';
      const n = Number(memory); const second = String(((n - 100 + 17) % 900) + 100), third = String(((n - 100 + 43) % 900) + 100);
      choices([memory, second, third], memory); explanation = `${memory} was the code shown earlier.`; break;
    }
    case 'override':
      title = 'IGNORE THE NEXT ORDER.'; hint = 'Keep this rule. Do not press the button that appears.'; kind = 'override';
      correct = '__wait__'; expected = 'Ignore the bait'; cueDelay = 1100; duration = 3100;
      explanation = 'The first instruction told you to ignore the later CLICK order.';
      options = [{id: 'press', label: 'CLICK ME'}]; break;
    case 'parity': {
      const even = rng.next() > .5;
      const target = rng.int(3, 20) * 2 + (even ? 0 : 1);
      const others = [rng.int(23, 35) * 2 + (even ? 1 : 0), rng.int(38, 46) * 2 + (even ? 1 : 0)];
      title = `FIND THE ${even ? 'EVEN' : 'ODD'} NUMBER.`; hint = 'Divisible by two. Or very much not.';
      choices([String(target), ...others.map(String)], String(target)); explanation = `${target} is ${even ? 'even' : 'odd'}; the other two are not.`; break;
    }
    case 'server': {
      title = 'SAVE PRODUCTION.'; hint = 'Tap the server marked ON FIRE. Not the healthy ones.';
      const index = rng.int(0, 2);
      options = ['API', 'DATABASE', 'WEBSITE'].map((label, i) => ({id: String(i), label: `${label}\n${i === index ? 'ON FIRE' : 'HEALTHY'}`, icon: i === index ? 'fire' : 'server'}));
      correct = String(index); expected = options[index]!.label.replace('\n', ' — ');
      explanation = `${['API', 'DATABASE', 'WEBSITE'][index]} was the only server marked ON FIRE.`; break;
    }
    case 'position': {
      const targetIndex = rng.int(0, 2);
      const names = ['LEFT', 'MIDDLE', 'RIGHT'] as const;
      const targetName = names[targetIndex]!;
      const labels = rng.shuffle(names);
      options = labels.map((label, i) => ({id: String(i), label}));
      correct = String(targetIndex); expected = `${targetName} button (${options[targetIndex]!.label})`;
      title = `PRESS THE ${targetName} BUTTON.`; hint = 'Position, not the word printed on it.';
      explanation = `The ${targetName.toLowerCase()} button was physically position ${targetIndex + 1}; its label was ${options[targetIndex]!.label}.`;
      break;
    }
    case 'lettercount': {
      const [word, letter] = rng.pick([['BOOTLOOP', 'O'], ['BANANA', 'A'], ['MISSISSIPPI', 'S'], ['COMMITTEE', 'M'], ['CACHE', 'C']] as const);
      const count = word.split('').filter(c => c === letter).length;
      title = `COUNT THE ${letter}'S.`; hint = `WORD: ${word}`; duration += 350;
      choices([String(Math.max(0, count - 1)), String(count), String(count + 1)], String(count));
      explanation = `${word} contains ${count} letter ${letter}${count === 1 ? '' : 's'}.`;
      break;
    }
    case 'second': {
      const numbers = rng.shuffle([rng.int(5, 18), rng.int(25, 38), rng.int(45, 58), rng.int(65, 88)]);
      const answer = [...numbers].sort((a, b) => b - a)[1]!;
      title = 'SECOND LARGEST.'; hint = 'Not first. That would be too convenient.';
      choices(numbers.map(String), String(answer));
      explanation = `${answer} is the second-largest number shown.`;
      break;
    }
    case 'match': {
      const words = rng.shuffle(['CACHE', 'DEPLOY', 'ERROR', 'BUTTON', 'ROBOT']);
      const mutate = (word: string): string => word.slice(0, -1) + (word.endsWith('X') ? 'Z' : 'X');
      const exact = words[0]!;
      const answer = `${exact}\n${exact}`;
      title = 'WHICH PAIR MATCHES EXACTLY?'; hint = 'Almost is not a match.';
      choices([answer, `${words[1]}\n${mutate(words[1]!)}`, `${words[2]}\n${mutate(words[2]!)}`], answer);
      explanation = `${exact} matched exactly on both lines.`;
      break;
    }
    case 'avoid': {
      const forbidden = rng.pick([7, 13, 42, 99]);
      const safe = forbidden + rng.pick([1, 2, 10]);
      const labels = rng.shuffle([String(forbidden), String(forbidden), String(safe)]);
      options = labels.map((label, i) => ({id: String(i), label}));
      correct = String(labels.findIndex(label => label !== String(forbidden))); expected = String(safe);
      title = `DO NOT PICK ${forbidden}.`; hint = 'Two buttons are bait. One is not.';
      explanation = `${safe} was the only button that was not ${forbidden}.`;
      break;
    }
  }
  const round: Round = {id, template, category: CATEGORY[template], kind, title, hint, options: Object.freeze(options.map(option => Object.freeze(option))), correct, expected, explanation, duration, cueDelay, symbol, alphabet: Object.freeze(alphabet), memoryValue: value};
  if (!title || !explanation || duration <= cueDelay) throw new Error('Invalid question contract');
  if (kind === 'choice' && options.filter(o => o.id === correct).length !== 1) throw new Error('Question must have exactly one correct option');
  return Object.freeze(round);
}
