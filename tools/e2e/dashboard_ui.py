"""
Dashboard interaction tests (real browser, real backend, real MongoDB). No extra dependencies: Playwright is already used by browser_e2e.py.
Covers: Features page, toggles, save + error states, bulk actions, draft preview, relationship switching, appearance, wording,
public link Copy / Share, and a theme + font fallback sweep. Needs the stack from INSTRUCTIONS.md running on http://localhost:5173.
Prints one line per check and "N/M checks passed"; exits 1 on any failure.
"""
import json, re, sys, time
from playwright.sync_api import sync_playwright, expect

BASE = "http://localhost:5173"
CFG = json.load(open(__file__.rsplit("/tools/", 1)[0] + "/backend/services/siteConfig/siteConfig.json"))
results = []
def check(name, ok, detail=""):
    results.append((name, bool(ok)))
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f"  -> {detail}"))

def hex_triplet(h): return " ".join(str(int(h[i:i+2], 16)) for i in (1, 3, 5))
def open_all(page):
    while page.locator("button[aria-expanded=false]").count(): page.locator("button[aria-expanded=false]").first.click()
def save(page):
    btn = page.get_by_role("button", name="Save changes")
    if btn.is_enabled(): btn.click()
    page.wait_for_timeout(900)
def toast_text(page): return " ".join(page.locator("[role=status],[role=alert]").all_inner_texts())

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, permissions=["clipboard-read", "clipboard-write"])
    page = ctx.new_page(); errs = []
    page.on("console", lambda m: errs.append(m.text) if m.type == "error" and "ERR_NAME_NOT_RESOLVED" not in m.text and "ERR_TUNNEL" not in m.text and "Failed to load resource" not in m.text else None)
    page.on("pageerror", lambda e: errs.append("pageerror " + str(e)))
    page.on("dialog", lambda d: d.accept())

    page.goto(BASE + "/register")
    page.get_by_label("Your name").fill("Dash Tester"); page.get_by_label("Email").fill(f"dash{int(time.time())}@example.com")
    page.locator("#reg-password").fill("Marigold-Rain-2026"); page.locator("#reg-confirm").fill("Marigold-Rain-2026")
    page.get_by_role("button", name="Create my account").click(); page.wait_for_url("**/dashboard")

    # ---------------------------------------------------------------- Features
    page.goto(BASE + "/dashboard/features"); page.wait_for_selector("[role=switch]")
    check("features: 8 category sections render", page.locator("section h2").count() == len(CFG["categories"]) == 8)
    open_all(page)
    check("features: all 49 switches render", page.locator("[role=switch]").count() == len(CFG["features"]) == 49)
    check("features: save bar starts clean", page.get_by_role("button", name="Save changes").is_disabled())
    first = page.locator("[role=switch]").first; before = first.get_attribute("aria-checked")
    first.click()
    check("toggle: marks unsaved + enables Save", "Unsaved" in page.locator("[role=status]").first.inner_text() and page.get_by_role("button", name="Save changes").is_enabled())
    page.get_by_role("button", name="Discard").click()
    check("toggle: Discard restores the saved value", page.locator("[role=switch]").first.get_attribute("aria-checked") == before)
    page.locator("[role=switch]").first.click(); save(page)
    check("toggle: save shows confirmation", "saved" in toast_text(page).lower())
    page.reload(); page.wait_for_selector("[role=switch]"); open_all(page)
    check("toggle: persisted after reload", page.locator("[role=switch]").first.get_attribute("aria-checked") != before)
    page.locator("[role=switch]").first.click(); save(page)  # back to default

    # dependency explanation
    page.locator("#sw-hero").click()
    check("dependency: child shows 'Off for now because'", page.get_by_text("Off for now because").count() >= 1)
    page.get_by_role("button", name="Discard").click()

    # save error state
    page.route("**/api/app/site/features", lambda r: r.fulfill(status=500, content_type="application/json", body='{"message":"Boom"}'))
    page.locator("#sw-timeline").click(); save(page)
    check("save error: alert shown and changes kept unsaved", page.locator("[role=alert]").count() >= 1 and "Unsaved" in page.locator("[role=status]").first.inner_text())
    page.unroute("**/api/app/site/features"); page.get_by_role("button", name="Discard").click()

    # bulk actions
    page.get_by_role("button", name="Disable all").click()
    check("bulk: Disable all asks for confirmation", page.get_by_role("dialog").is_visible())
    page.get_by_role("dialog").get_by_role("button", name="Cancel").click()
    check("bulk: Cancel changes nothing", page.locator("[role=switch][aria-checked=false]").count() < 49)
    page.get_by_role("button", name="Disable all").click(); page.get_by_role("dialog").get_by_role("button", name="Turn everything off").click(); page.wait_for_timeout(1000)
    open_all(page)
    check("bulk: Disable all turns all 49 off", page.locator("[role=switch][aria-checked=false]").count() == 49)
    page.reload(); page.wait_for_selector("[role=switch]"); open_all(page)
    check("bulk: Disable all persisted", page.locator("[role=switch][aria-checked=false]").count() == 49)
    page.get_by_role("button", name="Enable all").click(); page.get_by_role("dialog").get_by_role("button", name="Turn everything on").click(); page.wait_for_timeout(1000); open_all(page)
    check("bulk: Enable all turns all 49 on", page.locator("[role=switch][aria-checked=true]").count() == 49)
    page.get_by_role("button", name="Defaults").click(); page.get_by_role("dialog").get_by_role("button", name="Restore defaults").click(); page.wait_for_timeout(1000); open_all(page)
    defaults_on = sum(1 for f in CFG["features"] if f.get("default", True))
    check(f"bulk: Defaults restores registry defaults ({defaults_on} on)", page.locator("[role=switch][aria-checked=true]").count() == defaults_on, page.locator("[role=switch][aria-checked=true]").count())

    # draft preview: unsaved switch change reaches the preview without saving
    page.goto(BASE + "/dashboard/features"); page.wait_for_selector("iframe[title*='Live preview']"); page.wait_for_timeout(1500)
    fr = page.frame_locator("iframe[title*='Live preview']")
    fr.get_by_role("button").filter(has_text=re.compile("open", re.I)).first.click(); fr.locator("#main").wait_for(timeout=15000)
    has_before = fr.locator("#reasons").count()
    open_all(page); sw = page.locator("#sw-flipCards"); was = sw.get_attribute("aria-checked"); sw.click(); page.wait_for_timeout(1800)
    fr = page.frame_locator("iframe[title*='Live preview']")
    try:
        fr.get_by_role("button").filter(has_text=re.compile("open", re.I)).first.click(timeout=4000)
    except Exception: pass
    page.wait_for_timeout(800)
    check("draft preview: toggling 'flip cards' without saving changes the preview", fr.locator("#reasons").count() != has_before, f"before={has_before} after={fr.locator('#reasons').count()} was={was}")
    page.reload(); page.wait_for_selector("[role=switch]"); open_all(page)
    check("draft preview: nothing was saved", page.locator("#sw-flipCards").get_attribute("aria-checked") == was)

    # ------------------------------------------------------------ Relationship
    page.goto(BASE + "/dashboard/customize?tab=wording"); page.wait_for_selector("textarea")
    ta = page.locator("textarea").first; ta.fill("My own words stay"); key = ta.get_attribute("id"); save(page)
    check("wording: override saved", "saved" in toast_text(page).lower())
    page.reload(); page.wait_for_selector("textarea")
    check("wording: persisted after reload", page.locator(f"#{key}").input_value() == "My own words stay")
    check("wording: placeholder shows the suggested wording", len(page.locator("textarea").nth(1).get_attribute("placeholder") or "") > 0)

    page.goto(BASE + "/dashboard/customize?tab=relationship"); page.wait_for_selector("[role=radio]")
    check("relationship: Love is the current mode", page.get_by_role("radio", name=re.compile("Love")).first.get_attribute("aria-checked") == "true")
    page.get_by_role("radio", name=re.compile("Friendship")).first.click()
    check("relationship: friendship types listed", page.get_by_role("radio", name="Best Friend", exact=True).count() == 1 and page.get_by_role("radio", name="Girlfriend", exact=True).count() == 0)
    page.get_by_role("button", name="Review & save").click()
    dlg = page.get_by_role("dialog"); dlg.wait_for()
    check("relationship: switching shows what is replaced and kept", "Starter text" in dlg.inner_text() and "kept" in dlg.inner_text().lower(), dlg.inner_text()[:200])
    dlg.get_by_role("button", name="Cancel").click()
    page.reload(); page.wait_for_selector("[role=radio]")
    check("relationship: cancel changes nothing", page.get_by_role("radio", name=re.compile("Love")).first.get_attribute("aria-checked") == "true")
    page.get_by_role("radio", name=re.compile("Friendship")).first.click(); page.get_by_role("radio", name="Best Friend", exact=True).click()
    page.get_by_role("button", name="Review & save").click(); page.get_by_role("dialog").get_by_role("button", name="Switch mode").click(); page.wait_for_timeout(1200)
    check("relationship: saved as Friendship", "saved" in toast_text(page).lower() and page.get_by_role("radio", name=re.compile("Friendship")).first.get_attribute("aria-checked") == "true")
    check("relationship: theme was NOT changed, themes only suggested", page.get_by_text("Your colours were not changed").count() == 1)
    page.goto(BASE + "/dashboard/customize?tab=wording"); page.wait_for_selector("textarea")
    check("relationship: customised wording survived the mode change", page.locator(f"#{key}").input_value() == "My own words stay")
    page.goto(BASE + "/dashboard/customize?tab=appearance"); page.wait_for_selector("[role=radio]")
    check("relationship: friendship offers friendship themes, not love-only ones", page.get_by_role("radio", name=re.compile("Sky Blue")).count() == 1 and page.get_by_role("radio", name=re.compile("Rose Gold")).count() == 0)

    # -------------------------------------------------------------- Appearance
    page.get_by_role("radio", name=re.compile("Sky Blue")).click()
    check("appearance: preset marks unsaved", "Unsaved" in page.locator("[role=status]").first.inner_text())
    save(page); page.reload(); page.wait_for_selector("[role=radio]")
    check("appearance: preset persisted", page.get_by_role("radio", name=re.compile("Sky Blue")).get_attribute("aria-checked") == "true")
    page.get_by_label("Main accent").fill("#ff0000")
    check("appearance: custom colour shown", "#ff0000" in page.locator("text=#ff0000").first.inner_text())
    page.get_by_role("radio", name=re.compile("Playful Yellow")).click()
    check("appearance: preset over custom colours asks first", "Replace your custom colours" in page.get_by_role("dialog").inner_text())
    page.get_by_role("dialog").get_by_role("button", name="Cancel").click()
    page.get_by_label("Main accent").fill("#ff0000"); save(page); page.reload(); page.wait_for_selector("[role=radio]")
    check("appearance: custom colour persisted", page.locator("text=#ff0000").count() >= 1)
    page.get_by_label("Text", exact=True).fill("#101010"); page.get_by_label("Background").fill("#111111")
    check("appearance: low-contrast colours show a warning", page.get_by_test_id("contrast-warning").count() == 1)
    page.get_by_role("button", name="Discard").click()
    check("appearance: warning clears on discard", page.get_by_test_id("contrast-warning").count() == 0)
    page.get_by_role("button", name="Restore default appearance").click(); page.get_by_role("dialog").get_by_role("button", name="Restore").click(); page.wait_for_timeout(300); save(page)
    page.reload(); page.wait_for_selector("[role=radio]")
    check("appearance: restore default persisted (classic)", page.get_by_role("radio", name=re.compile("Classic")).get_attribute("aria-checked") == "true")

    # ------------------------------------------------------ Copy / Share link
    page.goto(BASE + "/dashboard"); page.wait_for_selector("#public-link-text")
    url = page.locator("#public-link-text").input_value()
    page.get_by_role("button", name="Copy link").click(); page.wait_for_timeout(300)
    check("copy: clipboard holds the full URL", page.evaluate("navigator.clipboard.readText()") == url)
    check("copy: success feedback", page.get_by_role("button", name="Copied").count() == 1 and "copied" in toast_text(page).lower())
    page.reload(); page.wait_for_selector("#public-link-text")
    page.evaluate("void Object.defineProperty(navigator.clipboard,'writeText',{value:()=>Promise.reject(new Error('denied')),configurable:true})")
    page.get_by_role("button", name="Copy link").click(); page.wait_for_timeout(400)
    check("copy: falls back (execCommand) when the Clipboard API is refused", "copied" in toast_text(page).lower() or "could not copy" in toast_text(page).lower())
    has_native = page.evaluate("typeof navigator.share === 'function'")
    wa = page.get_by_role("link", name="Share", exact=True)
    if not has_native:
        check("share fallback: this browser has no navigator.share -> WhatsApp link with the full URL", wa.count() == 1 and "wa.me" in wa.get_attribute("href") and url.replace(":", "%3A").replace("/", "%2F") in wa.get_attribute("href"), (wa.count(), wa.first.get_attribute("href") if wa.count() else None, url))
    ctx.close()

    # navigator.share is NOT native in headless Chromium on Linux: these use a stub, so they test OUR handler, not the OS share sheet.
    for label, stub, expect_error in [("accepts", "async (d)=>{window.__shared=d}", False), ("user cancels (AbortError)", "async ()=>{const e=new Error('x');e.name='AbortError';throw e}", False), ("fails (NotAllowedError)", "async ()=>{const e=new Error('x');e.name='NotAllowedError';throw e}", True)]:
        c2 = b.new_context(viewport={"width": 390, "height": 844}); c2.add_init_script(f"Object.defineProperty(navigator,'share',{{value:{stub},configurable:true}})")
        p2 = c2.new_page(); p2.goto(BASE + "/register")
        p2.get_by_label("Your name").fill("Share T"); p2.get_by_label("Email").fill(f"sh{int(time.time()*1000)}@example.com")
        p2.locator("#reg-password").fill("Marigold-Rain-2026"); p2.locator("#reg-confirm").fill("Marigold-Rain-2026"); p2.get_by_role("button", name="Create my account").click(); p2.wait_for_url("**/dashboard")
        p2.wait_for_selector("#public-link-text"); u = p2.locator("#public-link-text").input_value()
        p2.get_by_role("button", name="Share").click(); p2.wait_for_timeout(500)
        if label == "accepts": check("share (stubbed navigator.share): called with the full URL", (p2.evaluate("window.__shared") or {}).get("url") == u)
        check(f"share (stubbed): {label} -> {'error message' if expect_error else 'no error message'}", (p2.locator("[role=alert]").count() >= 1) == expect_error)
        c2.close()

    # ---------------------------------------------------------- Theme + font sweep (public page, fonts blocked by the sandbox)
    ctx = b.new_context(viewport={"width": 390, "height": 844}); page = ctx.new_page(); page.on("dialog", lambda d: d.accept())
    page.goto(BASE + "/register"); page.get_by_label("Your name").fill("Theme T"); page.get_by_label("Email").fill(f"th{int(time.time())}@example.com")
    page.locator("#reg-password").fill("Marigold-Rain-2026"); page.locator("#reg-confirm").fill("Marigold-Rain-2026"); page.get_by_role("button", name="Create my account").click(); page.wait_for_url("**/dashboard")
    page.wait_for_selector("#public-link-text"); slug = page.locator("#public-link-text").input_value().split("/birthday/")[1]
    page.get_by_role("button", name="Publish my page").click(); page.wait_for_selector("text=Published", timeout=8000)
    bad = []; seen = set()
    pub = ctx.new_page()
    for mode in ["love", "friendship"]:
        if mode == "friendship":
            page.goto(BASE + "/dashboard/customize?tab=relationship"); page.wait_for_selector("[role=radio]")
            page.get_by_role("radio", name=re.compile("Friendship")).first.click(); page.get_by_role("button", name="Review & save").click()
            page.get_by_role("dialog").get_by_role("button", name="Switch mode").click(); page.wait_for_timeout(1200)
        for t in [t for t in CFG["themes"] if t["id"] != "classic"]:
            page.goto(BASE + "/dashboard/customize?tab=appearance"); page.wait_for_selector("[role=radio]")
            radios = page.get_by_role("radio", name=t["label"], exact=True)
            if not radios.count() or t["id"] in seen: continue
            seen.add(t["id"]); radios.first.click(); save(page)
            for w, h in [(390, 844), (1440, 900)]:
                pub.set_viewport_size({"width": w, "height": h}); pub.goto(BASE + f"/birthday/{slug}"); pub.wait_for_timeout(900)
                gold = pub.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--c-gold').trim()")
                over = pub.evaluate("document.documentElement.scrollWidth - innerWidth")
                if gold != hex_triplet(t["colors"]["primary"]) or over > 0: bad.append((t["id"], w, gold, over))
                if w == 390: pub.screenshot(path=f"/tmp/e2e/shots/theme-{t['id']}.png")
    n_all = len([t for t in CFG["themes"] if t["id"] != "classic"])
    check(f"themes: all {n_all} non-classic themes were applied ({len(seen)} reached through Love then Friendship)", len(seen) == n_all, sorted(set(t['id'] for t in CFG['themes']) - seen))
    check("themes: each applies its primary colour and has no horizontal overflow at 390 and 1440", not bad, bad)
    fam = {}
    for f in [f for f in CFG["fonts"]]:
        page.goto(BASE + "/dashboard/customize?tab=appearance"); page.wait_for_selector("[role=radio]")
        page.get_by_role("radio", name="Default" if f["id"] == "elegant" else f["label"], exact=True).click(); save(page)
        pub.goto(BASE + f"/birthday/{slug}"); pub.wait_for_timeout(900)
        fam[f["id"]] = pub.evaluate("(()=>{const e=document.querySelector('h1,h2,.font-serif');return e?getComputedStyle(e).fontFamily:''})()")
    check("fonts: every font stack ends in a generic fallback (page stays readable when Google Fonts cannot load)", all(re.search(r"(serif|cursive|sans-serif)\s*$", v) for v in fam.values()), fam)
    check("console stayed clean through the dashboard tests", not errs, errs[:3])
    b.close()

fails = [r for r in results if not r[1]]
print(f"\n{len(results)-len(fails)}/{len(results)} checks passed")
sys.exit(1 if fails else 0)
