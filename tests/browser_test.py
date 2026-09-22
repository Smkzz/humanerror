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

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / 'dist/index.html').read_text(encoding='utf-8')
QA = ROOT / 'qa'
QA.mkdir(exist_ok=True)


def tap(page, selector, touch=False):
    node = page.locator(selector)
    (node.tap if touch else node.click)()


def wait_phase(page, predicate, timeout=6):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        state = page.locator('#app').get_attribute('data-phase')
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
    kind = page.locator('#board').get_attribute('data-kind')
    if kind == 'memory':
        memory[0] = page.locator('.memory-code').inner_text()
        tap(page, '#actions .primary', touch)
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
    candidates = options(page)
    if title.startswith('BIGGEST NUMBER'):
        winner = max(candidates, key=lambda o:int(o['label']))
    elif title.startswith('SMALLEST NUMBER'):
        winner = min(candidates, key=lambda o:int(o['label']))
    elif title.startswith('FIND THE IMPOSTOR'):
        winner = next(o for o in candidates if o['label'] in '○□△◇')
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
    elif title.startswith('FIND THE EVEN') or title.startswith('FIND THE ODD'):
        parity = 0 if 'EVEN' in title else 1
        winner = next(o for o in candidates if int(o['label'])%2==parity)
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
      return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,actionsBottom:r.bottom,smallTargets:boxes.filter(x=>x.w<44||x.h<44)};
    }""")


def run_case(browser, name, viewport, touch=False, keyboard=False, reduced=False, url=None):
    context = browser.new_context(viewport=viewport,has_touch=touch,device_scale_factor=1,reduced_motion='reduce' if reduced else 'no-preference')
    page = context.new_page()
    errors, requests = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type=='error' else None)
    page.on('request', lambda r: requests.append(r.url))
    if url: page.goto(url,wait_until='load')
    else: page.set_content(HTML,wait_until='load')
    assert 'DO WHAT' in page.locator('#prompt').inner_text()
    initial = layout(page)
    page.screenshot(path=str(QA / f'{name}-intro.png'))
    page.get_by_role('button',name='Practice',exact=True).click()
    page.get_by_role('button',name='LET ME PRACTISE').click()
    memory=[None]; solved=0; min_targets=[]
    while page.locator('#app').get_attribute('data-phase')!='finished':
        settle_active(page)
        if page.locator('#app').get_attribute('data-phase')=='finished':break
        if solved == 0:
            page.screenshot(path=str(QA/f'{name}-play.png'))
            # A real button pause/resume must not lose the current question.
            before=page.locator('#correct').inner_text()
            page.get_by_role('button',name='Pause',exact=True).click()
            page.wait_for_timeout(80)
            assert page.locator('#app').get_attribute('data-phase')=='paused'
            page.get_by_role('button',name='RESUME').click()
            assert page.locator('#correct').inner_text()==before
        info=layout(page)
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
    assert final['scrollHeight']<=final['height']+1,final
    page.screenshot(path=str(QA/f'{name}-result.png'))
    page.get_by_role('button',name='Review answers',exact=True).click()
    assert 'ANSWER 1 / 10' in page.locator('#stage').inner_text()
    page.get_by_role('button',name='Next →',exact=True).click()
    assert 'ANSWER 2 / 10' in page.locator('#stage').inner_text()
    page.get_by_role('button',name='Back to result',exact=True).click()
    # No app telemetry, assets, APIs, fonts or CDN requests after loading the page.
    # Chromium may probe /favicon.ico for browser chrome when navigating a live URL;
    # that request is classified separately and is not initiated by the app.
    allowed_requests={url} if url else set()
    favicon=urljoin(url, '/favicon.ico') if url else None
    if favicon: allowed_requests.add(favicon)
    runtime_requests=[r for r in requests if r not in allowed_requests]
    browser_requests=[r for r in requests if favicon and r == favicon]
    assert not runtime_requests, runtime_requests
    assert not errors,errors
    assert not min_targets,min_targets
    result={'name':name,'loading':'live-url' if url else 'exact-artifact-document','viewport':viewport,'touch':touch,'keyboard':keyboard,'reducedMotion':reduced,'accuracy':'10/10','initialLayout':initial,'finalLayout':final,'javascriptErrors':errors,'runtimeRequests':runtime_requests,'browserRequests':browser_requests}
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
    report={'browser':version,'cases':results,'scope':'Exact artifact rendered by Chromium; live navigation only when --url is supplied.'}
    (QA/f'browser-{args.case}.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))

if __name__=='__main__':main()
