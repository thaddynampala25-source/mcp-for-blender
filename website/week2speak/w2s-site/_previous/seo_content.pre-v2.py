"""Crawlable page content for the Week2Speak site: guides, FAQs, the mistakes guide and the about page.
Everything here is plain HTML, so search engines and AI crawlers can read it without running JavaScript."""
import json, html as H

D = json.load(open('/home/claude/w2s-site/data.json'))
UPDATED = '11 November 2026'
UPDATED_ISO = '2026-11-11'
e = H.escape

EXAMPLES = {
 'age': ("I have 25 years.", "I'm 25 years old."),
 'state': ("I have hungry.", "I'm hungry."),
 'agree': ("I am agree with you.", "I agree with you."),
 'people': ("People is very friendly here.", "People are very friendly here."),
 'subject': ("Is raining today.", "It's raining today."),
 'depend': ("It depends of the price.", "It depends on the price."),
 'explain': ("Can you explain me the problem?", "Can you explain the problem to me?"),
 'purpose': ("I came to London for learn English.", "I came to London to learn English."),
 'article': ("I saw her the last week.", "I saw her last week."),
 'compare': ("This one is more better.", "This one is better."),
 'make': ("I did a mistake.", "I made a mistake."),
 'married': ("She is married with a doctor.", "She is married to a doctor."),
 'want': ("I want that you come.", "I want you to come."),
 'negative': ("I don't know nothing about it.", "I don't know anything about it."),
 'since': ("I live here since 2020.", "I've lived here since 2020."),
 'gerund': ("I like play football.", "I like playing football."),
}
N = len(D['RULES'])
SLUG = {r['id']: r['id'] for r in D['RULES']}

def faq_html(items, title='Questions people ask'):
    out = [f'<h2>{e(title)}</h2>', '<div class="faq">']
    for q, a in items:
        out.append(f'<details><summary>{e(q)}</summary><p>{a}</p></details>')
    out.append('</div>')
    return '\n'.join(out)

def faq_ld(items):
    strip = lambda s: H.unescape(__import__('re').sub(r'<[^>]+>', '', s))
    return {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": strip(a)}} for q, a in items]}

def guide(inner):
    return f'<section class="guide light" aria-label="About this page"><div class="wrap prose">\n{inner}\n</div></section>\n'

# ---------------- FAQs ----------------
FAQ = {
 'home': [
  ("What is Week2Speak?", "Week2Speak is an English speaking programme for Spanish speakers. It combines a 7-day Sprint with a tutor who speaks Spanish, short daily lessons, and practice rooms for speaking out loud: Speech Mode, sentence games and shadowing."),
  ("Can you really speak English in 7 days?", "You will not be fluent in 7 days. The Sprint aims for something smaller and real: by Day 7 you can introduce yourself, order, ask questions and give a 2-minute talk in English without a script. Your Day 1 and Day 7 recordings show the change."),
  ("Who is Week2Speak for?", "Adults whose first language is Spanish who understand some English but freeze when they have to speak. If you have never studied English at all, the first week will feel fast."),
  ("How much does it cost?", "The founding cohort is free and has ten places. Prices for the paid plans are set before the public launch."),
  ("Do I need to download an app?", "No. Everything runs in the browser on your phone or computer. The microphone works in Chrome, Edge and Safari; in other browsers you can type your answers instead."),
  ("Which English accents can I learn?", "American, British and Australian. The voices come from your own device, so the accents you hear depend on the voices your phone or computer has installed."),
 ],
 'speak': [
  ("Do I need a microphone?", "It helps. In Chrome, Edge and Safari (including on iPhone and Android) you can answer out loud. In other browsers, say your answer out loud first and then type it."),
  ("Is the tutor in Speech Mode a real person?", "No. Speech Mode is scripted practice that runs on this site. Live lessons with a human tutor are part of the 7-Day Sprint."),
  ("What happens when I make a mistake?", "If your sentence contains a mistake that is common for Spanish speakers, such as \"I have 25 years\", you see a one-line fix with the reason it happens in Spanish."),
  ("Is Speech Mode free?", "Yes, while the site is in testing."),
  ("Who are the Language Buddies?", "Mila and Rio, two 3D characters in Speech Mode. They speak the tutor's lines, listen while you answer and react when you get a sentence right. You can switch between them, spin them and poke them."),
 ],
 'games': [
  ("Why do the games ask me to say the sentence?", "Tapping the right answer trains recognition. Saying the whole sentence trains speaking, which is the skill the Sprint is built around."),
  ("How long is a round?", "Eight sentences in Word Order, Fill the Gap and Flash Translate, and six word pairs in Sound Lab. Most rounds take three to five minutes."),
  ("What is Quick Answers?", "A listening and speaking game. You hear a question such as \"Where are you from?\" and answer out loud in a full sentence. The words stay hidden unless you ask to see them, so you practise understanding by ear."),
  ("What is Sound Lab?", "A listening game for the six sounds Spanish speakers find hardest in English, such as ship and sheep or think and sink. You hear one word, choose which one it was, then say it yourself."),
  ("Are the games part of the 7-Day Sprint?", "Yes. Every game has a pack for each day of the Sprint, built from the sentences in that day's lesson, and finishing a round ticks the task on your Sprint page."),
  ("Do I need to know grammar first?", "No. Fill the Gap explains each answer in one line after you choose, using the mistakes Spanish speakers make most."),
 ],
 'shadow': [
  ("What is shadowing in language learning?", "Shadowing means listening to a native speaker and repeating what they say almost at the same time, a beat behind them. It trains the rhythm, linking and stress of English."),
  ("Does shadowing improve your accent?", "It can help you hear and copy rhythm and linked sounds. Research on shadowing is still small: one study of 24 learners found it improved how well they heard linked sounds, while the gain in their own pronunciation was not statistically significant. Use it as daily practice, not as a guaranteed accent fix."),
  ("How long should I shadow each day?", "Five minutes is enough. Shadow one clip three times at Steady speed, then once at Natural speed in Solo mode."),
 ],
 'sprint': [
  ("Can you really learn to speak English in 7 days?", "You will not be fluent. You will have said hundreds of real sentences out loud, learned the phrases for six everyday situations, and given a 2-minute talk on Day 7. For learners who freeze when they speak, that first week is the hardest part."),
  ("How much time does the Sprint take each day?", "About 20 minutes, in three steps: learn (the lesson and the sound of the day), practise (a game and a spoken scene), and speak (a voice note of up to 60 seconds to your tutor)."),
  ("What are the two calls with the tutor?", "On Day 1, a 45-minute Kickoff call: your goals, a short recording of where you start, and five sentences about yourself. On Day 7, a 45-minute Showcase call: your 2-minute talk, your Day 1 and Day 7 recordings side by side, and a short live lesson."),
  ("What happens after the Sprint?", "If you want to keep going, you can join the 12-week programme with weekly lessons with the same tutor. There is no obligation."),
  ("What homework is there?", "No written homework. Each day has six short tasks on this site: a lesson, a sound game, a clip to shadow, a sentence game, a spoken scene, and one voice note to your tutor. The page ticks them off as you finish."),
  ("What if I miss a day?", "You can catch up the next day. The Sprint is about doing a little every day, not doing it perfectly."),
 ],
 'course': [
  ("Is the course free?", "Yes, while the site is in testing."),
  ("How long is each lesson?", "Twelve minutes or less. Each lesson has five key phrases, one mistake that comes from Spanish, and a practice task."),
  ("Do I need a teacher to use the course?", "No. You can work through the lessons alone. The 7-Day Sprint adds two live calls and daily feedback on your voice notes."),
 ],
 'join': [
  ("Who can join the founding cohort?", "Adults whose first language is Spanish and who want to speak English with more confidence. There are ten places."),
  ("What does it cost?", "Nothing. The founding cohort is free. In return, we ask for honest feedback on the programme."),
  ("Will I be recorded?", "Your Day 1 and Day 7 talks are recorded so you can hear your progress. We ask separately, in writing, before using any clip publicly, and you can say no."),
  ("What happens after I send my request?", "The tutor contacts you to arrange your Day 1 call."),
 ],
}

# ---------------- page guides ----------------
def sprint_table():
    rows = ''.join(f'<tr><th scope="row">Day {i + 1}</th><td>{e(d["title"])}</td><td>{e(d["goal"])}</td><td>{e("; ".join(d["tasks"]))}</td></tr>' for i, d in enumerate(D['DAYS']))
    return f'<div class="tbl"><table><thead><tr><th>Day</th><th>Theme</th><th>Goal</th><th>Practice</th></tr></thead><tbody>{rows}</tbody></table></div>'

def course_list():
    rule = {r['id']: r for r in D['RULES']}
    out = ['<ol class="lessons">']
    for i, (d, c) in enumerate(zip(D['DAYS'], D['COURSE'])):
        r = rule[c['rule']]
        out.append(f'<li><h3>Lesson {i + 1}: {e(d["title"])}</h3><p>{e(d["goal"])}</p><p><strong>Key phrases:</strong> {e(" / ".join(c["phr"]))}</p>'
                   f'<p><strong>Mistake from Spanish:</strong> <s>{e(c["bad"])}</s> → {e(c["good"])} {e(r["tip"])}</p></li>')
    out.append('</ol>')
    return '\n'.join(out)

GUIDES = {
 'speak': f'''<h2>How Speech Mode works</h2>
<p>Speech Mode is a speaking practice room. The tutor says a line from a real situation, you answer in a full English sentence, and the conversation moves on. Each answer earns XP, and mistakes that are common for Spanish speakers get a short fix.</p>
<p><strong>Language Buddies.</strong> Mila and Rio are two 3D characters who say the tutor's lines, with mouths that move as they speak. Switch between them with one button, drag to spin them, and tap them to see how they react.</p>
<ol><li><strong>Pick a scene:</strong> Meet someone new, Café order, Airport check-in, Chat about yesterday, Coffee chat: opinions or Job interview.</li><li><strong>Answer out loud</strong> with the microphone, or type if your browser has no speech recognition.</li><li><strong>Tap Help me</strong> if you freeze. The first tap gives you a sentence starter, the second a bank of useful words, the third a full sentence to say.</li></ol>
<p>Want a list of the mistakes it watches for? Read <a href="/common-mistakes/">{N} English mistakes Spanish speakers make</a>.</p>
{faq_html(FAQ["speak"])}''',
 'games': f'''<h2>Five games that end with you speaking</h2>
<p>Every game makes you build or hear English and then say it, so you practise speaking instead of only recognising answers. Each game has a pack for every day of the 7-Day Sprint, built from that day's lesson.</p>
<div class="tbl"><table><thead><tr><th>Game</th><th>How it works</th><th>Best for</th></tr></thead><tbody>
<tr><th scope="row">Word Order</th><td>Put shuffled word tiles in the right order, then say the sentence.</td><td>English word order, questions</td></tr>
<tr><th scope="row">Fill the Gap</th><td>Choose the missing word, then say the whole sentence. Each answer explains the rule in one line.</td><td>Mistakes that come from Spanish</td></tr>
<tr><th scope="row">Flash Translate</th><td>See a short sentence in Spanish and say it in English.</td><td>Thinking in English faster</td></tr>
<tr><th scope="row">Sound Lab</th><td>Hear one of two similar words, such as ship and sheep, choose the one you heard, then say it.</td><td>The six sounds Spanish speakers find hardest</td></tr>
<tr><th scope="row">Quick Answers</th><td>Hear a question, then answer out loud in a full sentence. No text unless you ask for it.</td><td>Understanding real questions and answering fast</td></tr>
</tbody></table></div>
{faq_html(FAQ["games"])}''',
 'shadow': f'''<h2>What is shadowing?</h2>
<p>Shadowing is a speaking exercise where you listen to a native speaker and repeat what they say almost at the same time, a beat behind them. It trains the rhythm, stress and linked sounds of English, which reading rules does not.</p>
<h2>How to shadow in three steps</h2>
<ol><li><strong>Listen.</strong> Play the clip and follow the words as they light up.</li><li><strong>Shadow.</strong> Speak along with the voice, a beat behind. Do it three times.</li><li><strong>Solo.</strong> The words light up at speaking pace with no voice, and you say the clip alone.</li></ol>
<p>There is a clip for every day of the 7-Day Sprint, from Introducing yourself to My talk, plus My script, where you type your own sentences and shadow them. Choose from three speeds and three accents: American, British and Australian.</p>
{faq_html(FAQ["shadow"])}
<p class="src">Source: <a href="https://journal.equinoxpub.com/ISLA/article/view/26864" rel="noopener">script-enhanced shadowing study, Instructed Second Language Acquisition</a>.</p>''',
 'sprint': f'''<h2>What the 7-Day Sprint is</h2>
<p>The 7-Day Sprint is a one-week English speaking programme for Spanish speakers. It has two 45-minute calls with a tutor, one on Day 1 and one on Day 7, and about 20 minutes of practice a day in between.</p>
<h2>The seven days</h2>
{sprint_table()}
<h2>Your daily routine</h2>
<ol><li><strong>Learn (7 minutes).</strong> The day's lesson from <a href="/course/">the course</a>, the sound of the day in Sound Lab, and a clip to <a href="/shadowing/">shadow</a> three times.</li><li><strong>Practise (10 minutes).</strong> One of <a href="/games/">the games</a> with the day's sentences, then a spoken scene in <a href="/speech-mode/">Speech Mode</a>.</li><li><strong>Speak (1 minute).</strong> A voice note of up to 60 seconds, with no reading. The tutor replies within 24 hours with one thing that worked, one fix and one sentence to say back.</li></ol>
<h2>Your before and after</h2>
<p>On Day 1 and again on Day 7 you read the same five sentences, the Sprint card, and record them on this page. The recordings stay on your device until you send them. On Day 7 you play the two side by side and hear what a week changed.</p>
{faq_html(FAQ["sprint"])}''',
 'course': f'''<h2>All seven lessons</h2>
<p>The course has seven short lessons, one for each day of the Sprint. Each lesson takes 12 minutes or less and covers five key phrases with their Spanish meaning, one mistake that comes from Spanish, and a voice note to send to your tutor.</p>
{course_list()}
{faq_html(FAQ["course"])}''',
 'join': f'''<h2>What you get in the founding cohort</h2>
<ul><li>The full 7-Day Sprint with a tutor who speaks Spanish.</li><li>Two 45-minute calls, on Day 1 and Day 7.</li><li>Daily feedback on your voice notes.</li><li>Your Day 1 and Day 7 talks recorded, so you can hear the difference.</li></ul>
{faq_html(FAQ["join"])}''',
}

def home_faq():
    return f'<section class="guide light" id="faq" aria-label="Questions"><div class="wrap prose">\n{faq_html(FAQ["home"])}\n<p><a href="/about/">How Week2Speak teaches</a> · <a href="/common-mistakes/">{N} English mistakes Spanish speakers make</a></p>\n</div></section>\n'

def week_cards():
    return ''.join(f'<article class="dcard{" last" if i == 6 else ""}"><div class="n num">{i + 1}</div><h3>{e(d["title"])}</h3><p>{e(d["goal"])}</p><ul>{"".join(f"<li>{e(t)}</li>" for t in d["tasks"])}</ul></article>' for i, d in enumerate(D['DAYS']))

# ---------------- mistakes guide ----------------
def mistakes_page():
    toc = ''.join(f'<li><a href="#{r["id"]}">{e(r["name"])}</a></li>' for r in D['RULES'])
    items = []
    for i, r in enumerate(D['RULES']):
        bad, good = EXAMPLES[r['id']]
        items.append(f'''<article class="mistake" id="{r["id"]}">
<h2>{i + 1}. {e(r["name"])}</h2>
<p class="pair"><span class="no"><s>{e(bad)}</s></span><span class="yes">{e(good)}</span></p>
<p>{e(r["tip"])} {e(r["es"])}</p>
</article>''')
    return f'''<section class="light"><div class="wrap view">
<div class="vh"><h1>{N} English mistakes Spanish speakers make</h1><p>Most mistakes Spanish speakers make in English are Spanish grammar carried across word for word. Here are the {N} we see most, each with the wrong sentence, the right one, and the Spanish pattern behind it.</p></div>
<div class="prose">
<p class="updated">Last updated {UPDATED}</p>
<nav aria-label="Mistakes in this guide"><ol class="toc">{toc}</ol></nav>
{"".join(items)}
<h2>How to stop making them</h2>
<p>Knowing the rule is not enough; the fix has to come out of your mouth without thinking. Say the correct sentence out loud five times, then use it in a real answer. <a href="/speech-mode/">Speech Mode</a> flags these mistakes as you answer, and <a href="/games/">Fill the Gap</a> drills them one by one.</p>
<p><a class="key hl big" href="/7-day-sprint/">Start the 7-Day Sprint</a></p>
</div></div></section>
'''

def mistakes_ld(site):
    return [{"@type": "Article", "headline": f"{N} English mistakes Spanish speakers make", "description": f"The {N} most common English mistakes Spanish speakers make, with the wrong sentence, the right one, and the Spanish pattern behind each.",
             "datePublished": UPDATED_ISO, "dateModified": UPDATED_ISO, "inLanguage": "en", "author": {"@id": site + "/#org"}, "publisher": {"@id": site + "/#org"},
             "mainEntityOfPage": site + "/common-mistakes/", "image": site + "/media/og.png"},
            {"@type": "ItemList", "name": "English mistakes Spanish speakers make", "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": r["name"], "url": f"{site}/common-mistakes/#{r['id']}"} for i, r in enumerate(D['RULES'])]}]

# ---------------- about page ----------------
def about_page():
    return f'''<section class="light"><div class="wrap view">
<div class="vh"><h1>How Week2Speak teaches English</h1><p>Week2Speak gets Spanish speakers saying real English sentences from the first day, with a tutor who speaks Spanish and short daily practice in between.</p></div>
<div class="prose">
<h2>Why we start with speaking</h2>
<p>Many Spanish speakers study English for years at school and still freeze when they have to speak. They have learned about English but have rarely produced it. Week2Speak reverses the order: you say a sentence first, then look at the grammar that came up in what you said.</p>
<h2>The method</h2>
<ul>
<li><strong>Speak from day one.</strong> On Day 1 you build five true sentences about yourself and say them out loud. Researchers such as Merrill Swain argue that producing language is what shows learners the gaps in what they know (<a href="https://en.wikipedia.org/wiki/Comprehensible_output" rel="noopener">comprehensible output</a>).</li>
<li><strong>Task first, grammar after.</strong> Each lesson and call starts with a real task, like ordering in a café, and corrections come from your own sentences. This follows task-based teaching (<a href="https://jalt-publications.org/tlt/articles/2333-task-based-learning-what-kind-adventure" rel="noopener">Willis's framework</a>).</li>
<li><strong>Little and often.</strong> Lessons are 12 minutes or less, and sentences you learned come back on later days. Reviews of the research find spaced repetition helps vocabulary stick (<a href="https://riset.unisma.ac.id/index.php/JREALL/article/view/25562" rel="noopener">systematic review, 2026</a>).</li>
<li><strong>Mistakes from Spanish, fixed in Spanish.</strong> The feedback targets the errors Spanish grammar causes, explained with the Spanish pattern behind them. See <a href="/common-mistakes/">the {N} most common</a>.</li>
</ul>
<h2>Who is behind Week2Speak</h2>
<p>Week2Speak was started by an English tutor who speaks Spanish, Portuguese and English, together with a partner who builds the practice tools. It is in testing, in English, with a free founding cohort of ten learners. A Spanish version of the site comes next.</p>
<p><a class="key hl big" href="/join/">Ask for a founding place</a></p>
</div></div></section>
'''

LLMS = '''# Week2Speak

> Week2Speak is an English speaking programme for adults whose first language is Spanish. It combines a 7-Day Sprint with a Spanish-speaking tutor, short daily lessons, and browser-based speaking practice: Speech Mode conversations, sentence and sound games, and shadowing in American, British and Australian accents.

Status: in testing (November 2026). The site is in English; a Spanish version is planned. The founding cohort is free and has ten places. Paid plan prices are set before the public launch.

## Main pages
- [7-Day Sprint]({site}/7-day-sprint/): two 45-minute tutor calls (Day 1 and Day 7), about 20 minutes of practice a day in six short tasks, daily voice-note feedback.
- [Course]({site}/course/): seven lessons of 12 minutes or less, each with five key phrases and one mistake that comes from Spanish.
- [Speech Mode]({site}/speech-mode/): scripted speaking practice in six scenes with a three-step hint system.
- [Games]({site}/games/): Word Order, Fill the Gap, Flash Translate, Sound Lab and Quick Answers, with a pack for each day of the Sprint.
- [Shadowing]({site}/shadowing/): a clip for each day plus your own script, three speeds, American, British and Australian accents.
- [16 English mistakes Spanish speakers make]({site}/common-mistakes/): each with the wrong sentence, the right one and the Spanish pattern behind it.
- [How we teach]({site}/about/): the method and the research behind it.
- [Join]({site}/join/): request a founding place.

## Facts
- Audience: Spanish-speaking adults who understand some English but freeze when speaking.
- Claim scope: the Sprint does not promise fluency in 7 days. It aims for a 2-minute unscripted talk on Day 7.
- Live AI tutor: not available to the public yet; Speech Mode on the site is scripted.
'''
