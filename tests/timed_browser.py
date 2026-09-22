"""One complete, real-time adaptive playthrough, using only visible content."""
import json, os, shutil, time
from playwright.sync_api import sync_playwright
from browser_test import HTML, QA, solve, wait_phase, layout

with sync_playwright() as p:
    kwargs={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage']}
    exe=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
    if exe:kwargs['executable_path']=exe
    browser=p.chromium.launch(**kwargs)
    page=browser.new_page(viewport={'width':1366,'height':768})
    errors=[];requests=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
    page.set_content(HTML)
    page.get_by_role('button',name='PANIC →',exact=True).click()
    memory=[None];count=0;start=time.monotonic()
    while page.locator('#app').get_attribute('data-phase')!='finished':
        wait_phase(page,lambda s:s in ['active','finished'])
        if page.locator('#app').get_attribute('data-phase')=='finished':break
        kind=page.locator('#board').get_attribute('data-kind')
        if kind=='memory':
            memory[0]=page.locator('.memory-code').inner_text()
            wait_phase(page,lambda s:s!='active')
        else:
            solve(page,memory,keyboard=True)
        count+=1
        if count%10==0: print('completed screens',count,flush=True)
        assert count<300
        assert time.monotonic()-start<240
    ratio=page.locator('.result-ratio').inner_text()
    a,b=map(int,ratio.split('/'))
    assert a==b,(ratio,page.locator('#board').inner_text())
    assert 'YOU SURVIVED' in page.locator('#stage').inner_text()
    assert not errors,errors
    assert not requests,requests
    page.screenshot(path=str(QA/'timed-adaptive-result.png'))
    report={'browser':browser.version,'loading':'exact-artifact-document','realTime':True,'screens':count,'correct':a,'graded':b,'accuracy':100,'wallSeconds':round(time.monotonic()-start,2),'displayedActiveSecondsRemaining':page.locator('#clock').inner_text(),'errors':errors,'runtimeRequests':requests,'layout':layout(page)}
    (QA/'timed-adaptive.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2),flush=True)
    browser.close()
