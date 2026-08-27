import {
  ConfigurationShape,
  BlockedKey,
  LimitKey,
  LimitMinutes,
  SnoozeKey,
  Today,
  UsageKey,
  PlatformConfiguration,
} from "@/utils/Config";

const hostnameAliases: Record<string, string> = {
  "x.com": "www.twitter.com",
  "www.x.com": "www.twitter.com",
  "twitter.com": "www.twitter.com",
  "m.twitch.tv": "www.twitch.tv",
  "m.youtube.com": "www.youtube.com",
  "pinterest.com": "www.pinterest.com",
};

// How often we credit time to the site in the focused tab. Short enough that a limit is
// enforced promptly, long enough not to write storage constantly.
const TICK_SECONDS = 15;

function configFor(url: string | undefined): PlatformConfiguration | undefined {
  if (!url) return undefined;
  try {
    const hostname = new URL(url).hostname;
    return ConfigurationShape[hostnameAliases[hostname] ?? hostname];
  } catch {
    return undefined;
  }
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === "install") {
      browser.tabs.create({ url: browser.runtime.getURL("/options.html") });
    }
  });

  async function updateBadge(tabId: number) {
    let tab: Browser.tabs.Tab;
    try {
      tab = await browser.tabs.get(tabId);
    } catch {
      return;
    }
    const config = configFor(tab.url);
    if (!config) {
      browser.action.setBadgeText({ text: "", tabId });
      return;
    }

    const [disabledVal, pausedVal, blockedVal] = await Promise.all([
      storage.getItem<string>(config.DisabledKey),
      storage.getItem<string>(config.PauseKey),
      storage.getItem<string>(BlockedKey(config.Platform)),
    ]);

    if (disabledVal === "true") {
      browser.action.setBadgeText({ text: "off", tabId });
      browser.action.setBadgeBackgroundColor({ color: "#585b70", tabId });
      return;
    }
    if (pausedVal === "true") {
      browser.action.setBadgeText({ text: "⏸", tabId });
      browser.action.setBadgeBackgroundColor({ color: "#585b70", tabId });
      return;
    }
    if (blockedVal === "true") {
      browser.action.setBadgeText({ text: "⛔", tabId });
      browser.action.setBadgeBackgroundColor({ color: "#585b70", tabId });
      return;
    }

    const values = await Promise.all(config.Keys.map((k) => storage.getItem<string>(k.Key)));
    const activeCount = values.filter((v, i) => v !== null && v !== config.Keys[i].Values[0]).length;

    if (activeCount > 0) {
      browser.action.setBadgeText({ text: String(activeCount), tabId });
      browser.action.setBadgeBackgroundColor({ color: "#cba6f7", tabId });
    } else {
      browser.action.setBadgeText({ text: "", tabId });
    }
  }

  // Only sites with a daily limit are timed, so nothing is written for sites you have not
  // put a limit on. The content script watches the usage key and shows the block screen.
  async function trackUsage() {
    let window: Browser.windows.Window;
    try {
      window = await browser.windows.getLastFocused();
    } catch {
      return;
    }
    if (!window.focused) return;

    const [tab] = await browser.tabs.query({ active: true, windowId: window.id });
    const config = configFor(tab?.url);
    if (!config) return;

    const limit = await storage.getItem<string>(LimitKey(config.Platform));
    if (LimitMinutes(limit) === 0) return;

    const [disabledVal, pausedVal, snooze] = await Promise.all([
      storage.getItem<string>(config.DisabledKey),
      storage.getItem<string>(config.PauseKey),
      storage.getItem<number>(SnoozeKey(config.Platform)),
    ]);
    if (disabledVal === "true") return;
    // A timed pause stores the timestamp it resumes at; either way the site is not filtered,
    // but it is still time spent on it, so only an explicit pause stops the clock.
    if (pausedVal === "true") return;
    if ((snooze ?? 0) > Date.now()) return;

    const key = UsageKey(config.Platform);
    const seconds = (await storage.getItem<number>(key)) ?? 0;
    await storage.setItem(key, seconds + TICK_SECONDS);
  }

  // Usage keys carry the date, so yesterday's are dead weight.
  async function pruneUsage() {
    const today = Today();
    const all = await browser.storage.local.get(null);
    const stale = Object.keys(all).filter((k) => /-usage-\d{4}-\d{2}-\d{2}$/.test(k) && !k.endsWith(today));
    if (stale.length > 0) await browser.storage.local.remove(stale);
  }

  pruneUsage();
  setInterval(trackUsage, TICK_SECONDS * 1000);
  setInterval(pruneUsage, 60 * 60 * 1000);

  browser.tabs.onActivated.addListener(({ tabId }) => updateBadge(tabId));
  browser.tabs.onUpdated.addListener((tabId, info) => {
    if (info.status === "complete") updateBadge(tabId);
  });
  browser.storage.onChanged.addListener(async (_changes, area) => {
    if (area !== "sync") return;
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) updateBadge(tab.id);
  });
});
