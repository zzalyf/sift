# Sift

A Firefox browser extension (forked from [Feedless](https://github.com/ZMensRain/Feedless)) that lets you hide algorithmic feeds and distracting content on social media, while keeping the features you actually use.

*"Boredom is the birthplace of ideas."*

## Features

- Hide "For You" / algorithmic feeds independently from "Following" feeds
- Hide explore/discovery feeds while keeping search functional
- Hide shortform content (Reels, Shorts, TikToks)
- Hide sidebar clutter (Grok, trending, who to follow, recommendations, etc.)
- Site-aware popup: click the extension icon on any supported site to see only that site's settings
- Pause / Pause for 10 minutes — temporarily disable filtering per site
- Export/import settings as JSON
- Firefox Android support (tested on m.twitch.tv and mobile web)

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
- **Twitch** (www.twitch.tv + m.twitch.tv)
  - Redirects home to Following on desktop and mobile
  - Hides Live Channels, Recommended Categories, Viewers Also Watch sidebar sections
  - Hides Open App prompt and Go Ad-Free upsell

## Config keys

### Shortform content

**`{platform}-shortform`** — one of:

- **`block`** — blocks shortform pages and hides shortform from the UI
- **`hide`** — hides shortform from the UI but allows watching when shared directly
- **`show`** — no change

### Feeds

**`{platform}-hide-feed`** — `"true"` / `"false"` — hides the main (Following/chronological) feed

**`{platform}-hide-for-you-feed`** — `"true"` / `"false"` — hides the algorithmic For You feed

**`{platform}-hide-{feedtype}-feed`** — `"true"` / `"false"` — hides a specific feed type (explore, trending, etc.)

**`{platform}-paused`** — `"true"` / `"false"` / Unix timestamp — pauses all filtering for that site; a timestamp value auto-resumes at that time

> Default for all options is the most restrictive value.

## Building

```sh
pnpm i
pnpm build:firefox   # development build → .output/firefox-mv2/
pnpm zip:firefox     # production zip → .output/sift-{version}-firefox.zip
```

Load the extension in Firefox via `about:debugging` → Load Temporary Add-on → select any file inside `.output/firefox-mv2/`. Click **Reload** there after each build.

### Firefox Android

Transfer the `.zip` file to the device and install via Firefox for Android (Settings → Add-ons → Install from file). For remote debugging, use ADB over WiFi:

```sh
adb pair <ip>:<pair-port> <code>   # from Developer Options → Wireless debugging → Pair device
adb connect <ip>:<port>
```

Then open `about:debugging` on desktop Firefox and connect to the device.
