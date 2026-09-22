import test from 'node:test';
import assert from 'node:assert/strict';
import { CHALLENGE_VERSION, parseChallenge, challengeLink, readPreferences } from '../build/modules/challenge.js';

test('valid challenge roundtrip preserves only current version, seed and mode',()=>{
 assert.equal(CHALLENGE_VERSION,'3');
 const u=challengeLink('https://example.test/game/?junk=1#old','abc_123');const parsed=parseChallenge(new URL(u).hash);
 assert.equal(parsed.valid,true);assert.equal(parsed.seed,'abc_123');assert.equal(new URL(u).search,'');assert.equal(new URL(u).hash.includes('v=3'),true);
});

test('challenge parser rejects malformed, old-version, oversized, duplicate or unexpected parameters',()=>{
 for(const v of ['#v=3&seed=%3Cimg%3E&mode=challenge','#v=3&seed=x&mode=challenge&seed=y','#v=3&seed=x&mode=adaptive','#v=2&seed=x&mode=challenge','#v=999&seed=x&mode=challenge','#v=3&seed=x&mode=challenge&score=999','#v=3&seed=../../secrets&mode=challenge','#v=3&seed='+ 'a'.repeat(300) +'&mode=challenge'])assert.equal(parseChallenge(v).valid,false);
 assert.equal(parseChallenge(''),null);assert.equal(challengeLink('file:///game/index.html','seed'),null);
});

test('preference parser treats storage as untrusted and optional',()=>{
 for(const raw of [null,'broken',JSON.stringify(null),'x'.repeat(500)])assert.deepEqual(readPreferences(raw),{sound:false,best:0});
 for(const v of [-1,1e9,'999',null])assert.equal(readPreferences(JSON.stringify({best:v})).best,0);
 assert.deepEqual(readPreferences('{"best":123,"sound":true}'),{best:123,sound:true});
});
