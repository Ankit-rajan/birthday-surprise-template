import re, time
from playwright.sync_api import sync_playwright
BASE="http://localhost:5173"
bad=[]
def audit(page, name):
    page.wait_for_timeout(700)
    sw=page.evaluate("document.documentElement.scrollWidth"); cw=page.evaluate("document.documentElement.clientWidth")
    broken=page.evaluate("Array.from(document.images).filter(i=>i.complete&&i.naturalWidth===0&&i.src).map(i=>i.src)")
    small=page.evaluate("""Array.from(document.querySelectorAll('a,button')).filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&(r.height<32)&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('.sr-only')&&e.offsetParent!==null&&!e.classList.contains('sr-only')}).map(e=>(e.innerText||e.getAttribute('aria-label')||'').trim().slice(0,24)).filter(Boolean)""")
    # Content clipping: visible elements poking past the right edge of the viewport (ignoring ones inside a horizontally scrollable box).
    clipped=page.evaluate("""(()=>{const W=document.documentElement.clientWidth;const sc=e=>{for(let n=e.parentElement;n;n=n.parentElement){const o=getComputedStyle(n).overflowX;if((o==='auto'||o==='scroll'||o==='hidden')&&n!==document.body&&n!==document.documentElement)return true}return false};
      return Array.from(document.querySelectorAll('body *')).filter(e=>{const r=e.getBoundingClientRect();const cs=getComputedStyle(e);return r.width>0&&r.height>0&&r.right>W+1&&cs.position!=='fixed'&&cs.visibility!=='hidden'&&!sc(e)}).slice(0,4).map(e=>e.tagName+'.'+String(e.className).slice(0,30))})()""")
    # Bottom navigation (dashboard, phone): present, every item at least 44px tall, and not covered by anything else.
    nav=page.evaluate("""(()=>{const n=document.querySelector('nav[aria-label=Dashboard].fixed');if(!n||getComputedStyle(n).display==='none')return null;const r=n.getBoundingClientRect();
      const items=[...n.querySelectorAll('a,button')].map(e=>e.getBoundingClientRect().height);
      const cx=r.left+r.width/2,cy=r.top+r.height/2;const top=document.elementFromPoint(cx,cy);return {h:Math.round(r.height),min:Math.round(Math.min(...items)),n:items.length,covered:!n.contains(top),inView:r.bottom<=innerHeight+1}})()""")
    dlg=page.locator('[role=dialog]').count()>0  # an open sheet legitimately covers the bar
    nav_ok = nav is None or (nav["min"]>=44 and (not nav["covered"] or dlg) and nav["inView"] and nav["n"]==5)
    ok = sw<=cw+1 and not broken and not clipped and nav_ok
    if clipped or nav: print(f"      clipped={clipped} bottom-nav={nav}")
    print(("PASS " if ok else "FAIL ")+f"{name}: width {sw}/{cw}, broken imgs {len(broken)}, short tap targets {len(small)} {small[:5]}")
    if not ok: bad.append(name)
    page.screenshot(path=f"/tmp/e2e/shots/m-{name}.png")
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":390,"height":844},is_mobile=True,has_touch=True); pg=ctx.new_page()
    for path,name in [("/","landing"),("/login","login"),("/register","register"),("/forgot-password","forgot"),("/demo","demo-intro")]:
        pg.goto(BASE+path); pg.wait_for_load_state("networkidle"); audit(pg,name)
    # demo open
    pg.goto(BASE+"/demo"); pg.get_by_role("button").filter(has_text=re.compile("open",re.I)).first.click(); pg.wait_for_selector("#main"); pg.wait_for_timeout(1200)
    for sec in ["home","gallery","timeline","reasons","vault"]:
        loc=pg.locator(f"#{sec}")
        if loc.count(): loc.first.scroll_into_view_if_needed(); pg.wait_for_timeout(1000); audit(pg,f"demo-{sec}")
    # register + dashboard pages
    pg.goto(BASE+"/register"); pg.get_by_label("Your name").fill("Mobile Tester"); pg.get_by_label("Email").fill(f"mob{int(time.time())}@example.com")
    pg.locator("#reg-password").fill("Marigold-Rain-2026"); pg.locator("#reg-confirm").fill("Marigold-Rain-2026"); pg.get_by_role("button",name="Create my account").click(); pg.wait_for_url("**/dashboard")
    for path,name in [("/dashboard","dash"),("/dashboard/website","website"),("/dashboard/customize","customize"),("/dashboard/account","account")]:
        pg.goto(BASE+path); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(500); audit(pg,name)
    for path,name in [("/dashboard/features","features"),("/dashboard/customize?tab=relationship","tab-relationship"),("/dashboard/customize?tab=appearance","tab-appearance"),("/dashboard/customize?tab=wording","tab-wording"),("/dashboard/customize?tab=cake","tab-cake")]:
        pg.goto(BASE+path); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(500); audit(pg,name)
    # Features: open every category, toggle one (save bar appears) and make sure the save bar does not sit under the bottom nav.
    pg.goto(BASE+"/dashboard/features"); pg.wait_for_selector("[role=switch]")
    while pg.locator("button[aria-expanded=false]").count(): pg.locator("button[aria-expanded=false]").first.click()
    audit(pg,"features-all-open")
    pg.locator("[role=switch]").first.click(); pg.wait_for_timeout(400); audit(pg,"features-dirty")
    sb=pg.evaluate("""(()=>{const b=[...document.querySelectorAll('button')].find(x=>/save changes/i.test(x.innerText));const n=document.querySelector('nav[aria-label=Dashboard].fixed');if(!b||!n)return null;const a=b.getBoundingClientRect(),c=n.getBoundingClientRect();return {overlap:a.bottom>c.top+1&&a.top<c.bottom,h:Math.round(a.height)}})()""")
    print(("PASS " if sb and not sb["overlap"] and sb["h"]>=44 else "FAIL ")+f"features save bar vs bottom nav: {sb}")
    if not sb or sb["overlap"] or sb["h"]<44: bad.append("savebar-overlap")
    pg.goto(BASE+"/dashboard/preview?embed=1"); pg.wait_for_timeout(1200); audit(pg,"preview-embed")
    pg.goto(BASE+"/dashboard"); pg.get_by_role("button",name="More").click(); pg.wait_for_timeout(500); audit(pg,"more-sheet"); pg.keyboard.press("Escape")
    pg.goto(BASE+"/dashboard/website"); pg.get_by_role("tab",name="Letters").click(); audit(pg,"website-letters")
    pg.get_by_role("tab",name="Timeline").click(); audit(pg,"website-timeline")
    # Published public page on a phone (friendship starter content).
    pg.goto(BASE+"/dashboard"); slug=pg.locator("#public-link-text").input_value().split("/birthday/")[1]
    pg.once("dialog",lambda d:d.accept()); pg.get_by_role("button",name="Publish my page").click(); pg.wait_for_selector("text=Published",timeout=8000)
    pub=ctx.new_page(); pub.goto(BASE+f"/birthday/{slug}"); pub.wait_for_load_state("networkidle"); audit(pub,"public-intro")
    pub.get_by_role("button").filter(has_text=re.compile("open",re.I)).first.click(); pub.wait_for_selector("#main",timeout=15000); pub.wait_for_timeout(1200); audit(pub,"public-open")
    b.close()
print("\nFAILED:",bad if bad else "none")
