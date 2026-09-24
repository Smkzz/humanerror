"""Real Chromium interactions against the exact built HTML.

The default loads the artifact into a browser document (no server required).
Pass --url http://127.0.0.1:4173/ on machines that permit browser navigation.
The report distinguishes document rendering from live HTTP navigation.
"""
from __future__ import annotations
import argparse
import json
import os
from pathlib import Path
import re
import shutil
import time
from urllib.parse import urljoin
from playwright.sync_api import sync_playwright
from novel_browser_oracle import deduce as deduce_novel

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / 'dist/index.html').read_text(encoding='utf-8')
QA = ROOT / 'qa'
QA.mkdir(exist_ok=True)
NOVEL_TEMPLATES = frozenset('mirror rotate loopcount overlap occlusion changegrid pathtrace components tilefit cubeface conflict ruleswitch ruleinfer errorcheck rulefollow queueorder stateupdate nback timeline elapsed beats prime factorpairs modthree fraction ratio estimate binary balance precedence unitrate chance roman mean perimeter anagram weave rhyme analogy compound caesar homophone categorize xor implication syllogism ordering setdiff counterexample sieve'.split())


def tap(page, selector, touch=False):
    node = page.locator(selector)
    (node.tap if touch else node.click)()


def wait_phase(page, predicate, timeout=6):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        state = page.locator('#app').get_attribute('data-phase')
        if state == 'paused':
            page.get_by_role('button',name=re.compile('RESUME')).click()
            page.wait_for_timeout(25)
            continue
        if predicate(state): return
        page.wait_for_timeout(25)
    raise AssertionError(f"Phase did not change: {state}; {page.locator('#prompt').inner_text()}")


def settle_active(page):
    wait_phase(page, lambda state: state in ['active','finished'])


def options(page):
    return page.locator('.choice').evaluate_all("els => els.map(el => ({id:el.dataset.answer,label:el.querySelector('.choice-label').textContent}))")


def solve(page, memory, touch=False, keyboard=False):
    """Independent rule oracle reads only visible text, not app/engine internals."""
    title = page.locator('#prompt').inner_text().replace('\n', ' ')
    hint = page.locator('#hint').inner_text().replace('\n', ' ')
    kind = page.locator('#board').get_attribute('data-kind')
    if kind == 'memory':
        memory[0] = page.locator('.memory-code').inner_text()
        if page.locator('#actions .primary').count():tap(page, '#actions .primary', touch)
        else:wait_phase(page,lambda state:state!='active')
        return
    if kind == 'wait' or kind == 'override':
        wait_phase(page, lambda state: state != 'active')
        return
    if kind == 'reaction':
        go = page.get_by_role('button', name='GO!', exact=True)
        deadline = time.monotonic() + 4
        while time.monotonic() < deadline:
            if page.locator('#app').get_attribute('data-phase') == 'finished':
                return
            if go.is_visible():
                break
            page.wait_for_timeout(25)
        else:
            raise AssertionError('Reaction cue did not appear before its deadline')
        # Let the visual cue reach a paint before input.
        page.wait_for_timeout(90)
        if page.locator('#app').get_attribute('data-phase') == 'finished':
            return
        if keyboard:
            page.keyboard.press('Space')
        else:
            tap(page, '.bait', touch)
        return
    if kind == 'typing':
        backwards = re.match(r'TYPE ([A-Z]+) BACKWARDS\.', title)
        if backwards:
            answer = backwards.group(1)[::-1]
        else:
            m = re.match(r'([A-Z]+) WITHOUT ([A-Z])\.', title)
            assert m, title
            answer = m.group(1).replace(m.group(2), '')
        if keyboard:
            page.keyboard.type(answer)
            page.keyboard.press('Enter')
        else:
            for char in answer:
                key = page.get_by_role('button', name=char, exact=True)
                (key.tap if touch else key.click)()
            tap(page, '#actions .primary', touch)
        return
    if kind == 'counter':
        target = int(re.match(r'TAP (\d+) TIMES\.', title).group(1))
        if keyboard:
            for _ in range(target): page.keyboard.press('Space')
            page.keyboard.press('Enter')
        else:
            for _ in range(target): tap(page, '.counter-tap', touch)
            tap(page, '#actions .primary', touch)
        return
    candidates = options(page)
    template = page.locator('#board').get_attribute('data-template')
    if template in NOVEL_TEMPLATES:
        answer = deduce_novel(template,title,hint,[option['label'] for option in candidates])
        matches = [option for option in candidates if option['label']==answer]
        assert len(matches)==1,(template,title,hint,answer,candidates)
        winner=matches[0]
        if keyboard:
            page.keyboard.press(str(candidates.index(winner)+1))
        else:
            tap(page,f'.choice[data-answer="{winner["id"]}"]',touch)
        return
    if title.startswith('BIGGEST NUMBER'):
        winner = max(candidates, key=lambda o:int(o['label']))
    elif title.startswith('SMALLEST NUMBER'):
        winner = min(candidates, key=lambda o:int(o['label']))
    elif title.startswith('FIND THE IMPOSTOR'):
        winner = next(o for o in candidates if sum(1 for x in candidates if x['label']==o['label'])==1)
    elif title.startswith('OPPOSITE OF'):
        antonyms={'LEFT':'RIGHT','RIGHT':'LEFT','UP':'DOWN','DOWN':'UP','YES':'NO','NO':'YES','OPEN':'CLOSED','CLOSED':'OPEN'}
        answer = antonyms[title.removeprefix('OPPOSITE OF ').rstrip('.')]
        winner = next(o for o in candidates if o['label']==answer)
    elif title.startswith('WHAT WAS THE CODE'):
        winner = next(o for o in candidates if o['label']==memory[0])
    elif title.startswith('SAVE PRODUCTION'):
        winner = next(o for o in candidates if 'ON FIRE' in o['label'])
    elif title.startswith('LONGEST WORD'):
        winner = max(candidates, key=lambda o:len(o['label']))
    elif title.startswith('SHORTEST WORD'):
        winner = min(candidates, key=lambda o:len(o['label']))
    elif title.startswith('CLOSEST TO '):
        target=int(re.search(r'CLOSEST TO (\d+)',title).group(1))
        winner=min(candidates,key=lambda o:abs(int(o['label'])-target))
    elif title.startswith('FIND THE EVEN') or title.startswith('FIND THE ODD'):
        parity = 0 if 'EVEN' in title else 1
        winner = next(o for o in candidates if int(o['label'])%2==parity)
    elif title.startswith('PRESS THE ') and title.endswith(' BUTTON.'):
        target = title.removeprefix('PRESS THE ').removesuffix(' BUTTON.')
        winner = candidates[{'LEFT':0,'MIDDLE-LEFT':1,'MIDDLE-RIGHT':2,'RIGHT':3}[target]]
    elif title.startswith('COUNT THE ') and not title.startswith('COUNT THE VOWELS'):
        letter = re.match(r"COUNT THE ([A-Z])'S\.", title).group(1)
        word = hint.removeprefix('WORD: ')
        answer = sum(1 for c in word if c == letter)
        winner = next(o for o in candidates if int(o['label'])==answer)
    elif title.startswith('SECOND LARGEST'):
        winner = sorted(candidates, key=lambda o:int(o['label']), reverse=True)[1]
    elif title.startswith('WHICH PAIR MATCHES EXACTLY'):
        winner = next(o for o in candidates if len(o['label'].split('\n'))==2 and o['label'].split('\n')[0]==o['label'].split('\n')[1])
    elif title.startswith('DO NOT PICK '):
        forbidden = title.removeprefix('DO NOT PICK ').rstrip('.')
        winner = next(o for o in candidates if o['label'] != forbidden)
    elif title.startswith('WHAT COMES NEXT'):
        nums = [int(x) for x in re.findall(r'\d+', hint)]
        answer = nums[-1] + (nums[1] - nums[0])
        winner = next(o for o in candidates if int(o['label']) == answer)
    elif title.startswith('COUNT THE VOWELS'):
        word = hint.removeprefix('WORD: ').split(' · ',1)[0]
        answer = sum(1 for c in word if c in 'AEIOU')
        winner = next(o for o in candidates if int(o['label']) == answer)
    elif title.startswith('WHICH PAIR MAKES '):
        target = int(re.search(r'MAKES (\d+)', title).group(1))
        winner = next(o for o in candidates if sum(map(int, o['label'].split(' + '))) == target)
    elif title.startswith('WHICH ORDER IS ASCENDING'):
        winner=next(o for o in candidates if (lambda values:all(a<b for a,b in zip(values,values[1:])))(list(map(int,re.findall(r'\d+',o['label'])))))
    elif title.startswith('MIDDLE LETTER'):
        match = re.search(r'\bWORD:\s*([A-Z]+)\b',hint)
        assert match, f'Expected a visible word hint for middle-letter task: {hint!r}'
        word = match.group(1); answer = word[len(word)//2]
        winner = next((o for o in candidates if o['label'].strip()==answer),None)
        assert winner is not None, f'Visible middle letter {answer!r} from {word!r} not in choices {candidates!r}'
    elif title.startswith('PICK THE WORD WITHOUT '):
        letter = re.search(r'WITHOUT ([A-Z])', title).group(1)
        winner = next(o for o in candidates if letter not in o['label'])
    elif title.startswith('STARTS WITH ') or title.startswith('ENDS WITH '):
        letter=re.search(r'(?:STARTS|ENDS) WITH ([A-Z])',title).group(1)
        winner=next(o for o in candidates if (o['label'].startswith(letter) if title.startswith('STARTS') else o['label'].endswith(letter)))
    elif title.startswith('WHICH PAIR IS ') and ' APART?' in title:
        gap=int(re.search(r'WHICH PAIR IS (\d+) APART',title).group(1))
        winner=next(o for o in candidates if abs(int(o['label'].split(' ↔ ')[0])-int(o['label'].split(' ↔ ')[1]))==gap)
    elif title.startswith('FIND THE REPEATED DIGIT CODE'):
        winner=next(o for o in candidates if len(set(o['label']))<len(o['label']))
    elif title.startswith('NEXT LETTER'):
        letters = re.findall(r'[A-Z]',hint)
        answer = chr(ord(letters[-1]) + ord(letters[1]) - ord(letters[0]))
        winner = next(o for o in candidates if o['label']==answer)
    else:
        match = re.match(r'(\d+) × (\d+) = \?',title)
        assert match, f'Unhandled visible question: {title}'
        answer = int(match.group(1))*int(match.group(2))
        winner = next(o for o in candidates if int(o['label'])==answer)
    if keyboard:
        page.keyboard.press(str(candidates.index(winner)+1))
    else:
        tap(page, f'.choice[data-answer="{winner["id"]}"]', touch)


def layout(page):
    return page.evaluate("""() => {
      const boxes = [...document.querySelectorAll('button:not([disabled])')].filter(x=>x.getClientRects().length).map(x=>({text:x.textContent,w:x.getBoundingClientRect().width,h:x.getBoundingClientRect().height}));
      const r=document.querySelector('#actions').getBoundingClientRect();
      const rect=(selector)=>{const e=document.querySelector(selector),b=e.getBoundingClientRect();return {top:b.top,bottom:b.bottom,height:b.height,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight}};
      return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,app:rect('#app'),arena:rect('#arena'),stageContent:rect('.stage-content'),actionsBottom:r.bottom,smallTargets:boxes.filter(x=>x.w<44||x.h<44)};
    }""")


def run_case(browser, name, viewport, touch=False, keyboard=False, reduced=False, url=None):
    context = browser.new_context(viewport=viewport,has_touch=touch,device_scale_factor=1,reduced_motion='reduce' if reduced else 'no-preference')
    page = context.new_page()
    errors, requests, api_responses = [], [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type=='error' else None)
    page.on('request', lambda r: requests.append(r.url))
    page.on('response', lambda r: api_responses.append({'url':r.url,'status':r.status}) if '/api/' in r.url else None)
    if url: page.goto(url,wait_until='load')
    else: page.set_content(HTML,wait_until='load')
    assert page.locator('#prompt').inner_text() in ['CLAIM #1.','BEAT #1.']
    assert page.locator('.competition-panel').count()==1
    page.locator('#player-name').fill('QA ' + name)
    initial = layout(page)
    page.screenshot(path=str(QA / f'v06-{name}-intro.png'))
    page.get_by_role('button',name='Practice',exact=True).click()
    page.get_by_role('button',name='LET ME PRACTISE').click()
    memory=[None]; solved=0; min_targets=[]; seen_templates=[]
    while page.locator('#app').get_attribute('data-phase')!='finished':
        settle_active(page)
        if page.locator('#app').get_attribute('data-phase')=='finished':break
        if solved == 0:
            page.screenshot(path=str(QA/f'v06-{name}-play.png'))
            # A real button pause/resume must not lose the current question.
            before=page.locator('#correct').inner_text()
            page.get_by_role('button',name='Pause',exact=True).click()
            page.wait_for_timeout(80)
            assert page.locator('#app').get_attribute('data-phase')=='paused'
            page.get_by_role('button',name='RESUME').click()
            assert page.locator('#correct').inner_text()==before
        info=layout(page)
        template=page.locator('#board').get_attribute('data-template')
        assert template not in seen_templates,seen_templates+[template]
        seen_templates.append(template)
        assert info['scrollWidth']<=info['width'], info
        assert info['scrollHeight']<=info['height']+1, info
        min_targets += info['smallTargets']
        solve(page,memory,touch,keyboard)
        solved+=1
        assert solved<=20,'Practice did not finish'
        if page.locator('#app').get_attribute('data-phase')=='feedback':
            assert page.locator('#prompt').inner_text() in ['CORRECT.','NOTED.'], page.locator('#hint').inner_text()
            if keyboard: page.keyboard.press('Enter')
            else: tap(page,'#actions .primary',touch)
    assert page.locator('.result-ratio').inner_text()=='10 / 10'
    assert '100% ACCURACY' in page.locator('.result-meta').inner_text()
    assert '1 setup screens excluded' in page.locator('#board').inner_text()
    final=layout(page)
    assert initial['scrollHeight']<=initial['height']+1,initial
    page.screenshot(path=str(QA/f'v06-{name}-result.png'))
    assert final['scrollHeight']<=final['height']+1,final
    page.get_by_role('button',name='Review answers',exact=True).click()
    assert 'ANSWER 1 / 10' in page.locator('#stage').inner_text()
    page.get_by_role('button',name='Next →',exact=True).click()
    assert 'ANSWER 2 / 10' in page.locator('#stage').inner_text()
    page.get_by_role('button',name='Back to result',exact=True).click()
    # The only app request before starting Practice is the same-origin board read.
    # Chromium may also probe /favicon.ico for browser chrome.
    allowed_requests={url} if url else set()
    favicon=urljoin(url, '/favicon.ico') if url else None
    if favicon: allowed_requests.add(favicon)
    board_request=urljoin(url, '/api/leaderboard') if url else None
    if board_request: allowed_requests.add(board_request)
    runtime_requests=[r for r in requests if r not in allowed_requests]
    browser_requests=[r for r in requests if favicon and r == favicon]
    assert not runtime_requests, runtime_requests
    if url:
        assert sum(1 for r in requests if r==board_request)==1,requests
        assert any(r['url']==board_request and r['status']==200 for r in api_responses),api_responses
    else:
        assert not requests,requests
    assert not errors,errors
    assert not min_targets,min_targets
    result={'name':name,'loading':'live-url' if url else 'exact-artifact-document','viewport':viewport,'touch':touch,'keyboard':keyboard,'reducedMotion':reduced,'accuracy':'10/10','missionTemplates':seen_templates,'noRepeat':len(seen_templates)==len(set(seen_templates)),'initialLayout':initial,'finalLayout':final,'javascriptErrors':errors,'runtimeRequests':runtime_requests,'apiResponses':api_responses,'browserRequests':browser_requests}
    context.close()
    return result


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--url');parser.add_argument('--case',default='all');args=parser.parse_args()
    config=[('desktop-keyboard',{'width':1280,'height':900},False,True,False),('mobile-touch',{'width':390,'height':844},True,False,False),('small-mobile',{'width':360,'height':640},True,False,True)]
    results=[]
    with sync_playwright() as p:
        executable=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
        kwargs={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage']}
        if executable:kwargs['executable_path']=executable
        browser=p.chromium.launch(**kwargs)
        version=browser.version
        for name,v,t,k,r in config:
            if args.case!='all' and args.case!=name:continue
            results.append(run_case(browser,name,v,t,k,r,args.url))
        browser.close()
    report={'browser':version,'version':'0.6.0','ruleset':'6','cases':results,'scope':'Exact v0.6 artifact rendered by Chromium; live navigation only when --url is supplied.'}
    (QA/f'v06-browser-{args.case}.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))

if __name__=='__main__':main()
