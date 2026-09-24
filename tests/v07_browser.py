"""Real Chrome checks against the exact ruleset 7 artifact."""
from __future__ import annotations
import hashlib, json, os, re, shutil, subprocess, time
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_test import ROOT, QA, options, wait_phase, layout, solve as solve_legacy

CHROMIUM_PATH = os.environ.get('CHROMIUM_PATH')
ARTIFACT = ROOT / 'dist' / 'index.html'
MANIFEST = ROOT / 'dist' / 'manifest.json'

def artifact_identity():
    payload = ARTIFACT.read_bytes()
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    identity = {
        'path':'dist/index.html',
        'sha256':hashlib.sha256(payload).hexdigest(),
        'htmlBytes':len(payload),
        'gzipBytes':manifest['gzipBytes'],
        'serverModuleCount':manifest['serverModuleCount'],
        'serverModulesSha256':manifest['serverModulesSha256']
    }
    assert identity['sha256'] == manifest['sha256']
    assert identity['htmlBytes'] == manifest['htmlBytes']
    return identity

def launch_browser(playwright):
    kwargs = {'headless':True, 'args':['--no-sandbox','--disable-dev-shm-usage']}
    if CHROMIUM_PATH: kwargs['executable_path'] = CHROMIUM_PATH
    return playwright.chromium.launch(**kwargs)
SEED = 'browser-v07-303'
OTHER_SEED = 'browser-v07-7'

class VisibleOracle:
    def __init__(self):
        self.process = subprocess.Popen(
            ['node', 'tests/browser_oracle_server.mjs'], cwd=ROOT,
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, encoding='utf-8', bufsize=1)

    def answer(self, template, title, hint, labels):
        request = json.dumps({'template': template, 'title': title, 'hint': hint, 'labels': labels}, ensure_ascii=False)
        self.process.stdin.write(request + '\n'); self.process.stdin.flush()
        line = self.process.stdout.readline()
        assert line, self.process.stderr.read()
        response = json.loads(line)
        if 'error' in response: raise AssertionError(response['error'])
        return response if response['supported'] else None

    def close(self):
        self.process.terminate()
        self.process.wait(timeout=5)

def visible_signature(page):
    title = page.locator('#prompt').inner_text().replace('\n', ' ').strip()
    hint = page.locator('#hint').inner_text().replace('\n', ' ').strip()
    labels = [x['label'] for x in options(page)]
    memory = page.locator('.memory-code').inner_text() if page.locator('.memory-code').count() else None
    return {
        'template': page.locator('#board').get_attribute('data-template'),
        'kind': page.locator('#board').get_attribute('data-kind'),
        'title': title, 'hint': hint, 'options': labels, 'memory': memory,
    }

def choose(page, signature, oracle, touch=False, keyboard=False, memory=None):
    if signature['kind'] != 'choice':
        solve_legacy(page, memory if memory is not None else [None], touch=touch, keyboard=keyboard)
        return
    template, title, hint, labels = signature['template'], signature['title'], signature['hint'], signature['options']
    result = oracle.answer(template, title, hint, labels)
    if result is None:
        solve_legacy(page, memory if memory is not None else [None], touch=touch, keyboard=keyboard)
        return
    answer = result['answer']
    winners = [i for i, label in enumerate(labels) if label == answer]
    assert len(winners) == 1, (template, title, hint, answer, labels)
    if keyboard:
        page.keyboard.press(answer if template == 'keymap' else str(winners[0] + 1))
    else:
        candidates = options(page)
        target = candidates[winners[0]]
        node = page.locator(f'.choice[data-answer="{target["id"]}"]')
        (node.tap if touch else node.click)()

def run_challenge(browser, oracle, seed, count, name, viewport, touch=False, keyboard=True, reduced=False):
    context = browser.new_context(viewport=viewport, has_touch=touch, device_scale_factor=1,
                                  reduced_motion='reduce' if reduced else 'no-preference')
    page = context.new_page(); errors=[]; web_requests=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('request', lambda r: web_requests.append(r.url) if r.url.startswith(('http:', 'https:')) else None)
    url = ARTIFACT.as_uri() + f'#v=7&seed={seed}&mode=challenge'
    page.goto(url, wait_until='load')
    assert page.locator('.seed-label').inner_text().endswith(seed)
    page.locator('#player-name').fill('V07 Browser')
    page.screenshot(path=str(QA / f'v07-browser-{name}-intro.png'))
    page.get_by_role('button', name='PLAY →', exact=True).click()
    memory=[None]; signatures=[]; seen=set(); layouts=[]; levels=[]; distractions=[]; stable_controls=None
    graded_correct=0; neutral_settlements=0; deck_finished=False; final_result=None
    while len(signatures) < count:
        wait_phase(page, lambda state: state in ['active','finished'])
        if page.locator('#app').get_attribute('data-phase') == 'finished': break
        sig=visible_signature(page); template=sig['template']
        assert template and template not in seen, (name, signatures, sig)
        seen.add(template); signatures.append(sig)
        info=layout(page); layouts.append(info)
        assert info['scrollWidth'] <= info['width'], (name,template,info)
        assert info['scrollHeight'] <= info['height'] + 1, (name,template,info)
        assert not info['smallTargets'], (name,template,info['smallTargets'])
        level=int(page.locator('#app').get_attribute('data-level')); levels.append(level)
        signal=page.locator('.arena').evaluate("e=>getComputedStyle(e,'::after').content")
        distractions.append(signal)
        if template == 'keymap':
            shortcuts=page.locator('.choice kbd').all_inner_texts()
            assert shortcuts == sig['options'], (name,template,'displayed shortcuts do not match literal keys',shortcuts,sig['options'])
        if level == 4 and stable_controls is None and sig['kind'] == 'choice':
            stable_controls=page.locator('.choice').evaluate_all("xs=>xs.map(x=>{const r=x.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})")
            page.wait_for_timeout(80)
            after=page.locator('.choice').evaluate_all("xs=>xs.map(x=>{const r=x.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})")
            assert stable_controls == after, (name, template, stable_controls, after)
        if len(signatures)==1: page.screenshot(path=str(QA / f'v07-browser-{name}-play.png'))
        choose(page,sig,oracle,touch,keyboard,memory)
        phase=page.locator('#app').get_attribute('data-phase')
        if phase == 'active':
            wait_phase(page, lambda state: state != 'active')
            phase=page.locator('#app').get_attribute('data-phase')
        assert phase == 'feedback', (name,template,'expected settled feedback',phase,page.locator('#stage').inner_text())
        status=page.locator('#stage').inner_text().strip()
        if status == 'ANSWER ACCEPTED':
            graded_correct += 1
        elif status == 'NOT A GRADED QUESTION':
            neutral_settlements += 1
        else:
            raise AssertionError((name,template,'non-accepted settlement',status,page.locator('#prompt').inner_text(),page.locator('#hint').inner_text()))
    assert len(signatures)==count, (name,'challenge ended before target',len(signatures),count)
    assert len(seen)==count
    assert graded_correct + neutral_settlements == count, (name,graded_correct,neutral_settlements,count)
    if count == 132:
        wait_phase(page, lambda state: state == 'finished', timeout=8)
        deck_finished=True
        assert 'MISSION DECK DONE' in page.locator('#stage').inner_text(), (name,page.locator('#stage').inner_text())
        ratio=page.locator('.result-ratio').inner_text()
        correct,attempted=map(int,re.findall(r'\d+',ratio))
        assert correct == attempted == graded_correct, (name,ratio,graded_correct,neutral_settlements)
        final_result={'correct':correct,'attempted':attempted,'status':page.locator('#stage').inner_text()}
    assert not errors, errors
    assert not web_requests, web_requests
    final=layout(page)
    result={'name':name,'browser':browser.version,'seed':seed,'viewport':viewport,'input':'touch' if touch else 'keyboard',
            'count':len(signatures),'signatures':signatures,'levels':levels,'maxLevel':max(levels),
            'distractionContent':distractions,'level4ControlsStableDuringDistraction':stable_controls is not None,
            'noRepeat':len(seen)==len(signatures),'layoutSamples':layouts,'finalLayout':final,
            'gradedCorrect':graded_correct,'neutralSettlements':neutral_settlements,
            'allSettlementsAccepted':graded_correct+neutral_settlements==count,'deckFinished':deck_finished,'finalResult':final_result,
            'javascriptErrors':errors,'networkRequests':web_requests,'reducedMotion':reduced}
    context.close();return result

def main():
    oracle=VisibleOracle()
    try:
      with sync_playwright() as p:
        release=artifact_identity()
        browser=launch_browser(p)
        all_desktop=run_challenge(browser,oracle,'browser-v07-all-132',132,'all132-desktop',{'width':1280,'height':900},keyboard=True)
        print('all132-desktop PASS', flush=True)
        all_small=run_challenge(browser,oracle,'browser-v07-all-132',132,'all132-small',{'width':360,'height':640},touch=True,keyboard=False,reduced=True)
        print('all132-small PASS', flush=True)
        desktop=run_challenge(browser,oracle,SEED,32,'desktop-challenge',{'width':1280,'height':900},keyboard=True)
        repeated=run_challenge(browser,oracle,SEED,32,'desktop-repeat',{'width':1280,'height':900},keyboard=True)
        other=run_challenge(browser,oracle,OTHER_SEED,12,'desktop-other-seed',{'width':1280,'height':900},keyboard=True)
        mobile=run_challenge(browser,oracle,SEED,12,'mobile-touch',{'width':390,'height':844},touch=True,keyboard=False)
        small=run_challenge(browser,oracle,SEED,12,'small-mobile-touch',{'width':360,'height':640},touch=True,keyboard=False,reduced=True)
        focusdesktop=run_challenge(browser,oracle,'browser-v07-focus-5',16,'focusfilter-desktop',{'width':1280,'height':900},keyboard=True)
        focusmobile=run_challenge(browser,oracle,'browser-v07-focus-5',16,'focusfilter-mobile',{'width':390,'height':844},touch=True,keyboard=False)
        assert desktop['signatures']==repeated['signatures'], 'same Challenge seed did not reproduce visible question signatures'
        assert desktop['signatures'][:12]!=other['signatures'], 'different Challenge seeds did not change visible content'
        assert focusdesktop['signatures'][-1]['template']=='focusfilter' and focusmobile['signatures'][-1]['template']=='focusfilter'
        assert len({x['template'] for x in desktop['signatures'] if x['template'] in {'raysight','knightmove','taxicab','foldpaper','stackview','griddegree','routeplan','linecross','orientation','focusfilter','gcd','lcm','percent','square','calendar','clockangle','area','combinations','unitconvert','fractionadd','signedcompare','weightedmean','consecutive','palindrome','wordladder','alphabetize','homograph','phraseorder','editdistance','letterpairs','acronym','subsequence','letterpattern','codebreak','assignment','decisiontree','causalorder','setcover','scheduling','stateflow','reachability','dualtrack','visualtracking','suppressrepeat','stopsignal','taskshift','crossmonitor','keymap','partition','interval'}})>=8
        assert desktop['maxLevel']==4 and '"SYS !!"' in desktop['distractionContent']
        assert all_desktop['count']==132 and all_small['count']==132
        assert all_desktop['noRepeat'] and all_small['noRepeat']
        assert all_desktop['allSettlementsAccepted'] and all_small['allSettlementsAccepted']
        assert all_desktop['deckFinished'] and all_small['deckFinished']
        assert all_desktop['maxLevel']==4 and all_small['maxLevel']==4
        browser_name=('Custom Chromium' if CHROMIUM_PATH else 'Playwright Chromium')+' '+browser.version
        browser.close()
        assert artifact_identity() == release, 'release artifact changed during browser qualification'
        report={'version':'0.7.0','ruleset':'7','browser':browser_name,'artifact':release,'cases':[desktop,repeated,other,mobile,small,focusdesktop,focusmobile,all_desktop,all_small],
              'sameSeedFirst32Exact':True,'differentSeedFirst12Different':True,'newV07TemplatesInDesktop32':len({x['template'] for x in desktop['signatures'] if x['template'] in {'raysight','knightmove','taxicab','foldpaper','stackview','griddegree','routeplan','linecross','orientation','focusfilter','gcd','lcm','percent','square','calendar','clockangle','area','combinations','unitconvert','fractionadd','signedcompare','weightedmean','consecutive','palindrome','wordladder','alphabetize','homograph','phraseorder','editdistance','letterpairs','acronym','subsequence','letterpattern','codebreak','assignment','decisiontree','causalorder','setcover','scheduling','stateflow','reachability','dualtrack','visualtracking','suppressrepeat','stopsignal','taskshift','crossmonitor','keymap','partition','interval'}}),
              'result':'PASS','scope':'Playwright Chromium against the exact ruleset 7 artifact; seeded Challenge visible signatures, interaction, layout, and UI stability.'}
      for filename, case in [('v07-all-132-desktop.json',all_desktop),('v07-all-132-small.json',all_small)]:
        sweep={'result':'PASS','name':case['name'],'browser':browser_name,'artifact':release,
               'expectedTemplates':132,'seenTemplates':case['count'],'count':case['count'],
               'noRepeat':case['noRepeat'],'maxLevel':case['maxLevel'],'gradedCorrect':case['gradedCorrect'],
               'neutralSettlements':case['neutralSettlements'],'allSettlementsAccepted':case['allSettlementsAccepted'],
               'deckFinished':case['deckFinished'],'finalResult':case['finalResult'],'javascriptErrors':case['javascriptErrors'],
               'networkRequests':case['networkRequests'],'viewport':case['viewport'],'input':case['input'],'reducedMotion':case['reducedMotion']}
        (QA/filename).write_text(json.dumps(sweep,indent=2,ensure_ascii=False)+'\n',encoding='utf-8',newline='\n')
      (QA/'v07-browser-challenge.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8',newline='\n')
      print(json.dumps({k:v for k,v in report.items() if k!='cases'},indent=2))
    finally: oracle.close()

if __name__=='__main__': main()
