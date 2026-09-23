"""One complete, real-time adaptive playthrough, using only visible content."""
import argparse, json, os, shutil, time
from playwright.sync_api import sync_playwright
from browser_test import HTML, QA, solve, wait_phase, layout

parser=argparse.ArgumentParser()
parser.add_argument('--url',help='Play against a running HUMAN ERROR server instead of the standalone offline artifact.')
args=parser.parse_args()

with sync_playwright() as p:
    kwargs={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage']}
    exe=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
    if exe:kwargs['executable_path']=exe
    browser=p.chromium.launch(**kwargs)
    page=browser.new_page(viewport={'width':1366,'height':768})
    errors=[];requests=[];api_responses=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:requests.append(r.url))
    page.on('response',lambda r:api_responses.append({'url':r.url,'status':r.status}) if '/api/' in r.url else None)
    if args.url: page.goto(args.url,wait_until='load')
    else: page.set_content(HTML)
    page.locator('#player-name').fill('Timed QA')
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
    final_layout=layout(page)
    assert final_layout['scrollWidth']<=final_layout['width'],final_layout
    assert final_layout['scrollHeight']<=final_layout['height']+1,final_layout
    if args.url:
        page.locator('.competition-result').get_by_text('SHARED RESULT ACCEPTED',exact=True).wait_for(timeout=15000)
        origin=args.url.split('/',3)[:3]
        origin='/'.join(origin)
        allowed=(origin+'/',origin+'/index.html',origin+'/favicon.ico',origin+'/api/leaderboard',origin+'/api/run-sessions')
        assert all(url.startswith(origin+'/') and any(url.split('?',1)[0]==path or url.split('?',1)[0].startswith(origin+'/api/run-sessions/') for path in allowed) for url in requests),requests
        assert any(r['url']==origin+'/api/leaderboard' and r['status']==200 for r in api_responses),api_responses
        assert any(r['url']==origin+'/api/run-sessions' and r['status']==201 for r in api_responses),api_responses
        assert any('/submit' in r['url'] and r['status']==200 for r in api_responses),api_responses
        assert 'SHARED RANK' in page.locator('.competition-result').inner_text()
    else:
        assert not requests,requests
    page.screenshot(path=str(QA/'timed-adaptive-result.png'))
    report={'browser':browser.version,'loading':'live-server-url' if args.url else 'exact-artifact-document','serverUrl':args.url,'realTime':True,'screens':count,'correct':a,'graded':b,'accuracy':100,'wallSeconds':round(time.monotonic()-start,2),'displayedActiveSecondsRemaining':page.locator('#clock').inner_text(),'errors':errors,'runtimeRequests':requests,'apiResponses':api_responses,'sharedResultAccepted':bool(args.url),'result':page.locator('.competition-result').inner_text() if args.url else None,'layout':final_layout}
    (QA/'timed-adaptive.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2),flush=True)
    browser.close()
