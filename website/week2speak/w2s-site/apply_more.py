"""Second layer of Sprint features, applied by apply_sprint.py after its own changes:
Quick Answers (a listening and speaking game), Sound Lab that makes you listen first,
the Today homework hub on the Sprint page, and the before/after recorder."""
import json

J = lambda v: json.dumps(v, ensure_ascii=False)


def apply(s, C):
    def rep(a, b):
        nonlocal s
        assert s.count(a) == 1, ('EXPECTED ONCE', s.count(a), a[:90])
        s = s.replace(a, b)

    # ---------- Quick Answers: data ----------
    quick = [[{'q': x[0], 'st': x[1], 'm': x[2], 'es': x[3], 'full': bool(x[4]) if len(x) > 4 else False, 'rate': x[5] if len(x) > 5 else 0} for x in d] for d in C.QUICK]
    rep("const SOUND_NAMES = ", "GAMES.quick = {name:'Quick Answers', packs: " + J(quick) + "};\nconst SOUND_NAMES = ")
    rep('<button type="button" data-game="sound">Sound Lab</button>', '<button type="button" data-game="sound">Sound Lab</button><button type="button" data-game="quick">Quick Answers</button>')
    rep("<p>Four games with a new pack for every day of the Sprint. Build the sentence, hear the sound, then say it out loud.</p>",
        "<p>Five games with a new pack for every day of the Sprint. Build the sentence, hear the sound, answer the question, and say it out loud.</p>")

    # ---------- engine: load ----------
    rep("G.choice = null; G.spoke = false; }", "G.choice = null; G.spoke = false; G.played = false; }\n  if (G.kind === 'quick') { G.shown = false; G.played = false; }")

    # ---------- engine: render ----------
    rep("html += '<p class=\"muted\">Listen. Which word did you hear?</p>';", "html += '<p class=\"muted\">Tap Play and listen. Then choose the word you heard.</p>';")
    rep("""data-word="${esc(o)}"${G.solved ? ' disabled' : ''}>""", """data-word="${esc(o)}"${G.solved || !G.played ? ' disabled' : ''}>""")
    rep("""  } else if (G.kind === 'gap') {
    const filled""", r"""  } else if (G.kind === 'quick') {
    html += '<p class="muted">Listen to the question. Answer out loud, in a full sentence.</p>';
    html += `<div class="row"><button type="button" class="key primary big" data-hearq="1">${ic('speaker')}${G.played ? 'Play it again' : 'Play the question'}</button>${G.played && !G.shown && !G.solved ? '<button type="button" class="key" data-showq="1">Show the words</button>' : ''}</div>`;
    if (G.shown || G.solved) html += `<p class="prompt">${esc(it.q)}</p><p class="small muted" lang="es">${esc(it.es)}</p>`;
    html += `<form class="composer" id="flashForm" autocomplete="off"><button class="key round mic-only" type="button" data-say="1" aria-label="Say your answer"${G.played && !G.solved ? '' : ' disabled'}>${ic('mic')}</button><input class="field" id="flashInput" type="text" placeholder="Or type your answer" aria-label="Your answer"${G.solved || !G.played ? ' disabled' : ''} value="${esc(G.typed || '')}"><button class="key primary" type="submit"${G.solved || !G.played ? ' disabled' : ''}>Check</button></form>`;
  } else if (G.kind === 'gap') {
    const filled""")
    rep("G.kind === 'sound' ? it.w : it.a[0]; }", "G.kind === 'sound' ? it.w : G.kind === 'quick' ? it.m : it.a[0]; }")
    rep("if (G.kind !== 'sound') logLine(GAMES[G.kind].name, target()); }", "if (G.kind !== 'sound') logLine(GAMES[G.kind].name, G.kind === 'quick' && G.typed ? G.typed : target()); }")

    # ---------- engine: check ----------
    rep("function miss(title, body) {", r"""const plain = t => String(t).toLowerCase().replace(/[’`]/g, "'").replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
function checkQuick(text, spoken) {
  const it = gItems()[G.i]; G.typed = text;
  if (!text.trim()) return;
  const said = ' ' + plain(text);
  const ok = it.full ? Math.max(...it.st.map(a => similar(a, text))) >= .8 : it.st.some(a => said.includes(' ' + plain(a)));
  const errs = analyze(text);
  const fix = errs.length ? esc(errs[0].tip) + ' ' + esc(errs[0].es) : '';
  const model = 'One way to say it: <b>' + esc(it.m) + '</b>';
  if (ok) return solve(true, errs.length ? 'Good answer. One fix.' : 'Good answer.', (fix ? fix + ' ' : '') + model, spoken ? 5 : 0);
  if (G.tries >= 1) return solve(false, 'Here is one way to answer.', '<b>' + esc(it.m) + '</b> Say it out loud twice.');
  miss('Not yet. One more try.', fix || 'Start like this: <b>' + esc(it.m.split(' ').slice(0, Math.max(1, Math.min(2, it.m.split(' ').length - 1))).join(' ')) + '…</b>');
}
function miss(title, body) {""")

    # ---------- engine: clicks ----------
    rep("  else if (b.dataset.hearword) Voice.speak(it.w, {rate:.85});", """  else if (b.dataset.hearword) { G.played = true; renderGame(); Voice.speak(it.w, {rate:.85}); }
  else if (b.dataset.hearq) { G.played = true; if ($('#flashInput')) G.typed = $('#flashInput').value || ''; renderGame(); Voice.speak(it.q, {rate: it.rate || .95}); }
  else if (b.dataset.showq) { G.shown = true; G.typed = $('#flashInput').value || ''; renderGame(); }""")
    rep("if (G.kind === 'flash') G.typed = $('#flashInput').value; renderGame();", "if (G.kind === 'flash' || G.kind === 'quick') G.typed = $('#flashInput').value || ''; renderGame();")
    rep("if (G.kind === 'flash') return checkFlash(said, true);", "if (G.kind === 'flash') return checkFlash(said, true);\n      if (G.kind === 'quick') return checkQuick(said, true);")
    rep("if (G.kind === 'flash' && !G.solved) checkFlash($('#flashInput').value, false);", "if (G.kind === 'flash' && !G.solved) checkFlash($('#flashInput').value, false);\n  if (G.kind === 'quick' && !G.solved) checkQuick($('#flashInput').value, false);")

    # ---------- Sprint page: Today hub ----------
    rep('<div class="todaybar"><h2 style="margin:0">Today</h2><div class="pips" id="pips"></div></div>', '<div class="stack" id="today"></div>')
    i = s.index("  const pips = [["); j = s.index("  let done = 0, total = 0;", i)
    s = s[:i] + s[j:]
    assert "#pips" not in s, 'pips still referenced'
    rep("  if (openDay < 0) { openDay = dayDone.findIndex(", r"""  const cd = sprintDay(), td = DAYS[cd], nti = td.tasks.findIndex((_, ti) => !state.sprint[taskId(cd, ti)]), nt = td.tasks[nti];
  const groups = [['Learn', [0, 1, 2]], ['Practise', [3, 4]], ['Speak', [5]]];
  const wa = String((window.W2S_CONFIG || {}).whatsapp || '').replace(/\D/g, '');
  $('#today').innerHTML = !nt ? `<h2 style="margin:0">Sprint complete</h2><p class="kline">I can talk for two minutes.</p><p class="muted">All ${total} tasks are done. Play any room again, or use Quick Answers for extra speaking.</p>` :
    `<div class="todaybar"><h2 style="margin:0">Today: Day ${cd + 1}</h2><span class="tag">${esc(td.title)}</span></div><p class="kline">${esc(td.can)}</p>` +
    `<div class="steps3">${groups.map(([n, ix], gi) => { const c = ix.filter(ti => state.sprint[taskId(cd, ti)]).length; return `<div class="step3${c === ix.length ? ' d' : ''}"><b>${gi + 1}. ${n}</b><span class="num">${c}/${ix.length}</span></div>`; }).join('')}</div>` +
    (nt.go ? `<div class="row"><a class="key primary big" href="#${nt.go === 'talk' ? 'sprint' : nt.go}" data-go='${esc(JSON.stringify(Object.assign({}, nt.set, nt.go === 'talk' ? {talk:1} : {})))}'>Next: ${esc(nt.short || nt.label)}${ic('arrow')}</a></div>` :
      `<div class="fb info">Last step today<span>${esc(nt.label)}</span></div><div class="row">${wa ? `<a class="key primary big" href="https://wa.me/${wa}" target="_blank" rel="noopener">Open WhatsApp</a>` : ''}<button type="button" class="key" data-tick="${taskId(cd, nti)}">${ic('check')}I did it</button></div>`) +
    `<p class="small muted">Five more minutes? <a href="#games" data-go='${esc(JSON.stringify({game:'quick', day:cd}))}'>Quick Answers, Day ${cd + 1}</a>: hear a question and answer out loud.</p>`;
  if (openDay < 0) { openDay = dayDone.findIndex(""")
    rep("$('#days').addEventListener('toggle',", r"""$('#today').addEventListener('click', e => { const b = e.target.closest('[data-tick]'); if (!b) return; state.sprint[b.dataset.tick] = true; addXP(10); save(); renderSprint(); });

/* ---------- before and after: recordings that stay on this device ---------- */
const REC = {db:null, media:null, chunks:[], slot:null, stream:null, urls:{}, blobs:{}, timer:0};
const REC_SLOTS = [['day1', 'Day 1'], ['day7', 'Day 7']];
const recOK = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder && window.indexedDB);
function recDB() { return new Promise((res, rej) => { if (REC.db) return res(REC.db); const r = indexedDB.open('w2s-clips', 1); r.onupgradeneeded = () => r.result.createObjectStore('clips'); r.onsuccess = () => { REC.db = r.result; res(REC.db); }; r.onerror = () => rej(r.error); }); }
const recTx = (mode, fn) => recDB().then(db => new Promise((res, rej) => { const tx = db.transaction('clips', mode), rq = fn(tx.objectStore('clips')); tx.oncomplete = () => res(rq && rq.result); tx.onerror = () => rej(tx.error); }));
function recSet(id, blob) { if (REC.urls[id]) URL.revokeObjectURL(REC.urls[id]); REC.urls[id] = URL.createObjectURL(blob); REC.blobs[id] = blob; }
function renderRecs() {
  if (!document.getElementById('recs')) return;
  if (!recOK) { $('#recs').innerHTML = '<p class="muted">This browser cannot record here. Record the card as a WhatsApp voice note and send it to your tutor.</p>'; return; }
  $('#recs').innerHTML = REC_SLOTS.map(([id, name]) => { const on = REC.slot === id, url = REC.urls[id];
    return `<div class="recslot"><b>${name}</b>` + (url ? `<audio controls preload="metadata" src="${url}"></audio>` : '<span class="muted small">Not recorded yet.</span>') +
      `<div class="row"><button type="button" class="key ${on ? 'rec' : 'primary'}" data-rec="${id}"${REC.slot && !on ? ' disabled' : ''}>${ic(on ? 'stop' : 'mic')}${on ? 'Stop' : url ? 'Record again' : 'Record'}</button>` +
      (url && !on ? `<button type="button" class="key" data-recshare="${id}">Send it</button>` : '') + '</div></div>'; }).join('') +
    (REC.urls.day1 && REC.urls.day7 ? `<button type="button" class="key hl big" data-recboth="1" style="grid-column:1/-1">${ic('play')}Play Day 1, then Day 7</button>` : '');
}
function recStop() { clearTimeout(REC.timer); if (REC.media && REC.media.state !== 'inactive') REC.media.stop(); }
async function recStart(id) {
  Voice.stop(); Mic.stop();
  try { REC.stream = await navigator.mediaDevices.getUserMedia({audio:true}); }
  catch (e) { $('#recNote').textContent = 'The microphone is blocked. Allow it in your browser settings, or record a WhatsApp voice note instead.'; return; }
  REC.chunks = []; REC.media = new MediaRecorder(REC.stream); REC.slot = id;
  REC.media.ondataavailable = e => { if (e.data && e.data.size) REC.chunks.push(e.data); };
  REC.media.onstop = async () => {
    REC.stream.getTracks().forEach(t => t.stop());
    const blob = new Blob(REC.chunks, {type: REC.media.mimeType || 'audio/webm'}); REC.slot = null;
    if (blob.size) { try { await recTx('readwrite', st => st.put(blob, id)); } catch (e) {} recSet(id, blob); addXP(10); $('#recNote').textContent = 'Saved on this device. Listen to it, then send it to your tutor.'; }
    renderRecs();
  };
  REC.media.start(); REC.timer = setTimeout(recStop, 90000);
  $('#recNote').textContent = 'Recording. Read the five sentences once, then tap Stop.'; renderRecs();
}
async function recShare(id) {
  const blob = REC.blobs[id]; if (!blob) return;
  const ext = /mp4|aac|m4a/.test(blob.type) ? 'm4a' : /ogg/.test(blob.type) ? 'ogg' : 'webm';
  const file = new File([blob], 'week2speak-' + id + '.' + ext, {type: blob.type});
  if (navigator.canShare && navigator.canShare({files:[file]})) { try { await navigator.share({files:[file], title:'Week2Speak ' + id}); } catch (e) {} return; }
  const a = document.createElement('a'); a.href = REC.urls[id]; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  $('#recNote').textContent = 'Saved to your downloads. Send that file to your tutor on WhatsApp.';
}
$('#recs').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.rec) { if (REC.slot === b.dataset.rec) recStop(); else if (!REC.slot) recStart(b.dataset.rec); }
  else if (b.dataset.recshare) recShare(b.dataset.recshare);
  else if (b.dataset.recboth) { const a = $$('#recs audio'); if (a.length < 2) return; a[1].pause(); a[0].currentTime = 0; a[1].currentTime = 0; a[0].onended = () => { a[0].onended = null; a[1].play(); }; a[0].play(); }
});
renderRecs();
if (recOK && document.getElementById('recs')) Promise.all(REC_SLOTS.map(([id]) => recTx('readonly', st => st.get(id)).then(b => { if (b) recSet(id, b); }).catch(() => {}))).then(renderRecs);

$('#days').addEventListener('toggle',""")
    rep('    <div class="panel stack" id="talk">', """    <div class="panel stack" id="clipsPanel">
      <h2 style="margin:0">Your before and after</h2>
      <p class="muted">Read the Sprint card out loud on Day 1, and again on Day 7. The same five sentences, seven days apart. Recordings stay on this device until you send them.</p>
      <p class="card5">Hi, I'm ____. I'm from ____.<br>I speak Spanish, and I'm studying English.<br>I live in a big city, and I really like it.<br>Yesterday I worked, and then I watched a film.<br>I think this is a very good start.</p>
      <div class="recs" id="recs"></div>
      <p class="small muted" id="recNote" role="status"></p>
    </div>
    <div class="panel stack" id="talk">""")
    rep('Play all three games', 'Play all five games')

    # ---------- Language Buddies: the app tells the 3D characters what is happening ----------
    rep("if (!['us', 'gb', 'au'].includes(state.accent)) state.accent = 'us';", """if (!['us', 'gb', 'au'].includes(state.accent)) state.accent = 'us';
const emit = (n, d) => { try { window.dispatchEvent(new CustomEvent('w2s:' + n, {detail: d || {}})); } catch (e) {} };
if (state.buddy !== 'rio') state.buddy = 'mila';
window.W2S_BUDDY = state.buddy; window.W2S_BUDDY_GENDER = state.buddy === 'rio' ? 'm' : 'f';
window.addEventListener('w2s:buddy', e => { const id = e.detail && e.detail.id === 'rio' ? 'rio' : 'mila'; state.buddy = id; save(); renderVoiceNotes();
  setTimeout(() => { if (currentView === 'speak' && $('#speakAloud').checked) Voice.speak(id === 'rio' ? "Hey! I'm Max. Let's talk." : "Hi! I'm Ruby. Let's talk.", {rate: 1}); }, 700); });
/* Speech Mode screen: Start talking, Play again and the replay button */
window.addEventListener('w2s:start', () => { window.W2S_HOLD = 0; startMission(S.id); });
window.addEventListener('w2s:replay', () => { const t = S.turns.slice().reverse().find(x => x.role === 'tutor'); if (t) Voice.speak(t.text, {rate: .95}); });""")
    # The first tutor line waits for "Start talking": browsers only allow speech after a tap.
    rep("if ($('#speakAloud').checked && currentView === 'speak') Voice.speak(text, {rate:.95});", "if ($('#speakAloud').checked && currentView === 'speak' && !window.W2S_HOLD) Voice.speak(text, {rate:.95});")
    rep("'More help' : 'That is all the help'", "'More help' : 'That is all'")
    rep("sessions:0, course:{done:{}, said:{}}, script:''});", "sessions:0, course:{done:{}, said:{}}, script:'', buddy:'mila'});")
    rep("    return m.find(v => /natural|premium|enhanced|google/i.test(v.name)) || m[0];", """    const best = l => l.find(v => /natural|premium|enhanced|google/i.test(v.name)) || l[0];
    const FEM = /female|samantha|victoria|allison|ava|susan|zira|jenny|aria|hazel|libby|sonia|kate|serena|martha|karen|catherine|matilda|natasha|tessa|moira|nicky|zoe|flo|sandy|shelley/i, MAL = /(^|[^e])male|\\bdaniel|alex\\b|fred|tom\\b|aaron|evan|nathan|david|mark\\b|guy\\b|ryan|george|oliver|arthur|thomas|lee\\b|gordon|william|james|eddy|reed|rocko/i;
    const want = window.W2S_BUDDY_GENDER, same = want ? m.filter(v => want === 'm' ? (MAL.test(v.name) && !/female/i.test(v.name)) : FEM.test(v.name)) : [];
    return same.length ? best(same) : best(m);""")
    rep("  function stop() { token++; clear();", "  function stop() { emit('speakend'); token++; clear();")
    rep("""  function speak(text, opts = {}) {
    stop();""", """  function speak(text, opts = {}) {
    stop();
    { const words = String(text).split(/\\s+/).filter(Boolean), ow = opts.onWord, oe = opts.onEnd;
      opts = Object.assign({}, opts, {onWord: i => { if (i >= 0) emit('word', {word: words[i] || '', i}); if (ow) ow(i); }, onEnd: () => { emit('speakend'); if (oe) oe(); }});
      emit('speak', {text: String(text)}); }""")
    rep("function setBtn(on) { $$('.listening').forEach(b => b.classList.remove('listening'));", "function setBtn(on) { emit('mic', {on: !!(on && cur)}); $$('.listening').forEach(b => b.classList.remove('listening'));")
    rep("  S.sent++; renderTally(); addXP(10);", "  emit(errs.length ? 'oops' : 'good');\n  S.sent++; renderTally(); addXP(10);")
    rep("$('#helpBtn').addEventListener('click', () => { if (S.hintLevel < 3) { S.hintLevel++;", "$('#helpBtn').addEventListener('click', () => { if (S.hintLevel < 3) { emit('help'); S.hintLevel++;")
    rep("  addXP(bonus); markActivity('speak:' + S.id); burstFrom(chat);", "  addXP(bonus); markActivity('speak:' + S.id); burstFrom(chat); emit('done', {bonus});")
    rep("$('#clearMsg').textContent = 'Cleared.';", "try { if (REC.db) { REC.db.close(); REC.db = null; } indexedDB.deleteDatabase('w2s-clips'); REC.urls = {}; REC.blobs = {}; renderRecs(); } catch (err) {} try { localStorage.removeItem('w2s.buddyMute'); localStorage.removeItem('w2s.buddyHidden'); } catch (err) {} $('#clearMsg').textContent = 'Cleared.';")
    rep("'This resets XP, streak, Sprint ticks and the log on this device.'", "'This resets XP, streak, Sprint ticks, your recordings and the log on this device.'")
    return s
