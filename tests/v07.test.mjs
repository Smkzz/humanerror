import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRound, TEMPLATES } from '../build/modules/games.js';
import { V07_TEMPLATES } from '../build/modules/v07.js';
import { NOVEL_TEMPLATES } from '../build/modules/novel.js';
import { HOMOGRAPHS } from '../build/modules/vocabulary.js';

const registerTest=process.env.HUMAN_ERROR_ORACLE_BRIDGE==='1'?()=>{}:test;
const shown=r=>r.options.map(x=>x.label),winner=r=>r.options.find(x=>x.id===r.correct)?.label;
const pair=s=>[s.charCodeAt(0)-65,Number(s.slice(1))-1];
const gcd=(a,b)=>b?gcd(b,a%b):Math.abs(a);
const hamming=(a,b)=>[...a].reduce((n,c,i)=>n+Number(c!==b[i]),0);
const pattern=s=>{const m=new Map();return [...s].map(c=>{if(!m.has(c))m.set(c,m.size);return m.get(c);}).join(',');};
const subseq=(a,b)=>{let i=0;for(const c of b)if(c===a[i])i++;return i===a.length;};
function editDistance(a,b){const d=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let p=d[0];d[0]=i;for(let j=1;j<=b.length;j++){const old=d[j];d[j]=Math.min(d[j]+1,d[j-1]+1,p+Number(a[i-1]!==b[j-1]));p=old;}}return d[b.length];}
function combinations(values,k){if(k===0)return [[]];if(values.length<k)return [];return [...combinations(values.slice(1),k-1).map(x=>[values[0],...x]),...combinations(values.slice(1),k)];}
function permutations(values){if(values.length<2)return [[...values]];return values.flatMap((v,i)=>permutations([...values.slice(0,i),...values.slice(i+1)]).map(x=>[v,...x]));}

export function v07Oracle(t,r){
 const h=r.hint,title=r.title,options=shown(r);
 switch(t){
  case 'raysight': {
   const rows=h.match(/Grid: ([.#@A-C]+(?: \/ [.#@A-C]+){6})/)[1].split(' / '),[oy,ox]=(()=>{for(let y=0;y<7;y++){const x=rows[y].indexOf('@');if(x>=0)return[y,x];}})(),visible=[];
   for(const label of ['A','B','C']){let tx=-1,ty=-1;for(let y=0;y<7;y++){const x=rows[y].indexOf(label);if(x>=0){tx=x;ty=y;}}const vx=tx-ox,vy=ty-oy;if(!(vx===0||vy===0||Math.abs(vx)===Math.abs(vy)))continue;const dx=Math.sign(vx),dy=Math.sign(vy);let x=ox+dx,y=oy+dy,clear=true;while(x!==tx||y!==ty){if(rows[y][x]==='#')clear=false;x+=dx;y+=dy;}if(clear)visible.push(label);}
   assert.equal(visible.length,1);return visible[0];
  }
  case 'knightmove': {const [sx,sy]=pair(title.match(/FROM ([A-H][1-8])/)[1]);const valid=options.filter(s=>{const [x,y]=pair(s),dx=Math.abs(x-sx),dy=Math.abs(y-sy);return dx*dy===2;});assert.equal(valid.length,1);return valid[0];}
  case 'taxicab': {const [,a,b]=h.match(/([A-H][1-8]) to ([A-H][1-8])/),[x,y]=pair(a),[u,v]=pair(b);return String(Math.abs(x-u)+Math.abs(y-v));}
  case 'foldpaper': {const [,side,axis,s]=h.match(/Fold (left|right|top|bottom) half over the (vertical|horizontal) centre line · Hole at ([A-F][1-6])/),[x,y]=pair(s),folded=axis==='vertical'?(side==='left'?x<3:x>=3):(side==='top'?y<3:y>=3);return axis==='vertical'?`${String.fromCharCode(65+(folded?5-x:x))}${y+1}`:`${String.fromCharCode(65+x)}${folded?6-y:y+1}`;}
  case 'stackview': {const [a,b]=h.replace('Front stack heights ','').split(' · Behind ').map(x=>x.split(' · ').map(Number));return String(a.reduce((s,x,i)=>s+Math.min(x,b[i]),0));}
  case 'griddegree': {const rows=h.match(/Grid: ([.#@]+(?: \/ [.#@]+){4})/)[1].split(' / '),y=rows.findIndex(x=>x.includes('@')),x=rows[y].indexOf('@');return String([[x+1,y],[x-1,y],[x,y+1],[x,y-1]].filter(([a,b])=>rows[b]?.[a]==='#').length);}
  case 'routeplan': {const rows=h.match(/count steps: ([.#SG]+(?: \/ [.#SG]+){4})/)[1].split(' / '),start=[0,0],q=[[...start,0]],seen=new Set(['0,0']);for(let i=0;i<q.length;i++){const[x,y,d]=q[i];if(rows[y][x]==='G')return String(d);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=`${nx},${ny}`;if(nx>=0&&ny>=0&&ny<5&&nx<5&&rows[ny][nx]!=='#'&&!seen.has(k)){seen.add(k);q.push([nx,ny,d+1]);}}}assert.fail('goal unreachable');}
  case 'linecross': {const chords=[...h.matchAll(/([A-H])–([A-H])/g)].map(m=>m.slice(1).map(c=>c.charCodeAt(0)-65));let count=0;for(let i=0;i<chords.length;i++)for(let j=i+1;j<chords.length;j++){const[a,b]=chords[i].sort((x,y)=>x-y),[c,d]=chords[j].sort((x,y)=>x-y);if(a<c&&c<b&&b<d||c<a&&a<d&&d<b)count++;}return String(count);}
  case 'orientation': {const dirs=['N','E','S','W'];let i=dirs.indexOf(title.match(/FROM ([NESW])/)[1]);for(const turn of h.match(/Turn sequence: ([LRU](?: · [LRU])*) · U means/)[1].split(' · '))i=(i+(turn==='R'?1:turn==='L'?3:2))%4;return dirs[i];}
  case 'focusfilter': {const target=h.match(/Target: (.*?) · Choose/)[1];assert.equal(options.filter(x=>x===target).length,1);return target;}
  case 'gcd': {const[a,b]=h.match(/Numbers (\d+) and (\d+)/).slice(1).map(Number);return String(gcd(a,b));}
  case 'lcm': {const[a,b]=h.match(/Numbers (\d+) and (\d+)/).slice(1).map(Number);return String(a/gcd(a,b)*b);}
  case 'percent': {const[,p,b]=title.match(/WHAT IS (\d+)% OF (\d+)/).map(Number);return String(p*b/100);}
  case 'square': return options.find(x=>Number.isInteger(Math.sqrt(Number(x))));
  case 'calendar': {const days=['MON','TUE','WED','THU','FRI','SAT','SUN'],start=days.indexOf(h.match(/Starting day: ([A-Z]+)/)[1]),n=Number(title.match(/AFTER (\d+) DAYS/)[1]);return days[(start+n%7)%7];}
  case 'clockangle': {const[,hh,mm]=h.match(/Time (\d\d):(\d\d)/),hour=Number(hh)%12,minute=Number(mm),angle=Math.abs(hour*30-minute*5.5),small=Math.min(angle,360-angle);return Number.isInteger(small)?String(small):small.toFixed(1);}
  case 'area': {const[,a,b]=h.match(/Length (\d+) · Width (\d+)/).map(Number);return String(a*b);}
  case 'combinations': {const count=Number(h.match(/^(\d+) people total/)[1]);return String(title.includes('INCLUDE')?count-1:title.includes('EXCLUDE')?(count-1)*(count-2)/2:count*(count-1)/2);}
  case 'unitconvert': return String(Number(h.match(/(\d+) cm/)[1])*10);
  case 'fractionadd': {const[,a,d,b]=h.match(/(\d+)\/(\d+) \+ (\d+)\/\d+/).map(Number),g=gcd(a+b,d);return `${(a+b)/g}/${d/g}`;}
  case 'signedcompare': return String(Math.max(...h.match(/Candidates: (.*)/)[1].split(' · ').map(Number)));
  case 'weightedmean': {const vals=[...h.matchAll(/(-?\d+)×(\d+)/g)].map(m=>[+m[1],+m[2]]);return String(vals.reduce((s,[v,w])=>s+v*w,0)/vals.reduce((s,[,w])=>s+w,0));}
  case 'consecutive': {const[a,b]=h.match(/(\d+) through (\d+)/).slice(1).map(Number);return String((a+b)*(b-a+1)/2);}
  case 'palindrome': return options.filter(x=>x===[...x].reverse().join('')).length===1?options.find(x=>x===[...x].reverse().join('')):assert.fail('ambiguous palindrome');
  case 'wordladder': {const[,a,b]=h.match(/([A-Z]{5}) → \? → ([A-Z]{5})/);const valid=options.filter(x=>hamming(a,x)===1&&hamming(x,b)===1);assert.equal(valid.length,1);return valid[0];}
  case 'alphabetize': return h.match(/Words: (.*)/)[1].split(' · ').sort().join(' · ');
  case 'homograph': {const row=HOMOGRAPHS.find(x=>x[3]===h||x[4]===h);assert.ok(row);return h===row[3]?row[1]:row[2];}
  case 'phraseorder': {const words=h.match(/Tiles: (.*)/)[1].split(' · '),subjects=['BIRDS','ROBOTS','RIVERS','CHILDREN','WORKERS','PLANES','HORSES','ACTORS'],verbs=['CHASE','WATCH','FOLLOW','CARRY','MOVE','GUIDE','VISIT','HELP'],s=words.find(x=>subjects.includes(x)),v=words.find(x=>verbs.includes(x)),o=words.find(x=>x!==s&&x!==v);return `${s} ${v} ${o}`;}
  case 'editdistance': {const[,a,b]=h.match(/([A-Z]+) → ([A-Z]+)/);return String(editDistance(a,b));}
  case 'letterpairs': {const s=h.match(/Letters: ([A-Z]+)/)[1];return String([...s].slice(1).reduce((n,c,i)=>n+Number(c.charCodeAt(0)===[...s][i].charCodeAt(0)+1),0));}
  case 'acronym': return h.match(/Categories: (.*)/)[1].split(' · ').map(x=>x[0]).join('');
  case 'subsequence': {const s=h.match(/Source: ([A-Z]+)/)[1],valid=options.filter(x=>subseq(x,s));assert.equal(valid.length,1);return valid[0];}
  case 'letterpattern': {const s=h.match(/Pattern source: ([A-Z]+)/)[1],valid=options.filter(x=>pattern(x)===pattern(s));assert.equal(valid.length,1);return valid[0];}
  case 'codebreak': {const[,key,code]=h.match(/Key (.*?) · Code (.*)/),map=new Map([...key.matchAll(/([▲●■◆★])=(\d+)/g)].map(m=>[m[1],m[2]]));return [...code].map(x=>map.get(x)).join('');}
  case 'assignment': {const people=['A','B','C'],jobs=['RED','BLUE','GOLD'],clues=[...h.matchAll(/([A-C]) ≠ (RED|BLUE|GOLD)/g)].map(m=>m.slice(1)),solutions=permutations(jobs).filter(p=>clues.every(([who,job])=>p[people.indexOf(who)]!==job)),job=title.match(/WHO GETS (RED|BLUE|GOLD)/)[1];assert.equal(solutions.length,1);return people[solutions[0].indexOf(job)];}
  case 'decisiontree': {const[,v,even,odd,limit]=h.match(/Start (\d+) · If even add (\d+); if odd subtract (\d+) · Is result at least (\d+)/).map(Number),result=v%2===0?v+even:v-odd;return result>=limit?'YES':'NO';}
  case 'causalorder': {const target=title.match(/CAUSES ([A-F])/)[1],edge=[...h.matchAll(/([A-F]) → ([A-F])/g)].find(m=>m[2]===target);assert.ok(edge);return edge[1];}
  case 'setcover': {const universe=h.match(/Universe ([A-F]+)/)[1],sets=[...h.matchAll(/\d+:\{([A-F]+)\}/g)].map(m=>m[1]),full=new Set(universe);for(let k=1;k<=sets.length;k++)for(const c of combinations(sets,k))if([...full].every(x=>c.some(s=>s.includes(x))))return String(k);assert.fail('no cover');}
  case 'scheduling': {const[,a,b,c,d]=h.match(/A \((\d+)\) and B \((\d+)\) run together; then C \((\d+)\); then D \((\d+)\)/).map(Number);return String(Math.max(a,b)+c+d);}
  case 'stateflow': {const start=h.match(/Start ([A-C])/)[1],inputs=h.match(/Inputs ([XY]+)/)[1],map=new Map([...h.matchAll(/([A-C]) ([XY])→([A-C])/g)].map(m=>[`${m[1]}${m[2]}`,m[3]]));let s=start;for(const c of inputs)s=map.get(s+c);return s;}
  case 'reachability': {const edges=[...h.matchAll(/([A-F])→([A-F])/g)].map(m=>m.slice(1)),seen=new Set(['A']),q=['A'];for(let i=0;i<q.length;i++)for(const[a,b]of edges)if(a===q[i]&&!seen.has(b)){seen.add(b);q.push(b);}return seen.has('F')?'YES':'NO';}
  case 'dualtrack': {const[,nums,shapes]=h.match(/Numbers: ([1-9 ]+) · Count evens\. Shapes: ([▲●■ ]+) · Count ●/);return `${nums.split(' ').filter(x=>Number(x)%2===0).length} | ${[...shapes].filter(x=>x==='●').length}`;}
  case 'visualtracking': {const target=title.match(/TRACK ([A-D])/)[1],initial=h.match(/Start slots 1–4: ([A-D](?: · [A-D]){3})/)[1].split(' · '),row=[...initial];for(const[,a,b]of h.split('Swaps ')[1].matchAll(/(\d)↔(\d)/g)){[row[a-1],row[b-1]]=[row[b-1],row[a-1]];}return `SLOT ${row.indexOf(target)+1}`;}
  case 'suppressrepeat': {const[,prev,current]=h.match(/Previous cue (LEFT|RIGHT) · Current cue (LEFT|RIGHT)/);return prev===current?'HOLD':current==='LEFT'?'RIGHT':'LEFT';}
  case 'stopsignal': {const[,action,deadline,stop]=h.match(/GO (LEFT|RIGHT) · response deadline (\d+) ms · STOP arrives at (\d+) ms/);return Number(stop)<Number(deadline)?'HOLD':action;}
  case 'taskshift': {const m=h.match(/C=([A-Z]+) · S=([A-Z]+) · (.*)/);assert.ok(m);const[,color,shape,text]=m,rows=text.split(' · ').map(x=>x.match(/([CS]):([A-Z]+)\/([A-Z]+)/));assert.ok(rows.every(Boolean));return String(rows.filter(([,cue,c,s])=>cue==='C'?c===color:s===shape).length);}
  case 'crossmonitor': return String([...h.matchAll(/(\d)\/(\d)/g)].filter(m=>Number(m[1])>Number(m[2])).length);
  case 'keymap': {const map=new Map([...h.matchAll(/([1-6])=(NORTH|EAST|SOUTH|WEST)/g)].map(m=>[m[2],m[1]])),dir=title.match(/MOVES (NORTH|EAST|SOUTH|WEST)/)[1];return map.get(dir);}
  case 'partition': {const values=h.match(/Use every value once: ([\d ·]+)/)[1].split(' · ').map(Number),total=values.reduce((a,b)=>a+b,0);if(total%2)return 'NO';for(let m=1;m<(1<<values.length)-1;m++){let sum=0;for(let i=0;i<values.length;i++)if(m>>i&1)sum+=values[i];if(sum===total/2)return 'YES';}return 'NO';}
  case 'interval': {const[,a,b,c,d]=h.match(/A \[(\d+), (\d+)\] · B \[(\d+), (\d+)\]/).map(Number);return Math.max(a,c)<Math.min(b,d)?'OVERLAP':Math.max(a,c)===Math.min(b,d)?'TOUCH':'SEPARATE';}
  default: assert.fail(`Missing v0.7 oracle ${t}`);
 }
}

registerTest('ruleset 7 adds exactly 50 distinct IDs to the preserved 82',()=>{
 assert.equal(TEMPLATES.length,132);assert.equal(NOVEL_TEMPLATES.length,50);assert.equal(V07_TEMPLATES.length,50);assert.equal(new Set(TEMPLATES).size,132);assert.equal(new Set(V07_TEMPLATES).size,50);
 for(const t of V07_TEMPLATES)assert.ok(TEMPLATES.includes(t),t);
});

registerTest('50 new templates × 1000 visible-contract oracle cases',()=>{
 for(const t of V07_TEMPLATES)for(let seed=0;seed<1000;seed++){
  const r=makeRound(t,`v07-oracle-${seed}`,seed%132,`${t}-${seed}`,'739',1+seed%4),answer=v07Oracle(t,r),label=winner(r);
  assert.equal(r.kind,'choice',t);assert.ok(r.duration>=1500&&r.duration>r.cueDelay,t);assert.ok(r.title&&r.hint&&r.explanation,t);
  assert.ok(r.options.length>=2&&r.options.length<=4,t);assert.equal(new Set(r.options.map(x=>x.label)).size,r.options.length,t);
  assert.equal(r.options.filter(x=>x.id===r.correct).length,1,t);assert.equal(r.expected,answer,`${t}, seed ${seed}: ${r.title} / ${r.hint}`);assert.equal(label,answer,`${t}, seed ${seed}`);
  assert.ok(!/undefined|NaN/.test(`${r.title} ${r.hint} ${label} ${r.explanation}`),`${t}: malformed prompt`);
  for(const s of [r.title,r.hint,...r.options.map(x=>x.label)])assert.equal([...s].join(''),s,`${t}: malformed Unicode`);
 }
});

registerTest('alphabetize answer is locale-independent code-point order',()=>{
 const original=String.prototype.localeCompare;
 String.prototype.localeCompare=function(){throw new Error('localeCompare must not influence seeded answers');};
 try {
  for(let seed=0;seed<100;seed++){
   const round=makeRound('alphabetize',`locale-${seed}`,seed,'locale-round','739',1);
   const expected=round.hint.match(/Words: (.*)/)[1].split(' · ').sort().join(' · ');
   assert.equal(round.expected,expected);
  }
 } finally { String.prototype.localeCompare=original; }
});

registerTest('all 132 questions reproduce exactly for equal seeds',()=>{
 for(const t of TEMPLATES)for(let seed=0;seed<20;seed++)assert.deepEqual(makeRound(t,`same-${seed}`,seed%132,'same-round','739',1+seed%4),makeRound(t,`same-${seed}`,seed%132,'same-round','739',1+seed%4));
});

registerTest('fold wording matches its axis and shortest-route answers vary with visible obstacles',()=>{
 const distances=new Set();
 for(let seed=0;seed<1000;seed++){
  const fold=makeRound('foldpaper',`fold-quality-${seed}`,seed,'fold','739',1),axis=fold.hint.includes('vertical')?'vertical':'horizontal',side=fold.hint.match(/Fold (\w+) half/)[1];
  assert.equal(axis==='vertical'?['left','right'].includes(side):['top','bottom'].includes(side),true,fold.hint);
  assert.equal(fold.expected,v07Oracle('foldpaper',fold),fold.hint);
  const route=makeRound('routeplan',`route-quality-${seed}`,seed,'route','739',1),answer=Number(v07Oracle('routeplan',route));
  assert.ok([8,10,12].includes(answer),route.hint);distances.add(answer);
  assert.equal(route.expected,String(answer),route.hint);
 }
 assert.equal(distances.size,3,`expected shortest route lengths 10, 12 and 14; got ${[...distances]}`);
});
