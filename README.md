# Sift

A Firefox browser extension (forked from [Feedless](https://github.com/ZMensRain/Feedless)) that lets you hide algorithmic feeds and distracting content on social media, while keeping the features you actually use.

## Features

- Hide "For You" / algorithmic feeds independently from "Following" feeds on Twitter/X and Instagram
- Hide explore/discovery feeds while keeping search functional
- Hide shortform content (Reels, Shorts, TikToks)
- Hide sidebar clutter (Grok, trending, who to follow, etc.)
- Site-aware popup: click the extension on a supported site to see only that site's settings
- Firefox Android support

## Supported Platforms

- YouTube & YouTube Music
- Twitter/X
- Instagram
- TikTok
- Reddit
- LinkedIn
- Facebook
- Bluesky
- Pinterest
- Substack

## Config keys

### Shortform content

**`{platform}-shortform`** — one of:

- **`block`** — blocks shortform pages and hides shortform from the UI
- **`hide`** — hides shortform from the UI but allows watching when shared directly
- **`show`** — no change

### Feeds

**`{platform}-hide-feed`** — `"true"` / `"false"` — hides the main (Following/chronological) feed

**`{platform}-hide-for-you-feed`** — `"true"` / `"false"` — hides the algorithmic For You feed (Twitter/X and Instagram)

**`{platform}-hide-{feedtype}-feed`** — `"true"` / `"false"` — hides a specific feed type (explore, trending, etc.)

> Default for all options is the most restrictive value.

## Building

```sh
pnpm i
pnpm build:firefox   # development build → .output/firefox-mv2/
pnpm zip:firefox     # production zip
```

Load the extension in Firefox via `about:debugging` → Load Temporary Add-on → select any file inside `.output/firefox-mv2/`. Click **Reload** there after each build.
