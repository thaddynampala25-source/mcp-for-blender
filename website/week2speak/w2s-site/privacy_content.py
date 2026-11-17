"""Privacy notice for week2speak.com. Plain HTML, written to match what the site and the tutoring actually do."""
UPDATED = '11 November 2026'
EMAIL = 'hello@week2speak.com'


import re


def _stack(html):
    """Label each cell with its column heading so tables can stack into cards on phones."""
    def one(m):
        t = m.group(0)
        heads = re.findall(r'<th>(.*?)</th>', t.split('</thead>')[0])
        def row(r):
            i = iter(heads[1:])
            return re.sub(r'<td>', lambda _: f'<td data-label="{next(i, "")}">', r.group(0))
        return t.replace('<div class="tbl">', '<div class="tbl stack">').split('</thead>')[0] + '</thead>' + re.sub(r'<tr>.*?</tr>', row, t.split('</thead>')[1], flags=re.S)
    return re.sub(r'<div class="tbl">.*?</table></div>', one, html, flags=re.S)


def privacy_page(owner=''):
    who = (f'Week2Speak is run by {owner}, a sole trader based in the United Kingdom. {owner} is the data controller for the personal data described here.'
           if owner else 'Week2Speak is run by a sole trader based in the United Kingdom, who is the data controller for the personal data described here.')
    return _stack(f'''<section class="light"><div class="wrap view">
<div class="vh"><h1>Privacy notice</h1><p>What personal data Week2Speak collects, why, who else handles it, how long we keep it, and the rights you have.</p></div>
<div class="prose">
<p class="updated">Last updated {UPDATED}</p>

<h2>Who we are</h2>
<p>{who} Contact us about anything in this notice at <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>

<h2>The short version</h2>
<ul>
<li>Practising on this website does not send your answers to us. Your progress is saved only in your own browser.</li>
<li>We only collect your name and contact details if you ask for a place, and we use them only to arrange it.</li>
<li>We record lessons only with your permission, and we ask separately before using any clip publicly. You can say no to both and still take part.</li>
<li>We do not sell your data, use advertising cookies, or track you across other websites.</li>
</ul>

<h2>What we collect and why</h2>
<div class="tbl"><table>
<thead><tr><th>What</th><th>When</th><th>Why we use it</th><th>Legal basis</th></tr></thead>
<tbody>
<tr><th scope="row">Practice progress: XP, streak, completed tasks, sentences you type or say, your chosen accent</th><td>When you use the practice rooms</td><td>To show your progress. It stays in your browser's storage and is not sent to us.</td><td>Not collected by us</td></tr>
<tr><th scope="row">"Before and after" recordings you make on the Sprint page</th><td>When you tap Record</td><td>So you can hear your own progress. They are saved only in your browser's storage and are not sent to us unless you choose to send the file to your tutor.</td><td>Not collected by us</td></tr>
<tr><th scope="row">Your voice, while the microphone is on</th><td>When you tap a microphone button</td><td>To turn your speech into text so the exercise can check it. Your browser does this (see "Who else handles your data").</td><td>Your choice to use the microphone; you can type instead</td></tr>
<tr><th scope="row">Name, WhatsApp number or email, level, goal, preferred accent</th><td>When you send the Join form</td><td>To contact you about a founding place and plan your first lesson</td><td>Steps you asked us to take before joining (contract)</td></tr>
<tr><th scope="row">Lesson notes, your voice notes and our replies, the errors you make</th><td>During the Sprint or programme</td><td>To teach you, give feedback and plan your lessons</td><td>Providing the service you signed up for (contract)</td></tr>
<tr><th scope="row">Recordings of your Day 1 and Day 7 talks and other lesson recordings</th><td>Only if you agree</td><td>So you and your tutor can hear your progress</td><td>Your consent</td></tr>
<tr><th scope="row">Clips of you used on our website or social media</th><td>Only if you agree separately, in writing</td><td>To show other learners what the programme does</td><td>Your separate consent</td></tr>
<tr><th scope="row">Payment details</th><td>If you buy a paid plan</td><td>To take payment. Our payment provider handles your card details; we never see your full card number.</td><td>Contract; keeping tax records (legal obligation)</td></tr>
<tr><th scope="row">Technical data: IP address, browser type, pages requested</th><td>Whenever you visit</td><td>Our host processes this to deliver the site and protect it from attacks</td><td>Legitimate interests in running a secure website</td></tr>
</tbody></table></div>

<h2>Recordings and clips</h2>
<p>Before your first lesson we ask two separate questions, and neither box is ticked for you:</p>
<ol>
<li>May we record your lessons so you and your tutor can hear your progress?</li>
<li>May we use short clips of you on our website or social media?</li>
</ol>
<p>You can agree to the first and not the second, or to neither. You can change your mind at any time by messaging your tutor or emailing <a href="mailto:{EMAIL}">{EMAIL}</a>. If you withdraw permission for public clips, we stop using them and remove the ones we control. We say "I'm recording now" at the start of every recorded part of a lesson.</p>

<h2>Cookies and browser storage</h2>
<p>This website does not set cookies and does not use analytics or advertising trackers. It saves your practice progress in your browser's local storage so it is still there when you come back. Recordings you make on the Sprint page are kept in the same way. That data stays on your device. You can delete it with the "Clear practice data on this device" button on the <a href="/tutor/">Tutor view</a> page, or by clearing site data in your browser settings.</p>

<h2>Who else handles your data</h2>
<p>We use a small number of providers. Each one handles your data only to provide its service to us.</p>
<div class="tbl"><table>
<thead><tr><th>Provider</th><th>What for</th><th>What it receives</th></tr></thead>
<tbody>
<tr><th scope="row">Cloudflare</th><td>Hosting this website and our domain</td><td>Technical data such as your IP address</td></tr>
<tr><th scope="row">Your browser's speech service (for example Google for Chrome, Apple for Safari)</th><td>Turning speech into text when you use a microphone button</td><td>The audio of what you say while the microphone is on. This is handled under your browser provider's own privacy terms.</td></tr>
<tr><th scope="row">Web3Forms</th><td>Delivering the Join form to our email</td><td>What you type in the form</td></tr>
<tr><th scope="row">WhatsApp (Meta)</th><td>Messages and voice-note homework</td><td>Your number, messages and voice notes</td></tr>
<tr><th scope="row">Google (Meet, Docs, Workspace)</th><td>Video lessons and your lesson notes document</td><td>Your name, video and audio during calls, and lesson notes</td></tr>
<tr><th scope="row">Stripe</th><td>Payments for paid plans</td><td>Your payment details and email</td></tr>
<tr><th scope="row">Cal.com</th><td>Booking lesson times</td><td>Your name, email and chosen time</td></tr>
</tbody></table></div>
<p>Some of these providers process data outside the UK and the European Economic Area, including in the United States. Where they do, they rely on legal safeguards such as standard contractual clauses or the UK-US data bridge. We store learner recordings on our own computer, not with a transcription service.</p>

<h2>How long we keep it</h2>
<ul>
<li><strong>Join requests</strong> from people who do not go on to join: 12 months, then deleted.</li>
<li><strong>Lesson notes, voice notes and recordings:</strong> while you are a learner, then 12 months after your last lesson, then deleted.</li>
<li><strong>Clips you agreed to publish:</strong> until you withdraw permission.</li>
<li><strong>Payment and tax records:</strong> as long as UK tax law requires, currently at least 5 years after the relevant tax return deadline.</li>
</ul>

<h2>Your rights</h2>
<p>Under UK and EU data protection law (UK GDPR and the GDPR) you can ask us to:</p>
<ul>
<li>give you a copy of the personal data we hold about you;</li>
<li>correct data that is wrong or incomplete;</li>
<li>delete your data;</li>
<li>restrict or object to how we use it;</li>
<li>give you your data in a format you can take elsewhere;</li>
<li>withdraw any consent you gave, at any time, without affecting what we did before.</li>
</ul>
<p>Learners in Mexico have the equivalent rights of access, rectification, cancellation and opposition under Mexico's Federal Law on the Protection of Personal Data Held by Private Parties. Learners in Colombia can know, update and correct their data and revoke their authorisation under Law 1581 of 2012.</p>
<p>To use any of these rights, email <a href="mailto:{EMAIL}">{EMAIL}</a>. We reply within one month. It is free.</p>

<h2>Complaints</h2>
<p>If you are unhappy with how we handle your data, please contact us first so we can put it right. You can also complain to a data protection authority:</p>
<ul>
<li>United Kingdom: the Information Commissioner's Office, <a href="https://ico.org.uk/make-a-complaint/" rel="noopener">ico.org.uk</a></li>
<li>Spain: the Agencia Española de Protección de Datos, <a href="https://www.aepd.es" rel="noopener">aepd.es</a></li>
<li>Colombia: the Superintendencia de Industria y Comercio, <a href="https://www.sic.gov.co" rel="noopener">sic.gov.co</a></li>
<li>Mexico: the federal authority responsible for personal data protection</li>
</ul>

<h2>Age</h2>
<p>Week2Speak is for adults aged 18 and over. We do not knowingly collect data from anyone younger.</p>

<h2>Changes to this notice</h2>
<p>If we change how we use your data, we update this page and the date at the top. If a change affects you as a learner, we tell you directly before it applies.</p>
</div></div></section>
''')
