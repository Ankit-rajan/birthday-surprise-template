import re, time
from playwright.sync_api import sync_playwright
BASE="http://localhost:5173"
bad=[]
def audit(page, name):
    page.wait_for_timeout(700)
    sw=page.evaluate("document.documentElement.scrollWidth"); cw=page.evaluate("document.documentElement.clientWidth")
    broken=page.evaluate("Array.from(document.images).filter(i=>i.complete&&i.naturalWidth===0&&i.src).map(i=>i.src)")
    small=page.evaluate("""Array.from(document.querySelectorAll('a,button')).filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&(r.height<32)&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('.sr-only')&&e.offsetParent!==null&&!e.classList.contains('sr-only')}).map(e=>(e.innerText||e.getAttribute('aria-label')||'').trim().slice(0,24)).filter(Boolean)""")
    ok = sw<=cw+1 and not broken
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
    pg.goto(BASE+"/dashboard/website"); pg.get_by_role("tab",name="Letters").click(); audit(pg,"website-letters")
    pg.get_by_role("tab",name="Timeline").click(); audit(pg,"website-timeline")
    b.close()
print("\nFAILED:",bad if bad else "none")
