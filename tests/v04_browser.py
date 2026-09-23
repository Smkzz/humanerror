"""Deterministic v0.4 coverage: seven new tasks plus local-name/leaderboard integration."""
import json, os, re, shutil
from playwright.sync_api import sync_playwright
from browser_test import HTML, QA, solve, wait_phase, layout

COVERAGE_SEED='v04-511'
TARGETS={
    'TYPE ':'reverse',
    'COUNT THE VOWELS':'vowels',
    'WHICH PAIR MAKES ':'pairtotal',
    'TAP ':'counter',
    'MIDDLE LETTER':'middle',
    'WHAT COMES NEXT':'sequence',
    'PICK THE WORD WITHOUT ':'notcontain',
}

def wait_state(page,wanted,timeout=8):
    for _ in range(int(timeout*40)):
        state=page.locator('#app').get_attribute('data-phase')
        if state in wanted:return state
        page.wait_for_timeout(25)
    raise AssertionError((state,page.locator('#prompt').inner_text()))

def open_challenge(browser,touch):
    viewport={'width':390,'height':844} if touch else {'width':1280,'height':900}
    context=browser.new_context(viewport=viewport,has_touch=touch,device_scale_factor=1)
    page=context.new_page()
    page.goto(f'about:blank#v=4&seed={COVERAGE_SEED}&mode=challenge')
    page.set_content(HTML,wait_until='load')
    page.locator('#player-name').fill('V04 Touch' if touch else 'V04 Keys')
    page.get_by_role('button',name='PANIC →',exact=True).click()
    return context,page

def target_name(title):
    for prefix,name in TARGETS.items():
        if title.startswith(prefix):return name
    return None

def coverage_run(browser,touch):
    context,page=open_challenge(browser,touch)
    errors=[];requests=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    page.on('request',lambda r:requests.append(r.url))
    memory=[None];seen={};screens=0
    while len(seen)<7 and screens<22:
        wait_state(page,{'active','finished'})
        assert page.locator('#app').get_attribute('data-phase')!='finished',(seen,screens)
        title=page.locator('#prompt').inner_text().replace('\n',' ')
        kind=page.locator('#board').get_attribute('data-kind')
        info=layout(page)
        assert info['scrollWidth']<=info['width'] and info['scrollHeight']<=info['height']+1,info
        assert not info['smallTargets'],info
        name=target_name(title)
        if name and name not in seen:
            evidence={'title':title,'kind':kind,'screenIndex':screens}
            if name=='counter':
                evidence['targetTaps']=int(re.match(r'TAP (\d+) TIMES\.',title).group(1))
                assert page.locator('#counter-value').inner_text()=='0'
            solve(page,memory,touch=touch,keyboard=not touch)
            wait_state(page,{'feedback','finished'})
            assert page.locator('#prompt').inner_text()=='CORRECT.',page.locator('#hint').inner_text()
            seen[name]=evidence
        elif kind=='memory':
            memory[0]=page.locator('.memory-code').inner_text()
            wait_phase(page,lambda s:s!='active')
        else:
            solve(page,memory,touch=touch,keyboard=not touch)
        screens+=1
    assert set(seen)==set(TARGETS.values()),seen
    assert not errors,errors
    assert not requests,requests
    context.close()
    return {'seed':COVERAGE_SEED,'input':'touch' if touch else 'keyboard','screensVisited':screens,'targets':seen}

def leaderboard_integration(browser):
    context=browser.new_context(viewport={'width':1280,'height':900})
    context.route('http://human-error.local/**',lambda route: route.fulfill(status=200,content_type='text/html',body=HTML))
    page=context.new_page()
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://human-error.local/',wait_until='load')
    page.locator('#player-name').fill('Alice')
    page.get_by_role('button',name='PANIC →',exact=True).click()
    memory=[None];screens=0
    while page.locator('#app').get_attribute('data-phase')!='finished' and screens<24:
        wait_state(page,{'active','finished'})
        if page.locator('#app').get_attribute('data-phase')=='finished':break
        kind=page.locator('#board').get_attribute('data-kind')
        if kind=='memory':
            memory[0]=page.locator('.memory-code').inner_text();wait_phase(page,lambda s:s!='active')
        elif kind in ['reaction','wait']:
            page.locator('.bait').click()
        elif kind=='override':
            page.locator('.bait').wait_for(timeout=4000);page.locator('.bait').click()
        elif kind=='typing':
            page.keyboard.type('ZZZZ');page.keyboard.press('Enter')
        elif kind=='counter':
            page.get_by_role('button',name='SEND ↵',exact=True).click()
        elif kind=='choice':
            page.locator('.choice').first.click()
        else: raise AssertionError(kind)
        screens+=1
    assert page.locator('#app').get_attribute('data-phase')=='finished',screens
    assert not page.locator('#board').inner_text().find('Alice')<0
    stored=page.evaluate("JSON.parse(localStorage.getItem('human-error:leaderboard:v4'))")
    assert stored['name']=='Alice'
    assert len(stored['leaderboard'])==1
    assert stored['leaderboard'][0]['name']=='Alice'
    score=stored['leaderboard'][0]['score']
    page.get_by_role('button',name='Leaderboard',exact=True).click()
    assert 'WHO' in page.locator('#prompt').inner_text()
    assert 'Alice' in page.locator('.leaderboard').inner_text()
    assert str(score) in page.locator('.leaderboard').inner_text().replace(',','')
    info=layout(page);assert info['scrollWidth']<=info['width'] and info['scrollHeight']<=info['height']+1,info
    assert not errors,errors
    context.close()
    return {'player':'Alice','recorded':True,'score':score,'screensUntilFinish':screens}

def local_migration(browser):
    context=browser.new_context(viewport={'width':390,'height':844})
    context.route('http://human-error.local/**',lambda route: route.fulfill(status=200,content_type='text/html',body=HTML))
    legacy=context.new_page()
    legacy.add_init_script("localStorage.setItem('human-error:v3',JSON.stringify({best:4321,sound:true}))")
    legacy.goto('http://human-error.local/',wait_until='load')
    legacy.locator('#player-name').fill('Legacy Player')
    legacy.get_by_role('button',name='Practice',exact=True).click()
    legacy_profile=legacy.evaluate("JSON.parse(localStorage.getItem('human-error:leaderboard:v4'))")
    assert legacy_profile['leaderboard'][0]['name']=='Legacy Player'
    assert legacy_profile['leaderboard'][0]['score']==4321
    assert legacy_profile['sharedLeaderboard']==[]
    assert 'Legacy Player' in legacy.locator('.competition-panel').inner_text()
    context.close()

    current={'name':'Current Player','leaderboard':[{'name':'Current Player','score':7654,'correct':7,'attempted':10,'bestStreak':4,'recordedAt':1790000000000}], 'sharedLeaderboard':[], 'lastKnownRank':None,'lastKnownRankAt':None,'gamesPlayed':9}
    context=browser.new_context(viewport={'width':390,'height':844})
    context.route('http://human-error.local/**',lambda route: route.fulfill(status=200,content_type='text/html',body=HTML))
    page=context.new_page()
    page.add_init_script("localStorage.setItem('human-error:leaderboard:v4',"+json.dumps(json.dumps(current))+ ")")
    page.goto('http://human-error.local/',wait_until='load')
    assert page.locator('#player-name').input_value()=='Current Player'
    assert 'Current Player' in page.locator('.competition-panel').inner_text()
    restored=page.evaluate("JSON.parse(localStorage.getItem('human-error:leaderboard:v4'))")
    assert restored['leaderboard'][0]['score']==7654
    assert restored['sharedLeaderboard']==[]
    assert restored['gamesPlayed']==9
    context.close()
    return {'legacyV3PersonalBest':4321,'migratedInto':'browser-local v4 profile','sharedLeaderboardEntries':0,'currentV4LocalProfileRestored':True,'gamesPlayedRestored':9}

with sync_playwright() as p:
    kwargs={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage']}
    exe=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
    if exe:kwargs['executable_path']=exe
    browser=p.chromium.launch(**kwargs)
    report={'browser':browser.version,'result':'PASS','coverageRuns':[coverage_run(browser,False),coverage_run(browser,True)],'leaderboard':leaderboard_integration(browser),'localMigration':local_migration(browser)}
    (QA/'v04-browser-fixtures.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
    browser.close()
