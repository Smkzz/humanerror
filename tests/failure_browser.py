"""Wrong-answer browser path: no accidental wins, phantom questions or bonus."""
import json, os, shutil
from playwright.sync_api import sync_playwright
from browser_test import HTML, QA, options, wait_phase, layout
with sync_playwright() as p:
    kw={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage']}
    exe=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
    if exe:kw['executable_path']=exe
    b=p.chromium.launch(**kw);page=b.new_page(viewport={'width':1366,'height':768})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_content(HTML)
    page.get_by_role('button',name='PANIC →',exact=True).click();screens=0
    while page.locator('#app').get_attribute('data-phase')!='finished':
        wait_phase(page,lambda x:x in ['active','finished'])
        if page.locator('#app').get_attribute('data-phase')=='finished':break
        kind=page.locator('#board').get_attribute('data-kind');title=page.locator('#prompt').inner_text()
        if kind=='memory':wait_phase(page,lambda s:s!='active')
        elif kind in ['reaction','wait']:page.locator('.bait').click()
        elif kind=='choice':
            choices=options(page)
            if title.startswith('BIGGEST'):bad=min(choices,key=lambda o:int(o['label']))
            elif title.startswith('SMALLEST'):bad=max(choices,key=lambda o:int(o['label']))
            elif title.startswith('OPPOSITE'):bad=next(o for o in choices if o['label']==title.removeprefix('OPPOSITE OF ').rstrip('.'))
            else:raise AssertionError(title)
            page.locator(f'.choice[data-answer="{bad["id"]}"]').click()
        else:raise AssertionError(kind)
        screens+=1;assert screens<=6
    assert page.locator('.result-ratio').inner_text()=='0 / 4'
    assert page.locator('#score').inner_text()=='0'
    assert page.locator('#stage').inner_text()=='HUMAN ERROR DETECTED'
    dimensions=layout(page);assert dimensions['scrollHeight']<=768,dimensions
    assert not errors,errors
    page.screenshot(path=str(QA/'failure-desktop-result.png'))
    report={'browser':b.version,'loading':'exact-artifact-document','result':'PASS','correct':0,'graded':4,'score':0,'neutralSetupScreens':1,'javascriptErrors':errors,'layout':dimensions}
    (QA/'browser-failure.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2));b.close()
