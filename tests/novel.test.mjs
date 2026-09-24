import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRound, TEMPLATES } from '../build/modules/games.js';
import { NOVEL_TEMPLATES } from '../build/modules/novel.js';
import { ANALOGIES, CATEGORIES_OF_THINGS, COMPOUNDS, HOMOPHONES, RHYME_FAMILIES } from '../build/modules/vocabulary.js';

const registerTest=process.env.HUMAN_ERROR_ORACLE_BRIDGE==='1'?()=>{}:test;
const label = round => round.options.find(option => option.id === round.correct)?.label;
const nums = value => (value.match(/-?\d+/g) ?? []).map(Number);
function roman(value) {
  let total=0;
  for(let i=0;i<value.length;i++){const x={I:1,V:5,X:10,L:50,C:100}[value[i]];const y={I:1,V:5,X:10,L:50,C:100}[value[i+1]]??0;total+=x<y?-x:x;}
  return String(total);
}
export function novelOracle(t,r) {
  const h=r.hint, title=r.title, options=r.options.map(x=>x.label);
  if(t==='mirror'){const g=h.match(/Grid: ([.#]+) \/ ([.#]+) \/ ([.#]+)/).slice(1);return g.map(row=>[...row].reverse().join('')).join('');}
  if(t==='rotate'){const g=h.match(/Tile: (\d+) (\d+) \/ (\d+) (\d+)/).slice(1).map(Number);return `${g[2]} ${g[0]} / ${g[3]} ${g[1]}`;}
  if(t==='loopcount'){const code=h.match(/Digits: ([0-9]+)/)[1];return String([...code].reduce((a,x)=>a+(x==='8'?2:'069'.includes(x)?1:0),0));}
  if(t==='overlap'){const [,a,b]=h.match(/Set A: ([A-H]+) · Set B: ([A-H]+)/);return [...a].filter(x=>b.includes(x)).sort().join('');}
  if(t==='occlusion')return h.match(/front → back: [A-F] > [A-F] > ([A-F])/)[1];
  if(t==='changegrid'){const [,a,b]=h.match(/Before ([A-D]+) · After ([A-D]+)/);return String([...a].findIndex((x,i)=>x!==b[i])+1);}
  if(t==='pathtrace'){let [,col,row,moves]=h.match(/Start ([A-D])([1-4]) · Moves ([NESW]+)/);let x=col.charCodeAt(0)-65,y=Number(row)-1;for(const d of moves){if(d==='N')y--;if(d==='S')y++;if(d==='E')x++;if(d==='W')x--;}return `${'ABCD'[x]}${y+1}`;}
  if(t==='components'){
    const rows=h.match(/Grid \(# = filled cell\): ([.#]+) \/ ([.#]+) \/ ([.#]+) \/ ([.#]+)/).slice(1),seen=new Set();let count=0;
    for(let y=0;y<4;y++)for(let x=0;x<4;x++){const k=y*4+x;if(rows[y][x]!=='#'||seen.has(k))continue;count++;const q=[k];seen.add(k);while(q.length){const p=q.pop(),px=p%4,py=Math.floor(p/4);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=px+dx,ny=py+dy,j=ny*4+nx;if(nx>=0&&nx<4&&ny>=0&&ny<4&&rows[ny][nx]==='#'&&!seen.has(j)){seen.add(j);q.push(j);}}}}
    return String(count);
  }
  if(t==='tilefit'){const [,first,second,third]=h.match(/Rows ([A-F]{3}) \/ ([A-F]{3}) \/ ([A-F]{2})\?/);assert.equal(second,first.slice(1)+first[0]);assert.equal(third,first.slice(2)+first[0]);return first[1];}
  if(t==='cubeface'){const m=h.match(/Net: ([A-F]) above ([A-F]) · ([A-F])-([A-F])-([A-F])-([A-F]) in a row/);assert.ok(m);return m[6];}
  if(t==='conflict'){const arrow=h.match(/Arrow ([←→↑↓])/)[1];return {'←':'LEFT','→':'RIGHT','↑':'UP','↓':'DOWN'}[arrow];}
  if(t==='ruleswitch'){const cue=title.match(/RULE ([AB])/)[1],v=nums(h);return String(cue==='A'?Math.min(...v):Math.max(...v));}
  if(t==='ruleinfer'){const pairs=[...h.matchAll(/(\d+)→(\d+)/g)].map(m=>[+m[1],+m[2]]);const ratio=pairs[0][1]/pairs[0][0];assert.ok(pairs.every(([x,y])=>y/x===ratio));return String(Number(h.match(/· (\d+)→\?/)[1])*ratio);}
  if(t==='errorcheck'){const odd=title.includes('ODD'),values=nums(h),bad=values.filter(x=>(Math.abs(x)%2===1)!==odd);assert.equal(bad.length,1);return String(bad[0]);}
  if(t==='rulefollow'){const [a,b]=nums(h),z=title.includes('SUM')?a+b:a*b;return String(z+1);}
  if(t==='queueorder'){const start=h.match(/Start ([A-D]) ([A-D]) ([A-D]) ([A-D])/).slice(1);[start[0],start[3]]=[start[3],start[0]];const c=start.indexOf('C');start.splice(c,1);start.unshift('C');return start.join(' ');}
  if(t==='stateupdate'){const [,s,a,op,b]=h.match(/Start (\d+) · \+(\d+) · ([+-])(\d+)/);return String(Number(s)+Number(a)+(op==='+'?1:-1)*Number(b));}
  if(t==='nback'){const seq=h.match(/Sequence ([A-D](?: · [A-D]){4})/)[1].split(' · ');return seq.at(-3);}
  if(t==='timeline'){const times=[...h.matchAll(/([ABC])=(\d+)/g)].map(m=>[m[1],+m[2]]).sort((a,b)=>a[1]-b[1]);assert.equal(times.length,3);return times[1][0];}
  if(t==='elapsed'){const [,a,b]=h.match(/From (\d\d:\d\d) to (\d\d:\d\d)/),to=x=>Number(x.slice(0,2))*60+Number(x.slice(3));return String((to(b)-to(a)+1440)%1440);}
  if(t==='beats'){const v=nums(h),g=v.slice(1).map((x,i)=>x-v[i]);return String(Math.max(...g));}
  if(t==='prime'){const candidates=nums(h);const p=candidates.filter(x=>x>1&&Array.from({length:x-2},(_,i)=>i+2).every(d=>x%d!==0));assert.equal(p.length,1);return String(p[0]);}
  if(t==='factorpairs'){const x=Number(title.match(/FACTOR PAIRS OF (\d+)/)[1]);return String(Array.from({length:x},(_,i)=>i+1).filter(a=>a<=x/a&&x%a===0).length);}
  if(t==='modthree')return String(Number(h.match(/Number (\d+)/)[1])%3);
  if(t==='fraction'){return options.sort((a,b)=>{const [an,ad]=a.split('/').map(Number),[bn,bd]=b.split('/').map(Number);return an/ad-bn/bd;}).at(-1);}
  if(t==='ratio'){const [a,b]=nums(h.match(/Base ratio\s+(\d+:\d+)/)[1]),winner=options.filter(x=>{const [c,d]=x.split(':').map(Number);return c*b===d*a;});assert.equal(winner.length,1);return winner[0];}
  if(t==='estimate'){const x=Number(h.match(/Number (\d+)/)[1]);return String(Math.round(x/10)*10);}
  if(t==='binary')return String(parseInt(h.match(/Binary ([01]{8}|[01]{6})/)[1],2));
  if(t==='balance'){const [,sign,a,total]=title.match(/SOLVE: X ([+-]) (\d+) = (-?\d+)/);return String(Number(total)+(sign==='+'?-1:1)*Number(a));}
  if(t==='precedence'){const [,a,b,c]=h.match(/Compute (\d+) \+ (\d+) × (\d+)/);return String(+a+(+b)*(+c));}
  if(t==='unitrate'){const [,d,tim]=h.match(/(\d+) km in (\d+) hours/);return String(+d/+tim);}
  if(t==='chance'){const [,red,blue]=h.match(/Bag: (\d+) red \+ (\d+) blue/),total=+red + +blue;return options.find(x=>{const [a,b]=x.split('/').map(Number);return a*total===+red*b;});}
  if(t==='roman')return roman(h.match(/^([IVXLC]+)/)[1]);
  if(t==='mean'){const v=nums(h);return String(v.reduce((a,b)=>a+b,0)/v.length);}
  if(t==='perimeter'){const [a,b]=nums(h);return String(2*(a+b));}
  if(t==='anagram'){const chars=[...h].sort().join('');const winners=options.filter(x=>[...x].sort().join('')===chars);assert.equal(winners.length,1);return winners[0];}
  if(t==='weave'){const [,a,b]=h.match(/First ([A-Z]+) · Second ([0-9]+)/);return [...a].map((x,i)=>x+b[i]).join('');}
  if(t==='rhyme'){const target=title.match(/WITH ([A-Z]+)/)[1],family=RHYME_FAMILIES.find(x=>x.includes(target));return options.find(x=>family.includes(x));}
  if(t==='analogy'){const relation=title.match(/^([A-Z]+) : ([A-Z]+) :: ([A-Z]+) :/),row=ANALOGIES.find(x=>x[0]===relation[1]&&x[1]===relation[2]&&x[2]===relation[3]);assert.ok(row);return row[3];}
  if(t==='compound'){const [,a,b]=h.match(/Part 1 ([A-Z]+) · Part 2 ([A-Z]+)/);return a+b;}
  if(t==='caesar'){const shift=Number(title.match(/SHIFT −(\d+)/)[1]);return [...h].map(ch=>String.fromCharCode((ch.charCodeAt(0)-65-shift+26)%26+65)).join('');}
  if(t==='homophone'){return HOMOPHONES.find(x=>x[0]===h)?.[1];}
  if(t==='categorize'){const category=title.match(/WHICH IS A ([A-Z]+)\?/)[1],matches=options.filter(x=>CATEGORIES_OF_THINGS[category].includes(x));assert.equal(matches.length,1);return matches[0];}
  if(t==='xor'){const [,nameA,a,nameB,b]=h.match(/([A-Z]+) is (true|false) · ([A-Z]+) is (true|false)/i);return String((a==='true')!==(b==='true')).toUpperCase();}
  if(t==='implication'){const [,pName,p,,q]=h.match(/([A-Z]+) is (true|false) · ([A-Z]+) is (true|false)/i);return String(p!=='true'||q==='true').toUpperCase();}
  if(t==='syllogism'){const matches=[...h.matchAll(/All ([A-Z]+) are ([A-Z]+)\./g)];assert.equal(matches.length,2);return matches[0][2]===matches[1][1]?'YES':'CANNOT INFER';}
  if(t==='ordering'){const pairs=[...h.matchAll(/([A-D]) before ([A-D])/g)];return ['A','B','C','D'].find(x=>!pairs.some(p=>p[1]===x));}
  if(t==='setdiff'){const [,a,b]=h.match(/A ([A-Z]+) · B ([A-Z]+)/);return [...a].filter(x=>!b.includes(x)).join('');}
  if(t==='counterexample')return options.find(x=>Number(x)%2===1);
  if(t==='sieve'){const values=nums(h),valid=values.filter(x=>x%2===1&&x%3===0);assert.equal(valid.length,1);return String(valid[0]);}
  assert.fail(`No independent visible-contract oracle for ${t}: ${title} / ${h}`);
}

registerTest('50 added missions have independent visible-contract oracles across 1000 seeds each',()=>{
  assert.equal(TEMPLATES.length,132);assert.equal(NOVEL_TEMPLATES.length,50);assert.equal(new Set(NOVEL_TEMPLATES).size,50);
  for(const t of NOVEL_TEMPLATES)for(let seed=0;seed<1000;seed++){
    const r=makeRound(t,`novel-${seed}`,seed%82,`novel:${seed}`,null),answer=novelOracle(t,r),winner=label(r);
    assert.equal(r.kind,'choice',t);assert.equal(r.options.length,3,t);assert.equal(new Set(r.options.map(o=>o.label)).size,3,t);
    assert.equal(r.options.filter(o=>o.id===r.correct).length,1,t);assert.ok(Number(r.correct)>=0&&Number(r.correct)<3,t);
    assert.ok(r.title&&r.hint&&r.explanation&&!/undefined|NaN/.test(`${r.title} ${r.hint} ${r.explanation}`),`${t}: malformed visible prompt`);
    assert.ok(r.duration>=1500&&r.duration>r.cueDelay,t);assert.equal(winner,answer,`${t}, seed ${seed}: ${r.title} / ${r.hint}`);
    assert.equal(r.expected,answer,t);
    for(const text of [r.title,r.hint,...r.options.map(o=>o.label)])assert.equal([...text].join(''),text,`${t}: malformed Unicode`);
  }
});

registerTest('novel question generation is byte-for-byte deterministic',()=>{
  for(const t of NOVEL_TEMPLATES)for(let seed=0;seed<100;seed++)assert.deepEqual(makeRound(t,`same-${seed}`,seed%82,'same',null),makeRound(t,`same-${seed}`,seed%82,'same',null));
});
