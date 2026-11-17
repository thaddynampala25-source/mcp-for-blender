# Week2Speak: notes for Claude Code

Read PROJECT_HANDOFF.md first. The short version:

- Edit sources in `w2s-site/` and `w2s-show/showcase.pre-sprint.html`. Never edit `w2s-site/dist/` or `w2s-show/showcase.html` by hand: both are generated.
- Build: `npm run build`. Serve: `npm run serve` (port 8765). Test: `npm test` and `npm run test:buddies` with the server running.
- The site must make no requests to other domains (the privacy notice promises it). Self-host every asset.
- Keep the internal Buddy ids `mila` (Ruby) and `rio` (Max) and the `w2s:*` window events.
- Keep the labels the Sprint decks and learner guide name: Next, Go, Help me, Record, Send it, Speech Mode, and the scene names.
- Stop and ask before deleting files, adding dependencies other than three.js loaders, changing the privacy notice, or removing a page or feature.
