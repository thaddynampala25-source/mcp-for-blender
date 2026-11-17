import re, json, os, shutil, time, sys
sys.path.insert(0, '/home/claude/w2s-site')
import seo_content as C
from body_parts import FOOTER
import privacy_content as PC
import buddy_block as BB
SRC = '/home/claude/w2s-show/showcase.html'
OUT = '/home/claude/w2s-site/dist'
SITE = os.environ.get('SITE_URL', 'https://week2speak.pages.dev').rstrip('/')
VER = time.strftime('%Y%m%d%H%M')
s = open(SRC, encoding='utf-8').read()
def rep(t, a, b, n=1):
    assert a in t, 'MISSING: ' + a[:80]
    return t.replace(a, b, n)

css = s[s.index('<style>') + 7: s.index('</style>')]
body = s[s.index('</style>') + 8: s.index('<script src="https://cdnjs')]
scripts = re.findall(r'<script>\n?(.*?)</script>', s, re.S)
app_js, home_js = scripts[0], scripts[1]

PATHS = {'home': '/', 'speak': '/speech-mode/', 'games': '/games/', 'shadow': '/shadowing/', 'sprint': '/7-day-sprint/', 'course': '/course/', 'tutor': '/tutor/', 'join': '/join/'}

# ---------- CSS: base reset that the Claude page skeleton used to provide ----------
css = ("*,*::before,*::after{box-sizing:border-box}\nhtml{-webkit-text-size-adjust:100%}\nbody{margin:0}\nimg,video{max-width:100%}\n[hidden]{display:none!important}\n"
       ":root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}\n") + css

# ---------- HTML body: real links instead of hash routes ----------
for k, p in PATHS.items():
    body = body.replace(f'href="#{k}"', f'href="{p}"')
body = body.replace('href="#home"', 'href="/"')
body = rep(body, 'poster="poster.jpg" src="demo.mp4"', 'poster="/media/poster.jpg" src="/media/demo.mp4"')
assert 'href="#speak"' not in body and 'href="#join"' not in body

OLDSEL = "const $ = (s, r = document) => r.querySelector(s);\nconst $$ = (s, r = document) => Array.from(r.querySelectorAll(s));"
NULLJS = open('/home/claude/w2s-site/nulljs.txt').read()
# ---------- app.js: path routing, cross-page go links, browser mic, sign-up form ----------
a = app_js
a = rep(a, OLDSEL, NULLJS)
a = rep(a, "burstFrom($('.prompt', gameBody) || $('.tray', gameBody))", "burstFrom(gameBody.querySelector('.prompt') || gameBody.querySelector('.tray') || gameBody.querySelector('.pool') || gameBody)")
a = rep(a, "/* ---------- router ---------- */", "/* ---------- router ---------- */\nconst PATHS = " + json.dumps(PATHS) + ";\nconst pathOf = v => PATHS[v] || '/';")
a = rep(a, "  const name = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home';", "  const name = document.body.dataset.page || 'home';")
a = rep(a, "if (a.getAttribute('href') === '#' + name)", "if (a.getAttribute('href') === PATHS[name])")
a = rep(a, "window.addEventListener('hashchange', show);\n", "")
a = rep(a, "  if (changed) window.scrollTo(0, 0);\n", "")
a = rep(a, "let pending = null;\ndocument.addEventListener('click', e => { const a = e.target.closest('[data-go]'); if (!a) return; try { pending = JSON.parse(a.dataset.go); } catch (err) { pending = null; } if (pending && pending.talk) { e.preventDefault(); $('#talk').scrollIntoView({behavior: reduced ? 'auto' : 'smooth', block:'start'}); $('#talkBtn').focus({preventScroll:true}); pending = null; } });",
"""let pending = null;
try { const g = sessionStorage.getItem('w2s.go'); if (g) { pending = JSON.parse(g); sessionStorage.removeItem('w2s.go'); } } catch (e) {}
const toTalk = () => { $('#talk').scrollIntoView({behavior: reduced ? 'auto' : 'smooth', block:'start'}); $('#talkBtn').focus({preventScroll:true}); };
document.addEventListener('click', e => { const a = e.target.closest('[data-go]'); if (!a) return; let go = null; try { go = JSON.parse(a.dataset.go); } catch (err) { go = null; } if (!go) return;
  if (go.talk && document.body.dataset.page === 'sprint') { e.preventDefault(); toTalk(); return; }
  try { sessionStorage.setItem('w2s.go', JSON.stringify(go)); } catch (err) {} });""")
# template-string links
a = rep(a, 'href="#${t.go === \'talk\' ? \'sprint\' : t.go}"', 'href="${pathOf(t.go === \'talk\' ? \'sprint\' : t.go)}"', 2)
a = rep(a, 'href="#${q.go}"', 'href="${pathOf(q.go)}"')
a = rep(a, 'href="#${nt.go === \'talk\' ? \'sprint\' : nt.go}"', 'href="${pathOf(nt.go === \'talk\' ? \'sprint\' : nt.go)}"')
a = rep(a, '<a href="#games" data-go=', '<a href="${pathOf(\'games\')}" data-go=')
assert 'href="#$' not in a, re.findall(r'href="#\$[^"]*"', a)
# sign-up form that works for every visitor
a = rep(a, "  const uid = cap.db ? await myId() : null;\n  if (!cap.db || !uid) { jMsg('Requests are saved only for signed-in testers. Open this page signed in to Claude, or message the team directly.'); return; }",
"""  const uid = cap.db ? await myId() : null;
  if (!cap.db || !uid) { await sendJoin(name); return; }""")
a = rep(a, "async function loadSignups() {", r"""async function sendJoin(name) {
  const C = window.W2S_CONFIG || {}, btn = $('#jSend');
  const data = {name: name.slice(0, 60), contact: contactOf(), accent: (ACCENTS.find(x => x.id === $('#jAccent').value) || {}).name || '', level: $('#jLevel').value, goal: $('#jGoal').value};
  const text = 'Hi! I would like a founding place in Week2Speak.\nName: ' + data.name + '\nContact: ' + (data.contact || '-') + '\nAccent: ' + data.accent + '\nLevel: ' + data.level + '\nWhy English: ' + data.goal;
  if (C.formKey) {
    btn.disabled = true; jMsg('Sending.');
    try {
      const r = await fetch('https://api.web3forms.com/submit', {method: 'POST', headers: {'Content-Type': 'application/json', Accept: 'application/json'}, body: JSON.stringify(Object.assign({access_key: C.formKey, subject: 'Founding place request: ' + data.name, from_name: 'Week2Speak website', botcheck: ''}, data))});
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.success !== false) { jMsg('Request sent. The tutor will message you about a founding place.', true); burstFrom(btn); $('#joinForm').reset(); }
      else jMsg('The request did not go through. Check your connection and send it again.');
    } catch (err) { jMsg('The request did not go through. Check your connection and send it again.'); }
    btn.disabled = false; return;
  }
  if (C.whatsapp) { const url = 'https://wa.me/' + String(C.whatsapp).replace(/\D/g, '') + '?text=' + encodeURIComponent(text); jMsg('Opening WhatsApp with your request.', true); window.open(url, '_blank', 'noopener'); return; }
  jMsg('Sign-ups open soon. Check back in a few days.');
}
async function loadSignups() {""")
# browser speech recognition when Claude dictation is not available
a = rep(a, "window.W2S = {", r"""/* ---------- microphone for every visitor: the browser's own speech recognition ---------- */
function browserSpeech() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return null;
  let rec = null; const P = [], F = [], St = []; const emit = (l, e) => l.forEach(f => { try { f(e); } catch (err) {} });
  const sub = l => f => { l.push(f); return () => { const i = l.indexOf(f); if (i >= 0) l.splice(i, 1); }; };
  return {
    onPartial: sub(P), onFinal: sub(F), onState: sub(St), active: () => !!rec,
    start(opts) {
      return new Promise((resolve, reject) => {
        let started = false, reason = 'stopped';
        try { rec = new SR(); } catch (e) { reject({code: 'unavailable'}); return; }
        rec.lang = (opts && opts.language) || 'en-US'; rec.interimResults = true; rec.continuous = true; rec.maxAlternatives = 1;
        rec.onstart = () => { started = true; emit(St, {state: 'listening'}); resolve(); };
        rec.onresult = e => { let interim = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) emit(F, {text: r[0].transcript.trim()}); else interim += r[0].transcript; } if (interim) emit(P, {text: interim.trim()}); };
        rec.onerror = ev => { const code = (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') ? 'not_granted' : ev.error === 'no-speech' ? 'stopped' : 'unavailable'; reason = code; if (!started) { rec = null; reject({code}); } };
        rec.onend = () => { rec = null; emit(St, {state: 'idle', reason}); };
        try { rec.start(); } catch (e) { rec = null; reject({code: 'unavailable'}); }
      });
    },
    stop() { return new Promise(res => { if (!rec) { res(); return; } const r = rec; const done = r.onend; r.onend = ev => { if (done) done(ev); res(); }; try { r.stop(); } catch (e) { res(); } setTimeout(res, 1500); }); }
  };
}
if (!(window.claude && typeof window.claude.use === 'function')) { const bs = browserSpeech(); if (bs) Mic.attach(bs); }

window.W2S = {""")
a = rep(a, "show();\n})();", "show();\nif (pending && pending.talk && currentView === 'sprint') setTimeout(toTalk, 400);\n})();") if "show();\n})();" in a else a
# ---------- home.js: run the page-entry animation on load ----------
h = home_js
h = rep(h, OLDSEL, NULLJS)
h = rep(h, "document.addEventListener('w2s:view', e => {\n  const name = e.detail.name, changed = e.detail.changed;", "const onView = d => {\n  const name = d.name, changed = d.changed;")
h = rep(h, "stagger: .035, clearProps: 'transform,opacity', overwrite: true});\n});", "stagger: .035, clearProps: 'transform,opacity', overwrite: true});\n};\ndocument.addEventListener('w2s:view', e => onView(e.detail));\nonView({name: document.body.dataset.page || 'home', changed: true});")
h = rep(h, "const tr = {speak: ['#speak', 'Try Speech Mode'], order: ['#games', 'Play Word Order'], shadow: ['#shadow', 'Open the shadowing studio'], rec: ['#sprint', 'Start the 7-Day Sprint']}[id];",
        "const tr = {speak: ['/speech-mode/', 'Try Speech Mode'], order: ['/games/', 'Play Word Order'], shadow: ['/shadowing/', 'Open the shadowing studio'], rec: ['/7-day-sprint/', 'Start the 7-Day Sprint']}[id];")
h = rep(h, "const t = document.getElementById(a.dataset.jump); if (t)", "const t = document.getElementById(a.dataset.jump); if (t && t.offsetParent !== null)")
# home-only work: skip the heavy home scenes on other pages
h = h.replace("const W = window.W2S;", "const W = window.W2S;\nconst onHome = (document.body.dataset.page || 'home') === 'home';", 1)
h = rep(h, "window.addEventListener('scroll', onScroll, {passive: true}); onScroll();", "window.addEventListener('scroll', onScroll, {passive: true}); onScroll();\nif (!onHome) return;")
h = rep(h, "if (!reduced) { (function loop(ts) {", "if (!reduced && onHome) { (function loop(ts) {")
h = rep(h, "if (!reduced) { let i = -1; (function next()", "if (!reduced && onHome) { let i = -1; (function next()")
h = rep(h, "if (!reduced) setInterval(() => { if (flipI", "if (!reduced && onHome) setInterval(() => { if (flipI")

# ---------- pages ----------
PAGES = {
 'home':     ('Week2Speak: Speak English in 7 Days for Spanish Speakers', 'Say real English sentences from day one. A 7-day Sprint with a Spanish-speaking tutor, plus speaking practice, shadowing and games for Spanish speakers.'),
 'speak':    ('Speech Mode: English Speaking Practice | Week2Speak', 'Practise speaking English out loud in real scenes: a café, an airport, a job interview. Get hints when you freeze and quick fixes for Spanish-speaker mistakes.'),
 'games':    ('English Speaking Games for Beginners | Week2Speak', 'Five short games that end with you speaking: Word Order, Fill the Gap, Flash Translate, Sound Lab and Quick Answers, with a pack for each Sprint day.'),
 'shadow':   ('English Shadowing Practice for Beginners | Week2Speak', 'Speak along with a native voice while the words light up. Shadow a clip for each Sprint day, or your own script, in American, British or Australian English.'),
 'sprint':   ('7-Day English Speaking Sprint | Week2Speak', 'A one-week English speaking programme for Spanish speakers: two calls with a tutor, 20 minutes of practice a day, and a 2-minute talk on Day 7.'),
 'course':   ('Free 7-Lesson English Speaking Course | Week2Speak', 'Seven short English lessons for Spanish speakers, one a day. Each has five key phrases, one mistake that comes from Spanish, and a speaking task.'),
 'tutor':    ('Tutor view | Week2Speak', 'What a tutor sees before a lesson: sentences spoken and the errors that keep coming back.'),
 'join':     ('Join the Week2Speak Founding Cohort', 'Ask for one of ten free founding places: the full 7-Day Sprint with a Spanish-speaking tutor, daily voice-note feedback, and your Day 1 and Day 7 on record.'),
 'mistakes': ('16 English Mistakes Spanish Speakers Make | Week2Speak', 'The 16 most common English mistakes Spanish speakers make, like "I have 25 years" and "I am agree", with the correct sentence and why each one happens.'),
 'privacy':  ('Privacy Notice | Week2Speak', 'How Week2Speak collects, uses and protects your personal data: practice progress, join requests, lesson recordings, the providers we use and your rights.'),
 'about':    ('How Week2Speak Teaches English', 'Week2Speak gets Spanish speakers saying English sentences from day one: speaking first, task-based lessons, spaced review and feedback on Spanish-speaker errors.'),
}
CFG = json.load(open('/home/claude/w2s-site/config.json')) if os.path.exists('/home/claude/w2s-site/config.json') else {}
ALL = dict(PATHS, mistakes='/common-mistakes/', about='/about/', privacy='/privacy/')
CRUMB = {'speak': 'Speech Mode', 'games': 'Games', 'shadow': 'Shadowing', 'sprint': '7-Day Sprint', 'course': 'Course', 'join': 'Join', 'mistakes': 'Common mistakes', 'about': 'About', 'privacy': 'Privacy'}
ORG = {"@type": "EducationalOrganization", "@id": SITE + "/#org", "name": "Week2Speak", "url": SITE + "/", "logo": SITE + "/apple-touch-icon.png",
       "description": "English speaking practice and tutoring for Spanish speakers.", "email": "hello@week2speak.com", "founder": {"@type": "Person", "name": "Mei Gabriela Parrablanco"}}
def ld(name):
    g = [ORG]
    if name == 'home':
        g.append({"@type": "WebSite", "@id": SITE + "/#site", "url": SITE + "/", "name": "Week2Speak", "inLanguage": "en", "publisher": {"@id": SITE + "/#org"}})
        g.append({"@type": "VideoObject", "name": "Week2Speak practice app walkthrough", "description": "A 53-second screen recording of the Week2Speak practice rooms: a first sentence, Word Order, Speech Mode with a Spanish-speaker fix, and shadowing.",
                  "thumbnailUrl": SITE + "/media/poster.jpg", "contentUrl": SITE + "/media/demo.mp4", "uploadDate": C.UPDATED_ISO, "duration": "PT53S", "inLanguage": "en"})
    if name in CRUMB:
        g.append({"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"}, {"@type": "ListItem", "position": 2, "name": CRUMB[name], "item": SITE + ALL[name]}]})
    if name in ('course', 'sprint'):
        g.append({"@type": "Course", "name": "7-Day English Speaking Sprint" if name == 'sprint' else "Week2Speak 7-lesson English speaking course",
                  "description": PAGES[name][1], "provider": {"@id": SITE + "/#org"}, "inLanguage": "en", "educationalLevel": "Beginner",
                  "teaches": "Spoken English for Spanish speakers", "url": SITE + ALL[name], "isAccessibleForFree": True,
                  "hasCourseInstance": {"@type": "CourseInstance", "courseMode": "Online", "courseWorkload": "PT20M"}})
    if name in C.FAQ:
        g.append(C.faq_ld(C.FAQ[name]))
    if name == 'mistakes':
        g.extend(C.mistakes_ld(SITE))
    return json.dumps({"@context": "https://schema.org", "@graph": g}, ensure_ascii=False)
FONTS = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&family=Figtree:wght@400..800&display=swap'
def head(name, title, desc, path, noindex=False):
    url = SITE + path; e = lambda x: x.replace('&', '&amp;').replace('"', '&quot;').replace('<', '&lt;')
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{url}">
<meta name="robots" content="{'noindex,follow' if noindex else 'index,follow,max-image-preview:large'}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Week2Speak">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/media/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Week2Speak: Speak English in 7 days">
<meta property="og:locale" content="en_GB">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0B103A">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/assets/fonts/bricolage.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/figtree.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css?v={VER}">
<script type="application/ld+json">{ld(name)}</script>
</head>
'''
SCRIPTS = f'''<script src="/assets/config.js?v={VER}"></script>
<script src="/assets/vendor/gsap-3.12.5.min.js" defer></script>
<script src="/assets/vendor/ScrollTrigger-3.12.5.min.js" defer></script>
<script src="/assets/app.js?v={VER}" defer></script>
<script src="/assets/home.js?v={VER}" defer></script>
'''
NAV_END = body.index('</header>') + len('</header>')
NAV = body[:NAV_END]
MAIN = body[NAV_END:]
home_start = MAIN.index('<div data-view="home" id="top">')
home_end = MAIN.index('\n</div>\n\n<!-- SPEECH MODE -->') + len('\n</div>\n')
HOME = MAIN[home_start:home_end]
ROOMS = {}
for m in re.finditer(r'<!-- [A-Z ]+ -->\n<section data-view="(\w+)" class="light" hidden>.*?</div></section>\n', MAIN, re.S):
    ROOMS[m.group(1)] = m.group(0)
assert set(ROOMS) == {'speak', 'games', 'shadow', 'sprint', 'course', 'tutor', 'join'}, ROOMS.keys()
# header: Join becomes a button that is always visible; short tab labels so the phone row fits without scrolling
SHORT = {'/speech-mode/': 'Speak', '/shadowing/': 'Shadow', '/7-day-sprint/': 'Sprint'}
for href, short in SHORT.items():
    NAV = re.sub(r'<a href="%s">([^<]+)</a>' % re.escape(href), lambda m: f'<a href="{href}" aria-label="{m.group(1)}"><span class="tl">{m.group(1)}</span><span class="ts">{short}</span></a>', NAV)
for href in ('/', '/tutor/'):
    NAV = rep(NAV, f'<a href="{href}">', f'<a class="tab-x" href="{href}">')
NAV = rep(NAV, '<a href="/join/">Join</a>', '')
NAV = rep(NAV, '<span class="stat num" id="stXp" title="Experience points"></span></div>', '<span class="stat num" id="stXp" title="Experience points"></span></div>\n  <a class="nav-join" href="/join/">Join free</a>')
ROOMS['speak'] = rep(ROOMS['speak'], '<div class="panel stack">\n      <div class="row" style="justify-content:space-between">\n        <h2 id="missionTitle"', '<div class="panel stack speakpanel">\n      ' + BB.STAGE + '<div class="row" style="justify-content:space-between">\n        <h2 id="missionTitle"')
ROOMS['join'] = rep(ROOMS['join'], '<span id="jMsg" role="status" class="result"></span></div>', '<span id="jMsg" role="status" class="result"></span></div>\n        <p class="full small muted">We use these details only to contact you about a founding place. Read the <a href="/privacy/">privacy notice</a>.</p>')
HOME = rep(HOME, '<div class="wk-track" id="wkTrack"></div>', '<div class="wk-track" id="wkTrack">' + C.week_cards() + '</div>')
HOME = rep(HOME, '<section class="plans light" id="plans">', C.home_faq() + '\n<section class="plans light" id="plans">')


H1 = {'speak': [('<h1 data-split>Speech Mode</h1>', '<h1 data-split>Speech Mode: English speaking practice</h1>')],
      'games': [('<h1 data-split>Games</h1>', '<h1 data-split>English speaking games</h1>')],
      'shadow': [('<h1 data-split>Shadowing studio</h1>', '<h1 data-split>English shadowing studio</h1>')],
      'sprint': [('<h1 data-split>7-Day Sprint</h1>', '<h1 data-split>The 7-Day English Speaking Sprint</h1>')],
      'course': [('<h1 data-split>The course</h1>', '<h1 data-split>Free English speaking course</h1>')]}


def page_body(name):
    if name == 'home':
        main = HOME
    elif name == 'mistakes':
        main = C.mistakes_page()
    elif name == 'about':
        main = C.about_page()
    elif name == 'privacy':
        main = PC.privacy_page(CFG.get('owner', ''))
    else:
        main = ROOMS[name]
        for old, new in H1.get(name, []): main = rep(main, old, new)
        main = main.replace(f'<section data-view="{name}" class="light" hidden>', f'<section data-view="{name}" class="light">')
        if name in C.GUIDES:
            main += C.guide(C.GUIDES[name])
    nav = NAV.replace('<a class="nav-join" href="/join/">', '<a class="nav-join" href="/join/" aria-current="page">') if name == 'join' else NAV
    return nav + '\n<main id="main">\n' + main + '</main>\n' + FOOTER


if os.path.exists(OUT): shutil.rmtree(OUT)
shutil.copytree('/home/claude/w2s-site/email', OUT + '/email'); os.makedirs(OUT + '/assets/fonts'); os.makedirs(OUT + '/assets/vendor'); os.makedirs(OUT + '/media')
NMOD = '/home/claude/w2s-show/node_modules'
shutil.copy(NMOD + '/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-standard-normal.woff2', OUT + '/assets/fonts/bricolage.woff2')
shutil.copy(NMOD + '/@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2', OUT + '/assets/fonts/figtree.woff2')
shutil.copy(NMOD + '/gsap/dist/gsap.min.js', OUT + '/assets/vendor/gsap-3.12.5.min.js')
shutil.copy(NMOD + '/gsap/dist/ScrollTrigger.min.js', OUT + '/assets/vendor/ScrollTrigger-3.12.5.min.js')
shutil.copy('/home/claude/w2s-site/vendor3/package/build/three.module.min.js', OUT + '/assets/vendor/three-0.170.0.module.min.js')
shutil.copy('/home/claude/w2s-site/buddies.js', OUT + '/assets/buddies.js')
FONTFACE = '@font-face{font-family:"Bricolage Grotesque";src:url("/assets/fonts/bricolage.woff2") format("woff2");font-weight:200 800;font-stretch:75% 100%;font-display:swap}\n@font-face{font-family:"Figtree";src:url("/assets/fonts/figtree.woff2") format("woff2");font-weight:300 900;font-display:swap}\n'
open(OUT + '/assets/site.css', 'w', encoding='utf-8').write(FONTFACE + css + open('/home/claude/w2s-site/extra.css').read() + BB.CSS)
open(OUT + '/assets/app.js', 'w', encoding='utf-8').write(a)
open(OUT + '/assets/home.js', 'w', encoding='utf-8').write(h)
cfg = {'formKey': CFG.get('formKey', ''), 'whatsapp': CFG.get('whatsapp', '')}
open(OUT + '/assets/config.js', 'w').write('/* Week2Speak site settings. formKey: Web3Forms access key for the Join form. whatsapp: number with country code, digits only. */\nwindow.W2S_CONFIG = ' + json.dumps(cfg) + ';\n')
for name, (title, desc) in PAGES.items():
    path = ALL[name]; d = OUT + path; os.makedirs(d, exist_ok=True)
    html = head(name, title, desc, path, noindex=(name == 'tutor')) + f'<body data-page="{name}">\n' + page_body(name) + SCRIPTS + (BB.script(VER) if name == 'speak' else '') + '</body>\n</html>\n'
    open(d + 'index.html', 'w', encoding='utf-8').write(html)
for f in ('demo.mp4', 'poster.jpg'): shutil.copy('/home/claude/w2s-show/' + f, OUT + '/media/' + f)
lastmod = time.strftime('%Y-%m-%d')
open(OUT + '/sitemap.xml', 'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(
    f'  <url><loc>{SITE}{ALL[n]}</loc><lastmod>{lastmod}</lastmod><priority>{"1.0" if n == "home" else "0.8"}</priority></url>\n' for n in PAGES if n != 'tutor') + '</urlset>\n')
open(OUT + '/llms.txt', 'w').write(C.LLMS.replace('{site}', SITE))
open(OUT + '/robots.txt', 'w').write(f'User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n')
open(OUT + '/_headers', 'w').write('''/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: microphone=(self), camera=(), geolocation=()
  X-Frame-Options: SAMEORIGIN
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/media/*
  Cache-Control: public, max-age=604800
/*.png
  Cache-Control: public, max-age=604800
''')
open(OUT + '/site.webmanifest', 'w').write(json.dumps({"name": "Week2Speak", "short_name": "Week2Speak", "start_url": "/", "display": "standalone", "background_color": "#F3F5FF", "theme_color": "#0B103A",
    "icons": [{"src": "/apple-touch-icon.png", "sizes": "180x180", "type": "image/png"}, {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png"}]}))
open(OUT + '/favicon.svg', 'w').write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#2D4BFF"/><rect x="14" y="12" width="36" height="40" rx="9" fill="#FFD93B" transform="rotate(-6 32 32)"/><text x="32" y="45" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="34" fill="#101642">2</text></svg>')
nf = head('home', 'Page not found | Week2Speak', 'This page does not exist.', '/404', noindex=True).replace(f'<link rel="canonical" href="{SITE}/404">\n', '')
open(OUT + '/404.html', 'w', encoding='utf-8').write(nf + '<body class="light" style="background:var(--paper)"><main class="wrap" style="padding-block:80px;display:grid;gap:20px;justify-items:start"><a class="logo" href="/" style="color:var(--ink)">Week<span class="two">2</span>Speak</a><h1 style="font-size:clamp(2.6rem,8vw,4.5rem)">That page does not exist.</h1><p style="color:var(--ink-2);font-size:1.15rem">The link may be old, or the address has a typo.</p><div class="row"><a class="key hl big" href="/">Go to the home page</a><a class="key big" href="/7-day-sprint/">See the 7-Day Sprint</a></div></main></body>\n</html>\n')
print('SITE', SITE, '| pages', len(PAGES), '| version', VER)
