"""Live adaptive Chrome play-through with server replay and leaderboard readback."""
from __future__ import annotations
import json, os, re, shutil, socket, subprocess, tempfile, time, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
from v07_browser import VisibleOracle, ROOT, QA, options, wait_phase, layout, solve_legacy, choose, artifact_identity, launch_browser

def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1',0)); return s.getsockname()[1]

def main():
    oracle=VisibleOracle(); runtime=tempfile.TemporaryDirectory(prefix='human-error-v07-browser-')
    port=free_port(); origin=f'http://127.0.0.1:{port}'
    env=os.environ.copy(); env.update({'HOST':'127.0.0.1','PORT':str(port),'DATA_DIR':runtime.name})
    server=subprocess.Popen(['node','scripts/serve.mjs'],cwd=ROOT,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding='utf-8')
    try:
      ready=False
      for _ in range(100):
        if server.poll() is not None: raise AssertionError(f'server exited early: {server.stdout.read()}')
        try:
          with urllib.request.urlopen(origin+'/api/health',timeout=1) as response:
            health=json.loads(response.read()); assert health['status']=='ok' and health['ruleset']=='7'; ready=True; break
        except Exception: time.sleep(.1)
      assert ready,'v0.7 HTTP service did not become healthy'
      with sync_playwright() as p:
        release=artifact_identity()
        browser=launch_browser(p)
        page=browser.new_page(viewport={'width':1280,'height':900})
        errors=[]; requests=[]; api=[]; submissions=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
        page.on('request',lambda r:requests.append(r.url))
        def capture(response):
          if '/api/' not in response.url:return
          item={'url':response.url,'status':response.status}
          if '/submit' in response.url:
            try:item['body']=response.json();submissions.append(item['body'])
            except Exception:item['body']=None
          api.append(item)
        page.on('response',capture)
        page.goto(origin+'/',wait_until='load')
        page.locator('#player-name').fill('V07 Live QA')
        page.get_by_role('button',name='PLAY →',exact=True).click()
        start=time.monotonic(); memory=[None]; seen=[]; signatures=[]; levels=[]; tempos=[]; distractions=[]; layouts=[]
        while page.locator('#app').get_attribute('data-phase')!='finished':
          wait_phase(page,lambda s:s in ['active','finished'])
          if page.locator('#app').get_attribute('data-phase')=='finished':break
          page.wait_for_function("() => { const e=document.querySelector('#app'), b=document.querySelector('#board'); return e && (e.dataset.phase==='finished'||(e.dataset.phase==='active'&&b?.dataset.template&&b?.dataset.kind)); }",
                                 timeout=2000)
          if page.locator('#app').get_attribute('data-phase')=='finished':break
          page.wait_for_function("() => { const e=document.querySelector('#app'); return e && (e.dataset.phase==='finished'||e.dataset.level); }",timeout=2000)
          if page.locator('#app').get_attribute('data-phase')=='finished':break
          sig={'template':page.locator('#board').get_attribute('data-template'),
               'kind':page.locator('#board').get_attribute('data-kind'),
               'title':page.locator('#prompt').inner_text().replace('\n',' ').strip(),
               'hint':page.locator('#hint').inner_text().replace('\n',' ').strip(),
               'options':[x['label'] for x in options(page)],
               'memory':page.locator('.memory-code').inner_text() if page.locator('.memory-code').count() else None}
          assert sig['template'] and sig['template'] not in seen,(seen,sig)
          seen.append(sig['template']);signatures.append(sig)
          level=int(page.locator('#app').get_attribute('data-level'));levels.append(level)
          mode=page.locator('#mode-label').inner_text();tempo_match=re.search(r'(\d+(?:\.\d+)?)×',mode);assert tempo_match,mode;tempos.append(float(tempo_match.group(1)))
          distractions.append(page.locator('.arena').evaluate("e=>getComputedStyle(e,'::after').content"))
          info=layout(page);layouts.append(info)
          assert info['scrollWidth']<=info['width'] and info['scrollHeight']<=info['height']+1,(sig['template'],info)
          assert not info['smallTargets'],(sig['template'],info['smallTargets'])
          # Keep the 60-second Adaptive budget ahead of this enlarged no-repeat deck;
          # otherwise a zero-latency fixture can finish all 132 cards as unranked exhaustion.
          if sig['kind']=='choice':
            page.wait_for_timeout(500)
            if page.locator('#app').get_attribute('data-phase')=='finished': break
          if sig['kind']!='choice':
            solve_legacy(page,memory,keyboard=True)
          else:
            answer=oracle.answer(sig['template'],sig['title'],sig['hint'],sig['options'])
            if answer is None:solve_legacy(page,memory,keyboard=True)
            else:
              winners=[i for i,x in enumerate(sig['options']) if x==answer['answer']]
              assert len(winners)==1,(sig,answer)
              page.keyboard.press(answer['answer'] if sig['template']=='keymap' else str(winners[0]+1))
          if sig['kind']!='memory':
            phase=page.locator('#app').get_attribute('data-phase')
            if phase=='active':
              wait_phase(page,lambda s:s!='active')
              phase=page.locator('#app').get_attribute('data-phase')
            if phase=='feedback':
              status=page.locator('#stage').inner_text().strip()
              if status!='ANSWER ACCEPTED':
                raise AssertionError(('timed non-accepted settlement',sig,status,page.locator('#prompt').inner_text(),page.locator('#hint').inner_text()))
          assert time.monotonic()-start<240,'live adaptive run exceeded 240 seconds'
        ratio=page.locator('.result-ratio').inner_text();correct,attempted=map(int,re.findall(r'\d+',ratio))
        assert attempted>=10 and correct==attempted,(ratio,seen)
        assert 'YOU SURVIVED' in page.locator('#stage').inner_text(),page.locator('#stage').inner_text()
        page.screenshot(path=str(QA/'v07-browser-adaptive-result.png'))
        page.locator('.competition-result').get_by_text('SHARED RESULT ACCEPTED',exact=True).wait_for(timeout=15000)
        allowed={origin+'/',origin+'/index.html',origin+'/favicon.ico',origin+'/api/leaderboard',origin+'/api/run-sessions'}
        assert all(url.startswith(origin+'/') and (url.split('?',1)[0] in allowed or '/api/run-sessions/' in url and url.endswith('/submit')) for url in requests),requests
        assert any(x['url']==origin+'/api/leaderboard' and x['status']==200 for x in api),api
        assert any(x['url']==origin+'/api/run-sessions' and x['status']==201 for x in api),api
        assert any('/submit' in x['url'] and x['status']==200 for x in api),api
        assert submissions and submissions[-1]['accepted'] is True and submissions[-1]['validation']=='server-replayed',submissions
        score=int(re.sub(r'\D','',page.locator('#score').inner_text()))
        assert (submissions[-1]['score'],submissions[-1]['correct'],submissions[-1]['attempted'])==(score,correct,attempted),(submissions[-1],score,correct,attempted)
        assert submissions[-1]['endReason']=='time',(submissions[-1],page.locator('#stage').inner_text())
        assert max(levels)==4 and max(tempos)>=1.38,(levels,tempos)
        assert any('SYS !!' in x for x in distractions),distractions
        assert not errors,errors
        assert len(seen)==len(set(seen))
        browser_name=('Custom Chromium' if os.environ.get('CHROMIUM_PATH') else 'Playwright Chromium')+' '+browser.version
        browser.close()
        assert artifact_identity() == release, 'release artifact changed during timed browser qualification'
        report={'browser':browser_name,'version':'0.7.0','ruleset':'7','artifact':release,'serverUrl':origin,'result':'PASS',
                'activeScreens':len(seen),'templates':seen,'visibleQuestionSignatures':signatures,'noRepeat':True,
                'levels':levels,'tempoMultiplier':tempos,'distractionContent':distractions,'layoutSamples':layouts,
                'correct':correct,'graded':attempted,'score':score,'wallSeconds':round(time.monotonic()-start,2),
                'serverReplay':{k:submissions[-1][k] for k in ['validation','version','ruleset','score','correct','attempted','bestStreak','endReason','activeMs']},
                'browserServerParity':True,'leaderboardSubmissionAccepted':True,'apiResponses':api,'javascriptErrors':errors,
                'runtimeRequests':requests,'scope':'Fresh local v0.7 service with temporary leaderboard storage; Chrome played the built artifact and server replay accepted the event transcript.'}
        (QA/'v07-browser-server.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8',newline='\n')
        print(json.dumps({k:v for k,v in report.items() if k not in {'visibleQuestionSignatures','layoutSamples','distractionContent','runtimeRequests'}},indent=2,ensure_ascii=False))
    finally:
      oracle.close();server.terminate()
      try:server.wait(timeout=5)
      except subprocess.TimeoutExpired:server.kill();server.wait(timeout=5)
      runtime.cleanup()

if __name__=='__main__':main()
