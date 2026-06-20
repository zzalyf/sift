import { ConfigurationShape } from "@/utils/Config";

const hostnameAliases: Record<string, string> = {
  "x.com": "www.twitter.com",
  "www.x.com": "www.twitter.com",
  "twitter.com": "www.twitter.com",
};

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === "install") {
      browser.tabs.create({ url: browser.runtime.getURL("/options.html") });
    }
  });

  async function updateBadge(tabId: number) {
    let tab: browser.tabs.Tab;
    try {
      tab = await browser.tabs.get(tabId);
    } catch {
      return;
    }
    if (!tab.url) {
      browser.action.setBadgeText({ text: "", tabId });
      return;
    }
    let hostname: string;
    try {
      hostname = new URL(tab.url).hostname;
    } catch {
      browser.action.setBadgeText({ text: "", tabId });
      return;
    }
    const key = hostnameAliases[hostname] ?? hostname;
    const config = ConfigurationShape[key];
    if (!config) {
      browser.action.setBadgeText({ text: "", tabId });
      return;
    }

    const pausedVal = await storage.getItem<string>(config.PauseKey);
    if (pausedVal === "true") {
      browser.action.setBadgeText({ text: "⏸", tabId });
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
