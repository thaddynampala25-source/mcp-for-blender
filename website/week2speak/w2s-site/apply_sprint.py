import os as _os; _os.chdir(_os.path.dirname(_os.path.abspath(__file__)))   # run from this folder, wherever the project lives
"""Write the Sprint content and the new room features into the app source (w2s-show/showcase.html) and data.json.
Run once on a clean copy: it starts from showcase.pre-sprint.html so it can be re-run safely."""
import json, re, shutil, os
import sprint_content as C

SRC = '../w2s-show/showcase.html'
BASE = '../w2s-show/showcase.pre-sprint.html'
if not os.path.exists(BASE): shutil.copy(SRC, BASE)
s = open(BASE, encoding='utf-8').read()
J = lambda v: json.dumps(v, ensure_ascii=False)


def rep(a, b, n=1):
    global s
    assert s.count(a) >= n, ('MISSING', a[:90], s.count(a))
    s = s.replace(a, b) if n == 0 else s.replace(a, b, n)


def block(start, end, new):
    """Replace everything from `start` up to (not including) `end`."""
    global s
    i = s.index(start); j = s.index(end, i)
    s = s[:i] + new + s[j:]


# ---------- accents: American, British, Australian ----------
i = s.index("const ACCENTS = ["); j = s.index("];", i) + 2
s = s[:i] + "const ACCENTS = [\n  {id:'us', name:'American', lang:'en-US'}, {id:'gb', name:'British', lang:'en-GB'}, {id:'au', name:'Australian', lang:'en-AU'}\n];" + s[j:]
s = re.sub(r"\n  ie:'<rect[^\n]*", '', s, count=1)
s = re.sub(r",\n  in:'<rect[^\n]*", '', s, count=1)
s = re.sub(r"\n  \{id:'ie', name:'Irish'[^\n]*", '', s, count=1)
s = re.sub(r"\n  \{id:'in', name:'Indian'[^\n]*", '', s, count=1)
assert 'Irish' not in s and 'Indian' not in s and "en-IE" not in s and "en-IN" not in s
rep("if (!state.course || !state.course.done) state.course = {done:{}, said:{}};",
    "if (!state.course || !state.course.done) state.course = {done:{}, said:{}};\nif (!['us', 'gb', 'au'].includes(state.accent)) state.accent = 'us';")
rep("sessions:0, course:{done:{}, said:{}}});", "sessions:0, course:{done:{}, said:{}}, script:''});")

# ---------- one more mistake rule ----------
rep("}\n];\nconst ruleById", """},
  {id:'gerund', name:'"Like" + plain verb', re:/\\b(like|love|enjoy)s?\\s+(play|cook|dance|travel|read|watch|listen|swim|run|go|study|sing|eat|work|walk)\\b/i, tip:'After "like", use -ing: "I like playing football."', es:'Spanish says "me gusta jugar".'}
];
const ruleById""")

# ---------- sprint days ----------
def tasks(i, d):
    n = i + 1
    t = [{'label': f'Lesson {n}: key phrases', 'short': f'Lesson {n}', 'act': f'course:{n}', 'go': 'course', 'set': {'lesson': i}},
         {'label': f'Sound Lab: {C.SOUND_NAMES[i]}', 'short': 'Sound Lab', 'act': f'game:sound:{n}', 'go': 'games', 'set': {'game': 'sound', 'day': i}}]
    if i == 6:
        t += [{'label': 'Write your talk in "My script" and shadow it three times', 'short': 'Shadow your talk', 'act': 'shadow:mine', 'go': 'shadow', 'set': {'clip': 'mine'}},
              {'label': 'Word Order: Day 7 round', 'short': 'Word Order', 'act': 'game:order:7', 'go': 'games', 'set': {'game': 'order', 'day': 6}},
              {'label': 'Rehearse your 2-minute talk against the clock', 'short': 'The 2-minute clock', 'act': 'talk:day7', 'go': 'talk', 'set': {}},
              {'label': 'Your Day 7 call: give the talk to your tutor', 'act': 'manual', 'go': '', 'set': {}}]
        return t
    t += [{'label': f'Shadow "{d["cname"]}" three times', 'short': 'Shadowing', 'act': f'shadow:{d["clip"]}', 'go': 'shadow', 'set': {'clip': d['clip']}},
          {'label': f'{d["gname"]}: Day {n} round', 'short': d['gname'], 'act': f'game:{d["game"]}:{n}', 'go': 'games', 'set': {'game': d['game'], 'day': i}},
          {'label': f'Speech Mode: {d["sname"]}', 'short': 'Speech Mode', 'act': f'speak:{d["scene"]}', 'go': 'speak', 'set': {'mission': d['scene']}},
          {'label': f'Voice note to your tutor: {d["vn"]}', 'act': 'manual', 'go': '', 'set': {}}]
    return t

days_js = 'const DAYS = [\n' + ',\n'.join('  ' + J({'title': d['title'], 'can': d['can'], 'goal': d['goal'], 'vn': d['vn'], 'tasks': tasks(i, d)}) for i, d in enumerate(C.DAYS)) + '\n];\n'
block("const DAYS = [", "const QUESTS", days_js)
rep("const taskId = (d, t) => 'd' + (d + 1) + 't' + (t + 1);",
    "const taskId = (d, t) => 'k' + (d + 1) + '_' + (t + 1);\nconst sprintDay = () => { const i = DAYS.findIndex((d, di) => d.tasks.some((_, ti) => !state.sprint[taskId(di, ti)])); return i < 0 ? 6 : i; };")
rep("if (completed) { state.sprint.d7t2 = true; addXP(50);", "if (completed) { addXP(50);")
rep("{id:'q2', label:'Shadow \"Small talk\" at Natural speed', xp:20, go:'shadow', set:{clip:'smalltalk'}}", "{id:'q2', label:'Shadow \"Keep talking\" at Natural speed', xp:20, go:'shadow', set:{clip:'smalltalk'}}")

# ---------- speech mode scenes ----------
i = s.index("  meet:{name:'Meet someone new'"); j = s.index("  airport:{", i)
meet = {"name": "Meet someone new", "brief": "The learner meets a friendly stranger called Sam at a party. Sam asks their name, where they are from, their age, their job, why they are learning English and what they like.", "steps": [
    {"t": "Hi! I'm Sam. What's your name?", "h": {"starter": "Hi Sam, I'm…", "words": ["I'm", "nice to meet you"], "model": "Hi Sam, I'm Ana. Nice to meet you."}},
    {"t": "Nice to meet you too! Where are you from?", "h": {"starter": "I'm from…", "words": ["I'm from", "Colombia", "Mexico", "Spain", "in"], "model": "I'm from Lima, in Peru."}},
    {"t": "Cool! How old are you, if you don't mind?", "h": {"starter": "I'm…", "words": ["I'm", "thirty", "years old"], "model": "I'm thirty."}},
    {"t": "And what do you do?", "h": {"starter": "I'm a…", "words": ["I'm a", "student", "nurse", "teacher", "I work in"], "model": "I'm a nurse."}},
    {"t": "Why are you learning English?", "h": {"starter": "I'm learning English because I want to…", "words": ["because I want to", "travel", "get a better job", "study abroad"], "model": "I'm learning English because I want to travel."}},
    {"t": "Great reason. And what do you like?", "h": {"starter": "I like…", "words": ["I like", "music", "football", "cooking", "and"], "model": "I like music and football."}},
    {"t": "Me too! And look: you just had a whole conversation in English."}]}
s = s[:i] + "  meet:" + J(meet) + ",\n" + s[j:]
i = s.index("  free:{name:'Free talk'")
s = s[:i] + ''.join(f"  {k}:{J(v)},\n" for k, v in C.MISSIONS_NEW.items()) + s[i:]

# ---------- games: a pack for every day, plus Sound Lab ----------
games_js = f"""const SENT = {J(C.S)};
const GAMES = {{
  order:{{name:'Word Order', packs: SENT.map(d => d.map(x => ({{s: x[0]}})))}},
  gap:{{name:'Fill the Gap', packs: {J(C.GAP)}.map(d => d.map(x => ({{t: x[0], o: x[1], a: x[2], n: x[3]}})))}},
  flash:{{name:'Flash Translate', packs: SENT.map(d => d.map(x => ({{es: x[1], a: [x[0]].concat(x.slice(2))}})))}},
  sound:{{name:'Sound Lab', packs: {J(C.SOUND)}.map(d => d.map(x => ({{w: x[0], alt: x[1], n: x[2]}})))}}
}};
const SOUND_NAMES = {J(C.SOUND_NAMES)};
const gItems = () => {{ const g = GAMES[G.kind]; return g.packs[G.day] || g.packs[0]; }};
"""
block("const GAMES = {", "const G = {", games_js)
rep("const G = {kind:'order', i:0,", "const G = {kind:'order', day:0, picked:false, i:0,")
rep("""function startGame(kind) {
  Voice.stop(); Mic.stop();
  Object.assign(G, {kind, i:0, marks:[], combo:0, first:0});
  $$('#gameTabs button').forEach(b => b.setAttribute('aria-pressed', b.dataset.game === kind));
  loadItem();
}""", """function startGame(kind, day) {
  Voice.stop(); Mic.stop();
  if (!GAMES[kind]) kind = 'order';
  if (day != null) G.picked = true; else day = G.picked ? G.day : sprintDay();
  Object.assign(G, {kind, day: Math.max(0, Math.min(6, +day || 0)), i:0, marks:[], combo:0, first:0});
  $$('#gameTabs button').forEach(b => b.setAttribute('aria-pressed', b.dataset.game === kind));
  $('#gameDays').innerHTML = DAYS.map((d, i) => `<button type="button" class="chip" data-gday="${i}" aria-pressed="${i === G.day}">Day ${i + 1}</button>`).join('');
  $('#gameDayNote').textContent = kind === 'sound' ? 'Sound of the day: ' + SOUND_NAMES[G.day] + '.' : 'Day ' + (G.day + 1) + ': ' + DAYS[G.day].title + '. ' + DAYS[G.day].can;
  loadItem();
}""")
s = s.replace("GAMES[G.kind].items[G.i]", "gItems()[G.i]").replace("GAMES[G.kind].items.length", "gItems().length").replace("GAMES.flash.items[G.i]", "gItems()[G.i]")
rep("const g = GAMES[G.kind], n = g.items.length, it = g.items[G.i];", "const g = GAMES[G.kind], n = gItems().length, it = gItems()[G.i];")
assert '.items' not in s[s.index('const GAMES = {'):s.index("$('#gameTabs').addEventListener")], 'old items reference left'
rep("  if (G.kind === 'gap') G.choice = null;", "  if (G.kind === 'gap') G.choice = null;\n  if (G.kind === 'sound') { G.opts = Math.random() < .5 ? [it.w, it.alt] : [it.alt, it.w]; G.choice = null; G.spoke = false; }")
rep("""  } else if (G.kind === 'gap') {
    const filled""", """  } else if (G.kind === 'sound') {
    html += '<p class="muted">Listen. Which word did you hear?</p>';
    html += `<div class="row"><button type="button" class="key primary big" data-hearword="1">${ic('speaker')}Play the word</button></div>`;
    html += '<div class="pool">' + G.opts.map(o => `<button type="button" class="tile${G.solved && o === it.w ? ' right' : ''}${G.choice === o && o !== it.w ? ' wrong' : ''}" data-word="${esc(o)}"${G.solved ? ' disabled' : ''}>${esc(o)}</button>`).join('') + '</div>';
  } else if (G.kind === 'gap') {
    const filled""")
rep("""if (G.solved) html += `<button type="button" class="key" data-hearit="1">${ic('speaker')}Hear it</button>""",
    """if (G.solved && G.kind === 'sound') html += `<button type="button" class="key" data-hearboth="1">${ic('speaker')}Hear both</button><button type="button" class="key rec mic-only" data-sayword="1">${ic('mic')}Say "${esc(it.w)}"</button>`;
  if (G.solved) html += `${G.kind === 'sound' ? '' : `<button type="button" class="key" data-hearit="1">${ic('speaker')}Hear it</button>`}""")
rep("return G.kind === 'order' ? it.s : G.kind === 'gap' ? it.t.replace('___', it.a) : it.a[0]; }",
    "return G.kind === 'order' ? it.s : G.kind === 'gap' ? it.t.replace('___', it.a) : G.kind === 'sound' ? it.w : it.a[0]; }")
rep("G.fb = {kind:'ok', title: title + ' +' + xp + ' XP', body}; logLine(GAMES[G.kind].name, target()); }",
    "G.fb = {kind:'ok', title: title + ' +' + xp + ' XP', body}; if (G.kind !== 'sound') logLine(GAMES[G.kind].name, target()); }")
rep("  else if (b.dataset.opt != null) {", """  else if (b.dataset.hearword) Voice.speak(it.w, {rate:.85});
  else if (b.dataset.word != null) {
    G.choice = b.dataset.word;
    if (G.choice === it.w) solve(true, 'Correct: "' + it.w + '".', esc(it.n));
    else { G.tries++; solve(false, 'It was "' + it.w + '", not "' + it.alt + '".', esc(it.n)); }
  }
  else if (b.dataset.hearboth) Voice.speak(it.w + '. ' + it.alt + '.', {rate:.8});
  else if (b.dataset.sayword) {
    G.fb = {kind:'info', title:'Listening. Say "' + it.w + '".'}; renderGame();
    Mic.start({button: $('[data-sayword]', gameBody), onText: () => {}, onEnd: said => {
      const heard = ' ' + String(said || '').toLowerCase().replace(/[^a-z' ]/g, ' ') + ' ';
      if (!said) G.fb = {kind:'info', title:'I did not catch that. Try again.'};
      else if (heard.includes(' ' + it.w + ' ')) { if (!G.spoke) { G.spoke = true; addXP(5); } G.fb = {kind:'ok', title:'I heard "' + it.w + '". +5 XP', body: esc(it.n)}; }
      else if (heard.includes(' ' + it.alt + ' ')) G.fb = {kind:'bad', title:'I heard "' + it.alt + '".', body: esc(it.n)};
      else G.fb = {kind:'info', title:'I heard "' + String(said).slice(0, 40) + '". Try once more.'};
      renderGame();
    }});
  }
  else if (b.dataset.opt != null) {""")
rep("addXP(bonus); markActivity('game:' + G.kind);", "addXP(bonus); markActivity('game:' + G.kind + ':' + (G.day + 1));")
rep("$('#gameTabs').addEventListener('click', e => { const b = e.target.closest('[data-game]'); if (b) startGame(b.dataset.game); });",
    "$('#gameTabs').addEventListener('click', e => { const b = e.target.closest('[data-game]'); if (b) startGame(b.dataset.game); });\n$('#gameDays').addEventListener('click', e => { const b = e.target.closest('[data-gday]'); if (b) startGame(G.kind, +b.dataset.gday); });")
rep("if (name === 'games') { if (p.game || !started.games) startGame(p.game || G.kind); started.games = true; }",
    "if (name === 'games') { if (p.game || !started.games) startGame(p.game || G.kind, p.day); started.games = true; }")
rep("if (name === 'course') renderCourse();", "if (name === 'course') { if (p.lesson != null) courseDay = Math.max(0, Math.min(6, +p.lesson || 0)); renderCourse(); }")
rep('<button type="button" data-game="order">Word Order</button><button type="button" data-game="gap">Fill the Gap</button><button type="button" data-game="flash">Flash Translate</button>\n    </div>',
    '<button type="button" data-game="order">Word Order</button><button type="button" data-game="gap">Fill the Gap</button><button type="button" data-game="flash">Flash Translate</button><button type="button" data-game="sound">Sound Lab</button>\n    </div>\n    <div class="chips" id="gameDays" role="group" aria-label="Sprint day"></div>\n    <p class="small muted" id="gameDayNote"></p>')
rep("<p>Short rounds that make you build a sentence, then say it. Eight sentences a round.</p>",
    "<p>Four games with a new pack for every day of the Sprint. Build the sentence, hear the sound, then say it out loud.</p>")

# ---------- shadowing: seven clips and your own script ----------
clips_js = "const CLIPS = {\n" + ",\n".join(f"  {k}:{J({'name': n, 'text': t})}" for k, (n, t) in C.CLIPS.items()) + "\n};\n" + \
    f"const MINE_DEFAULT = {J(C.MINE_DEFAULT)};\nconst clipText = () => SH.clip === 'mine' ? ((state.script || '').trim() || MINE_DEFAULT) : CLIPS[SH.clip].text;\n"
block("const CLIPS = {", "const SH = {", clips_js)
assert s.count("CLIPS[SH.clip].text") == 3, s.count("CLIPS[SH.clip].text")
s = s.replace("SH.k = karaoke($('#shLine'), CLIPS[SH.clip].text);", "SH.k = karaoke($('#shLine'), clipText());\n  $('#minePanel').hidden = SH.clip !== 'mine';\n  if (SH.clip === 'mine' && document.activeElement !== $('#mineText')) $('#mineText').value = state.script || '';")
s = s.replace("const text = CLIPS[SH.clip].text; SH.playing = true;", "const text = clipText(); SH.playing = true;")
rep("$('#shPlay').addEventListener('click', shPlay);", """$('#shPlay').addEventListener('click', shPlay);
$('#mineSave').addEventListener('click', () => { shStop(); state.script = $('#mineText').value.replace(/\\s+/g, ' ').trim().slice(0, 900); save(); $('#mineMsg').textContent = state.script ? 'Saved on this device.' : 'Empty, so the sample script is used.'; renderShadow(); });""")
rep('<div class="panel"><h2>Clip</h2><div class="chips" id="clips"></div></div>',
    '<div class="panel"><h2>Clip</h2><div class="chips" id="clips"></div></div>\n      <div class="panel" id="minePanel" hidden><h2>My script</h2><p class="small muted" style="margin-bottom:10px">Type the sentences from your lesson, or your 2-minute talk. They stay on this device.</p><textarea class="field" id="mineText" rows="6" maxlength="900" aria-label="My script" placeholder="Hi, I\'m Ana. I\'m from Lima, in Peru."></textarea><div class="row" style="margin-top:10px"><button class="key primary" id="mineSave" type="button">Save and shadow it</button><span class="small muted" id="mineMsg" role="status"></span></div></div>')

# ---------- sprint page ----------
rep("<p>Three tasks a day, about ten minutes. Tick them yourself or let the rooms tick them when you finish.</p>",
    "<p>Six tasks a day, about twenty minutes. The rooms tick themselves when you finish them. Tick the voice note once you have sent it to your tutor.</p>")
rep("<p class=\"muted\">Talk about who you are, what you do, and why you are learning English. No script. Keep going until the clock stops.</p>",
    "<p class=\"muted\">Four parts, thirty seconds each: who you are, what you like, what you did last week, and why you are learning English. No script. Keep going until the clock stops.</p>")
rep("<h2 data-split>Seven days, three tasks a day</h2>", "<h2 data-split>Seven days, twenty minutes a day</h2>")
rep("<div><h3>${esc(d.title)}</h3><p>${esc(d.goal)}</p></div><span class=\"count num\">", "<div><h3>${esc(d.title)}</h3><p><b>${esc(d.can)}</b> ${esc(d.goal)}</p></div><span class=\"count num\">")

# ---------- course ----------
course_js = "const COURSE = [\n" + ",\n".join("  " + J({'phr': [[p[0], p[1]] for p in c['phr']], 'bad': c['bad'], 'good': c['good'], 'rule': c['rule']}) for c in C.COURSE) + "\n];\n"
block("const COURSE = [", "let courseDay", course_js)
rep("""<p class="kline" data-phr="${k}">${esc(p)}</p>""", """<div><p class="kline" data-phr="${k}">${esc(p[0])}</p><p class="small muted" lang="es">${esc(p[1])}</p></div>""")
rep("kk = karaoke(p, c.phr[k]); Voice.speak(c.phr[k], {rate: .9, onWord: kk.mark});", "kk = karaoke(p, c.phr[k][0]); Voice.speak(c.phr[k][0], {rate: .9, onWord: kk.mark});")
rep("logLine('Course: lesson ' + (courseDay + 1), c.phr[+b.dataset.said]);", "logLine('Course: lesson ' + (courseDay + 1), c.phr[+b.dataset.said][0]);")
rep("state.course.done[key] = true; addXP(20);", "state.course.done[key] = true; markActivity('course:' + (courseDay + 1)); addXP(20);")
rep("d.tasks.filter(t => t.go).map(t => `<li><span></span>", "d.tasks.filter(t => t.go && t.go !== 'course').map(t => `<li><span></span>")
rep("<h2 style=\"margin:0;font-size:1.7rem\">Lesson ${courseDay + 1}: ${esc(d.title)}</h2><p class=\"muted\">${esc(d.goal)}</p>",
    "<h2 style=\"margin:0;font-size:1.7rem\">Lesson ${courseDay + 1}: ${esc(d.title)}</h2><p class=\"muted\"><b>${esc(d.can)}</b> ${esc(d.goal)}</p>")
rep("`<div class=\"panel stack\"><h2 style=\"margin:0\">Practise in the rooms</h2>",
    "(d.vn ? `<div class=\"panel stack\"><h2 style=\"margin:0\">Today's voice note</h2><p class=\"kline\">${esc(d.vn)}</p><p class=\"muted small\">Record it on WhatsApp and send it to your tutor. One minute or less, no reading. Your tutor answers with a voice note.</p></div>` : '') +\n    `<div class=\"panel stack\"><h2 style=\"margin:0\">Practise in the rooms</h2>")

import apply_more
s = apply_more.apply(s, C)
open(SRC, 'w', encoding='utf-8').write(s)

# ---------- data for the crawlable pages ----------
dp = 'data.json'
D = json.load(open(dp))
def short(i, d):
    if i == 6: return ['Lesson 7 and Sound Lab', 'Shadow your own talk', 'Rehearse against the 2-minute clock', 'Day 7 call: give the talk to your tutor']
    return [f'Lesson {i + 1} and Sound Lab ({C.SOUND_NAMES[i]})', f'Shadow "{d["cname"]}"', f'{d["gname"]} and Speech Mode: {d["sname"]}', 'Voice note: ' + d['vn']]
D['DAYS'] = [{'title': d['title'], 'goal': d['can'] + ' ' + d['goal'], 'tasks': short(i, d)} for i, d in enumerate(C.DAYS)]
D['COURSE'] = [{'phr': [p[0] for p in c['phr']], 'bad': c['bad'], 'good': c['good'], 'rule': c['rule']} for c in C.COURSE]
if not any(r['id'] == 'gerund' for r in D['RULES']):
    D['RULES'].append({'id': 'gerund', 'name': '"Like" + plain verb', 'tip': 'After "like", use -ing: "I like playing football."', 'es': 'Spanish says "me gusta jugar".'})
D['CLIPS'] = {k: {'name': n, 'text': t} for k, (n, t) in C.CLIPS.items()} if isinstance(D.get('CLIPS'), dict) else D.get('CLIPS')
json.dump(D, open(dp, 'w'), ensure_ascii=False, indent=1)
print('applied', len(s))
