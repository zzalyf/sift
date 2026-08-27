// Forces a dark theme on a site.
//
// There is no universal way to do this. Where a site has a known theme hook we flip that,
// because the result is the site's real dark theme. Everywhere else we fall back to the
// invert filter — but only after checking that the page actually rendered light, so a site
// that is already dark (or whose native hook worked) never gets inverted.

const NATIVE: Record<string, () => void> = {
	youtube: () => {
		document.documentElement.setAttribute("dark", "");
		document.querySelector("ytd-app")?.setAttribute("dark", "");
	},
	youtube_music: () => document.documentElement.setAttribute("dark", ""),
	twitch: () => {
		document.documentElement.classList.add("tw-root--theme-dark");
		document.body?.classList.add("tw-root--theme-dark");
	},
	reddit: () => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("theme-dark");
	},
};

const CSS = `
:root[sift-dark="true"] { color-scheme: dark; }
:root[sift-dark-invert="true"] {
	filter: invert(1) hue-rotate(180deg);
	background: #1e1e2e !important;
}
:root[sift-dark-invert="true"] img,
:root[sift-dark-invert="true"] video,
:root[sift-dark-invert="true"] canvas,
:root[sift-dark-invert="true"] iframe,
:root[sift-dark-invert="true"] [style*="background-image"] {
	filter: invert(1) hue-rotate(180deg);
}
#sift-block { filter: none !important; }
`;

// Sampled after the page has had a chance to paint its own theme.
const SAMPLE_DELAYS = [0, 400, 1500, 4000];

let timers: ReturnType<typeof setTimeout>[] = [];

export function ApplyDarkMode(on: boolean, platform: string) {
	const root = document.documentElement;
	timers.forEach(clearTimeout);
	timers = [];

	if (!on) {
		root.removeAttribute("sift-dark");
		root.removeAttribute("sift-dark-invert");
		return;
	}

	if (!document.getElementById("sift-dark-style")) {
		const style = document.createElement("style");
		style.id = "sift-dark-style";
		style.textContent = CSS;
		root.appendChild(style);
	}

	root.setAttribute("sift-dark", "true");
	NATIVE[platform]?.();

	timers = SAMPLE_DELAYS.map((delay) =>
		setTimeout(() => {
			NATIVE[platform]?.();
			if (rendersLight()) root.setAttribute("sift-dark-invert", "true");
			else root.removeAttribute("sift-dark-invert");
		}, delay)
	);
}

// The filter does not change computed background-color, so this stays stable once inverted.
//
// Sampling document.body is not enough: on YouTube the body is transparent and a child paints
// the background, which read as "not light" and would have skipped the fallback on any light
// site built the same way. Sample what is actually painted mid-viewport instead, walking up
// until something has an opaque background.
function rendersLight() {
	const start =
		document.elementFromPoint(window.innerWidth / 2, Math.floor(window.innerHeight * 0.6)) ??
		document.body;

	for (let node: Element | null = start; node; node = node.parentElement) {
		const rgb = getComputedStyle(node)
			.backgroundColor.match(/\d+(\.\d+)?/g)
			?.map(Number);
		if (!rgb || rgb.length < 3) continue;
		if (rgb.length > 3 && rgb[3] === 0) continue; // transparent: whatever is behind it counts
		return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255 > 0.55;
	}
	return false;
}
