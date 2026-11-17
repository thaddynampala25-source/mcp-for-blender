# Week2Speak phone audit

Audited 16 November 2026 on the local build, in headless Chromium, at 360x640, 390x844 and 1440x900.
Baseline screenshots and measurements: `audit/before/`. After the fixes: `audit/after/`.
Every number below comes from `audit/before/metrics.json`, `audit/before/extra.json`, `audit/after/metrics.json`, `audit/after/extra.json` or `audit/after/speech-states.json`.

Severity: **P0** blocks a flow or breaks on a phone. **P1** clearly hurts a phone user. **P2** polish.

## Findings

| # | Finding | Page | Evidence | Sev | Fix | Status |
|---|---|---|---|---|---|---|
| 1 | The reply box sat far below the first screen. A learner had to scroll past the heading, scene list, accent list and tally before they could answer. | Speech Mode | Before: reply box top at 1968px on a 640px screen (3.1 screens down), 1755px at 390x844. After: 564px and 768px, always on screen. `audit/before/speech-mode-p360.png`, `audit/after/speech-1-landing-360x640.png` | P0 | Speech Mode rebuilt as one screen: stage, subtitle, pinned reply bar | Fixed: `buddy_block.py`, `sitebuild.py` |
| 2 | The tutor's line, the correction and the reply box could not be seen together, and the Buddy scrolled off screen while the learner replied (its rendering paused). | Speech Mode | Before: chat-to-reply-box span 508px plus a 210px stage above it on a 640px screen | P0 | Subtitle and correction card sit over the lower stage, above the reply bar | Fixed: `buddy_block.py` |
| 3 | The tutor's first line could not be heard on a phone: browsers only allow speech after a tap, and the page tried to speak on load. | Speech Mode | App called `Voice.speak` in `startMission` at page load | P0 | "Start talking" button; the first line is spoken after that tap | Fixed: `apply_more.py`, `buddy_block.py` |
| 4 | The header took 91px of a 640px screen (14%) on every page. | All | Before: `.nav` 91px at 360 and 92px at 390 | P1 | One row of 48px on Speech Mode; other pages keep the two-row header | Fixed for Speech Mode: `buddy_block.py`. Other pages unchanged by design |
| 5 | Header tabs were 64x34px and their labels 12.8px. | All | Before: 5 tabs at 64x34, text 12.8px | P1 | Tabs are 40px tall with a 46px hit area, text 14px. Logo and Join button reach 44px and 46px | Fixed: `extra.css` |
| 6 | Choice chips, mode buttons and word-bank buttons were under 44px tall. | Speech Mode, Games, Shadowing, Course | Before: 14 to 20 small targets per page on the first three screens. After: only the header items (40px, hit area 46px) and the Sprint tick boxes remain | P1 | 44px minimum | Fixed: `extra.css` |
| 7 | The home page scrolled sideways by 1px at 360px. | Home | Before: `scrollWidth` 361. Cause: a tilted card (`.toy`) measured 361.06px. After: 360 | P1 | The home section clips sideways overflow | Fixed: `extra.css` |
| 8 | Intro text on the blue bands just missed the contrast minimum, and so did the green "right sentence" chips. | All rooms, Common mistakes | Before: 4.48:1 and 4.38:1 against a 4.5:1 minimum. After: no failures in the sampled text | P1 | Lighter intro text, darker green | Fixed: `extra.css` |
| 9 | On a 640px screen the heading and intro filled most of the first screen, so the first control started late. | Games, Shadowing, Sprint, Course, Join | First main action, before to after: Games 1145 to 1033px, Sprint 641 to 562px, Course 1047 to 942px, Join 1066 to 1005px | P1 | Compact heading band on phones | Fixed: `extra.css` |
| 10 | In the shadowing studio the Play button came after the clip list, accent and speed choices. | Shadowing | Before: Play at 1543px (2.4 screens). After: 667px | P1 | On phones the player comes first; the choices follow | Fixed: `extra.css` |
| 11 | Small text in the rooms: tags, tally labels, the Buddy caption. | Speech Mode, Games, Sprint, Tutor | Before: 5 to 12 items under 14px per page (11.5 to 13.8px). After: 0, except a 9.2px line inside the home page's demo film | P1 | 14px minimum | Fixed: `extra.css`, `buddy_block.py` |
| 12 | Frame rate on a phone had never been measured and nothing lowered the quality on a slow device. | Speech Mode | No readout or fallback in the old runtime | P1 | `?fps=1` readout; quality steps down (pixel ratio 2, 1.5, 1, then shadows off) after two seconds under 40 fps | Fixed: `buddies.js`. Shown stepping 0 to 3 in `audit/after/buddy-test/result.json` |
| 13 | The second Buddy would have been downloaded in the background for everyone (about 0.9 MB). | Speech Mode | Found while measuring page weight | P1 | The other Buddy downloads only when the learner switches | Fixed: `buddies.js` |
| 14 | Messages such as "Try a full sentence" only appeared in the conversation list. | Speech Mode | In the new layout the list lives in the bottom sheet | P1 | Shown as a card over the stage for six seconds | Fixed: `buddy_block.py` |
| 15 | The third Help me label, "That is all the help", did not fit a chip. | Speech Mode | 20 characters in an 88px chip | P1 | Label is now "That is all" | Fixed: `apply_more.py` |
| 16 | Sprint tick boxes are 22x22px. | Sprint | `audit/after/metrics.json`: `k1_1 22x22` | P2 | Larger tap area round each tick | Left |
| 17 | The Sprint page is 9849px tall on a phone with 35 "Go" buttons; only today's tasks matter. | Sprint | `audit/after/7-day-sprint-p360.png`, page height in metrics | P2 | Collapse other days by default | Left |
| 18 | The home page is 9151px tall and the try-it game starts five screens down. | Home | Game at 3281px on a 844px screen | P2 | Move the game higher | Left |
| 19 | In a narrow desktop window with a classic scrollbar, Sprint, Course and Tutor view jump when the scrollbar appears. Phones are not affected. | Sprint, Course, Tutor | Layout shift 0.29 to 0.37 in a 360px desktop window, 0 in phone emulation | P2 | Reserve the scrollbar gutter | Left |
| 20 | Tutor view and the privacy notice have no next step on the first screens. | Tutor, Privacy | First call to action: none | P2 | Add a link back to practice | Left |
| 21 | The WhatsApp field's example number looks like a filled-in value. | Join | `audit/before/join-p360.png` | P2 | Lighter placeholder | Left |
| 22 | Words a beginner may not know: "XP", "Scripted practice", "Solo". | All rooms | Read from the screenshots | P2 | Add a short Spanish gloss | Left |
| 23 | With the keyboard open and Help me open, the hint covers the lower half of the Buddy's face. | Speech Mode | `audit/after/speech-8-keyboard-open-360x640.png` shows the keyboard state without the hint; with it the stage is 226px tall | P2 | Accepted: the starter sentence matters more while typing | Left |

No console errors on any page before or after (`audit/before/metrics.json`, `audit/after/metrics.json`). No requests to other domains (`audit/after/buddy-test/result.json`).

## Flows on a 390px phone

Counted on the baseline build with `audit/flows.cjs`, except where marked.

| Flow | Before | After |
|---|---|---|
| Home to first spoken sentence | 2 taps (Start the 7-Day Sprint, Next: Lesson 1) then the lesson's Hear and "I said it" buttons: 4 taps, about 2 screens of scrolling | Same taps, less scrolling (finding 9) |
| A full Speech Mode scene (Café order, 5 replies) | 2.1 screens of scrolling first, then 10 taps typing or 5 with the mic | 1 tap (Start talking), then 5 taps with the mic or 10 typing. No scrolling |
| One round of a game | Check button at 1146px (1.4 screens down), one tap per word, then Check. Counted from the controls on the page, not walked by script | Check button at 1010px (was 1146px), same taps |
| Shadow one clip | Play at 1412px (1.7 screens down), 1 tap | Play at 611px (on the first screen), 1 tap |
| One Sprint day | Next button at 619px, then one "Go" per task (6 tasks, each opens another page). Counted from the controls on the page, not walked by script | Next button at 515px, same taps |
| Join form | 1 required field, submit at 1022px (1.2 screens) | Submit at 960px |

## How other apps lay out an avatar conversation

Done directly; the `/competitor-teardown` skill was not available in this session. Sources were opened and read on 16 November 2026. Anything they did not state is marked [unverified].

| App | Avatar | Reply control | Subtitles and hints | Keyboard |
|---|---|---|---|---|
| Speak (Free Talk, immersive roleplay) | Character scene fills the screen [unverified] | Mic with a "pulsing mic ring" and live transcription; you "tap to send the sentence"; you can "tap or speak anytime to cut in" | Hints are "on-demand"; corrections "appear after you speak" with a Retry; translation on tap. Source: help.speak.com | Typing not described [unverified] |
| Duolingo Video Call | Lily on a call screen, accept with a green button; full-screen character [unverified] | Voice, back and forth | Transcript used after the call; live subtitles [unverified]. Source: blog.duolingo.com | No keyboard [unverified] |
| Praktika | "A full-screen video feed of an AI avatar" with text over it | "A central voice input button" over a bottom control bar; a text field on some screens | Captions are a toggle in the bottom controls; a "suggestion card" beside the greeting; word tap opens a bottom sheet. Source: screensdesign.com | "A text input field, and a system keyboard" on chat screens; layout change [unverified] |
| Loora | "A portrait of the AI tutor", not full screen | "A bottom Hold to talk microphone button", "a pulsing listening button at the bottom" | Chat bubbles; an inline "grammar correction tip"; feedback in a modal. Source: screensdesign.com | "A bottom text input field with a send button" on one screen |
| ELSA | [unverified] | [unverified] | [unverified] | [unverified]. No source describing its role-play screen could be opened |

## Five design rules for Speech Mode

1. **The reply control is always at the bottom and never scrolls.** Every app with a confirmed layout puts the mic at the bottom of the screen. Ours is a 64px mic in a 76px bar.
2. **The mic leads, typing follows.** Voice is the main control and a text field is the fallback. Where the browser has no speech recognition, the text field takes the mic's place.
3. **The character is the screen and words sit over it.** Subtitles, hints and corrections are cards over the lower stage, never a separate page. The face stays clear of them.
4. **Help and corrections arrive in the flow, on request or after the learner speaks, and never block the next turn.** One tap opens a hint; a correction shows after the reply and the scene carries on.
5. **Settings live one tap away in a sheet.** Scene, accent, tally and history stay off the main screen, as Praktika does with word look-ups and speed controls.
