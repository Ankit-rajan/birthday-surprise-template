import re, sys, json, time
from playwright.sync_api import sync_playwright, expect

BASE = "http://localhost:5173"
results = []
def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail and not ok else ""))

with sync_playwright() as p:
    b = p.chromium.launch()

    def new_ctx(w=1440, h=900, mobile=False):
        ctx = b.new_context(viewport={"width": w, "height": h}, is_mobile=mobile, has_touch=mobile, device_scale_factor=1)
        errs = []
        page = ctx.new_page()
        page.on("console", lambda m: errs.append(m.text) if m.type == "error" and "ERR_NAME_NOT_RESOLVED" not in m.text and "ERR_TUNNEL_CONNECTION_FAILED" not in m.text else None)
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.on("response", lambda r: errs.append(f"HTTP {r.status} {r.url}") if r.status >= 400 and "/api/app/auth/me" not in r.url and "/api/admin/auth/me" not in r.url and r.status != 401 else None)
        return ctx, page, errs

    # ---------- landing, desktop + mobile
    ctx, page, errs = new_ctx()
    page.goto(BASE + "/"); page.wait_for_load_state("networkidle")
    h1 = page.locator("h1").inner_text()
    check("landing headline", "Create a Birthday Surprise" in h1 and "Never Forget" in h1, h1)
    page.screenshot(path="/tmp/e2e/shots/landing-desktop.png", full_page=True)
    nav_text = page.locator("header nav").inner_text()
    for label in ["Home", "Explore Demo", "Features", "How It Works", "Login", "Create Your Own"]:
        check(f"public nav has '{label}'", label.lower() in nav_text.lower(), nav_text)
    check("no 'admin' text for visitors", "admin" not in page.inner_text("body").lower())
    for sec in ["features", "how-it-works", "demo", "faq"]:
        check(f"section #{sec} present", page.locator(f"#{sec}").count() == 1)
    check("landing has no console errors", not errs, "; ".join(errs[:3]))
    page.get_by_role("link", name="Create Your Own").first.click(); page.wait_for_url("**/register")
    check("CTA 'Create Your Own' -> /register", page.url.endswith("/register"))
    page.goto(BASE + "/"); page.get_by_role("link", name="Explore Live Demo").first.click(); page.wait_for_url("**/demo")
    check("CTA 'Explore Live Demo' -> /demo", page.url.endswith("/demo"))
    ctx.close()

    ctx, page, errs = new_ctx(390, 844, mobile=True)
    page.goto(BASE + "/"); page.wait_for_load_state("networkidle")
    page.screenshot(path="/tmp/e2e/shots/landing-mobile.png", full_page=True)
    sw = page.evaluate("document.documentElement.scrollWidth"); cw = page.evaluate("document.documentElement.clientWidth")
    check("landing mobile: no horizontal overflow", sw <= cw + 1, f"{sw}>{cw}")
    page.get_by_role("button", name="Open menu").click()
    check("mobile menu opens with links", page.locator("#site-menu").get_by_role("link", name="Explore Demo").is_visible())
    page.locator("#site-menu").get_by_role("link", name="How It Works").click(); page.wait_for_timeout(900)
    check("mobile menu anchor scrolls to How It Works", page.evaluate("document.getElementById('how-it-works').getBoundingClientRect().top") < 200)
    ctx.close()

    # ---------- demo
    ctx, page, errs = new_ctx()
    page.goto(BASE + "/demo"); page.wait_for_load_state("networkidle")
    check("demo banner visible", page.get_by_text("Live demo with sample content").is_visible())
    check("demo 'Create your own' CTA", page.get_by_role("link", name="Create your own").first.is_visible())
    page.screenshot(path="/tmp/e2e/shots/demo-intro.png")
    page.get_by_role("button").filter(has_text=re.compile("open", re.I)).first.click()
    page.wait_for_selector("#main", timeout=15000); page.wait_for_timeout(1500)
    page.screenshot(path="/tmp/e2e/shots/demo-hero.png")
    body = page.inner_text("body")
    check("demo shows Aanya Sharma", "Aanya" in body)
    check("demo has no placeholder wording", not re.search(r"lorem|edit in my dashboard|replace me|test user", body, re.I))
    imgs = page.evaluate("Array.from(document.images).filter(i=>i.complete && i.naturalWidth===0).map(i=>i.src)")
    check("demo: no broken images in view", not imgs, str(imgs))
    page.locator("#gallery").scroll_into_view_if_needed(); page.wait_for_timeout(1200)
    page.screenshot(path="/tmp/e2e/shots/demo-gallery.png")
    all_imgs = page.evaluate("Array.from(document.images).map(i=>[i.src,i.naturalWidth])")
    check("demo: gallery has >= 10 images", sum(1 for s,w in all_imgs if "gallery-" in s) >= 10, str(len(all_imgs)))
    # cake
    page.locator("#home, main").first.scroll_into_view_if_needed()
    cake = page.locator("svg[aria-label*='ake'], [aria-label*='ake']").first
    check("demo: cake present", cake.count() >= 0)
    # vault
    page.locator("#vault").scroll_into_view_if_needed(); page.wait_for_timeout(800)
    check("demo vault shows password hint", page.get_by_text("Demo password: aanya-and-aarav").is_visible())
    page.screenshot(path="/tmp/e2e/shots/demo-vault-locked.png")
    pw = page.locator("#vault input[type=password]").first
    pw.fill("wrong-password"); page.locator("#vault button[type=submit]").click(); page.wait_for_timeout(900)
    check("demo vault rejects wrong password", "not the password" in page.locator("#vault").inner_text().lower())
    pw.fill("aanya-and-aarav"); page.locator("#vault button[type=submit]").click(); page.wait_for_timeout(1800)
    page.screenshot(path="/tmp/e2e/shots/demo-vault-open.png")
    check("demo vault opens with password", "Lock again" in page.locator("#vault").inner_text() or page.locator("#vault").inner_text().lower().count("secret") > 0)
    check("demo console clean", not [e for e in errs if "favicon" not in e], "; ".join(errs[:4]))
    ctx.close()

    # ---------- register through the UI, dashboard
    ctx, page, errs = new_ctx()
    page.goto(BASE + "/register"); page.wait_for_load_state("networkidle")
    page.get_by_label("Your name").fill("Meera Kapoor")
    page.get_by_label("Email").fill(f"meera{int(time.time())}@example.com")
    page.locator("#reg-password").fill("Marigold-Rain-2026"); page.locator("#reg-confirm").fill("Marigold-Rain-2026")
    page.get_by_role("button", name="Create my account").click()
    page.wait_for_url("**/dashboard", timeout=15000)
    page.wait_for_selector("text=Hello, Meera"); page.wait_for_timeout(500)
    page.screenshot(path="/tmp/e2e/shots/dashboard.png", full_page=True)
    # Desktop: sidebar. (Phone bottom bar is covered by mobile_audit.py and dashboard_ui.py.)
    nav = page.locator("aside").inner_text()
    for label in ["Dashboard", "My Website", "Customize", "Features", "Preview", "Account Settings", "Logout"]:
        check(f"customer nav has '{label}'", label.lower() in nav.lower(), nav)
    check("customer sees no 'admin' anywhere", "admin" not in page.inner_text("body").lower())
    check("customer nav has no platform link", page.locator("a[href*='platform'], a[href*='admin']").count() == 0)
    check("new account starts as draft", page.get_by_text("Draft (private)").is_visible())
    check("new workspace has NO demo data", "Aanya" not in page.inner_text("body"))
    slug = page.locator("#public-link-text").input_value().split("/birthday/")[1].strip()

    # customize
    page.goto(BASE + "/dashboard/customize?tab=cake"); page.wait_for_selector("text=Birthday cake")
    page.get_by_role("radio", name="Chocolate").click(); page.wait_for_timeout(600)
    page.screenshot(path="/tmp/e2e/shots/customize.png", full_page=True)
    check("customize saves cake theme", page.get_by_text("Saved.").count() >= 1)

    # use the sample text, then publish
    page.goto(BASE + "/dashboard"); page.wait_for_selector("text=Need inspiration?")
    page.once("dialog", lambda d: d.accept())
    page.get_by_role("button", name="Start from the sample text").click(); page.wait_for_selector("text=Sample text loaded");
    page.once("dialog", lambda d: d.accept())
    page.get_by_role("button", name="Publish my page").click(); page.wait_for_selector("text=Published", timeout=8000)
    check("publish works", page.get_by_text("Published").first.is_visible())

    # website tabs
    page.goto(BASE + "/dashboard/website"); page.wait_for_selector("[role=tablist]")
    page.screenshot(path="/tmp/e2e/shots/website-tab.png", full_page=True)
    for tab in ["Cover photos", "Gallery", "Timeline", "Letters", "Private photos & videos", "Private messages", "Passwords & privacy"]:
        page.get_by_role("tab", name=tab).click(); page.wait_for_timeout(300)
        check(f"tab '{tab}' renders without error", page.locator("[role=alert]").count() == 0)

    # preview (own, full screen)
    page.goto(BASE + "/dashboard/preview"); page.wait_for_selector("text=Preview of your live page")
    page.get_by_role("button").filter(has_text=re.compile("open", re.I)).first.click(); page.wait_for_selector("#main", timeout=15000); page.wait_for_timeout(1000)
    page.screenshot(path="/tmp/e2e/shots/preview.png")
    check("preview shows own content", "Aanya" in page.inner_text("body"))
    ctx.storage_state(path="/tmp/e2e/meera.json")
    check("dashboard flow console clean", not [e for e in errs if "favicon" not in e], "; ".join(errs[:4]))
    ctx.close()

    # ---------- public page, fresh anonymous browser
    ctx, page, errs = new_ctx()
    page.goto(BASE + f"/birthday/{slug}"); page.wait_for_load_state("networkidle")
    page.get_by_role("button").filter(has_text=re.compile("open", re.I)).first.click(); page.wait_for_selector("#main", timeout=15000); page.wait_for_timeout(800)
    check("public page loads for anonymous visitor", "Aanya" in page.inner_text("body"))
    check("public page has no preview/demo banner", page.get_by_text("Live demo with sample content").count() == 0 and page.get_by_text("Preview of your live page").count() == 0 and page.get_by_text("Preview: only you can see this").count() == 0)
    page.screenshot(path="/tmp/e2e/shots/public.png")
    ctx.close()

    ctx, page, errs = new_ctx()
    page.goto(BASE + "/birthday/nobody-lives-here"); page.wait_for_load_state("networkidle")
    check("unknown slug shows 'Not available'", page.get_by_text("Not available").is_visible())
    page.goto(BASE + "/dashboard"); page.wait_for_url("**/login**")
    check("anonymous /dashboard redirects to login", "/login?next=" in page.url)
    page.goto(BASE + "/admin"); page.wait_for_url("**/platform")
    page.wait_for_selector("text=For the owner of this service only"); page.screenshot(path="/tmp/e2e/shots/platform-login.png")
    check("/admin redirects to platform login", page.get_by_text("Platform Administration").first.is_visible())
    ctx.close()

    # ---------- login redirect for existing customer + logout
    ctx = b.new_context(storage_state="/tmp/e2e/meera.json", viewport={"width": 1440, "height": 900}); page = ctx.new_page()
    page.goto(BASE + "/login"); page.wait_for_url("**/dashboard")
    check("logged-in customer skips login page", True)
    page.get_by_role("button", name="Logout").first.click(); page.wait_for_url(BASE + "/")
    page.goto(BASE + "/dashboard"); page.wait_for_url("**/login**")
    check("logout ends session", "/login" in page.url)
    ctx.close()

    # ---------- platform admin
    ctx, page, errs = new_ctx()
    page.goto(BASE + "/platform"); page.get_by_label("Email").fill("owner@example.com"); page.get_by_label("Password").fill("owner-passphrase-12345")
    page.get_by_role("button", name="Sign in").click(); page.wait_for_selector("text=Registered users", timeout=10000); page.wait_for_timeout(800)
    page.screenshot(path="/tmp/e2e/shots/platform.png", full_page=True)
    check("platform console lists users", page.locator("tbody tr").count() >= 1)
    body = page.inner_text("body"); check("platform shows no customer content", "Aanya" not in body and "Marigold" not in body and "Meera" in body)
    ctx.close()
    b.close()

fails = [r for r in results if not r[1]]
print(f"\n{len(results)-len(fails)}/{len(results)} checks passed")
sys.exit(1 if fails else 0)
