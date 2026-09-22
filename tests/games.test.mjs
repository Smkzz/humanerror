import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRound, TEMPLATES } from '../build/modules/games.js';
import { Director } from '../build/modules/director.js';
import { Random } from '../build/modules/random.js';

test('all generators × 1000 seeds have valid unique answer contracts',()=>{
 assert.equal(TEMPLATES.length,18);
 for(const template of TEMPLATES)for(let n=0;n<1000;n++){
  const r=makeRound(template,`seed-${n}`,n%40,`id-${n}`,'739');
  assert.ok(r.title&&r.expected&&r.explanation);assert.ok(r.duration>r.cueDelay);assert.ok(Object.isFrozen(r));
  if(r.kind==='choice'){assert.equal(r.options.filter(o=>o.id===r.correct).length,1);assert.equal(new Set(r.options.map(o=>o.id)).size,r.options.length);}
  if(r.kind==='typing'){assert.ok(r.correct.length>0);assert.ok(r.correct.length<=4);}
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
 for(let i=0;i<500;i++)for(const t of ['magnitude','parity','longword','opposite']){
  const r=makeRound(t,`oracle-${i}`,i%30,`r${i}`,null);const winner=r.options.find(o=>o.id===r.correct).label;
  if(t==='magnitude')assert.equal(Number(winner),r.title.startsWith('BIGGEST')?Math.max(...r.options.map(o=>+o.label)):Math.min(...r.options.map(o=>+o.label)));
  if(t==='parity')assert.equal(+winner%2,r.title.includes('EVEN')?0:1);
  if(t==='longword')assert.equal(winner.length,r.title.startsWith('LONGEST')?Math.max(...r.options.map(o=>o.label.length)):Math.min(...r.options.map(o=>o.label.length)));
  if(t==='opposite'){const pairs={LEFT:'RIGHT',RIGHT:'LEFT',UP:'DOWN',DOWN:'UP',YES:'NO',NO:'YES',OPEN:'CLOSED',CLOSED:'OPEN'};assert.equal(winner,pairs[r.title.match(/OF (\w+)/)[1]]);}
 }
});

test('independent oracle verifies five v0.3 microgames',()=>{
 for(let i=0;i<1000;i++){
  const position=makeRound('position',`position-${i}`,i%40,`p${i}`,null);
  const target={LEFT:0,MIDDLE:1,RIGHT:2}[position.title.match(/PRESS THE (LEFT|MIDDLE|RIGHT) BUTTON/)[1]];
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
  assert.notEqual(winner.label,forbidden);
  assert.equal(avoid.options.filter(o=>o.label!==forbidden).length,1);
 }
});

test('challenge deck stays identical despite different player success histories',()=>{
 const a=new Director('fixed','challenge'),b=new Director('fixed','challenge');
 for(let i=0;i<100;i++){
  assert.equal(a.choose(i),b.choose(i));a.observe('words','wrong');b.observe('numbers','correct');
 }
});

test('v0.3 keeps three onboarding beats then introduces seeded opening variety',()=>{
 for(const seed of ['a','b','c']) {
  const d=new Director(seed,'challenge');
  assert.deepEqual([d.choose(0),d.choose(1),d.choose(2)],['magnitude','brakes','remember']);
 }
 const signatures=new Set();
 for(let seed=0;seed<30;seed++){
  const d=new Director(`opening-${seed}`,'challenge');
  const seq=[];for(let i=0;i<7;i++)seq.push(d.choose(i));
  assert.equal(seq[6],'recall');
  signatures.add(seq.slice(3,6).join(','));
 }
 assert.ok(signatures.size>=10,`expected opening variety, got ${signatures.size} signatures`);
});

test('adaptive scheduler never repeats the same template back-to-back',()=>{
 for(let seed=0;seed<20;seed++){
  const d=new Director(`variety-${seed}`,'adaptive');let last=null;
  for(let i=0;i<120;i++){const next=d.choose(i);assert.notEqual(next,last);last=next;d.observe('words',i%2?'correct':'wrong');}
 }
});

test('weakness requires observed opportunities, not just one mistake',()=>{
 const d=new Director('target','adaptive');d.observe('words','wrong');assert.equal(d.target(),null);
 d.observe('words','correct');assert.equal(d.target(),'words');d.observe('memory','observed');assert.equal(d.stats.memory.attempts,0);
});

test('seeded generator is reproducible and does not mutate input arrays',()=>{
 const a=new Random('same'),b=new Random('same');for(let i=0;i<100;i++)assert.equal(a.next(),b.next());
 const input=Object.freeze([1,2,3]);assert.deepEqual([...a.shuffle(input)].sort(),[1,2,3]);assert.throws(()=>a.pick([]));
});
