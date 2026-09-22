"""Deterministic v0.3 browser coverage: all new games on one fixed deck plus override render-boundary fairness."""
import json, os, shutil
from playwright.sync_api import sync_playwright
from browser_test import HTML, QA, solve, wait_phase, layout, options

COVERAGE_SEED='coverage-2'
TARGETS={
    'SECOND LARGEST':'second',
    'PRESS THE ':'position',
    'COUNT THE ':'lettercount',
    'DO NOT PICK ':'avoid',
    'WHICH PAIR MATCHES EXACTLY':'match',
}

def open_challenge(browser, seed, touch):
    viewport={'width':390,'height':844} if touch else {'width':1280,'height':900}
    context=browser.new_context(viewport=viewport,has_touch=touch,device_scale_factor=1)
    page=context.new_page()
    page.goto(f'about:blank#v=3&seed={seed}&mode=challenge')
    page.set_content(HTML,wait_until='load')
    assert 'SAME-DECK CHALLENGE' in page.locator('#mode-label').inner_text()
    page.get_by_role('button',name='PANIC →',exact=True).click()
    return context,page

def wait_game_state(page, wanted):
    pauses=0
    for _ in range(500):
        state=page.locator('#app').get_attribute('data-phase')
        if state=='paused':
            pauses+=1
            page.get_by_role('button',name='RESUME →',exact=True).click()
            page.wait_for_timeout(25)
            continue
        if state in wanted:return state,pauses
        page.wait_for_timeout(25)
    raise AssertionError(f'Game did not reach {wanted}: {state}; {page.locator("#prompt").inner_text()}')

def target_name(title):
    for prefix,name in TARGETS.items():
        if title.startswith(prefix):return name
    return None

def validate_target(page,name,title):
    candidates=options(page)
    assert len(candidates)>=3
    evidence={'title':title,'optionCount':len(candidates)}
    if name=='second':
        assert len(candidates)==4,candidates
    if name=='position':
        target=title.removeprefix('PRESS THE ').removesuffix(' BUTTON.')
        target_index={'LEFT':0,'MIDDLE':1,'RIGHT':2}[target]
        boxes=page.locator('.choice').evaluate_all(
            "els => els.map(el => ({x:el.getBoundingClientRect().x, aria:el.getAttribute('aria-label'), text:el.querySelector('.choice-label').textContent}))"
        )
        assert [b['x'] for b in boxes]==sorted(b['x'] for b in boxes),boxes
        expected_prefix=['Left position','Middle position','Right position'][target_index]
        assert boxes[target_index]['aria'].startswith(expected_prefix),boxes[target_index]
        assert f"printed {boxes[target_index]['text']}" in boxes[target_index]['aria']
        evidence['accessibleNames']=[b['aria'] for b in boxes]
    return evidence

def coverage_run(browser,touch):
    context,page=open_challenge(browser,COVERAGE_SEED,touch)
    errors=[];requests=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    page.on('request',lambda r:requests.append(r.url))
    memory=[None];seen={};screens=0;auto_pauses=0
    while len(seen)<5 and screens<24:
        state,pauses=wait_game_state(page,{'active','finished'});auto_pauses+=pauses
        assert state!='finished',(seen,page.locator('#board').inner_text())
        title=page.locator('#prompt').inner_text().replace('\n',' ')
        kind=page.locator('#board').get_attribute('data-kind')
        info=layout(page)
        assert info['scrollWidth']<=info['width'] and info['scrollHeight']<=info['height']+1,info
        assert not info['smallTargets'],info
        name=target_name(title)
        if name and name not in seen:
            evidence=validate_target(page,name,title)
            solve(page,memory,touch=touch,keyboard=not touch)
            state,pauses=wait_game_state(page,{'feedback','finished'});auto_pauses+=pauses
            assert page.locator('#prompt').inner_text()=='CORRECT.',page.locator('#hint').inner_text()
            evidence['screenIndex']=screens
            seen[name]=evidence
        elif kind=='memory':
            memory[0]=page.locator('.memory-code').inner_text()
            wait_phase(page,lambda s:s!='active')
        else:
            solve(page,memory,touch=touch,keyboard=not touch)
        screens+=1
    assert set(seen)=={'position','lettercount','second','match','avoid'},seen
    assert not errors,errors
    assert not requests,requests
    context.close()
    return {'seed':COVERAGE_SEED,'input':'touch' if touch else 'keyboard','screensVisited':screens,'autoPausesResumed':auto_pauses,'targets':seen}

def override_boundary(browser):
    context,page=open_challenge(browser,'override-0',False)
    memory=[None];auto_pauses=0
    for _ in range(3):
        state,pauses=wait_game_state(page,{'active'});auto_pauses+=pauses
        kind=page.locator('#board').get_attribute('data-kind')
        if kind=='memory':
            memory[0]=page.locator('.memory-code').inner_text()
            wait_phase(page,lambda s:s!='active')
        else:
            solve(page,memory,keyboard=True)
    state,pauses=wait_game_state(page,{'active'});auto_pauses+=pauses
    assert page.locator('#prompt').inner_text()=='IGNORE THE NEXT ORDER.'
    assert page.locator('.bait').count()==0
    before_correct=page.locator('#correct').inner_text()
    before_lives=page.locator('#lives').get_attribute('aria-label')
    remaining=page.locator('#round-progress')
    value=remaining.evaluate('(el) => el.value')
    for _ in range(700):
        if page.locator('#app').get_attribute('data-phase')=='paused':
            auto_pauses+=1
            page.get_by_role('button',name='RESUME →',exact=True).click()
            page.wait_for_timeout(25)
            continue
        value=remaining.evaluate('(el) => el.value')
        if value<=2240:break
        page.wait_for_timeout(5)
    assert page.locator('#app').get_attribute('data-phase')=='active'
    assert 2000<value<=2240,(value,page.locator('#prompt').inner_text())
    # Cross the final cue boundary without allowing a paint and without triggering the >350 ms gap guard.
    page.evaluate("""() => {
      const start=performance.now();
      while(performance.now()-start<275){}
      document.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true}));
    }""")
    assert page.locator('#app').get_attribute('data-phase')=='active'
    assert page.locator('#correct').inner_text()==before_correct
    assert page.locator('#lives').get_attribute('aria-label')==before_lives
    page.get_by_role('button',name='CLICK ME',exact=True).wait_for(timeout=1000)
    page.keyboard.press('Space')
    wait_game_state(page,{'feedback','finished'})
    assert page.locator('#correct').inner_text()=='2/3'
    assert page.locator('#lives').get_attribute('aria-label')=='3 lives remaining'
    context.close()
    return {'preRenderInputIgnored':True,'visibleBaitInputGraded':True,'autoPausesResumed':auto_pauses}

with sync_playwright() as p:
    kwargs={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage']}
    exe=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
    if exe:kwargs['executable_path']=exe
    browser=p.chromium.launch(**kwargs)
    runs=[coverage_run(browser,False),coverage_run(browser,True)]
    boundary=override_boundary(browser)
    report={'browser':browser.version,'result':'PASS','coverageRuns':runs,'overrideBoundary':boundary}
    (QA/'v03-browser-fixtures.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
    browser.close()
