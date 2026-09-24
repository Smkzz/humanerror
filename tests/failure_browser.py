"""Wrong-answer browser path: no accidental wins, phantom questions or bonus."""
import json, os, re, shutil
from playwright.sync_api import sync_playwright
from browser_test import HTML, QA, options, wait_phase, layout
from novel_browser_oracle import deduce as deduce_novel

def wrong_choice(page, memory):
    title=page.locator('#prompt').inner_text().replace('\n',' ')
    hint=page.locator('#hint').inner_text().replace('\n',' ')
    choices=options(page)
    template=page.locator('#board').get_attribute('data-template')
    if template in {'mirror','rotate','loopcount','overlap','occlusion','changegrid','pathtrace','components','tilefit','cubeface','conflict','ruleswitch','ruleinfer','errorcheck','rulefollow','queueorder','stateupdate','nback','timeline','elapsed','beats','prime','factorpairs','modthree','fraction','ratio','estimate','binary','balance','precedence','unitrate','chance','roman','mean','perimeter','anagram','weave','rhyme','analogy','compound','caesar','homophone','categorize','xor','implication','syllogism','ordering','setdiff','counterexample','sieve'}:
        correct=deduce_novel(template,title,hint,[option['label'] for option in choices])
        winner=next(option for option in choices if option['label']==correct)
        return next(option for option in choices if option['id']!=winner['id'])
    if title.startswith('BIGGEST NUMBER'):winner=max(choices,key=lambda o:int(o['label']))
    elif title.startswith('SMALLEST NUMBER'):winner=min(choices,key=lambda o:int(o['label']))
    elif title.startswith('FIND THE IMPOSTOR'):winner=next(o for o in choices if o['label'] in '○□△◇')
    elif title.startswith('OPPOSITE OF'):
        pairs={'LEFT':'RIGHT','RIGHT':'LEFT','UP':'DOWN','DOWN':'UP','YES':'NO','NO':'YES','OPEN':'CLOSED','CLOSED':'OPEN'}
        winner=next(o for o in choices if o['label']==pairs[title.removeprefix('OPPOSITE OF ').rstrip('.')])
    elif title.startswith('WHAT WAS THE CODE'):winner=next(o for o in choices if o['label']==memory[0])
    elif title.startswith('SAVE PRODUCTION'):winner=next(o for o in choices if 'ON FIRE' in o['label'])
    elif title.startswith('LONGEST WORD'):winner=max(choices,key=lambda o:len(o['label']))
    elif title.startswith('SHORTEST WORD'):winner=min(choices,key=lambda o:len(o['label']))
    elif title.startswith('CLOSEST TO '):
        target=int(re.search(r'CLOSEST TO (\d+)',title).group(1));winner=min(choices,key=lambda o:abs(int(o['label'])-target))
    elif title.startswith('FIND THE EVEN') or title.startswith('FIND THE ODD'):
        parity=0 if 'EVEN' in title else 1;winner=next(o for o in choices if int(o['label'])%2==parity)
    elif title.startswith('PRESS THE ') and title.endswith(' BUTTON.'):
        target=title.removeprefix('PRESS THE ').removesuffix(' BUTTON.');winner=choices[{'LEFT':0,'MIDDLE':1,'RIGHT':2}[target]]
    elif title.startswith('COUNT THE ') and not title.startswith('COUNT THE VOWELS'):
        letter=re.match(r"COUNT THE ([A-Z])'S\.",title).group(1);word=hint.removeprefix('WORD: ')
        answer=sum(1 for c in word if c==letter);winner=next(o for o in choices if int(o['label'])==answer)
    elif title.startswith('SECOND LARGEST'):winner=sorted(choices,key=lambda o:int(o['label']),reverse=True)[1]
    elif title.startswith('WHICH PAIR MATCHES EXACTLY'):
        winner=next(o for o in choices if len(o['label'].split('\n'))==2 and o['label'].split('\n')[0]==o['label'].split('\n')[1])
    elif title.startswith('DO NOT PICK '):
        forbidden=title.removeprefix('DO NOT PICK ').rstrip('.');winner=next(o for o in choices if o['label']!=forbidden)
    elif title.startswith('WHAT COMES NEXT'):
        nums=[int(x) for x in re.findall(r'\d+',hint)];answer=nums[-1]+(nums[1]-nums[0]);winner=next(o for o in choices if int(o['label'])==answer)
    elif title.startswith('COUNT THE VOWELS'):
        word=hint.removeprefix('WORD: ');answer=sum(1 for c in word if c in 'AEIOU');winner=next(o for o in choices if int(o['label'])==answer)
    elif title.startswith('WHICH PAIR MAKES '):
        target=int(re.search(r'MAKES (\d+)',title).group(1));winner=next(o for o in choices if sum(map(int,o['label'].split(' + ')))==target)
    elif title.startswith('WHICH ORDER IS ASCENDING'):
        winner=next(o for o in choices if (lambda values:all(a<b for a,b in zip(values,values[1:])))(list(map(int,re.findall(r'\d+',o['label'])))))
    elif title.startswith('MIDDLE LETTER'):
        word=hint.removeprefix('WORD: ');winner=next(o for o in choices if o['label']==word[len(word)//2])
    elif title.startswith('PICK THE WORD WITHOUT '):
        letter=re.search(r'WITHOUT ([A-Z])',title).group(1);winner=next(o for o in choices if letter not in o['label'])
    elif title.startswith('STARTS WITH ') or title.startswith('ENDS WITH '):
        letter=re.search(r'(?:STARTS|ENDS) WITH ([A-Z])',title).group(1);winner=next(o for o in choices if (o['label'].startswith(letter) if title.startswith('STARTS') else o['label'].endswith(letter)))
    elif title.startswith('WHICH PAIR IS ') and ' APART?' in title:
        gap=int(re.search(r'WHICH PAIR IS (\d+) APART',title).group(1));winner=next(o for o in choices if abs(int(o['label'].split(' ↔ ')[0])-int(o['label'].split(' ↔ ')[1]))==gap)
    elif title.startswith('FIND THE REPEATED DIGIT CODE'):
        winner=next(o for o in choices if len(set(o['label']))<len(o['label']))
    elif title.startswith('NEXT LETTER'):
        letters=re.findall(r'[A-Z]',hint);answer=chr(ord(letters[-1])+ord(letters[1])-ord(letters[0]));winner=next(o for o in choices if o['label']==answer)
    else:
        m=re.match(r'(\d+) × (\d+) = \?',title);assert m,title
        answer=int(m.group(1))*int(m.group(2));winner=next(o for o in choices if int(o['label'])==answer)
    return next(o for o in choices if o['id']!=winner['id'])

with sync_playwright() as p:
    kw={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage']}
    exe=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
    if exe:kw['executable_path']=exe
    b=p.chromium.launch(**kw);page=b.new_page(viewport={'width':1366,'height':768})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_content(HTML)
    page.locator('#player-name').fill('Failure QA')
    page.get_by_role('button',name='PANIC →',exact=True).click();screens=0;memory=[None]
    while page.locator('#app').get_attribute('data-phase')!='finished':
        wait_phase(page,lambda x:x in ['active','finished'])
        if page.locator('#app').get_attribute('data-phase')=='finished':break
        kind=page.locator('#board').get_attribute('data-kind')
        if kind=='memory':
            memory[0]=page.locator('.memory-code').inner_text();wait_phase(page,lambda s:s!='active')
        elif kind=='reaction' or kind=='wait':page.locator('.bait').click()
        elif kind=='override':
            page.locator('.bait').wait_for(timeout=4000);page.locator('.bait').click()
        elif kind=='typing':
            page.keyboard.type('ZZZZ');page.keyboard.press('Enter')
        elif kind=='counter':
            page.get_by_role('button',name='SEND ↵',exact=True).click()
        elif kind=='choice':
            bad=wrong_choice(page,memory);page.locator(f'.choice[data-answer="{bad["id"]}"]').click()
        else:raise AssertionError(kind)
        screens+=1;assert screens<=8
    assert page.locator('.result-ratio').inner_text()=='0 / 4'
    assert page.locator('#score').inner_text()=='0'
    assert page.locator('#stage').inner_text()=='HUMAN ERROR DETECTED'
    dimensions=layout(page);assert dimensions['scrollHeight']<=768,dimensions
    assert not errors,errors
    page.screenshot(path=str(QA/'v06-failure-desktop-result.png'))
    report={'browser':b.version,'loading':'exact-artifact-document','result':'PASS','correct':0,'graded':4,'score':0,'neutralSetupScreens':1,'javascriptErrors':errors,'layout':dimensions}
    (QA/'v06-browser-failure.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2));b.close()
