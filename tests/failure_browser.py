"""Wrong-answer browser path: no accidental wins, phantom questions or bonus."""
import json, os, re, shutil
from playwright.sync_api import sync_playwright
from browser_test import HTML, QA, options, wait_phase, layout

def wrong_choice(page, memory):
    title=page.locator('#prompt').inner_text().replace('\n',' ')
    hint=page.locator('#hint').inner_text().replace('\n',' ')
    choices=options(page)
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
    elif title.startswith('FIND THE EVEN') or title.startswith('FIND THE ODD'):
        parity=0 if 'EVEN' in title else 1;winner=next(o for o in choices if int(o['label'])%2==parity)
    elif title.startswith('PRESS THE ') and title.endswith(' BUTTON.'):
        target=title.removeprefix('PRESS THE ').removesuffix(' BUTTON.');winner=choices[{'LEFT':0,'MIDDLE':1,'RIGHT':2}[target]]
    elif title.startswith('COUNT THE '):
        letter=re.match(r"COUNT THE ([A-Z])'S\.",title).group(1);word=hint.removeprefix('WORD: ')
        answer=sum(1 for c in word if c==letter);winner=next(o for o in choices if int(o['label'])==answer)
    elif title.startswith('SECOND LARGEST'):winner=sorted(choices,key=lambda o:int(o['label']),reverse=True)[1]
    elif title.startswith('WHICH PAIR MATCHES EXACTLY'):
        winner=next(o for o in choices if len(o['label'].split('\n'))==2 and o['label'].split('\n')[0]==o['label'].split('\n')[1])
    elif title.startswith('DO NOT PICK '):
        forbidden=title.removeprefix('DO NOT PICK ').rstrip('.');winner=next(o for o in choices if o['label']!=forbidden)
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
        elif kind=='choice':
            bad=wrong_choice(page,memory);page.locator(f'.choice[data-answer="{bad["id"]}"]').click()
        else:raise AssertionError(kind)
        screens+=1;assert screens<=8
    assert page.locator('.result-ratio').inner_text()=='0 / 4'
    assert page.locator('#score').inner_text()=='0'
    assert page.locator('#stage').inner_text()=='HUMAN ERROR DETECTED'
    dimensions=layout(page);assert dimensions['scrollHeight']<=768,dimensions
    assert not errors,errors
    page.screenshot(path=str(QA/'failure-desktop-result.png'))
    report={'browser':b.version,'loading':'exact-artifact-document','result':'PASS','correct':0,'graded':4,'score':0,'neutralSetupScreens':1,'javascriptErrors':errors,'layout':dimensions}
    (QA/'browser-failure.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2));b.close()
