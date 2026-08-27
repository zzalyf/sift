// Full-screen block screen, shown when a site is blocked outright or its daily limit is up.
//
// Runs at document_start, before the page has a <body>, so everything here attaches to
// documentElement and re-attaches itself if the site wipes it.

// Built element by element rather than assigned as markup: innerHTML is the one thing AMO's
// automated review always flags, and there is no reason to hand it a false positive.
function icon() {
	const ns = "http://www.w3.org/2000/svg";
	const svg = document.createElementNS(ns, "svg");
	svg.setAttribute("viewBox", "0 0 512 512");
	svg.setAttribute("width", "104");
	svg.setAttribute("height", "104");
	svg.setAttribute("aria-hidden", "true");

	const bars: [number, number, number, number, number, string][] = [
		[0, 0, 512, 512, 96, "#1e1e2e"],
		[96, 152, 320, 44, 22, "#cba6f7"],
		[160, 236, 192, 44, 22, "#cba6f7"],
		[212, 320, 88, 44, 22, "#89b4fa"],
	];
	for (const [x, y, width, height, radius, fill] of bars) {
		const rect = document.createElementNS(ns, "rect");
		rect.setAttribute("x", String(x));
		rect.setAttribute("y", String(y));
		rect.setAttribute("width", String(width));
		rect.setAttribute("height", String(height));
		rect.setAttribute("rx", String(radius));
		rect.setAttribute("fill", fill);
		svg.appendChild(rect);
	}
	return svg;
}

const CSS = `
/* Every length here is in px on purpose. rem follows the host page's root font-size, and
   sites set that to whatever they like — YouTube uses 10px — which silently rescaled this
   whole screen from one site to the next. */
#sift-block {
	position: fixed;
	inset: 0;
	z-index: 2147483647;
	background: #1e1e2e;
	color: #cdd6f4;
	font-family: system-ui, sans-serif;
	font-size: 16px;
	line-height: 1.4;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 18px;
	text-align: center;
	padding: 32px;
}
#sift-block h1 { font-size: 32px; font-weight: 700; color: #cba6f7; margin: 0; letter-spacing: -0.01em; }
#sift-block p { font-size: 17px; color: #cdd6f4; margin: 0; }
#sift-block .sift-quote { font-size: 14px; font-style: italic; color: #585b70; margin-top: 4px; }
#sift-block button {
	margin-top: 12px;
	font-family: inherit;
	font-size: 15px;
	color: #cdd6f4;
	background: #313244;
	border: 1px solid #585b70;
	border-radius: 12px;
	padding: 10px 20px;
	cursor: pointer;
}
#sift-block button:hover { border-color: #cba6f7; color: #cba6f7; }
`;

export type BlockScreen = {
	title: string;
	detail: string;
	onSnooze: () => void;
};

let overlay: HTMLElement | null = null;
let guard: MutationObserver | null = null;
let mediaTimer: ReturnType<typeof setInterval> | null = null;

export function ShowBlockScreen(screen: BlockScreen) {
	if (overlay) {
		overlay.querySelector("h1")!.textContent = screen.title;
		overlay.querySelector(".sift-detail")!.textContent = screen.detail;
		attach();
		return;
	}

	const style = document.createElement("style");
	style.id = "sift-block-style";
	style.textContent = CSS;
	document.documentElement.appendChild(style);

	overlay = document.createElement("div");
	overlay.id = "sift-block";

	const title = document.createElement("h1");
	title.textContent = screen.title;

	const detail = document.createElement("p");
	detail.className = "sift-detail";
	detail.textContent = screen.detail;

	const quote = document.createElement("p");
	quote.className = "sift-quote";
	quote.textContent = '"Boredom is the birthplace of ideas."';

	const snooze = document.createElement("button");
	snooze.type = "button";
	snooze.textContent = "15 more minutes";
	snooze.addEventListener("click", () => screen.onSnooze());

	overlay.append(icon(), title, detail, quote, snooze);

	attach();

	// The page keeps rendering behind the overlay, so audio would keep playing.
	stopMedia();
	mediaTimer = setInterval(stopMedia, 2000);

	// Sites replace large parts of the DOM on navigation; put the overlay back if it goes.
	// The overlay is a direct child of <html>, so watching that one level is enough.
	guard = new MutationObserver(attach);
	guard.observe(document.documentElement, { childList: true });
}

export function HideBlockScreen() {
	guard?.disconnect();
	guard = null;
	if (mediaTimer) clearInterval(mediaTimer);
	mediaTimer = null;
	document.getElementById("sift-block-style")?.remove();
	overlay?.remove();
	overlay = null;
	document.documentElement.style.removeProperty("overflow");
}

function attach() {
	if (!overlay) return;
	if (!document.documentElement.contains(overlay)) {
		document.documentElement.appendChild(overlay);
	}
	document.documentElement.style.setProperty("overflow", "hidden", "important");
}

function stopMedia() {
	document.querySelectorAll<HTMLMediaElement>("video,audio").forEach((m) => {
		if (!m.paused) m.pause();
	});
}
