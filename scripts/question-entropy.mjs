import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { CATEGORY, makeRound, TEMPLATES } from '../build/modules/games.js';
import { Director } from '../build/modules/director.js';

const constrained=new Set(['brakes','reaction','override','counter','suppressrepeat']);
const group=t=>constrained.has(t)?'constrained-reflex':CATEGORY[t]==='numbers'?'numeric-procedural':CATEGORY[t]==='words'?'vocabulary-semantic':'grid-state-symbolic';
const threshold=t=>({ 'constrained-reflex':4,'numeric-procedural':80,'vocabulary-semantic':30,'grid-state-symbolic':60 })[group(t)];
const rows=[];
for(const template of TEMPLATES){
  const signatures=new Set();
  for(let seed=0;seed<100;seed++){
    const r=makeRound(template,`entropy-v07-${seed}`,seed%TEMPLATES.length,`entropy:${seed}`,'739',1+seed%4);
    signatures.add(JSON.stringify([r.template,r.title,r.hint,r.options.map(x=>x.label),r.memoryValue]));
  }
  rows.push({template,category:CATEGORY[template],group:group(template),target:threshold(template),uniquePer100:signatures.size});
}
const counts=rows.map(x=>x.uniquePer100).sort((a,b)=>a-b),below30=rows.filter(x=>x.uniquePer100<30),below20=rows.filter(x=>x.uniquePer100<20);
const firstMissionDistribution={};
for(let seed=0;seed<1000;seed++){const first=new Director(`opening-audit-${seed}`,'challenge').choose(0);firstMissionDistribution[first]=(firstMissionDistribution[first]??0)+1;}
const report={templateCount:TEMPLATES.length,seedsPerTemplate:100,signatureFields:['template','title','hint','visible option labels in shown order','visible memory value'],summary:{minimum:counts[0],median:(counts[65]+counts[66])/2,mean:counts.reduce((a,b)=>a+b,0)/counts.length,maximum:counts.at(-1)},below30,below20,firstMissionDistribution,missions:rows};
mkdirSync('qa',{recursive:true});writeFileSync('qa/v07-question-entropy.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({summary:report.summary,below30,below20,firstMissionDistribution},null,2));
for(const row of rows)assert.ok(row.uniquePer100>=row.target,`${row.template}: ${row.uniquePer100}/${row.target} unique signatures`);
