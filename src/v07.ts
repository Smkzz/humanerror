import type { NovelCard } from './novel.js';
import { Random } from './random.js';
import type { Category, V07Template } from './types.js';
import { CATEGORIES_OF_THINGS, HOMOGRAPHS, PALINDROMES, WORDS } from './vocabulary.js';

export const V07_TEMPLATES: readonly V07Template[] = Object.freeze([
  'raysight','knightmove','taxicab','foldpaper','stackview','griddegree','routeplan','linecross','orientation','focusfilter',
  'gcd','lcm','percent','square','calendar','clockangle','area','combinations','unitconvert','fractionadd','signedcompare','weightedmean','consecutive',
  'palindrome','wordladder','alphabetize','homograph','phraseorder','editdistance','letterpairs','acronym','subsequence','letterpattern',
  'codebreak','assignment','decisiontree','causalorder','setcover','scheduling','stateflow','reachability',
  'dualtrack','visualtracking','suppressrepeat','stopsignal','taskshift','crossmonitor','keymap','partition','interval'
]);
const CATEGORY_NAMES: readonly Category[] = ['attention','numbers','words','memory','reflex'];
const CATEGORY_CODES = '00100000001111111111111222222222200000030334400013';
export const V07_CATEGORY: Readonly<Record<V07Template, Category>> = Object.freeze(Object.fromEntries(V07_TEMPLATES.map((t,i) => [t,CATEGORY_NAMES[+CATEGORY_CODES[i]!]!])) as Record<V07Template, Category>);

const LONG_DURATIONS = new Set([3,4,6,10,11,13,15,17,24,28,33,34,35,37,38,39,45,48]);
const DAYS = Object.freeze(['MON','TUE','WED','THU','FRI','SAT','SUN']);
const DIRS = Object.freeze(['N','E','S','W']);
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const WORD5 = WORDS.filter(w => w.length === 5);
const ham = (a: string,b: string): number => [...a].reduce((n,c,i) => n + Number(c !== b[i]),0);
const LADDER_PAIRS: readonly (readonly [string,string,string])[] = (() => {
  const out: [string,string,string][] = [];
  for (const a of WORD5) for (const b of WORD5) {
    if (a >= b || ham(a,b) !== 2) continue;
    const mids = WORD5.filter(x => ham(a,x) === 1 && ham(x,b) === 1);
    for(const middle of mids)out.push([a,middle,b]);
  }
  return Object.freeze(out);
})();
const gcd = (a: number,b: number): number => b ? gcd(b,a % b) : Math.abs(a);
const lcm = (a: number,b: number): number => a / gcd(a,b) * b;
const gcdText = (a: number,b: number): string => { const d=gcd(a,b); return `${a/d}/${b/d}`; };
const coord = (x: number,y: number): string => `${LETTERS[x]}${y+1}`;
const parseCoord = (s: string): [number,number] => [s.charCodeAt(0)-65,Number(s.slice(1))-1];
const modAngle = (n: number): number => { const x=((n%360)+360)%360; return Math.min(x,360-x); };
function card(template: V07Template,title: string,hint: string,answer: string,wrong: readonly string[],duration?: number): NovelCard {
  const options=new Random(`${template}|${title}|${hint}|${[answer,...wrong].join('|')}`).shuffle([answer,...wrong]);
  if (options.length<2 || options.length>4 || new Set(options).size!==options.length || !options.includes(answer)) throw new Error(`Invalid ${template} options`);
  return Object.freeze({category:V07_CATEGORY[template],title:title.trim(),hint,answer,options:Object.freeze(options),explanation:`Answer: ${answer}.`,duration:Math.max(LONG_DURATIONS.has(V07_TEMPLATES.indexOf(template))?5400:4400,duration??0)});
}
function bfs(grid: readonly string[],sx: number,sy: number,gx: number,gy: number): number {
  const q:[number,number,number][]=[[sx,sy,0]],seen=new Set([`${sx},${sy}`]);
  const dirs:[number,number][]=[[1,0],[-1,0],[0,1],[0,-1]];
  for(let i=0;i<q.length;i++) { const [x,y,d]=q[i]!; if(x===gx&&y===gy)return d; for(const [dx,dy] of dirs) { const nx=x+dx,ny=y+dy,k=`${nx},${ny}`; if(nx>=0&&ny<grid.length&&ny>=0&&nx<grid[ny]!.length&&grid[ny]![nx]!== '#'&&!seen.has(k)){seen.add(k);q.push([nx,ny,d+1]);} } }
  return -1;
}
function pattern(s: string): string { const ids=new Map<string,number>(); return [...s].map(c=>{if(!ids.has(c))ids.set(c,ids.size);return String(ids.get(c));}).join(''); }
function editDistance(a: string,b: string): number {
  const row=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){let prev=row[0]!;row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j]!;row[j]=Math.min(row[j]!+1,row[j-1]!+1,prev+Number(a[i-1]!==b[j-1]));prev=old;}}
  return row[b.length]!;
}
function partitionExists(values: readonly number[]): boolean {
  const total=values.reduce((a,b)=>a+b,0); if(total%2)return false;
  const sums=new Set([0]); for(const x of values)for(const s of [...sums])sums.add(s+x); return sums.has(total/2);
}
function shuffled<T>(rng: Random,values: readonly T[]): T[] { return rng.shuffle(values); }
function chooseWords(rng: Random,count: number,exclude: readonly string[]=[]): string[] {
  return rng.shuffle(WORDS.filter(w=>!exclude.includes(w))).slice(0,count);
}
function permutations<T>(values: readonly T[]): T[][] {
  if(values.length<2)return [[...values]];
  return values.flatMap((value,index)=>permutations([...values.slice(0,index),...values.slice(index+1)]).map(rest=>[value,...rest]));
}
function isSubsequence(needle: string,haystack: string): boolean {
  let at=0; for(const c of haystack)if(c===needle[at])at++; return at===needle.length;
}
const SUBJECTS=Object.freeze(['BIRDS','ROBOTS','RIVERS','CHILDREN','WORKERS','PLANES','HORSES','ACTORS']);
const VERBS=Object.freeze(['CHASE','WATCH','FOLLOW','CARRY','MOVE','GUIDE','VISIT','HELP']);
const OBJECTS=Object.freeze(['CLOUDS','MICE','BOATS','STONES','FLOWERS','FRIENDS','BRIDGES','PLANETS']);
const COLOURS=Object.freeze(['RED','BLUE','GREEN','GOLD']);
const SHAPES=Object.freeze(['CIRCLE','SQUARE','TRIANGLE','STAR']);

export function makeV07Card(template: V07Template,rng: Random,level=1): NovelCard {
  const n=(lo: number,hi: number): number=>rng.int(lo,hi), pick=<T>(a: readonly T[]):T=>rng.pick(a);
  level=Math.max(1,Math.min(4,Math.trunc(level)));
  switch(V07_TEMPLATES.indexOf(template)){
    case 0: {
      const size=7,cx=3,cy=3,grid:string[][]=Array.from({length:size},()=>Array<string>(size).fill('.')),dirs:[number,number][]=[[0,-1],[1,0],[0,1],[-1,0],[1,-1],[1,1],[-1,1],[-1,-1]],chosen=rng.shuffle(dirs).slice(0,3),clear=rng.int(0,2),labels=['A','B','C'];
      grid[cy]![cx]='@';
      chosen.forEach((dir,i)=>{const [dx,dy]=dir,dist=n(2,3),x=cx+dx*dist,y=cy+dy*dist;if(i!==clear)grid[cy+dy]![cx+dx]='#';grid[y]![x]=labels[i]!;});
      const rows=grid.map(r=>r.join('')),answer=labels[clear]!;
      return card(template,'WHICH MARK HAS A CLEAR LINE OF SIGHT? ',`Grid: ${rows.join(' / ')} · @ is you; # blocks sight`,answer,labels.filter(x=>x!==answer));
    }
    case 1: {
      const x=n(0,7),y=n(0,7),legal:[number,number][]=[];
      const jumps:[number,number][]=[[1,2],[1,-2],[-1,2],[-1,-2],[2,1],[2,-1],[-2,1],[-2,-1]];for(const [dx,dy] of jumps)if(x+dx>=0&&x+dx<8&&y+dy>=0&&y+dy<8)legal.push([x+dx,y+dy]);
      const good=coord(...pick(legal)),bad:string[]=[]; while(bad.length<2){const c=coord(n(0,7),n(0,7)),[cx,cy]=parseCoord(c);if(c!==good&&!legal.some(([a,b])=>a===cx&&b===cy)&&!bad.includes(c))bad.push(c);}
      return card(template,`KNIGHT MOVE FROM ${coord(x,y)}.`,`A knight moves two squares in one axis and one in the other.`,good,bad);
    }
    case 2: {
      const a=coord(n(0,7),n(0,7)),b=coord(n(0,7),n(0,7)),[x,y]=parseCoord(a),[u,v]=parseCoord(b),d=Math.abs(x-u)+Math.abs(y-v);
      const wrong=rng.shuffle([...new Set([d-2,d-1,d+1,d+2].filter(x=>x>=0&&x!==d))]).slice(0,2).map(String); return card(template,'GRID DISTANCE. ',`${a} to ${b} · Horizontal plus vertical steps`,String(d),wrong);
    }
    case 3: {
      const axis=pick(['columns','rows'] as const),side=axis==='columns'?pick(['left','right'] as const):pick(['top','bottom'] as const),x=n(0,5),y=n(0,5),folded=axis==='columns'?(side==='left'?x<3:x>=3):(side==='top'?y<3:y>=3);
      const result=axis==='columns'?[folded?5-x:x,y]:[x,folded?5-y:y],answer=coord(result[0]!,result[1]!);
      let bad=[coord((result[0]!+1)%6,result[1]!),coord(result[0]!, (result[1]!+1)%6)]; if(bad[0]===bad[1])bad=[coord((result[0]!+2)%6,result[1]!),coord(result[0]!, (result[1]!+2)%6)];
      return card(template,'WHERE DOES THE HOLE LAND?',`6×6 grid: columns A–F left→right, rows 1–6 top→bottom · Fold ${side} half over the ${axis==='columns'?'vertical':'horizontal'} centre line · Hole at ${coord(x,y)}`,answer,bad);
    }
    case 4: {
      const front=Array.from({length:3},()=>n(1,6)),back=Array.from({length:3},()=>n(1,6)),hidden=front.reduce((s,h,i)=>s+Math.min(h,back[i]!),0);
      const wrong=rng.shuffle([...new Set([hidden-2,hidden-1,hidden+1,hidden+2].filter(x=>x>=0&&x!==hidden))]).slice(0,2).map(String); return card(template,'HOW MANY REAR CUBES ARE HIDDEN? ',`Front stack heights ${front.join(' · ')} · Behind ${back.join(' · ')}`,String(hidden),wrong);
    }
    case 5: {
      const size=5,x=n(1,3),y=n(1,3),g:string[][]=Array.from({length:size},()=>Array.from({length:size},()=>rng.next()<.35?'#':'.'));
      g[y]![x]='@'; const rows=g.map(r=>r.join('')),near:[number,number][]=[[x+1,y],[x-1,y],[x,y+1],[x,y-1]],count=near.filter(([cx,cy])=>g[cy]![cx]==='#').length;
      return card(template,'HOW MANY EDGE-ADJACENT CELLS CONTAIN #?',`Grid: ${rows.join(' / ')} · @ is the marked cell`,String(count),[String((count+1)%5),String((count+2)%5)]);
    }
    case 6: {
      const size=5,g:string[][]=[],wanted=pick([8,10,12] as const);let rows:string[]=[],distance=-1,attempts=0;
      do { for(let y=0;y<size;y++)g[y]=Array.from({length:size},()=>rng.next()<.32?'#':'.');g[0]![0]='S';g[4]![4]='G';rows=g.map(r=>r.join(''));distance=bfs(rows,0,0,4,4);attempts++; } while(distance!==wanted&&attempts<250);
      if(distance!==wanted){
        const detours:Record<number,ReadonlyArray<readonly [number,number]>>={8:[[0,0],[1,0],[2,0],[3,0],[4,0],[4,1],[4,2],[4,3],[4,4]],10:[[0,0],[1,0],[1,1],[1,2],[0,2],[0,3],[0,4],[1,4],[2,4],[3,4],[4,4]],12:[[0,0],[1,0],[2,0],[3,0],[3,1],[3,2],[2,2],[1,2],[1,3],[1,4],[2,4],[3,4],[4,4]]};
        for(let y=0;y<size;y++)g[y]=Array(size).fill('#');for(const [x,y] of detours[wanted]!)g[y]![x]='.';g[0]![0]='S';g[4]![4]='G';rows=g.map(r=>r.join(''));distance=bfs(rows,0,0,4,4);
      }
      const wrong=rng.shuffle([distance-2,distance-1,distance+1,distance+2].filter(x=>x>0&&x!==distance)).slice(0,2).map(String); return card(template,'SHORTEST OPEN ROUTE.',`Map (S start · G goal · # blocked) · Move only up/down/left/right; count steps: ${rows.join(' / ')}`,String(distance),wrong,6000);
    }
    case 7: {
      const nodes=rng.shuffle([...LETTERS.slice(0,8)]),chords=Array.from({length:4},(_,i)=>[nodes[i*2]!,nodes[i*2+1]!] as const);
      const crosses=(p: readonly string[],q: readonly string[]):boolean=>{const ab=p.map(c=>c.charCodeAt(0)).sort((x,y)=>x-y),cd=q.map(x=>x.charCodeAt(0)).sort((x,y)=>x-y),a=ab[0]!,b=ab[1]!,c=cd[0]!,d=cd[1]!;return a<c&&c<b&&b<d||c<a&&a<d&&d<b;};
      let count=0;for(let i=0;i<chords.length;i++)for(let j=i+1;j<chords.length;j++)count+=Number(crosses(chords[i]!,chords[j]!));
      const wrong=rng.shuffle([...new Set([count-2,count-1,count+1,count+2].filter(x=>x>=0&&x!==count))]).slice(0,2).map(String); return card(template,'HOW MANY CHORD PAIRS CROSS? ',`Points A–H go clockwise · Chords ${chords.map(p=>p.join('–')).join(' · ')}`,String(count),wrong);
    }
    case 8: {
      const start=pick(DIRS),turns=Array.from({length:3+level},()=>pick(['L','R','U'] as const));let i=DIRS.indexOf(start);
      for(const t of turns)i=(i+(t==='R'?1:t==='L'?3:2))%4;const answer=DIRS[i]!;
      return card(template,`FINAL HEADING FROM ${start}.`,`Turn sequence: ${turns.join(' · ')} · U means turn around`,answer,DIRS.filter(x=>x!==answer));
    }
    case 9: {
      const shape=pick(SHAPES),fill=pick(['SOLID','HOLLOW'] as const),size=pick(['SMALL','LARGE'] as const),colour=pick(COLOURS),otherShape=pick(SHAPES.filter(x=>x!==shape)),otherFill=fill==='SOLID'?'HOLLOW':'SOLID',otherSize=size==='SMALL'?'LARGE':'SMALL',otherColour=pick(COLOURS.filter(x=>x!==colour)),target=`${size} ${colour} ${fill} ${shape}`;
      return card(template,'MATCH ALL FOUR FEATURES.',`Target: ${target} · Choose the exact item`,target,[`${size} ${colour} ${fill} ${otherShape}`,`${size} ${colour} ${otherFill} ${shape}`,`${otherSize} ${otherColour} ${fill} ${shape}`]);
    }
    case 10: {
      const d=n(2,12);let m1=n(2,12),m2=n(2,12);while(gcd(m1,m2)!==1)m2=n(2,12);const a=d*m1,b=d*m2;return card(template,'GREATEST COMMON DIVISOR.',`Numbers ${a} and ${b}`,String(d),[String(d+1),String(d>1?d-1:d+2)],5600);
    }
    case 11: {
      const a=n(2,18),b=n(2,18),v=lcm(a,b),wrong=rng.shuffle([...new Set([v-2,v-1,v+1,v+2].filter(x=>x>0&&x!==v))]).slice(0,2).map(String);return card(template,'LEAST COMMON MULTIPLE.',`Numbers ${a} and ${b}`,String(v),wrong,5600);
    }
    case 12: {
      const base=n(5,60)*20,pct=n(1,19)*5,v=base*pct/100,wrongPct=rng.shuffle([pct-10,pct-5,pct+5,pct+10].filter(x=>x>0&&x<100)).slice(0,2),wrong=wrongPct.map(x=>String(base*x/100));return card(template,`WHAT IS ${pct}% OF ${base}?`,'Find the stated percentage.',String(v),wrong);
    }
    case 13: {
      const root=n(4,20+level*4),v=root*root,wrong=rng.shuffle([-9,-7,-5,-3,-2,-1,1,2,3,5,7,9].map(o=>v+o).filter(x=>x>0&&Number.isInteger(Math.sqrt(x))===false)).slice(0,2).map(String);return card(template,'WHICH VALUE IS A PERFECT SQUARE?',`Candidates: ${rng.shuffle([String(v),...wrong]).join(' · ')}`,String(v),wrong,5400);
    }
    case 14: {
      const day=n(0,6),days=n(1,999),answer=DAYS[(day+days%7)%7]!;return card(template,`WHAT DAY AFTER ${days} DAYS?`,`Starting day: ${DAYS[day]}`,answer,DAYS.filter(x=>x!==answer).slice(0,2));
    }
    case 15: {
      const h=n(1,12),m=pick([0,10,20,30,40,50]),angle=modAngle(Math.abs((h%12)*30-m*5.5)),answer=String(angle),wrong=rng.shuffle([angle-30,angle-15,angle+15,angle+30].filter(x=>x>=0&&x<=180&&x!==angle)).slice(0,2).map(String);
      return card(template,'SMALLER CLOCK-HAND ANGLE?',`Time ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} · Answer in degrees`,answer,wrong,5600);
    }
    case 16: {
      const a=n(2,30),b=n(2,24),v=a*b,wrong=rng.shuffle([...new Set([v-a,v-b,v+a,v+b].filter(x=>x>0&&x!==v))]).slice(0,2).map(String);return card(template,'RECTANGLE AREA.',`Length ${a} · Width ${b}`,String(v),wrong);
    }
    case 17: {
      const count=n(5,13),mode=pick(['ALL','WITH','WITHOUT'] as const),v=mode==='ALL'?count*(count-1)/2:mode==='WITH'?count-1:(count-1)*(count-2)/2,wrong=rng.shuffle([v-2,v-1,v+1,v+2].filter(x=>x>0)).slice(0,2).map(String),title=mode==='ALL'?'HOW MANY DISTINCT PAIRS?':mode==='WITH'?'HOW MANY PAIRS INCLUDE THE CAPTAIN?':'HOW MANY PAIRS EXCLUDE THE CAPTAIN?';return card(template,title,`${count} people total · Pick 2; order does not matter`,String(v),wrong,5600);
    }
    case 18: {
      const cm=n(1,999),mm=cm*10;return card(template,'CONVERT CENTIMETRES TO MILLIMETRES.',`${cm} cm = ? mm`,String(mm),[String(mm+10),String(mm-10)]);
    }
    case 19: {
      const d=n(3,40),a=n(1,d-2),b=n(1,d-a-1),v=gcdText(a+b,d),bad1=gcdText(a+b+1,d),bad2=gcdText(Math.max(0,a-b),d);
      return card(template,'ADD THE FRACTIONS.',`${a}/${d} + ${b}/${d}`,v,[bad1,bad2]);
    }
    case 20: {
      const values=rng.next()<.5?[n(1,99),-n(1,99),-n(1,99)]:[-n(1,99),-n(1,99),-n(1,99)],unique=[...new Set(values)];while(unique.length<3){const x=-n(1,99);if(!unique.includes(x))unique.push(x);}const v=Math.max(...unique);
      return card(template,'LARGEST SIGNED NUMBER.',`Candidates: ${unique.join(' · ')}`,String(v),unique.filter(x=>x!==v).map(String));
    }
    case 21: {
      let vals=[0,0,0],v=0;do{vals=[n(10,55),n(20,70),n(30,85)];v=(vals[0]!+2*vals[1]!+3*vals[2]!)/6;}while(!Number.isInteger(v)||vals.includes(v));return card(template,'FIND THE WEIGHTED MEAN.',`Scores ${vals[0]}×1 · ${vals[1]}×2 · ${vals[2]}×3`,String(v),[String(v+1),String(v-1)],5600);
    }
    case 22: {
      const first=n(1,100),count=n(2,level===1?5:9),v=count*(2*first+count-1)/2;return card(template,'SUM THE CONSECUTIVE NUMBERS.',`${first} through ${first+count-1}`,String(v),[String(v+1),String(v-1)]);
    }
    case 23: {
      const answer=pick(PALINDROMES),wrong=chooseWords(rng,2,[answer,...PALINDROMES]);
      return card(template,'WHICH WORD READS THE SAME BOTH WAYS?',`Candidates: ${rng.shuffle([answer,...wrong]).join(' · ')}`,answer,wrong);
    }
    case 24: {
      const [start,middle,end]=pick(LADDER_PAIRS),wrong=rng.shuffle(WORDS.filter(w=>w!==start&&w!==middle&&w!==end&&!(w.length===start.length&&ham(start,w)===1&&ham(w,end)===1))).slice(0,2);
      return card(template,'CHOOSE THE SHOWN MIDDLE WORD.',`Change one letter at each step: ${start} → ? → ${end}`,middle,wrong,5800);
    }
    case 25: {
      const words=chooseWords(rng,4),answer=[...words].sort().join(' · '),wrong:string[]=[];
      while(wrong.length<2){const candidate=rng.shuffle(words).join(' · ');if(candidate!==answer&&!wrong.includes(candidate))wrong.push(candidate);}
      return card(template,'PUT THE WORDS IN A–Z ORDER.',`Words: ${words.join(' · ')}`,answer,wrong);
    }
    case 26: {
      const [word,meaningA,meaningB,sentenceA,sentenceB]=pick(HOMOGRAPHS),useA=rng.next()<.5,answer=useA?meaningA:meaningB;
      return card(template,`MEANING OF “${word}” HERE.`,useA?sentenceA:sentenceB,answer,[useA?meaningB:meaningA,'NEITHER MEANING']);
    }
    case 27: {
      const words=[pick(SUBJECTS),pick(VERBS),pick(OBJECTS)],answer=words.join(' '),tokens=rng.shuffle(words),wrong=[`${words[1]} ${words[0]} ${words[2]}`,`${words[0]} ${words[2]} ${words[1]}`];
      return card(template,'PUT THE WORD TILES INTO A SENTENCE.',`Tiles: ${tokens.join(' · ')}`,answer,wrong);
    }
    case 28: {
      const a=pick(WORDS.filter(w=>w.length>=5&&w.length<=8)),chars=[...a],edits=n(1,3),indices=rng.shuffle([...Array(chars.length).keys()]).slice(0,edits);for(const i of indices){let c=pick([...LETTERS]);while(c===chars[i])c=pick([...LETTERS]);chars[i]=c;}const b=chars.join(''),d=editDistance(a,b);
      return card(template,'MINIMUM SINGLE-LETTER EDITS?',`${a} → ${b} · Replace, add, or remove one letter per edit`,String(d),[String(d+1),String(Math.max(0,d-1))],5800);
    }
    case 29: {
      const wanted=rng.next()<.5?0:1,pool=WORDS.filter(w=>w.length>=4&&[...w].slice(1).reduce((s,c,i)=>s+Number(c.charCodeAt(0)===[...w][i]!.charCodeAt(0)+1),0)===wanted),source=pick(pool),count=wanted;
      return card(template,'COUNT ADJACENT ALPHABETIC PAIRS.',`Letters: ${source} · Count pairs like AB, BC, or XY`,String(count),[String(count+1),String(count===0?2:0)]);
    }
    case 30: {
      const keys=Object.keys(CATEGORIES_OF_THINGS),unique=keys.filter((k,i)=>keys.findIndex(x=>x[0]===k[0])===i),cats=rng.shuffle(unique).slice(0,4),answer=cats.map(x=>x[0]).join(''),wrong:string[]=[];
      while(wrong.length<2){const candidate=rng.shuffle([...answer]).join('');if(candidate!==answer&&!wrong.includes(candidate))wrong.push(candidate);}
      return card(template,'TAKE THE INITIALS IN ORDER.',`Categories: ${cats.join(' · ')}`,answer,wrong);
    }
    case 31: {
      const source=pick(WORDS.filter(w=>w.length>=6)),indices=rng.shuffle([...Array(source.length).keys()]).slice(0,3).sort((a,b)=>a-b),answer=indices.map(i=>source[i]).join(''),wrong:string[]=[];
      while(wrong.length<2){const candidate=Array.from({length:3},()=>pick([...source])).join('');if(!isSubsequence(candidate,source)&&!wrong.includes(candidate)&&candidate!==answer)wrong.push(candidate);}
      return card(template,'WHICH STRING APPEARS IN ORDER?',`Source: ${source} · Keep order; skipped letters are allowed`,answer,wrong);
    }
    case 32: {
      let target='';do{target=Array.from({length:5},()=>pick([...LETTERS.slice(0,8)])).join('');}while(new Set(target).size===target.length);
      const rel=pattern(target),unique=[...new Set(rel)].length,letters=rng.shuffle([...LETTERS]).slice(0,unique),answer=[...rel].map(i=>letters[Number(i)]).join(''),wrong:string[]=[];
      while(wrong.length<2){const candidate=Array.from({length:target.length},()=>pick([...LETTERS.slice(0,8)])).join('');if(pattern(candidate)!==rel&&!wrong.includes(candidate))wrong.push(candidate);}
      return card(template,'MATCH THE REPEATING-LETTER PATTERN.',`Pattern source: ${target} · Ignore the letter identities`,answer,wrong);
    }
    case 33: {
      const symbols=rng.shuffle(['▲','●','■','◆','★']),digits=rng.shuffle([...Array(10).keys()]),map=new Map(symbols.slice(0,4).map((s,i)=>[s,String(digits[i])])),used=symbols.slice(0,4),sample=used.map(s=>`${s}=${map.get(s)}`).join(' · '),code=Array.from({length:3},()=>pick(used)),answer=code.map(s=>map.get(s)).join(''),wrong:string[]=[];
      while(wrong.length<2){const at=n(0,2),replacement=String(n(0,9)),candidate=[...answer].map((c,i)=>i===at?replacement:c).join('');if(candidate!==answer&&!wrong.includes(candidate))wrong.push(candidate);}
      return card(template,'DECODE THE SYMBOL CODE.',`Key ${sample} · Code ${code.join('')}`,answer,wrong);
    }
    case 34: {
      const people=['A','B','C'],jobs=shuffled(rng,['RED','BLUE','GOLD']),assigned=shuffled(rng,jobs),all=people.flatMap((p,i)=>jobs.filter(j=>j!==assigned[i]).map(j=>[p,j] as const)),clues=rng.shuffle(all),kept:Array<readonly [string,string]>=[];
      let valid=permutations(jobs).map(p=>({p,ok:true}));
      while(valid.filter(x=>x.ok).length!==1){const clue=clues.shift();if(!clue)throw new Error('Could not make unique assignment');kept.push(clue);valid=permutations(jobs).map(p=>({p,ok:kept.every(([who,job])=>p[people.indexOf(who)]!==job)}));}
      const targetJob=pick(jobs),actual=people[assigned.indexOf(targetJob)]!;
      return card(template,`WHO GETS ${targetJob}?`,`A, B, C get one each. Clues: ${kept.map(([p,j])=>`${p} ≠ ${j}`).join(' · ')}`,actual,people.filter(p=>p!==actual),5600);
    }
    case 35: {
      const value=n(10,99),evenAdd=n(2,12),oddAdd=n(2,12),result=value%2===0?value+evenAdd:value-oddAdd,limit=n(20,90),answer=result>=limit?'YES':'NO';
      return card(template,'FOLLOW THE BRANCHES.',`Start ${value} · If even add ${evenAdd}; if odd subtract ${oddAdd} · Is result at least ${limit}?`,answer,[answer==='YES'?'NO':'YES'],5600);
    }
    case 36: {
      const nodes=rng.shuffle([...LETTERS.slice(0,6)]),target=nodes[4]!,parent=nodes[3]!,other=nodes[5]!,edges=[`${nodes[0]} → ${nodes[1]}`,`${nodes[1]} → ${nodes[2]}`,`${parent} → ${target}`,`${other} → ${nodes[0]}`];
      return card(template,`WHICH EVENT DIRECTLY CAUSES ${target}?`,`Causal links: ${rng.shuffle(edges).join(' · ')}`,parent,[nodes[0]!,nodes[1]!]);
    }
    case 37: {
      const universe=[...LETTERS.slice(0,5)],sets=Array.from({length:4},()=>rng.shuffle(universe).slice(0,n(2,3)));
      const force=(at:number,required:readonly string[])=>{const source=sets[at]!,size=source.length;sets[at]=[...required,...source.filter(x=>!required.includes(x))].slice(0,size);};
      force(0,['A','E']);force(1,['B']);force(2,['C']);force(3,['D']);
      const bits=sets.map(s=>s.reduce((m,x)=>m|1<<(x.charCodeAt(0)-65),0));let minimum=4;
      for(let mask=1;mask<1<<4;mask++){let cover=0,count=0;for(let i=0;i<4;i++)if(mask>>i&1){cover|=bits[i]!;count++;}if(cover===31)minimum=Math.min(minimum,count);}
      return card(template,'FEWEST SETS THAT COVER EVERY ITEM?',`Universe ${universe.join('')} · Sets ${sets.map((s,i)=>`${i+1}:{${s.join('')}}`).join(' ')}`,String(minimum),[String(minimum+1),String(Math.max(1,minimum-1))],6200);
    }
    case 38: {
      const duration=[n(1,7),n(1,7),n(1,7),n(1,7)],finish=Math.max(duration[0]!,duration[1]!)+duration[2]!+duration[3]!;
      return card(template,'PROJECT EARLIEST FINISH TIME.',`A (${duration[0]}) and B (${duration[1]}) run together; then C (${duration[2]}); then D (${duration[3]})`,String(finish),[String(finish+1),String(Math.max(1,finish-1))],5600);
    }
    case 39: {
      const states=['A','B','C'],xMap=rng.shuffle(states),yMap=rng.shuffle(states),transitions=(tag:string,map:string[])=>states.map((s,i)=>`${s} ${tag}→${map[i]}`).join(' · '),inputs=Array.from({length:3},()=>pick(['X','Y'] as const)),start=pick(states);let state=start;
      for(const input of inputs)state=(input==='X'?xMap:yMap)[states.indexOf(state)]!;
      return card(template,'RUN THE STATE MACHINE.',`X: ${transitions('X',xMap)} · Y: ${transitions('Y',yMap)} · Start ${start} · Inputs ${inputs.join('')}`,state,states.filter(s=>s!==state),6200);
    }
    case 40: {
      const nodes=[...LETTERS.slice(0,6)],want=rng.next()<.5;let edges:string[]=[],yes=false,attempts=0;
      do{edges=[];for(const a of nodes)for(const b of nodes)if(a!==b&&rng.next()<.16)edges.push(`${a}→${b}`);const adj=new Map(nodes.map(x=>[x,[] as string[]]));for(const e of edges){const [a,b]=e.split('→');adj.get(a!)!.push(b!);}const seen=new Set(['A']),q=['A'];for(let i=0;i<q.length;i++)for(const x of adj.get(q[i]!)!)if(!seen.has(x)){seen.add(x);q.push(x);}yes=seen.has('F');attempts++;}while((yes!==want||edges.length<3||edges.length>8)&&attempts<200);
      return card(template,'CAN START REACH GOAL?',`Directed links: ${edges.join(' · ')} · Start A · Goal F`,yes?'YES':'NO',[yes?'NO':'YES'],5200);
    }
    case 41: {
      const a=Array.from({length:8},()=>n(1,9)),b=Array.from({length:8},()=>pick(['▲','●','■'] as const)),ca=a.filter(x=>x%2===0).length,cb=b.filter(x=>x==='●').length,answer=`${ca} | ${cb}`,wrong=[`${(ca+1)%9} | ${cb}`,`${ca} | ${(cb+1)%9}`];
      return card(template,'COUNT BOTH STREAMS.',`Numbers: ${a.join(' ')} · Count evens. Shapes: ${b.join(' ')} · Count ●`,answer,wrong,5000);
    }
    case 42: {
      const row=rng.shuffle(['A','B','C','D']),initial=[...row],swaps:Array<[number,number]>=[];
      for(let i=0;i<4;i++){let a=n(0,3),b=n(0,3);while(a===b)b=n(0,3);[row[a],row[b]]=[row[b]!,row[a]!];swaps.push([a,b]);}
      const target=pick(initial),slot=row.indexOf(target);
      return card(template,`TRACK ${target} THROUGH THE SWAPS.`,`Start slots 1–4: ${initial.join(' · ')} · Swaps ${swaps.map(([a,b])=>`${a+1}↔${b+1}`).join(' · ')}`,`SLOT ${slot+1}`,[...row.map((_,i)=>`SLOT ${i+1}`).filter(x=>x!==`SLOT ${slot+1}`)].slice(0,2),5200);
    }
    case 43: {
      const prev=pick(['LEFT','RIGHT'] as const),current=pick(['LEFT','RIGHT'] as const),answer=current===prev?'HOLD':current==='LEFT'?'RIGHT':'LEFT';
      return card(template,'INVERT THE CUE; REPEAT MEANS HOLD.',`Previous cue ${prev} · Current cue ${current}`,answer,['LEFT','RIGHT','HOLD'].filter(x=>x!==answer));
    }
    case 44: {
      const action=pick(['LEFT','RIGHT'] as const),deadline=n(400,1000);let stopAt=n(100,1200);while(stopAt===deadline)stopAt=n(100,1200);const answer=stopAt<deadline?'HOLD':action;
      return card(template,'STOP SIGNAL CANCELS A GO.',`GO ${action} · response deadline ${deadline} ms · STOP arrives at ${stopAt} ms`,answer,[answer==='HOLD'?action:'HOLD'],4200);
    }
    case 45: {
      const cues=Array.from({length:4},()=>pick(['C','S'] as const)),rows=cues.map(c=>({c,color:pick(COLOURS),shape:pick(SHAPES)})),targetColor=pick(COLOURS),targetShape=pick(SHAPES),count=rows.filter(r=>r.c==='C'?r.color===targetColor:r.shape===targetShape).length,wrong2=count===0?2:count-1;
      return card(template,'SWITCH RULE BY ROW CUE.',`C=${targetColor} · S=${targetShape} · ${rows.map(r=>`${r.c}:${r.color}/${r.shape}`).join(' · ')}`,String(count),[String(count+1),String(wrong2)],6200);
    }
    case 46: {
      const pairs=Array.from({length:7},()=>[n(1,9),n(1,9)] as const),count=pairs.filter(([a,b])=>a>b).length,wrong2=count===0?2:count-1;
      return card(template,'COUNT COLUMNS WHERE LEFT EXCEEDS RIGHT.',`Paired streams: ${pairs.map(([a,b])=>`${a}/${b}`).join(' · ')}`,String(count),[String(count+1),String(wrong2)],5000);
    }
    case 47: {
      const dirs=['NORTH','EAST','SOUTH','WEST'],keys=rng.shuffle(['1','2','3','4','5','6']).slice(0,4),mapping=new Map(dirs.map((d,i)=>[d,keys[i]!])),target=pick(dirs),answer=mapping.get(target)!;
      return card(template,`WHICH KEY MOVES ${target}?`,`Control map: ${dirs.map(d=>`${mapping.get(d)}=${d}`).join(' · ')}`,answer,keys.filter(k=>k!==answer).slice(0,2));
    }
    case 48: {
      const want=rng.next()<.5;let values:number[]=[],yes=false,attempts=0;do{values=Array.from({length:4},()=>n(1,15));if(values.reduce((a,b)=>a+b,0)%2)values[0]=values[0]===15?14:values[0]!+1;yes=partitionExists(values);attempts++;}while(yes!==want&&attempts<100);const answer=yes?'YES':'NO';
      return card(template,'CAN FOUR VALUES SPLIT INTO EQUAL SUMS?',`Use every value once: ${values.join(' · ')}`,answer,[yes?'NO':'YES'],5600);
    }
    case 49: {
      const relation=pick(['OVERLAP','TOUCH','SEPARATE'] as const),a=n(0,30),b=a+n(4,12);let c=0,d=0;if(relation==='OVERLAP'){c=n(a+1,b-1);d=c+n(2,10);}else if(relation==='TOUCH'){c=b;d=c+n(2,10);}else{c=b+n(1,8);d=c+n(2,10);}
      return card(template,'HOW DO THE INTERVALS RELATE?',`A [${a}, ${b}] · B [${c}, ${d}]`,relation,['OVERLAP','TOUCH','SEPARATE'].filter(x=>x!==relation),4400);
    }
  }
  throw new Error(`Unknown v0.7 template: ${template}`);
}
