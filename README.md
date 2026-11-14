# wBlock Userscripts

Standalone userscripts maintained for wBlock. The raw `main` branch is the update channel.

## Packages

- `packages/tube-cleaner`: native YouTube controls and playback features, plus this fork's saved default playback speed and auto-next pills.

## Fork additions (hnhonnguyen)

This fork of Tube Cleaner adds two toolbar pills on YouTube watch pages:

- **Speed pill** (`1x`): choose a playback rate; it is saved and applied to every video.
- **Auto next pill** (`Auto next`): advances to the next video when playback ends. On by default; click to toggle.
- **Prev / Next pills**: jump to the previous or next video. Previous prefers YouTube's playlist button, then falls back to the videos watched in this tab.
- **Smart controls**: the full toolbar stays collapsed behind a small `⋯` handle. Tap the video or the handle to open it; it fades back after a few seconds, including when paused. On desktop it no longer opens just from moving the mouse. iPhone uses one compact row (`quality`, `speed`, `‹`, `›`, `SB`); Auto next now lives as a checkbox in the SB panel.

The fork declares `@grant none` on purpose. wBlock injects userscripts that request GM storage into the content world unless they are the upstream Tube Cleaner URL, and background playback needs the page world. SponsorBlock preferences fall back to `localStorage`. If you use wBlock, disable the built-in Tube Cleaner rather than deleting it; wBlock re-adds missing built-ins.

Install this fork from:

- `https://raw.githubusercontent.com/hnhonnguyen/wBlock-userscripts/main/packages/tube-cleaner/dist/tube-cleaner.user.js`

- `packages/player-cleaner`: native controls for custom web players.
- `packages/dearrow` replaces YouTube titles and thumbnails with community suggestions.
- `packages/dark-reader`: Dark Reader's MIT-licensed API engine for wBlock, without the full site-fix database.

Each package has editable `src/`, tracked generated `dist/`, and stable install metadata. Install from:

- `https://raw.githubusercontent.com/hnhonnguyen/wBlock-userscripts/main/packages/tube-cleaner/dist/tube-cleaner.user.js`
- `https://raw.githubusercontent.com/0xCUB3/wBlock-userscripts/main/packages/player-cleaner/dist/player-cleaner.user.js`
- `https://raw.githubusercontent.com/0xCUB3/wBlock-userscripts/main/packages/dark-reader/dist/dark-reader.user.js`
- `https://raw.githubusercontent.com/0xCUB3/wBlock-userscripts/main/packages/dearrow/dist/dearrow.user.js`

DeArrow runs independently of Tube Cleaner and uses community data from https://dearrow.ajay.app/ under CC BY-NC-SA 4.0.

## Development and release

```sh
npm install
npm run build
npm run check
npm test
```

Playwright WebKit is required for the cleaner harness (`npx playwright install webkit`). Bump the source metadata version for every release, then build and check. `dist/*.meta.js` files contain exactly the userscript metadata and are the update manifests. Do not edit generated files by hand. A release is published by pushing `main` to `origin`; raw `main` is intentionally the update channel.
