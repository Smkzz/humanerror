"""Check that a fresh browser context reads a previously accepted shared score."""
import argparse, json, os, shutil
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
from browser_test import QA, layout

parser=argparse.ArgumentParser()
parser.add_argument('--url',required=True,help='URL of a running HUMAN ERROR service with an accepted result.')
parser.add_argument('--player',required=True)
parser.add_argument('--score',required=True,type=int)
args=parser.parse_args()
origin=f'{urlsplit(args.url).scheme}://{urlsplit(args.url).netloc}'

with sync_playwright() as p:
    kwargs={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage']}
    exe=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
    if exe:kwargs['executable_path']=exe
    browser=p.chromium.launch(**kwargs)
    context=browser.new_context(viewport={'width':390,'height':844})
    context.add_init_script("window.__initialLeaderboardProfile=localStorage.getItem('human-error:leaderboard:v4')")
    page=context.new_page();errors=[];requests=[];responses=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:requests.append(r.url))
    page.on('response',lambda r:responses.append({'url':r.url,'status':r.status}) if '/api/' in r.url else None)
    page.goto(args.url,wait_until='load')
    row=page.locator('.competition-panel .competition-row').filter(has_text=args.player)
    row.wait_for(timeout=10000)
    row_text=row.inner_text().replace('\n',' ')
    score_text=''.join(char for char in row.locator('.leaderboard-score').inner_text() if char.isdigit())
    assert score_text and int(score_text)==args.score,(row_text,args.score)
    assert page.evaluate('window.__initialLeaderboardProfile') is None
    cached_profile=page.evaluate("JSON.parse(localStorage.getItem('human-error:leaderboard:v4'))")
    assert cached_profile['sharedLeaderboard'][0]['name']==args.player
    assert cached_profile['sharedLeaderboard'][0]['score']==args.score
    assert any(r['url']==origin+'/api/leaderboard' and r['status']==200 for r in responses),responses
    assert all(urlsplit(url).netloc==urlsplit(args.url).netloc for url in requests),requests
    assert not errors,errors
    dimensions=layout(page)
    assert dimensions['scrollWidth']<=dimensions['width'] and dimensions['scrollHeight']<=dimensions['height']+1,dimensions
    report={'result':'PASS','browser':browser.version,'freshContext':True,'initialLocalProfilePresent':False,'playerRow':row_text,'score':args.score,'leaderboardGet200':True,'serverResultCachedAfterFetch':True,'externalRequests':0,'javascriptErrors':errors,'layout':dimensions}
    (QA/'shared-browser-read.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,indent=2))
    context.close();browser.close()
