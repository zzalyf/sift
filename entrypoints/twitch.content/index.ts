import "./twitch.scss";

let hideLiveChannels = "true";
let hideViewersAlsoWatch = "true";
let hideOpenApp = "true";
let hideAdFree = "true";

export default defineContentScript({
	matches: ["*://www.twitch.tv/*", "*://m.twitch.tv/*"],
	runAt: "document_start",
	main(ctx) {
		Config(ConfigurationShape["www.twitch.tv"], update);
		NewObserver(unfeeder, ctx);
		unfeeder();
	},
});

function update(key: string, value: string) {
	if (key === "sync:twitch-hide-live-channels") hideLiveChannels = value;
	else if (key === "sync:twitch-hide-viewers-also-watch") hideViewersAlsoWatch = value;
	else if (key === "sync:twitch-hide-open-app") hideOpenApp = value;
	else if (key === "sync:twitch-hide-ad-free") hideAdFree = value;
	hideElements();
}

// Mark .side-nav-section elements with data-sift-hide so CSS can hide them with !important.
// JS inline styles lose to Twitch's display:flex !important, so we mark + hide via CSS instead.
function markSidebarSections() {
	document.querySelectorAll<HTMLElement>(".side-nav-section").forEach(section => {
		const text = section.querySelector("h2,h3,h4")?.textContent?.trim().toLowerCase() ?? "";
		const hideLive = hideLiveChannels !== "false" &&
			(text === "live channels" || text === "recommended categories");
		const hideViewers = hideViewersAlsoWatch !== "false" &&
			text.includes("viewers also");
		if (hideLive || hideViewers) {
			section.setAttribute("data-sift-hide", "true");
		} else {
			section.removeAttribute("data-sift-hide");
		}
	});
}

function hideElements() {
	if (hideLiveChannels !== "false") {
		if (location.hostname === "www.twitch.tv" && location.pathname === "/") {
			location.replace("/directory/following");
			return;
		}
		if (location.hostname === "m.twitch.tv") {
			const p = location.pathname;
			if (p === "/" || p === "/live" || p === "/live/") {
				location.replace("/following");
				return;
			}
		}
		// Hide "Live" tab in mobile navigation
		document.querySelectorAll<HTMLElement>("nav a, [role='tablist'] a, [role='tablist'] [role='tab']").forEach(el => {
			if (el.textContent?.trim().toLowerCase() === "live") el.style.display = "none";
		});
	}

	markSidebarSections();

	if (hideOpenApp !== "false") {
		document.querySelectorAll<HTMLElement>("a, button").forEach(el => {
			const text = el.textContent?.trim().toLowerCase() ?? "";
			if (text === "open app" || text === "open in app") {
				const sheet = el.closest<HTMLElement>("[role='dialog']") ?? el.closest<HTMLElement>("[data-a-target='app-download-drawer']");
				(sheet ?? el as HTMLElement).style.display = "none";
			}
		});
	}

	if (hideAdFree !== "false") {
		document.querySelectorAll<HTMLElement>("a, button").forEach(el => {
			const text = el.textContent?.trim().toLowerCase() ?? "";
			if (text.includes("go ad-free") || text.includes("ad-free for free")) {
				(el as HTMLElement).style.display = "none";
			}
		});
	}
}

function unfeeder() {
	AddPath();
	hideElements();
}
