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
			if (p === "/directory/following/live" || p === "/directory/following/live/") {
				location.replace("/directory/following");
				return;
			}
		}
		// Hide "Em direto"/"Live" tab — match by pathname since href resolves to full URL
		document.querySelectorAll<HTMLElement>("[role='tablist'] a").forEach(el => {
			const a = el as HTMLAnchorElement;
			if (a.pathname === "/" || a.pathname === "/live" || a.pathname === "/live/") {
				a.setAttribute("data-sift-hide", "true");
			}
		});
	}

	markSidebarSections();

	if (hideOpenApp !== "false") {
		// DOM-confirmed: mweb upsell modal is .ReactModal__Overlay containing a link with tt_medium=mweb
		document.querySelectorAll<HTMLElement>(".ReactModal__Overlay, .ReactModal__Content").forEach(el => {
			if (el.querySelector("a[href*='tt_medium=mweb'], a[href*='light_upsell'], a[href*='open_in_app']")) {
				el.setAttribute("data-sift-hide", "true");
			}
		});
	}

	if (hideAdFree !== "false") {
		// data-a-target pattern for the ad-free upsell button
		document.querySelectorAll<HTMLElement>("[data-a-target*='ad-free'], [data-test-selector*='ad-free']").forEach(el => {
			el.style.display = "none";
		});
	}
}

function unfeeder() {
	AddPath();
	hideElements();
}
