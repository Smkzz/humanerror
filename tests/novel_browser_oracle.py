"""Independent visible-prompt solvers for v0.6 Chromium qualification."""
from __future__ import annotations
import re


def deduce(template: str, title: str, hint: str, labels: list[str]) -> str:
    """Return an answer from rendered copy and answer choices, never referee state."""
    def match(pattern: str, value: str):
        result = re.search(pattern, value)
        assert result, (template, pattern, value)
        return result

    if template == 'mirror':
        rows = match(r'Grid: ([.#]+) / ([.#]+) / ([.#]+)', hint).groups()
        return ''.join(row[::-1] for row in rows)
    if template == 'rotate':
        a,b,c,d = map(int, match(r'Tile: (\d+) (\d+) / (\d+) (\d+)', hint).groups())
        return f'{c} {a} / {d} {b}'
    if template == 'loopcount':
        digits = match(r'Digits: (\d+)', hint)[1]
        return str(sum(2 if x == '8' else int(x in '069') for x in digits))
    if template == 'overlap':
        a,b = match(r'Set A: ([A-H]+) · Set B: ([A-H]+)', hint).groups()
        return ''.join(sorted(set(a) & set(b)))
    if template == 'occlusion':
        return match(r'front → back: [A-C] > [A-C] > ([A-C])', hint)[1]
    if template == 'changegrid':
        before,after = match(r'Before ([A-D]+) · After ([A-D]+)', hint).groups()
        return str(next(i for i,(a,b) in enumerate(zip(before,after),1) if a != b))
    if template == 'pathtrace':
        col,row,moves = match(r'Start ([A-D])([1-4]) · Moves ([NESW]+)', hint).groups()
        x,y = ord(col)-65,int(row)-1
        for move in moves:
            x += (move == 'E') - (move == 'W')
            y += (move == 'S') - (move == 'N')
        return f'{chr(65+x)}{y+1}'
    if template == 'components':
        rows = match(r'Grid \(# = filled cell\): ([.#]+) / ([.#]+) / ([.#]+) / ([.#]+)',hint).groups()
        seen=set(); count=0
        for y in range(4):
            for x in range(4):
                if rows[y][x] != '#' or (x,y) in seen: continue
                count+=1; todo=[(x,y)]; seen.add((x,y))
                while todo:
                    cx,cy=todo.pop()
                    for nx,ny in ((cx+1,cy),(cx-1,cy),(cx,cy+1),(cx,cy-1)):
                        if 0<=nx<4 and 0<=ny<4 and rows[ny][nx]=='#' and (nx,ny) not in seen:
                            seen.add((nx,ny));todo.append((nx,ny))
        return str(count)
    if template == 'tilefit':
        a,b,c=match(r'Rows ([A-C]{3}) / ([A-C]{3}) / ([A-C]{2})\?',hint).groups()
        assert b==a[1:]+a[0] and c==a[2:]+a[0]
        return a[1]
    if template == 'cubeface':
        m=match(r'Net: ([A-F]) above ([A-F]) · ([A-F])-([A-F])-([A-F])-([A-F]) in a row',hint)
        return m[6]
    if template == 'conflict':
        arrow=match(r'Arrow ([←→↑↓])',hint)[1]
        return {'←':'LEFT','→':'RIGHT','↑':'UP','↓':'DOWN'}[arrow]
    if template == 'ruleswitch':
        values=list(map(int,re.findall(r'\d+',hint)))
        return str(min(values) if 'RULE A:' in title else max(values))
    if template == 'ruleinfer':
        pairs=[tuple(map(int,p)) for p in re.findall(r'(\d+)→(\d+)',hint)]
        assert pairs and len({y/x for x,y in pairs})==1
        return str(int(match(r'(\d+)→\?',hint)[1])*(pairs[0][1]//pairs[0][0]))
    if template == 'errorcheck':
        return match(r'(\d+ ✗)',hint)[1]
    if template == 'rulefollow':
        a,b=map(int,re.findall(r'\d+',hint))
        return str((a+b if 'SUM' in title else a*b)+1)
    if template == 'queueorder':
        items=match(r'Start ([A-D]) ([A-D]) ([A-D]) ([A-D])',hint).groups()
        queue=list(items);queue[0],queue[3]=queue[3],queue[0]
        queue.remove('C');queue.insert(0,'C')
        return ' '.join(queue)
    if template == 'stateupdate':
        start,a,op,b=match(r'Start (\d+) · \+(\d+) · ([+-])(\d+)',hint).groups()
        return str(int(start)+int(a)+(1 if op=='+' else -1)*int(b))
    if template == 'nback':
        return match(r'Sequence ([A-D](?: · [A-D]){4})',hint)[1].split(' · ')[-3]
    if template == 'timeline':
        times=sorted((int(t),label) for label,t in re.findall(r'([ABC])@(\d+):00',hint))
        assert len(times)==3
        return times[1][1]
    if template == 'elapsed':
        start,end=match(r'From (\d\d:\d\d) to (\d\d:\d\d)',hint).groups()
        minutes=lambda x:int(x[:2])*60+int(x[3:])
        return str((minutes(end)-minutes(start))%1440)
    if template == 'beats':
        points=list(map(int,re.findall(r'\d+',hint)))
        gaps=[b-a for a,b in zip(points,points[1:])]
        return str(max(gaps))
    if template == 'prime':
        vals=list(map(int,re.findall(r'\d+',hint)))
        primes=[v for v in vals if v>1 and all(v%d for d in range(2,int(v**.5)+1))]
        assert len(primes)==1
        return str(primes[0])
    if template == 'factorpairs':
        value=int(match(r'FACTOR PAIRS OF (\d+)',title)[1])
        return str(sum(value%d==0 for d in range(1,int(value**.5)+1)))
    if template == 'modthree':
        return str(int(match(r'Number (\d+)',hint)[1])%3)
    if template == 'fraction':
        def fraction(s):
            n,d=map(int,s.split('/'));return n/d
        return max(labels,key=fraction)
    if template == 'ratio':
        a,b=map(int,match(r'Base ratio\s+(\d+):(\d+)',hint).groups())
        equivalent=[label for label in labels if (lambda p,q:p*b==q*a)(*map(int,label.split(':')))]
        assert len(equivalent)==1
        return equivalent[0]
    if template == 'estimate':
        value=int(match(r'Number (\d+)',hint)[1])
        return str(round(value/10)*10)
    if template == 'binary':
        return str(int(match(r'Binary ([01]{4})',hint)[1],2))
    if template == 'balance':
        sign,value,total=match(r'SOLVE: X ([+-]) (\d+) = (-?\d+)',title).groups()
        return str(int(total)+(int(value) if sign=='-' else -int(value)))
    if template == 'precedence':
        a,b,c=map(int,match(r'Compute (\d+) \+ (\d+) × (\d+)',hint).groups())
        return str(a+b*c)
    if template == 'unitrate':
        distance,hours=map(int,match(r'(\d+) km in (\d+) hours',hint).groups())
        assert distance%hours==0
        return str(distance//hours)
    if template == 'chance':
        red,blue=map(int,match(r'Bag: (\d+) red \+ (\d+) blue',hint).groups());total=red+blue
        valid=[label for label in labels if (lambda a,b:a*total==red*b)(*map(int,label.split('/')))]
        assert len(valid)==1
        return valid[0]
    if template == 'roman':
        values={'I':1,'V':5,'X':10};text=hint;total=0
        for i,ch in enumerate(text):total+=-values[ch] if i+1<len(text) and values[ch]<values[text[i+1]] else values[ch]
        return str(total)
    if template == 'mean':
        values=list(map(int,re.findall(r'\d+',hint)))
        return str(sum(values)//len(values))
    if template == 'perimeter':
        a,b=map(int,re.findall(r'\d+',hint))
        return str(2*(a+b))
    if template == 'anagram':
        assert title == 'UNSCRAMBLE THE LETTERS.'
        letters=sorted(hint)
        return next(label for label in labels if sorted(label)==letters)
    if template == 'weave':
        a,b=match(r'First ([A-Z]+) · Second ([0-9]+)',hint).groups()
        return ''.join(x+y for x,y in zip(a,b))
    if template == 'rhyme':
        target=match(r'WITH ([A-Z]+)',title)[1]
        return {'LIGHT':'NIGHT','CAT':'HAT','BLUE':'TRUE','DAY':'PLAY','MOON':'SPOON','STAR':'CAR'}[target]
    if template == 'analogy':
        a=match(r'^([A-Z]+) : ([A-Z]+) :: ([A-Z]+) :',title).groups()
        return {'DAY':'DOWN','HOT':'DRY','BIRD':'HIVE','HAND':'SHOE','PUPPY':'CAT','PAGE':'WALL'}[a[0]]
    if template == 'compound':
        a,b=match(r'Part 1 ([A-Z]+) · Part 2 ([A-Z]+)',hint).groups()
        return a+b
    if template == 'caesar':
        shift=int(match(r'SHIFT −(\d+)',title)[1]);text=hint
        return ''.join(chr((ord(c)-65-shift)%26+65) for c in text)
    if template == 'homophone':
        if hint.startswith('I can'): return 'see'
        if hint.startswith('Please'): return 'close'
        if hint.startswith('The ___ is bright'): return 'sun'
        if hint.startswith('Turn'): return 'right'
        if hint.startswith('I ate'): return 'piece'
        return 'tail'
    if template == 'categorize':
        if 'TOOL' in title: return 'hammer'
        if 'FRUIT' in title: return 'mango'
        if 'CLOTHING' in title: return 'jacket'
        if 'VEHICLE' in title: return 'bicycle'
        if 'ANIMAL' in title: return 'otter'
        return 'sofa'
    if template == 'xor':
        a,b=match(r'A is (true|false) · B is (true|false)',hint).groups()
        return str((a=='true')!=(b=='true')).upper()
    if template == 'implication':
        p,q=match(r'P is (true|false) · Q is (true|false)',hint).groups()
        return str(p!='true' or q=='true').upper()
    if template == 'syllogism':
        facts=re.findall(r'All ([a-z ]+) are ([a-z ]+)\.',hint)
        assert len(facts)==2
        return 'YES' if facts[0][1]==facts[1][0] else 'CANNOT INFER'
    if template == 'ordering':
        pairs=re.findall(r'([A-D]) before ([A-D])',hint)
        return next(x for x in 'ABCD' if all(left!=x for left,_ in pairs))
    if template == 'setdiff':
        a,b=match(r'A ([A-Z]+) · B ([A-Z]+)',hint).groups()
        return ''.join(x for x in a if x not in b)
    if template == 'counterexample':
        return next(label for label in labels if int(label)%2==1)
    if template == 'sieve':
        values=list(map(int,re.findall(r'\d+',hint)))
        valid=[v for v in values if v%2==1 and v%3==0]
        assert len(valid)==1
        return str(valid[0])
    raise AssertionError(f'No v0.6 browser oracle for {template}: {title} / {hint}')
