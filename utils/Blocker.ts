// Full-screen block screen, shown when a site is blocked outright or its daily limit is up.
//
// Runs at document_start, before the page has a <body>, so everything here attaches to
// documentElement and re-attaches itself if the site wipes it.

const ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="72" height="72" aria-hidden="true">
	<rect width="512" height="512" rx="96" fill="#1e1e2e"/>
	<rect x="96" y="152" width="320" height="44" rx="22" fill="#cba6f7"/>
	<rect x="160" y="236" width="192" height="44" rx="22" fill="#cba6f7"/>
	<rect x="212" y="320" width="88" height="44" rx="22" fill="#89b4fa"/>
</svg>`;

const CSS = `
#sift-block {
	position: fixed;
	inset: 0;
	z-index: 2147483647;
	background: #1e1e2e;
	color: #cdd6f4;
	font-family: system-ui, sans-serif;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 1rem;
	text-align: center;
	padding: 2rem;
}
#sift-block h1 { font-size: 1.5rem; font-weight: 700; color: #cba6f7; margin: 0; }
#sift-block p { font-size: 0.95rem; color: #cdd6f4; margin: 0; }
#sift-block .sift-quote { font-size: 0.8rem; font-style: italic; color: #585b70; }
#sift-block button {
	margin-top: 0.5rem;
	font: inherit;
	font-size: 0.85rem;
	color: #cdd6f4;
	background: #313244;
	border: 1px solid #585b70;
	border-radius: 0.75rem;
	padding: 0.5rem 1rem;
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
	overlay.innerHTML = `${ICON}
		<h1></h1>
		<p class="sift-detail"></p>
		<p class="sift-quote">"Boredom is the birthplace of ideas."</p>
		<button type="button">5 more minutes</button>`;
	overlay.querySelector("h1")!.textContent = screen.title;
	overlay.querySelector(".sift-detail")!.textContent = screen.detail;
	overlay.querySelector("button")!.addEventListener("click", () => screen.onSnooze());

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
