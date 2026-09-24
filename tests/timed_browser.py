"""One complete, real-time adaptive playthrough, using only visible content."""
import argparse, json, os, re, shutil, time
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
    errors=[];requests=[];api_responses=[];submissions=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:requests.append(r.url))
    def capture_response(response):
        if '/api/' not in response.url:return
        item={'url':response.url,'status':response.status}
        if '/submit' in response.url:
            try:item['body']=response.json();submissions.append(item['body'])
            except Exception:item['body']=None
        api_responses.append(item)
    page.on('response',capture_response)
    if args.url: page.goto(args.url,wait_until='load')
    else: page.set_content(HTML)
    page.locator('#player-name').fill('Timed QA')
    page.get_by_role('button',name='PANIC →',exact=True).click()
    memory=[None];count=0;seen=[];novel=[];levels=[];tempos=[];distractions=[];start=time.monotonic()
    while page.locator('#app').get_attribute('data-phase')!='finished':
        wait_phase(page,lambda s:s in ['active','finished'])
        if page.locator('#app').get_attribute('data-phase')=='finished':break
        kind=page.locator('#board').get_attribute('data-kind')
        template=page.locator('#board').get_attribute('data-template')
        assert template and template not in seen,seen+[template]
        seen.append(template)
        if template in {'mirror','rotate','loopcount','overlap','occlusion','changegrid','pathtrace','components','tilefit','cubeface','conflict','ruleswitch','ruleinfer','errorcheck','rulefollow','queueorder','stateupdate','nback','timeline','elapsed','beats','prime','factorpairs','modthree','fraction','ratio','estimate','binary','balance','precedence','unitrate','chance','roman','mean','perimeter','anagram','weave','rhyme','analogy','compound','caesar','homophone','categorize','xor','implication','syllogism','ordering','setdiff','counterexample','sieve'}:novel.append(template)
        level=int(page.locator('#app').get_attribute('data-level'))
        levels.append(level)
        mode_label=page.locator('#mode-label').inner_text()
        tempos.append(float(mode_label.split('·')[1].replace('× TEMPO','').strip()))
        distractions.append(page.locator('.arena').evaluate("e=>getComputedStyle(e,'::after').content"))
        if kind=='memory':
            memory[0]=page.locator('.memory-code').inner_text()
            wait_phase(page,lambda s:s!='active')
        else:
            if kind in ['choice','typing','counter']:
                page.wait_for_timeout(1100)
                if page.locator('#app').get_attribute('data-phase')!='active':
                    continue
            solve(page,memory,keyboard=True)
        count+=1
        if count%10==0: print('completed screens',count,flush=True)
        assert count<300
        assert time.monotonic()-start<240
    ratio=page.locator('.result-ratio').inner_text()
    a,b=map(int,ratio.split('/'))
    assert a==b,(ratio,page.locator('#board').inner_text())
    assert len(seen)==len(set(seen)),seen
    assert len(seen)>=20 and novel,{'screens':len(seen),'novel':novel}
    assert max(levels)==4 and max(tempos)>=1.38,(levels,tempos)
    assert any('SYS' in signal for signal in distractions),distractions
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
        assert submissions and submissions[-1]['accepted'] is True and submissions[-1]['validation']=='server-replayed',submissions
        client_score=int(re.sub(r'\D','',page.locator('#score').inner_text()))
        client_correct,client_attempted=map(int,page.locator('.result-ratio').inner_text().split('/'))
        server_result=submissions[-1]
        assert (server_result['score'],server_result['correct'],server_result['attempted'])==(client_score,client_correct,client_attempted),(server_result,client_score,client_correct,client_attempted)
        assert server_result['endReason']=='time' and page.locator('#stage').inner_text()=='YOU SURVIVED.',(server_result,page.locator('#stage').inner_text())
    else:
        assert not requests,requests
    page.screenshot(path=str(QA/'v06-timed-adaptive-result.png'))
    report={'browser':browser.version,'version':'0.6.0','ruleset':'6','loading':'live-server-url' if args.url else 'exact-artifact-document','serverUrl':args.url,'realTime':True,'screens':len(seen),'completedScreens':count,'missionTemplates':seen,'newMissionTemplates':novel,'noRepeat':len(seen)==len(set(seen)),'levels':levels,'tempoMultiplier':tempos,'distractionPseudoContent':distractions,'correct':a,'graded':b,'accuracy':100,'wallSeconds':round(time.monotonic()-start,2),'displayedActiveSecondsRemaining':page.locator('#clock').inner_text(),'browserErrors':errors,'runtimeRequests':requests,'apiResponses':api_responses,'sharedResultAccepted':bool(args.url),'serverReplayResult':({key:submissions[-1][key] for key in ['validation','version','ruleset','score','correct','attempted','bestStreak','endReason','activeMs']} if submissions else None),'browserServerParity':bool(args.url and submissions and (submissions[-1]['score'],submissions[-1]['correct'],submissions[-1]['attempted'])==(int(re.sub(r'\D','',page.locator('#score').inner_text())),a,b)),'result':page.locator('.competition-result').inner_text() if args.url else None,'layout':final_layout}
    (QA/'v06-timed-adaptive.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2),flush=True)
    browser.close()
