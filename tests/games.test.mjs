import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRound, TEMPLATES } from '../build/modules/games.js';
import { Director } from '../build/modules/director.js';
import { Random } from '../build/modules/random.js';
import { OPPOSITES } from '../build/modules/vocabulary.js';

test('all generators × 1000 seeds have valid unique answer contracts',()=>{
 assert.equal(TEMPLATES.length,132);
 for(const template of TEMPLATES)for(let n=0;n<1000;n++){
  const r=makeRound(template,`seed-${n}`,n%40,`id-${n}`,'739');
  assert.ok(r.title&&r.expected&&r.explanation);assert.ok(r.duration>r.cueDelay);assert.ok(Object.isFrozen(r));
  if(r.kind==='choice'){assert.equal(r.options.filter(o=>o.id===r.correct).length,1);assert.equal(new Set(r.options.map(o=>o.id)).size,r.options.length);}
  if(r.kind==='typing'){assert.ok(r.correct.length>0);assert.ok(r.correct.length<=11);}
  if(r.kind==='counter'){assert.match(r.correct,/^(?:[2-9]|1[0-2])$/);assert.equal(r.options.length,1);}
 }
});

test('independent arithmetic oracle verifies all multiplication choices',()=>{
 for(let n=0;n<1000;n++){
  const r=makeRound('math',`math-${n}`,n%30,`r${n}`,null);
  const m=r.title.match(/^(\d+) × (\d+) = \?$/);assert.ok(m);
  const expected=Number(m[1])*Number(m[2]);assert.equal(r.options.find(o=>o.id===r.correct).label,String(expected));
 }
});

test('independent oracle verifies magnitude, parity, word-length and opposite answers',()=>{
 for(let i=0;i<1000;i++)for(const t of ['magnitude','parity','longword','opposite']){
  const r=makeRound(t,`oracle-${i}`,i%30,`r${i}`,null);const winner=r.options.find(o=>o.id===r.correct).label;
  if(t==='magnitude')assert.equal(Number(winner),r.title.startsWith('BIGGEST')?Math.max(...r.options.map(o=>+o.label)):Math.min(...r.options.map(o=>+o.label)));
  if(t==='parity')assert.equal(+winner%2,r.title.includes('EVEN')?0:1);
  if(t==='longword'){assert.equal(new Set(r.options.map(o=>o.label.length)).size,3);assert.equal(winner.length,r.title.startsWith('LONGEST')?Math.max(...r.options.map(o=>o.label.length)):Math.min(...r.options.map(o=>o.label.length)));}
  if(t==='opposite'){const pairs=Object.fromEntries(OPPOSITES.flatMap(([a,b])=>[[a,b],[b,a]]));assert.equal(winner,pairs[r.title.match(/OF (\w+)/)[1]]);}
 }
});

test('independent oracle verifies five v0.3 microgames',()=>{
 for(let i=0;i<1000;i++){
  const position=makeRound('position',`position-${i}`,i%40,`p${i}`,null);
  const target={LEFT:0,'MIDDLE-LEFT':1,'MIDDLE-RIGHT':2,RIGHT:3}[position.title.match(/PRESS THE (LEFT|MIDDLE-LEFT|MIDDLE-RIGHT|RIGHT) BUTTON/)[1]];
  assert.equal(Number(position.correct),target);

  const count=makeRound('lettercount',`count-${i}`,i%40,`c${i}`,null);
  const letter=count.title.match(/COUNT THE ([A-Z])'S/)[1],word=count.hint.replace('WORD: ','');
  const expected=[...word].filter(c=>c===letter).length;
  assert.equal(Number(count.options.find(o=>o.id===count.correct).label),expected);

  const second=makeRound('second',`second-${i}`,i%40,`s${i}`,null);
  const sorted=second.options.map(o=>Number(o.label)).sort((a,b)=>b-a);
  assert.equal(Number(second.options.find(o=>o.id===second.correct).label),sorted[1]);

  const match=makeRound('match',`match-${i}`,i%40,`m${i}`,null);
  const exact=match.options.filter(o=>{const [a,b]=o.label.split('\n');return a===b;});
  assert.equal(exact.length,1);assert.equal(exact[0].id,match.correct);

  const avoid=makeRound('avoid',`avoid-${i}`,i%40,`a${i}`,null);
  const forbidden=avoid.title.match(/DO NOT PICK (\d+)/)[1],winner=avoid.options.find(o=>o.id===avoid.correct);
  assert.notEqual(winner.label,forbidden);assert.equal(avoid.options.filter(o=>o.label!==forbidden).length,1);
 }
});

test('independent oracle verifies seven v0.4 additions',()=>{
 for(let i=0;i<1000;i++){
  const sequence=makeRound('sequence',`seq-${i}`,i%40,`q${i}`,null);
  const nums=(sequence.hint.match(/\d+/g)??[]).map(Number);assert.equal(nums.length,3);
  const next=nums[2]+(nums[1]-nums[0]);assert.equal(Number(sequence.options.find(o=>o.id===sequence.correct).label),next);

  const vowels=makeRound('vowels',`vowel-${i}`,i%40,`v${i}`,null);
  const word=vowels.hint.match(/WORD: ([A-Z]+)/)[1];const vc=[...word].filter(c=>'AEIOU'.includes(c)).length;
  assert.equal(Number(vowels.options.find(o=>o.id===vowels.correct).label),vc);

  const reverse=makeRound('reverse',`rev-${i}`,i%40,`r${i}`,null);
  const original=reverse.title.match(/^TYPE ([A-Z]+) BACKWARDS\.$/)[1];
  assert.equal(reverse.correct,[...original].reverse().join(''));

  const pair=makeRound('pairtotal',`pair-${i}`,i%40,`p${i}`,null);
  const target=Number(pair.title.match(/MAKES (\d+)/)[1]);
  const winner=pair.options.find(o=>o.id===pair.correct).label.split(' + ').map(Number);
  assert.equal(winner[0]+winner[1],target);

  const middle=makeRound('middle',`middle-${i}`,i%40,`d${i}`,null);
  const mw=middle.hint.replace('WORD: ','');assert.equal(middle.options.find(o=>o.id===middle.correct).label,mw[Math.floor(mw.length/2)]);

  const nc=makeRound('notcontain',`nc-${i}`,i%40,`n${i}`,null);
  const letter=nc.title.match(/WITHOUT ([A-Z])/)[1];const safe=nc.options.find(o=>o.id===nc.correct).label;
  assert.equal(safe.includes(letter),false);assert.equal(nc.options.filter(o=>!o.label.includes(letter)).length,1);

  const counter=makeRound('counter',`tap-${i}`,i%40,`t${i}`,null);
  assert.equal(counter.kind,'counter');assert.equal(counter.correct,counter.title.match(/TAP (\d+) TIMES/)[1]);
 }
});

test('independent oracle verifies seven v0.5 additions',()=>{
 for(let i=0;i<1000;i++){
  const closest=makeRound('closest',`close-${i}`,i%40,`cl${i}`,null);
  const target=Number(closest.title.match(/CLOSEST TO (\d+)/)[1]);
  const distances=closest.options.map(o=>Math.abs(Number(o.label)-target));
  const best=Math.min(...distances);assert.equal(distances.filter(d=>d===best).length,1);
  assert.equal(Math.abs(Number(closest.options.find(o=>o.id===closest.correct).label)-target),best);

  const ascending=makeRound('ascending',`asc-${i}`,i%40,`as${i}`,null);
  const asc=o=>o.label.split(' < ').map(Number).every((v,n,a)=>n===0||a[n-1]<v);
  assert.equal(ascending.options.filter(asc).length,1);assert.equal(asc(ascending.options.find(o=>o.id===ascending.correct)),true);

  const initial=makeRound('initial',`initial-${i}`,i%40,`in${i}`,null);
  const first=initial.title.match(/STARTS WITH ([A-Z])/)[1];
  assert.equal(initial.options.filter(o=>o.label.startsWith(first)).length,1);
  assert.equal(initial.options.find(o=>o.id===initial.correct).label.startsWith(first),true);

  const last=makeRound('lastletter',`last-${i}`,i%40,`la${i}`,null);
  const final=last.title.match(/ENDS WITH ([A-Z])/)[1];
  assert.equal(last.options.filter(o=>o.label.endsWith(final)).length,1);
  assert.equal(last.options.find(o=>o.id===last.correct).label.endsWith(final),true);

  const difference=makeRound('difference',`diff-${i}`,i%40,`di${i}`,null);
  const gap=Number(difference.title.match(/PAIR IS (\d+) APART/)[1]);
  const gaps=difference.options.map(o=>{const [a,b]=o.label.split(' ↔ ').map(Number);return Math.abs(a-b);});
  assert.equal(gaps.filter(value=>value===gap).length,1);
  assert.equal(gaps[difference.options.findIndex(o=>o.id===difference.correct)],gap);

  const duplicate=makeRound('duplicate',`dup-${i}`,i%40,`du${i}`,null);
  const repeats=o=>new Set([...o.label]).size<o.label.length;
  assert.equal(duplicate.options.filter(repeats).length,1);
  assert.equal(repeats(duplicate.options.find(o=>o.id===duplicate.correct)),true);

  const alphabet=makeRound('alphabet',`alpha-${i}`,i%40,`al${i}`,null);
  const letters=alphabet.hint.match(/[A-Z]/g);assert.equal(letters.length,3);
  const step=letters[1].charCodeAt(0)-letters[0].charCodeAt(0);
  const expected=String.fromCharCode(letters[2].charCodeAt(0)+step);
  assert.equal(alphabet.options.find(o=>o.id===alphabet.correct).label,expected);
 }
});

test('Challenge is deterministic, history-independent and never repeats across 1000 full decks',()=>{
 for(let seed=0;seed<1000;seed++){
  const a=new Director(`challenge-${seed}`,'challenge'),b=new Director(`challenge-${seed}`,'challenge'),seen=new Set();
  for(let i=0;i<TEMPLATES.length;i++){
   const x=a.choose(i),y=b.choose(i);assert.ok(x);assert.equal(x,y);assert.equal(seen.has(x),false);seen.add(x);
   a.observe('words',i%2?'correct':'wrong');b.observe('numbers',i%3?'timeout':'correct');
   assert.equal(a.remainingTemplates.length,TEMPLATES.length-i-1);
  }
  assert.equal(a.choose(TEMPLATES.length),null);assert.equal(b.choose(TEMPLATES.length),null);assert.equal(seen.size,132);assert.equal(a.usedTemplates.length,132);
 }
});

test('v0.7 randomizes the opening and keeps seeded memory pairing valid',()=>{
 const firsts=new Set();
 for(let seed=0;seed<1000;seed++){
  const d=new Director(`opening-${seed}`,'challenge');
  const first=d.choose(0);assert.ok(first);firsts.add(first);
 }
 assert.ok(firsts.size>=12,`expected broad first-mission variety, got ${firsts.size}: ${[...firsts].join(',')}`);
 for(let seed=0;seed<200;seed++){
  const a=new Director(`memory-${seed}`,'challenge'),b=new Director(`memory-${seed}`,'challenge'),seqA=[],seqB=[];
  for(let i=0;i<TEMPLATES.length;i++){seqA.push(a.choose(i));seqB.push(b.choose(i));}
  assert.deepEqual(seqA,seqB);
  const remember=seqA.indexOf('remember'),recall=seqA.indexOf('recall');
  assert.ok(remember>=2&&remember<=12&&recall>=remember+3&&recall<=remember+8,`invalid memory pair at ${remember}/${recall}`);
  assert.equal(seqA.slice(0,remember).includes('recall'),false);
 }
});

test('all 132 templates produce seeded question variation instead of fixed instances',()=>{
 const counts=[];
 for(const template of TEMPLATES){
  const signatures=new Set();
  for(let seed=0;seed<100;seed++){
   const r=makeRound(template,`entropy-${seed}`,seed%132,`entropy:${seed}`,'739');
   signatures.add(JSON.stringify([r.title,r.hint,r.options.map(o=>o.label),r.memoryValue]));
  }
  const minimum=['reaction','override','suppressrepeat'].includes(template)?4:20;
  assert.ok(signatures.size>=minimum,`${template} only produced ${signatures.size} visible variants`);
  counts.push(signatures.size);
 }
 counts.sort((a,b)=>a-b);
 assert.ok(counts[Math.floor(counts.length/2)]>=50,`median visible variation was only ${counts[Math.floor(counts.length/2)]}`);
});

test('Adaptive no-replacement invariant survives 1000 seeds and varied recovery histories',()=>{
 for(let seed=0;seed<1000;seed++){
  const d=new Director(`variety-${seed}`,'adaptive'),seen=new Set();
  for(let i=0;i<TEMPLATES.length;i++){
   const template=d.choose(i);assert.ok(template);assert.equal(seen.has(template),false);seen.add(template);
   assert.equal(d.usedTemplates.length,i+1);assert.equal(d.remainingTemplates.length,131-i);
   const category=['attention','reflex','words','numbers','memory'][(seed+i)%5];
   d.observe(category,(seed+i)%4===0?'wrong':(seed+i)%4===1?'timeout':'correct');
   assert.equal(d.remainingTemplates.includes(template),false);
  }
  assert.equal(d.choose(TEMPLATES.length),null);assert.equal(seen.size,132);
 }
});

test('adaptive weakness weighting changes selection among unused missions',()=>{
 let differences=0;
 for(let seed=0;seed<100;seed++){
  const weak=new Director(`weight-${seed}`,'adaptive'),neutral=new Director(`weight-${seed}`,'adaptive');
  for(let i=0;i<5;i++)weak.observe('words','wrong');
  for(let i=0;i<5;i++)neutral.observe('numbers','correct');
  assert.equal(weak.target(),'words');
  for(let ordinal=0;ordinal<8;ordinal++){
   const a=weak.choose(ordinal),b=neutral.choose(ordinal);
   if(ordinal>=3&&a!==b)differences++;
   assert.ok(a);assert.ok(b);weak.observe('words',ordinal%2?'correct':'wrong');neutral.observe('numbers','correct');
  }
  assert.equal(weak.usedTemplates.length,8);assert.equal(neutral.usedTemplates.length,8);
 }
 assert.ok(differences>0,'weakness history must alter some deterministic choices');
});

test('weakness requires observed opportunities, not just one mistake',()=>{
 const d=new Director('target','adaptive');d.observe('words','wrong');assert.equal(d.target(),null);
 d.observe('words','correct');assert.equal(d.target(),'words');d.observe('memory','observed');assert.equal(d.stats.memory.attempts,0);
});

test('seeded generator is reproducible and does not mutate input arrays',()=>{
 const a=new Random('same'),b=new Random('same');for(let i=0;i<100;i++)assert.equal(a.next(),b.next());
 const input=Object.freeze([1,2,3]);assert.deepEqual([...a.shuffle(input)].sort(),[1,2,3]);assert.throws(()=>a.pick([]));
});
