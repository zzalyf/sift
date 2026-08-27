import { ApplyDarkMode } from "./DarkMode";
import { HideBlockScreen, ShowBlockScreen } from "./Blocker";

export default async function Config(config: PlatformConfiguration, onUpdate?: (key: string, value: string) => void) {
	try {
		return await fromStorage(config, onUpdate);
	} catch (error) {
		return fromDefaults(config, onUpdate);
	}
}

async function fromStorage(config: PlatformConfiguration, onUpdate?: (key: string, value: string) => void) {
	const siteUnwatch = initSiteControls(config);

	let unWatches = config.Keys.map(async (key) => {
		let value = await storage.getItem<string>(key.Key);
		update(key.Key, value ?? key.Values[0]);
		onUpdate?.(key.Key, value ?? key.Values[0]);
		return storage.watch<string>(key.Key, (v) => {
			const value = v ?? "true";
			onUpdate?.(key.Key, value);
			update(key.Key, value);
		});
	});

	// Content scripts act on the page from document_start; IsActive() holds them back until
	// this resolves, so nothing runs against a state we have not read yet.
	await Promise.all([...unWatches, siteUnwatch]);
	setReady();

	return {
		unwatch: () => {
			siteUnwatch.then((fn) => fn());
			unWatches.forEach(async (unwatch) => (await unwatch)());
		},
	};
}

// Pause, per-site disable, blocking, the daily limit and forced dark mode all feed off each
// other (disabling a site must also drop its block screen), so they share one state object
// and one apply().
async function initSiteControls(config: PlatformConfiguration) {
	const platform = config.Platform;
	const keys = {
		disabled: config.DisabledKey,
		pause: config.PauseKey,
		blocked: BlockedKey(platform),
		limit: LimitKey(platform),
		snooze: SnoozeKey(platform),
		dark: DarkKey(platform),
	};

	const state = {
		disabled: false,
		pause: null as string | null,
		blocked: false,
		limit: "off",
		usage: 0,
		snooze: 0,
		dark: false,
	};

	let wake: ReturnType<typeof setTimeout> | null = null;
	let lastDark: boolean | null = null;

	function apply() {
		if (wake) clearTimeout(wake);
		wake = null;

		const paused = pauseActive(keys.pause, state.pause);
		const off = state.disabled || paused;
		setAttribute("sift-disabled", state.disabled);
		setAttribute("sift-paused", off);

		const dark = state.dark && !off;
		if (dark !== lastDark) {
			lastDark = dark;
			ApplyDarkMode(dark, platform);
		}

		const limitSeconds = LimitMinutes(state.limit) * 60;
		const overLimit = limitSeconds > 0 && state.usage >= limitSeconds;
		const snoozedFor = state.snooze - Date.now();
		const blocked = !off && snoozedFor <= 0 && (state.blocked || overLimit);

		if (blocked) {
			ShowBlockScreen({
				title: state.blocked ? "Site blocked" : "Daily limit reached",
				detail: state.blocked
					? `${config.HumanName} is blocked in Sift.`
					: `${Math.round(state.usage / 60)}m on ${config.HumanName} today.`,
				onSnooze: () => storage.setItem(keys.snooze, Date.now() + 15 * 60 * 1000),
			});
		} else {
			HideBlockScreen();
		}

		// Re-evaluate when a snooze or a timed pause runs out.
		const next = [snoozedFor, pauseRemaining(state.pause)].filter((ms) => ms > 0);
		if (next.length > 0) wake = setTimeout(apply, Math.min(...next) + 500);
	}

	// The usage key carries today's date, so the watch has to move at local midnight.
	let usageUnwatch: (() => void) | null = null;
	let midnight: ReturnType<typeof setTimeout> | null = null;

	async function watchUsage() {
		usageUnwatch?.();
		const key = UsageKey(platform);
		state.usage = (await storage.getItem<number>(key)) ?? 0;
		usageUnwatch = storage.watch<number>(key, (v) => {
			state.usage = v ?? 0;
			apply();
		});
		apply();

		const tomorrow = new Date();
		tomorrow.setHours(24, 0, 5, 0);
		if (midnight) clearTimeout(midnight);
		midnight = setTimeout(watchUsage, tomorrow.getTime() - Date.now());
	}

	const [disabled, pause, blocked, limit, snooze, dark] = await Promise.all([
		storage.getItem<string>(keys.disabled),
		storage.getItem<string>(keys.pause),
		storage.getItem<string>(keys.blocked),
		storage.getItem<string>(keys.limit),
		storage.getItem<number>(keys.snooze),
		storage.getItem<string>(keys.dark),
	]);
	state.disabled = disabled === "true";
	state.pause = pause;
	state.blocked = blocked === "true";
	state.limit = limit ?? "off";
	state.snooze = snooze ?? 0;
	state.dark = dark === "true";
	await watchUsage();

	const unwatches = [
		storage.watch<string>(keys.disabled, (v) => { state.disabled = v === "true"; apply(); }),
		storage.watch<string>(keys.pause, (v) => { state.pause = v; apply(); }),
		storage.watch<string>(keys.blocked, (v) => { state.blocked = v === "true"; apply(); }),
		storage.watch<string>(keys.limit, (v) => { state.limit = v ?? "off"; apply(); }),
		storage.watch<number>(keys.snooze, (v) => { state.snooze = v ?? 0; apply(); }),
		storage.watch<string>(keys.dark, (v) => { state.dark = v === "true"; apply(); }),
	];

	return () => {
		if (wake) clearTimeout(wake);
		if (midnight) clearTimeout(midnight);
		usageUnwatch?.();
		unwatches.forEach((unwatch) => unwatch());
	};
}

// "true", "false", or a timestamp to resume at. Expired timestamps are written back so the
// popup and the badge do not have to know about the timestamp form.
function pauseActive(key: StorageItemKey, val: string | null) {
	if (!val || val === "false") return false;
	if (val === "true") return true;
	if (pauseRemaining(val) > 0) return true;
	storage.setItem(key, "false");
	return false;
}

function pauseRemaining(val: string | null) {
	if (!val || val === "true" || val === "false") return 0;
	const until = parseInt(val);
	return isNaN(until) ? 0 : until - Date.now();
}

function setAttribute(name: string, on: boolean) {
	if (on) document.documentElement.setAttribute(name, "true");
	else document.documentElement.removeAttribute(name);
}

function setReady() {
	document.documentElement.setAttribute("sift-ready", "true");
}

function fromDefaults(config: PlatformConfiguration, onUpdate?: (key: string, value: string) => void) {
	setAttribute("sift-paused", false);
	config.Keys.map((key) => {
		const value = key.Values[0];
		onUpdate?.(key.Key, value);
		update(key.Key, value);
	});
	setReady();
	return { unwatch: () => {} };
}

function update(key: string, value: string) {
	key = key.replace(/^(local|sync):/, "");
	document.querySelector(":root")?.setAttribute(key, value);
}

export type ConfigurationKey = {
	HumanName: string;
	Key: StorageItemKey;
	/** Values[0] is the default. */
	Values: string[];
	description?: string;
};

export type PlatformConfiguration = {
	HumanName: string;
	/** Slug the storage keys are built from, e.g. "youtube". */
	Platform: string;
	/** Content filtering: what to hide on the site. */
	Keys: ConfigurationKey[];
	/** Site controls: whether to allow the site at all, and how it looks. */
	SiteKeys: ConfigurationKey[];
	PauseKey: StorageItemKey;
	DisabledKey: StorageItemKey;
};

// -------------------------------------------------------------------------------------
// Utils (must be declared before ConfigurationShape to avoid TDZ in bundled background)
// -------------------------------------------------------------------------------------

export const DisabledKey = (platform: string) => `sync:${platform}-disabled` as StorageItemKey;
export const BlockedKey = (platform: string) => `sync:${platform}-blocked` as StorageItemKey;
export const LimitKey = (platform: string) => `sync:${platform}-daily-limit` as StorageItemKey;
export const DarkKey = (platform: string) => `sync:${platform}-force-dark` as StorageItemKey;
export const SnoozeKey = (platform: string) => `local:${platform}-snooze` as StorageItemKey;
/** Usage is per device and per local day, so the key carries the date and never needs resetting. */
export const UsageKey = (platform: string, day: string = Today()) =>
	`local:${platform}-usage-${day}` as StorageItemKey;

export function Today() {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const LimitValues = ["off", "5m", "15m", "30m", "1h", "2h"];

export function LimitMinutes(value: string | null) {
	switch (value) {
		case "5m": return 5;
		case "15m": return 15;
		case "30m": return 30;
		case "1h": return 60;
		case "2h": return 120;
		default: return 0;
	}
}

function siteKeys(platform: string): ConfigurationKey[] {
	return [
		booleanKey(BlockedKey(platform), "Block Site", false, "Replaces the whole site with a Sift screen"),
		{
			HumanName: "Daily Limit",
			Key: LimitKey(platform),
			Values: LimitValues,
			description: "Blocks the site once you have spent this long on it today",
		},
		booleanKey(DarkKey(platform), "Force Dark Mode", false, "Forces a dark theme, even where the site has none"),
	];
}

function platformConfig(platform: string, HumanName: string, Keys: ConfigurationKey[]): PlatformConfiguration {
	return {
		HumanName,
		Platform: platform,
		Keys,
		SiteKeys: siteKeys(platform),
		PauseKey: `sync:${platform}-paused`,
		DisabledKey: DisabledKey(platform),
	};
}

const feedDescriptions: Record<string, string> = {
	"up-next": "Hides recommended videos in the sidebar",
	"subscription": "Hides the subscriptions feed and sidebar section",
	"explore": "Hides explore and discovery content",
	"more-from": "Hides related content suggestions",
	"trending": "Hides trending topics",
	"for-you": "Hides the algorithmic For You feed",
	"who-to-follow": "Hides user follow suggestions",
	"whats-new": "Hides the What's New panel",
	"live": "Hides live content",
	"following": "Hides the Following feed",
	"search": "Hides content on the Search page",
	"games": "Hides gaming sections",
	"marketplace": "Hides the Marketplace feed",
	"videos": "Hides the Videos/Watch section",
	"popular-communities": "Hides popular community suggestions",
	"news": "Hides the News page feed",
	"related-posts": "Hides related posts in the sidebar",
	"new-bestsellers": "Hides the New Bestsellers section",
	"you-may-know": "Hides 'People you may know' suggestions",
	"related-pins": "Hides related pins on pin pages",
	"board": "Hides board idea suggestions",
};

function shortFormKeys(platform: string, description?: string): ConfigurationKey[] {
	return [
		{
			HumanName: "Shortform",
			Key: `sync:${platform}-shortform`,
			// Values[0] is the default: hide, so shortform stays reachable when shared directly.
			Values: ["hide", "block", "show"],
			description: description ?? "block: prevent access · hide: remove from UI · show: no change",
		},
	];
}

function booleanKey(Key: StorageItemKey, HumanName: string, Default: boolean = true, description?: string): ConfigurationKey {
	return {
		HumanName,
		Key,
		Values: Default ? ["true", "false"] : ["false", "true"],
		description,
	};
}

function titleCase(value: string) {
	return value
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

/**
 * Feed options for a platform. `defaults` turns individual ones off by default — key "home"
 * for the main feed, the feed's own name for the rest — because what counts as noise differs
 * per site: hiding YouTube's home feed is a bigger ask than hiding its recommendations.
 */
function feedKeys(
	platform: string,
	feeds: string[] = [],
	defaults: Record<string, boolean> = {}
): ConfigurationKey[] {
	const values = (on: boolean) => (on ? ["true", "false"] : ["false", "true"]);

	return [
		{
			HumanName: "Hide Home Feed",
			Key: `sync:${platform}-hide-feed`,
			Values: values(defaults.home ?? true),
			description: "Hides the main home/timeline feed",
		},
		...feeds.map(
			(feed): ConfigurationKey => ({
				HumanName: `Hide ${titleCase(feed)} Feed`,
				Key: `sync:${platform}-hide-${feed}-feed`,
				Values: values(defaults[feed] ?? true),
				description: feedDescriptions[feed] ?? `Hides the ${feed.replaceAll("-", " ")} feed`,
			})
		),
	];
}

export const ConfigurationShape: Record<string, PlatformConfiguration> = {
	"www.youtube.com": platformConfig("youtube", "YouTube", [
		...shortFormKeys("youtube", "Controls visibility of YouTube Shorts"),
		...feedKeys("youtube", ["up-next", "subscription"], { home: false, subscription: false }),
		booleanKey("sync:youtube-hide-more-from-youtube", "Hide More From YouTube", true, "Hides Premium, Music, and Kids sections in the sidebar"),
		booleanKey("sync:youtube-hide-explore", "Hide Explore Sidebar Section", true, "Hides Gaming, Podcasts, and Channels sections in the sidebar"),
		booleanKey("sync:youtube-hide-you-section", "Hide You Sidebar Section", false, "Hides History, Watch Later, and Liked Videos in the sidebar"),
		booleanKey("sync:youtube-hide-end-screen", "Hide End Screen Bits", true, "Hides end screen cards and video suggestions"),
		booleanKey("sync:youtube-hide-thumbnails", "Hide Thumbnails", true, "Removes video thumbnails, leaving titles and channel names"),
		booleanKey("sync:youtube-hide-comments", "Hide Comments", true, "Hides the comment section under videos"),
		booleanKey("sync:youtube-hide-community-posts", "Hide Community Posts", true, "Hides channel posts in the home and subscriptions feeds; channel Posts tabs are untouched"),
		booleanKey("sync:youtube-hide-playables", "Hide Playables", true, "Hides the Playables games shelf in the feed"),
		booleanKey("sync:youtube-hide-topic-shelves", "Hide Topic Shelves", true, "Hides \"Explore more topics\" chip shelves in the feed"),
		booleanKey("sync:youtube-hide-live", "Hide Live Streams", true, "Hides live streams in the home feed and in suggested videos"),
	]),
	"www.linkedin.com": platformConfig("linkedin", "LinkedIn", [
		...feedKeys("linkedin"),
		booleanKey("sync:linkedin-hide-premium-upsells", "Hide Premium Upsells", true, "Hides Premium subscription prompts throughout the site"),
		booleanKey("sync:linkedin-hide-add-to-your-feed", "Hide Add to Your Feed", true, "Hides the 'Add to your feed' suggestions section"),
	]),
	"www.reddit.com": platformConfig("reddit", "Reddit", feedKeys("reddit", ["explore", "related-posts", "popular-communities", "news"])),
	"www.tiktok.com": platformConfig("tiktok", "TikTok", [
		...shortFormKeys("tiktok", "Controls visibility of short video content"),
		...feedKeys("tiktok", ["explore", "live", "following", "search"]),
	]),
	"www.facebook.com": platformConfig("facebook", "Facebook", [
		...feedKeys("facebook", ["games", "marketplace", "videos"]),
		...shortFormKeys("facebook", "Controls visibility of Reels"),
	]),
	"www.instagram.com": platformConfig("instagram", "Instagram", [
		booleanKey("sync:instagram-hide-feed", "Hide Following Feed", false, "Hides posts from accounts you follow on the home page"),
		booleanKey("sync:instagram-hide-for-you-feed", "Hide For You Feed", true, "Hides the algorithmic For You tab on the home page"),
		...feedKeys("instagram", ["explore", "more-from"]).slice(1),
		booleanKey("sync:instagram-hide-explore-button", "Hide Explore Button", true, "Hides the Explore/magnifier button in the sidebar"),
		...shortFormKeys("instagram", "Controls visibility of Reels"),
	]),
	"music.youtube.com": platformConfig("youtube_music", "YouTube Music", [
		...feedKeys("youtube_music", ["explore"]),
		booleanKey("sync:youtube_music-hide-related", "Hide Related", true, "Hides related tracks panel on song pages"),
	]),
	"www.pinterest.com": platformConfig("pinterest", "Pinterest", feedKeys("pinterest", ["explore", "search", "related-pins", "board"])),
	"bsky.app": platformConfig("bsky", "Bluesky", [
		...feedKeys("bsky", ["explore"]),
		booleanKey("sync:bsky-hide-trending", "Hide Trending", true, "Hides trending topic links in the sidebar"),
	]),
	"substack.com": platformConfig("substack", "Substack", [
		...feedKeys("substack", ["explore", "up-next", "new-bestsellers", "you-may-know"]),
		booleanKey("sync:substack-hide-related", "Hide Related", true, "Hides related posts on note pages"),
	]),
	"www.twitter.com": platformConfig("twitter", "Twitter/X", [
		booleanKey("sync:twitter-hide-feed", "Hide Following Feed", false, "Hides posts in the Following tab"),
		...feedKeys("twitter", ["trending", "for-you", "who-to-follow", "whats-new", "explore"]).slice(1),
		booleanKey("sync:twitter-hide-premium", "Hide Premium", true, "Hides Premium subscription upsells and buttons"),
		booleanKey("sync:twitter-hide-grok", "Hide Grok", true, "Hides the Grok AI button in the sidebar"),
		booleanKey("sync:twitter-hide-live", "Hide Live On X", true, "Hides the Live on X broadcasts and Spaces module in the sidebar"),
		booleanKey("sync:twitter-hide-creator-studio", "Hide Creator Studio", true, "Hides Creator Studio links in the sidebar"),
	]),
	"www.twitch.tv": platformConfig("twitch", "Twitch", [
		booleanKey("sync:twitch-hide-live-channels", "Hide Live Channels", true, "Hides the Live Channels discovery section; redirects home to Following on desktop and mobile"),
		booleanKey("sync:twitch-hide-viewers-also-watch", "Hide Viewers Also Watch", true, "Hides channel recommendations on stream pages"),
		booleanKey("sync:twitch-hide-open-app", "Hide Open App Prompt", true, "Hides the Open App button and bottom sheet on mobile"),
		booleanKey("sync:twitch-hide-ad-free", "Hide Go Ad-Free Button", true, "Hides the 'Go Ad-Free for Free' upsell button in the header"),
	]),
};
