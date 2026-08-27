# CLAUDE.md — sift

## The Project
Browser extension that hides algorithmic feeds and distracting content on social media.
Fork of [Feedless](https://github.com/ZMensRain/Feedless). Firefox is the primary target (MV2).

Stack: [WXT](https://wxt.dev) · Solid · Tailwind v4 · SCSS · pnpm · TypeScript.

```sh
pnpm i               # postinstall runs `wxt prepare` — generates .wxt/, required before tsc works
pnpm compile         # tsc --noEmit — the only automated check in this repo
pnpm dev:firefox     # live-reload dev build
pnpm zip:firefox     # .output/sift-{version}-firefox.zip
```

There are no tests and no linter. "Verify" means `pnpm compile` plus loading the build in the
browser (`about:debugging` → Load Temporary Add-on → any file in `.output/firefox-mv2/`).
Don't invent a test suite to satisfy Goal-Driven Execution below — state the manual check instead.

## How Filtering Works
Almost everything is CSS. Do not reach for JS first.

`Config()` (utils/Config.ts) reads each storage key and mirrors its value onto `:root` as an
attribute, stripping the `sync:` prefix. SCSS then gates on that attribute:

```scss
:root:not([sift-paused="true"])[youtube-hide-explore="true"] { ... }
```

Supporting attributes: `AddPath()` → `page-path`, `AddParams()` → `page-params`,
`sift-paused` → set whenever Sift is off on the site, `sift-ready` → set once Config() has
read storage.

`sift-paused` is the single "Sift is off here" attribute: both Pause and the per-site disable
set it, so the 13 SCSS files gate on one thing. `sift-disabled` is set alongside it for the
popup and badge, and nothing in CSS reads it.

JS effects must call `IsActive()` first — redirects, clicks and scroll blockers have no CSS
gate, so without it they run while paused and before storage has been read.

Use JS only when CSS genuinely can't do it — redirects, marking elements the selector can't
reach (`data-sift-hide` in twitch.content), scroll blocking. When you do, still hide via CSS
(`[data-sift-hide="true"] { display: none !important; }`); inline styles lose to the site's own
`!important` rules.

## Conventions
- **Auto-imports.** WXT injects `defineContentScript`, `defineBackground`, `storage`, `browser`,
  everything in `utils/`, and the Solid primitives. Don't add explicit imports for those — only
  `@/`-aliased imports the auto-import doesn't cover (e.g. `ConfigurationShape` in background.ts).
- **Storage keys** are `sync:{platform}-{thing}`. `Values[0]` is both the default and the most
  restrictive value; the badge counts keys whose stored value differs from `Values[0]`.
- **Formatting is mixed** — newer files (Config.ts, ShadowRoot.ts, twitch, reddit) use tabs,
  older ones 2 spaces. Match the file you're in, not the repo.
- **utils/Config.ts ordering matters.** The helpers must stay declared above `ConfigurationShape`
  or the bundled background script hits a TDZ error. Don't reorder.
- **Colors** come from the `@theme` tokens in assets/tailwind.css (Catppuccin). Use the tokens.

## UI
Popup and options page share `components/ui.ts` — button, heading, field and muted-text class
strings. Reach for those rather than hand-rolling another button; that file is what keeps the
two surfaces looking like one product.

Option names are Title Case, including the ones `feedKeys()` generates.

## Site Controls
Every platform gets the same four site-level keys from `siteKeys()` in utils/Config.ts:
`-disabled`, `-blocked`, `-daily-limit`, `-force-dark`. They live in `SiteKeys`, separate from
the filtering `Keys`, and the per-section Reset deliberately ignores them — resetting filters
must not silently unblock a site.

`initSiteControls()` in utils/Config.ts is the one place these combine: it owns the storage
watches, decides whether the site is off / blocked, and drives `Blocker.ts` and `DarkMode.ts`.
Add site-level behaviour there, not in a content script.

The daily limit is counted in the background (15s ticks, focused window's active tab only,
and only for sites that actually have a limit). Usage is a `local:` key carrying the local
date; the content script re-points its watch at local midnight, so a tab left open overnight
does not stay blocked on yesterday's total.

## Adding a Platform
1. Entry in `ConfigurationShape` (utils/Config.ts) via `platformConfig(slug, name, keys)`,
   **keyed by the exact hostname** the popup will see from `new URL(tab.url).hostname`. The
   slug is what every storage key is built from.
2. `entrypoints/{name}.content/index.ts` + `{name}.scss`, with `runAt: "document_start"`.
3. `matches` in the content script.
4. If the site has alternate hostnames (m.*, x.com), add them to `hostnameAliases` — which
   exists **twice**, in `entrypoints/background.ts` and `entrypoints/popup/main.tsx`. Keep both
   in sync; they have drifted before.

A missing alias is silent: the content script still filters the page, but the popup and the
badge show nothing, because both look the hostname up in `ConfigurationShape` directly.

## Release
Push to `main` → `.github/workflows/latest-release.yml` builds both browsers and overwrites the
`latest` GitHub release. Bump `version` in package.json; it feeds the manifest and
`VITE_APP_VERSION`.


## Think Before Coding
Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so.
- Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## Simplicity First
Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.
- Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## Surgical Changes
Touch only what you must. Clean up only your own mess.

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## Goal-Driven Execution
Define success criteria. Loop until verified.

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"

For multi-step tasks, state a brief plan:
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

These guidelines are working if: fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
