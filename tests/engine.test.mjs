import test from 'node:test';
import assert from 'node:assert/strict';
import { Engine, ARM_MS } from '../build/modules/engine.js';
import { makeRound, TEMPLATES } from '../build/modules/games.js';

const create = (extra = {}) => new Engine({seed: 'regression', mode: 'adaptive', runId: 'test', ...extra});
function arm(e) { assert.equal(e.phase, 'arming'); e.step(ARM_MS); assert.equal(e.phase, 'active'); }
function next(e) { if (e.phase === 'feedback') { if (e.options.mode === 'practice') e.continuePractice(); else e.step(1200); } if (e.phase === 'arming') arm(e); }
function correct(e) {
  const r = e.round;
  if (r.kind === 'memory') { if(e.options.mode === 'practice') e.continuePractice(); else e.step(r.duration+1); }
  else if (r.kind === 'wait' || r.kind === 'override') e.step(r.duration+1);
  else if (r.kind === 'reaction') { e.step(r.cueDelay+100); e.presentReaction(r.id); e.answer(r.id, 'go'); }
  else e.answer(r.id, r.correct);
}
function wrong(e) { const r = e.round; if(r.kind === 'choice') e.answer(r.id,r.options.find(x=>x.id!==r.correct).id); else if(r.kind === 'counter') e.answer(r.id,String(Number(r.correct)+1)); else e.answer(r.id, r.kind === 'typing' ? 'WRONG' : 'press'); }

test('ten correct graded answers remain 10/10 under randomized Practice order', () => {
  const e = create({mode:'practice'}); e.start(); arm(e);
  let bound=0;
  while(e.phase!=='finished' && bound++<30) { correct(e); next(e); }
  assert.equal(e.phase,'finished'); assert.equal(e.endReason,'practice');
  assert.equal(e.summary().correct,10);assert.equal(e.summary().attempted,10);assert.equal(e.summary().accuracy,100);
  assert.ok(e.summary().observed>=0&&e.summary().observed<=1);assert.equal(e.summary().bestStreak,10);
});

test('neutral memory observation does not dilute graded accuracy', () => {
 const e = create({mode:'practice',deck:['magnitude','remember','odd'],practiceLength:2});e.start();arm(e);
 correct(e);next(e);correct(e);next(e);correct(e);
 assert.deepEqual([e.summary().correct,e.summary().attempted,e.summary().accuracy,e.summary().observed],[2,2,100,1]);
});

test('failed recall is consumed once, rather than immediately repeating',()=>{
 const e=create({deck:['remember','recall','magnitude']});e.start();arm(e);correct(e);next(e);
 assert.equal(e.round.template,'recall');wrong(e);next(e);assert.equal(e.round.template,'magnitude');
});

test('one round settles once even with duplicate click/submit/timeout',()=>{
 const e=create({deck:['magnitude']});e.start();arm(e);const r=e.round;
 assert.equal(e.answer(r.id,r.correct),true);assert.equal(e.answer(r.id,r.correct),false);
 assert.equal(e.summary().attempted,1);assert.equal(e.summary().correct,1);
 next(e);assert.equal(e.answer(r.id,r.correct),false);assert.equal(e.summary().attempted,1);
});

test('stale session IDs do not touch a restarted run',()=>{
 const old=create({runId:'old'});old.start();arm(old);
 const fresh=create({runId:'new'});fresh.start();arm(fresh);
 assert.equal(fresh.answer(old.round.id,old.round.correct),false);assert.equal(fresh.summary().attempted,0);
});

test('input during arming is ignored without a life or score change',()=>{
 const e=create();e.start();assert.equal(e.answer(e.round.id,e.round.correct),false);assert.equal(e.lives,4);assert.equal(e.summary().attempted,0);
});

test('deadline is inclusive, but an input after timeout cannot turn into a win',()=>{
 const e=create({deck:['magnitude']});e.start();arm(e);const r=e.round;e.step(r.duration);assert.equal(e.answer(r.id,r.correct),true);
 const f=create({deck:['magnitude']});f.start();arm(f);const r2=f.round;f.step(r2.duration+1);assert.equal(f.lastReceipt.outcome,'timeout');assert.equal(f.answer(r2.id,r2.correct),false);assert.equal(f.summary().attempted,1);
});

test('a run-expired unfinished question is cancelled, not wrong',()=>{
 const e=create({budgetMs:100,deck:['magnitude']});e.start();arm(e);e.step(101);
 assert.equal(e.endReason,'time');assert.equal(e.summary().cancelled,1);assert.equal(e.summary().attempted,0);assert.equal(e.summary().accuracy,null);
});

test('fourth error at end of budget never earns a survival bonus',()=>{
 const e=create({deck:['magnitude','odd','opposite','math']});e.start();arm(e);
 for(let i=0;i<3;i++){wrong(e);next(e);}
 e.step(60000-e.runElapsed-e.round.duration); // this terminates the active round, not a win
 // A separate exact-boundary fixture makes the remaining budget equal the round deadline.
 const f=create({deck:['magnitude','odd','opposite','math'],budgetMs:3800});f.start();arm(f);
 for(let i=0;i<3;i++){wrong(f);next(f);}
 f.step(3800);wrong(f);f.step(1000);
 assert.equal(f.endReason,'lives');assert.equal(f.summary().score,0);assert.equal(f.lives,0);
});

test('timeout and run expiry together prioritize the last life',()=>{
 const options={seed:'regression',mode:'adaptive',runId:'tie',deck:['magnitude','odd','opposite','math']};
 const probe=new Engine({...options,budgetMs:60_000});probe.start();arm(probe);for(let i=0;i<3;i++){wrong(probe);next(probe);}
 const e=new Engine({...options,budgetMs:probe.round.duration});e.start();arm(e);
 for(let i=0;i<3;i++){wrong(e);next(e);}e.step(e.round.duration+1);
 assert.equal(e.endReason,'lives');assert.equal(e.summary().score,0);
});

test('survival bonus is granted at most once',()=>{
 const e=create({budgetMs:20,deck:['magnitude']});e.start();arm(e);e.step(21);const score=e.summary().score;e.step(1e6);e.answer('invalid','0');assert.equal(score,1000);assert.equal(e.summary().score,score);
});

test('first correct answer has streak one and multiplier one',()=>{
 const e=create();e.start();arm(e);correct(e);assert.equal(e.streak,1);assert.equal(e.multiplier,1);assert.equal(e.summary().bestStreak,1);
});

test('neutral setups neither increment nor reset a streak',()=>{
 const e=create({deck:['magnitude','remember','recall','odd']});e.start();arm(e);correct(e);next(e);correct(e);assert.equal(e.streak,1);next(e);correct(e);assert.equal(e.streak,2);
});

test('pause freezes timers and blocks input; resumed run is marked assisted',()=>{
 const e=create();e.start();arm(e);e.step(20);const r=e.round;e.pause();e.step(999999);assert.equal(e.elapsed,20);assert.equal(e.answer(r.id,r.correct),false);e.resume();e.step(30);assert.equal(e.elapsed,50);assert.equal(e.assisted,true);assert.equal(e.answer(r.id,r.correct),true);
});

test('reaction requires the actual GO presentation, not just elapsed time',()=>{
 const e=create({deck:['reaction']});e.start();arm(e);e.step(e.round.cueDelay+50);e.answer(e.round.id,'go');assert.equal(e.lastReceipt.outcome,'wrong');assert.match(e.lastReceipt.explanation,/had not appeared/);
 const f=create({deck:['reaction']});f.start();arm(f);f.step(f.round.cueDelay+50);f.presentReaction(f.round.id);f.answer(f.round.id,'go');assert.equal(f.lastReceipt.outcome,'correct');
});

test('invalid option IDs are ignored, not interpreted as wrong answers',()=>{
 const e=create();e.start();arm(e);assert.equal(e.answer(e.round.id,'999'),false);assert.equal(e.answer(e.round.id,'x'.repeat(1000)),false);assert.equal(e.summary().attempted,0);
});

test('typing normalization accepts lowercase and surrounding whitespace',()=>{
 const e=create({deck:['omit']});e.start();arm(e);e.answer(e.round.id,` ${e.round.correct.toLowerCase()} `);assert.equal(e.lastReceipt.outcome,'correct');
});

test('practice questions never time out while reading',()=>{
 const e=create({mode:'practice',deck:['math']});e.start();arm(e);e.step(100000);assert.equal(e.phase,'active');correct(e);assert.equal(e.lastReceipt.outcome,'correct');
});

test('negative and nonfinite clock steps are rejected',()=>{
 const e=create();for(const value of [-1,NaN,Infinity])assert.throws(()=>e.step(value),RangeError);
});

test('every scored receipt conserves attempts and points over 300 generated runs',()=>{
 for(let seed=0;seed<300;seed++){
  const e=new Engine({seed:`simulation-${seed}`,mode:'adaptive',runId:`r-${seed}`});e.start();arm(e);let rounds=0;
  while(e.phase!=='finished' && rounds++<500){
   if(seed%3===0 && ['choice','typing'].includes(e.round.kind) && rounds%4===0)wrong(e);else{if(['choice','typing'].includes(e.round.kind))e.step(180);correct(e);}next(e);
   const sum=e.summary();assert.equal(sum.attempted,sum.correct+sum.wrong);assert.equal(sum.attempted,e.ledger.filter(r=>['correct','wrong','timeout'].includes(r.outcome)).length);
   assert.equal(new Set(e.ledger.map(r=>r.id)).size,e.ledger.length);
  }
  assert.equal(e.phase,'finished');
  const bonus=e.endReason==='time'?1000:0;assert.equal(e.summary().score,e.ledger.reduce((s,r)=>s+r.scoreDelta,0)+bonus);
 }
});

test('wait task gives one failure for pressing bait and no failure for waiting',()=>{
 const e=create({deck:['brakes']});e.start();arm(e);e.answer(e.round.id,'press');assert.equal(e.lastReceipt.outcome,'wrong');assert.equal(e.lives,3);
 const f=create({deck:['brakes']});f.start();arm(f);f.step(f.round.duration+1);assert.equal(f.lastReceipt.outcome,'correct');assert.equal(f.streak,1);
});

test('override rejects bait input until the renderer confirms the bait is visible',()=>{
 const e=create({deck:['override']});e.start();arm(e);const r=e.round;
 assert.equal(e.answer(r.id,'press'),false);e.step(r.cueDelay);assert.equal(e.cueDue,true);
 assert.equal(e.answer(r.id,'press'),false);assert.equal(e.summary().attempted,0);
 e.presentOverride(r.id);assert.equal(e.overridePresented,true);
 assert.equal(e.answer(r.id,'press'),true);assert.equal(e.lastReceipt.outcome,'wrong');assert.equal(e.lives,3);
});

test('noncanonical special-action values are ignored',()=>{
 for(const kind of ['reaction','brakes','override']){
  const e=create({deck:[kind]});e.start();arm(e);e.step(e.round.cueDelay);assert.equal(e.answer(e.round.id,'not-an-action'),false);assert.equal(e.summary().attempted,0);
 }
});

test('memory cannot be answered or scored through the answer API',()=>{
 const e=create({mode:'practice',deck:['remember']});assert.equal(e.pause(),false);e.start();assert.equal(e.start(),false);arm(e);
 assert.equal(e.answer(e.round.id,'anything'),false);assert.equal(e.roundRemaining,Infinity);e.pause();assert.equal(e.continuePractice(),false);e.resume();assert.equal(e.continuePractice(),true);assert.equal(e.summary().observed,1);
});

test('continue in wrong modes or at an active graded question is inert',()=>{
 const e=create();e.start();arm(e);assert.equal(e.continuePractice(),false);
 const f=create({mode:'practice'});f.start();arm(f);assert.equal(f.continuePractice(),false);assert.equal(f.summary().attempted,0);
});

test('round remaining, early GO and pause guards expose consistent state',()=>{
 const e=create({deck:['reaction']});assert.equal(e.roundRemaining,0);e.start();arm(e);const r=e.round;
 e.presentReaction(r.id);assert.equal(e.reactionPresented,false);e.step(20);assert.equal(e.roundRemaining,r.duration-20);
 e.pause();assert.equal(e.pause(),false);e.presentReaction(r.id);assert.equal(e.reactionPresented,false);e.resume();
});

test('invalid engine configuration is rejected at construction',()=>{
 assert.throws(()=>create({seed:'<invalid>'}));assert.throws(()=>create({mode:'unknown'}));for(const budgetMs of [0,-1,Infinity])assert.throws(()=>create({budgetMs}));
});


test('each graded answer applies 2% pacing to its unique next mission, with the safety floor',()=>{
 const deck=TEMPLATES.filter(t=>!['remember','recall','reaction','brakes','override'].includes(t)).slice(0,17);
 const e=create({deck,budgetMs:600000});e.start();arm(e);const scales=[];
 for(let i=0;i<17;i++){
  const base=makeRound(e.round.template,'regression',e.ordinal,`test:${e.ordinal}`,null,e.difficultyLevel),scale=e.paceScale;
  const floor=base.kind==='typing'?2600:base.kind==='counter'?2100:1500;
  assert.equal(e.round.duration,Math.max(floor,Math.round(base.duration*scale)));scales.push(scale);
  if(i===16)break;
  correct(e);assert.equal(e.summary().attempted,i+1);next(e);
 }
 assert.equal(scales[0],1);assert.equal(scales[1],.98);assert.equal(scales[2],.96);
 assert.equal(scales.at(-1),.72);assert.ok(scales.every(scale=>scale>=.72&&scale<=1));assert.equal(e.difficultyLevel,4);
});

test('Practice and Challenge engines consume each template once and end explicitly exhausted',()=>{
 for(const mode of ['practice','challenge']){
  const e=new Engine({seed:'exhaustion',mode,runId:`${mode}-end`,deck:TEMPLATES,budgetMs:1_000_000,practiceLength:200});
  assert.throws(()=>new Engine({seed:'repeat',mode,runId:'bad',deck:['math','math']}),/unique valid templates/);
  e.start();arm(e);const seen=new Set();let rounds=0;
  while(e.phase!=='finished'&&rounds++<400){
   if(e.phase==='active'){assert.equal(seen.has(e.round.template),false);seen.add(e.round.template);correct(e);}
   else next(e);
  }
  assert.equal(e.phase,'finished');assert.equal(e.endReason,'exhausted');assert.equal(seen.size,132);assert.equal(e.usedTemplates.length,132);assert.deepEqual(new Set(e.usedTemplates),seen);
 }
});

test('practice remains unpaced and untimed after repeated graded answers',()=>{
 const deck=TEMPLATES.slice(0,4),e=create({mode:'practice',deck,practiceLength:4});e.start();arm(e);
 for(let i=0;i<3;i++){
  const base=makeRound(e.round.template,'regression',e.ordinal,`test:${e.ordinal}`,null,e.difficultyLevel);
  assert.equal(e.paceScale,1);assert.equal(e.roundRemaining,Infinity);assert.equal(e.round.duration,base.duration);
  correct(e);next(e);
 }
 const base=makeRound(e.round.template,'regression',e.ordinal,`test:${e.ordinal}`,null,e.difficultyLevel);
 assert.equal(e.paceScale,1);assert.equal(e.roundRemaining,Infinity);assert.equal(e.round.duration,base.duration);
});

test('paced reaction rounds preserve a visible cue window',()=>{
 const deck=[...TEMPLATES.filter(t=>!['remember','recall','reaction','brakes','override'].includes(t)).slice(0,14),'reaction'];
 const e=create({deck,budgetMs:600000});e.start();arm(e);
 for(let i=0;i<14;i++){correct(e);next(e);}
 assert.equal(e.paceScale,.72);assert.equal(e.round.template,'reaction');
 assert.ok(e.round.cueDelay>0);assert.ok(e.round.duration-e.round.cueDelay>=650);
 assert.ok(e.round.duration>=1500);
});

test('counter task grades only the exact submitted tap count',()=>{
 const e=create({deck:['counter']});e.start();arm(e);const r=e.round;assert.equal(r.kind,'counter');
 assert.equal(e.answer(r.id,'x'),false);assert.equal(e.summary().attempted,0);
 assert.equal(e.answer(r.id,String(Number(r.correct)+1)),true);assert.equal(e.lastReceipt.outcome,'wrong');assert.equal(e.lives,3);
 const f=create({deck:['counter']});f.start();arm(f);const q=f.round;assert.equal(f.answer(q.id,q.correct),true);assert.equal(f.lastReceipt.outcome,'correct');assert.match(f.lastReceipt.submitted,/ taps$/);
});
