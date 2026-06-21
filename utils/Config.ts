export default async function Config(config: PlatformConfiguration, onUpdate?: (key: string, value: string) => void) {
	try {
		return fromStorage(config, onUpdate);
	} catch (error) {
		return fromDefaults(config, onUpdate);
	}
}

function fromStorage(config: PlatformConfiguration, onUpdate?: (key: string, value: string) => void) {
	const pauseUnwatch = initPause(config);

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
	return {
		unwatch: () => {
			pauseUnwatch.then((fn) => fn?.());
			unWatches.forEach(async (unwatch) => (await unwatch)());
		},
	};
}

async function initPause(config: PlatformConfiguration) {
	const val = await storage.getItem<string>(config.PauseKey);
	setPaused((val ?? "false") === "true");
	return storage.watch<string>(config.PauseKey, (v) => setPaused((v ?? "false") === "true"));
}

function setPaused(paused: boolean) {
	document.documentElement.toggleAttribute("sift-paused", paused);
}

function fromDefaults(config: PlatformConfiguration, onUpdate?: (key: string, value: string) => void) {
	setPaused(false);
	config.Keys.map((key) => {
		const value = key.Values[0];
		onUpdate?.(key.Key, value);
		update(key.Key, value);
	});
	return { unwatch: () => {} };
}

function update(key: string, value: string) {
	key = key.replace(/^(local|sync):/, "");
	document.querySelector(":root")?.setAttribute(key, value);
}

export type ConfigurationKey = {
	HumanName: string;
	Key: StorageItemKey;
	Values: string[];
	Max: string;
	description?: string;
};

export type PlatformConfiguration = {
	HumanName: string;
	Keys: ConfigurationKey[];
	PauseKey: StorageItemKey;
};

// -------------------------------------------------------------------------------------
// Utils (must be declared before ConfigurationShape to avoid TDZ in bundled background)
// -------------------------------------------------------------------------------------

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
			Values: ["block", "show", "hide"],
			Max: "block",
			description: description ?? "block: prevent access · hide: remove from UI · show: no change",
		},
	];
}

function booleanKey(Key: StorageItemKey, HumanName: string, Default: boolean = true, description?: string): ConfigurationKey {
	return {
		HumanName,
		Key,
		Max: "true",
		Values: Default ? ["true", "false"] : ["false", "true"],
		description,
	};
}

function feedKeys(platform: string, feeds?: string[]): ConfigurationKey[] {
	if (feeds === undefined) feeds = [];

	return [
		{
			HumanName: "Hide Home Feed",
			Key: `sync:${platform}-hide-feed`,
			Values: ["true", "false"],
			Max: "true",
			description: "Hides the main home/timeline feed",
		},
		...feeds.map(
			(feed): ConfigurationKey => ({
				HumanName: `Hide ${feed.replaceAll("-", " ")} Feed`,
				Key: `sync:${platform}-hide-${feed}-feed`,
				Values: ["true", "false"],
				Max: "true",
				description: feedDescriptions[feed] ?? `Hides the ${feed.replaceAll("-", " ")} feed`,
			})
		),
	];
}

export const ConfigurationShape: Record<string, PlatformConfiguration> = {
	"www.youtube.com": {
		HumanName: "YouTube",
		PauseKey: "sync:youtube-paused",
		Keys: [
			...shortFormKeys("youtube", "Controls visibility of YouTube Shorts"),
			...feedKeys("youtube", ["up-next", "subscription"]),
			booleanKey("sync:youtube-hide-more-from-youtube", "Hide More From Youtube", true, "Hides Premium, Music, and Kids sections in the sidebar"),
			booleanKey("sync:youtube-hide-explore", "Hide Explore Sidebar Section", true, "Hides Gaming, Podcasts, and Channels sections in the sidebar"),
			booleanKey("sync:youtube-hide-you-section", "Hide You Sidebar Section", false, "Hides History, Watch Later, and Liked Videos in the sidebar"),
			booleanKey("sync:youtube-hide-end-screen", "Hide End Screen bits", true, "Hides end screen cards and video suggestions"),
		],
	},
	"www.linkedin.com": {
		HumanName: "LinkedIn",
		PauseKey: "sync:linkedin-paused",
		Keys: [
			...feedKeys("linkedin"),
			booleanKey("sync:linkedin-hide-premium-upsells", "Hide Premium Upsells", true, "Hides Premium subscription prompts throughout the site"),
			booleanKey("sync:linkedin-hide-add-to-your-feed", "Hide Add to Your Feed", true, "Hides the 'Add to your feed' suggestions section"),
		],
	},
	"www.reddit.com": {
		HumanName: "Reddit",
		PauseKey: "sync:reddit-paused",
		Keys: feedKeys("reddit", ["explore", "related-posts", "popular-communities", "news"]),
	},
	"www.tiktok.com": {
		HumanName: "TikTok",
		PauseKey: "sync:tiktok-paused",
		Keys: [...shortFormKeys("tiktok", "Controls visibility of short video content"), ...feedKeys("tiktok", ["explore", "live", "following", "search"])],
	},
	"www.facebook.com": {
		HumanName: "Facebook",
		PauseKey: "sync:facebook-paused",
		Keys: [...feedKeys("facebook", ["games", "marketplace", "videos"]), ...shortFormKeys("facebook", "Controls visibility of Reels")],
	},
	"www.instagram.com": {
		HumanName: "Instagram",
		PauseKey: "sync:instagram-paused",
		Keys: [
			booleanKey("sync:instagram-hide-feed", "Hide Following Feed", true, "Hides posts from accounts you follow on the home page"),
			booleanKey("sync:instagram-hide-for-you-feed", "Hide For You Feed", true, "Hides the algorithmic For You tab on the home page"),
			...feedKeys("instagram", ["explore", "more-from"]).slice(1),
			booleanKey("sync:instagram-hide-explore-button", "Hide Explore Button", true, "Hides the Explore/magnifier button in the sidebar"),
			...shortFormKeys("instagram", "Controls visibility of Reels"),
		],
	},
	"music.youtube.com": {
		HumanName: "YouTube Music",
		PauseKey: "sync:youtube_music-paused",
		Keys: [
			...feedKeys("youtube_music", ["explore"]),
			booleanKey("sync:youtube_music-hide-related", "Hide Related", true, "Hides related tracks panel on song pages"),
		],
	},
	"pinterest.com": {
		HumanName: "Pinterest",
		PauseKey: "sync:pinterest-paused",
		Keys: [...feedKeys("pinterest", ["explore", "search", "related-pins", "board"])],
	},
	"bsky.app": {
		HumanName: "Bluesky",
		PauseKey: "sync:bsky-paused",
		Keys: [...feedKeys("bsky", ["explore"]), booleanKey("sync:bsky-hide-trending", "Hide Trending", true, "Hides trending topic links in the sidebar")],
	},
	"substack.com": {
		HumanName: "Substack",
		PauseKey: "sync:substack-paused",
		Keys: [
			...feedKeys("substack", ["explore", "up-next", "new-bestsellers", "you-may-know"]),
			booleanKey("sync:substack-hide-related", "Hide Related", true, "Hides related posts on note pages"),
		],
	},
	"www.twitter.com": {
		HumanName: "Twitter/X",
		PauseKey: "sync:twitter-paused",
		Keys: [
			booleanKey("sync:twitter-hide-feed", "Hide Following Feed", true, "Hides posts in the Following tab"),
			...feedKeys("twitter", ["trending", "for-you", "who-to-follow", "whats-new", "explore"]).slice(1),
			booleanKey("sync:twitter-hide-premium", "Hide Premium", true, "Hides Premium subscription upsells and buttons"),
			booleanKey("sync:twitter-hide-grok", "Hide Grok", true, "Hides the Grok AI button in the sidebar"),
			booleanKey("sync:twitter-hide-creator-studio", "Hide Creator Studio", true, "Hides Creator Studio links in the sidebar"),
		],
	},
	"www.twitch.tv": {
		HumanName: "Twitch",
		PauseKey: "sync:twitch-paused",
		Keys: [
			booleanKey("sync:twitch-hide-live-channels", "Hide Live Channels", true, "Hides the Live Channels discovery section; redirects home to Following on desktop and mobile"),
			booleanKey("sync:twitch-hide-viewers-also-watch", "Hide Viewers Also Watch", true, "Hides channel recommendations on stream pages"),
			booleanKey("sync:twitch-hide-open-app", "Hide Open App Prompt", true, "Hides the Open App button and bottom sheet on mobile"),
			booleanKey("sync:twitch-hide-ad-free", "Hide Go Ad-Free Button", true, "Hides the 'Go Ad-Free for Free' upsell button in the header"),
		],
	},
};

