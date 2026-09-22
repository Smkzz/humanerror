import test from 'node:test';
import assert from 'node:assert/strict';
import { Engine, ARM_MS } from '../build/modules/engine.js';

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
function wrong(e) { const r = e.round; if(r.kind === 'choice') e.answer(r.id,r.options.find(x=>x.id!==r.correct).id); else e.answer(r.id, r.kind === 'typing' ? 'WRONG' : 'press'); }

test('ten correct graded answers remain 10/10 with neutral memory screens', () => {
  const e = create({mode:'practice'}); e.start(); arm(e);
  let bound=0;
  while(e.phase!=='finished' && bound++<30) { correct(e); next(e); }
  assert.equal(e.phase,'finished'); assert.equal(e.endReason,'practice');
  assert.equal(e.summary().correct,10);assert.equal(e.summary().attempted,10);assert.equal(e.summary().accuracy,100);
  assert.equal(e.summary().observed,1);assert.equal(e.summary().bestStreak,10);
});

test('ten graded wins plus ten observations is still 100%, not 50%', () => {
 const e = create({mode:'practice',deck:['remember','magnitude']});e.start();arm(e);
 for(let i=0;i<20 && e.phase!=='finished';i++){correct(e);next(e);}
 assert.deepEqual([e.summary().correct,e.summary().attempted,e.summary().accuracy,e.summary().observed],[10,10,100,10]);
});

test('failed recall is consumed once, rather than immediately repeating',()=>{
 const e=create({deck:['remember','recall','recall']});e.start();arm(e);correct(e);next(e);
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
 const e=create({deck:['magnitude']});e.start();arm(e);
 for(let i=0;i<3;i++){wrong(e);next(e);}
 e.step(60000-e.runElapsed-e.round.duration); // this terminates the active round, not a win
 // A separate exact-boundary fixture makes the remaining budget equal the round deadline.
 const f=create({deck:['magnitude'],budgetMs:3800});f.start();arm(f);
 for(let i=0;i<3;i++){wrong(f);next(f);}
 f.step(3800);wrong(f);f.step(1000);
 assert.equal(f.endReason,'lives');assert.equal(f.summary().score,0);assert.equal(f.lives,0);
});

test('timeout and run expiry together prioritize the last life',()=>{
 const e=create({deck:['magnitude'],budgetMs:3800});e.start();arm(e);
 for(let i=0;i<3;i++){wrong(e);next(e);}e.step(3801);
 assert.equal(e.endReason,'lives');assert.equal(e.summary().score,0);
});

test('survival bonus is granted at most once',()=>{
 const e=create({budgetMs:20,deck:['magnitude']});e.start();arm(e);e.step(21);const score=e.summary().score;e.step(1e6);e.answer('invalid','0');assert.equal(score,1000);assert.equal(e.summary().score,score);
});

test('first correct answer has streak one and multiplier one',()=>{
 const e=create();e.start();arm(e);correct(e);assert.equal(e.streak,1);assert.equal(e.multiplier,1);assert.equal(e.summary().bestStreak,1);
});

test('neutral setups neither increment nor reset a streak',()=>{
 const e=create({deck:['magnitude','remember','magnitude']});e.start();arm(e);correct(e);next(e);correct(e);assert.equal(e.streak,1);next(e);correct(e);assert.equal(e.streak,2);
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
