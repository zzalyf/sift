// Whether the JS side of a content script should touch the page.
//
// The CSS rules gate themselves on :root:not([sift-paused="true"]), but JS effects
// (redirects, clicks, scroll blocking) have no such gate — they used to run even while
// Sift was paused. They also used to run before Config() had read storage, which is why
// this returns false until sift-ready is set: acting on an unknown state is worse than
// acting one mutation tick later.
export default function IsActive() {
	const root = document.documentElement;
	if (root.getAttribute("sift-ready") !== "true") return false;
	return root.getAttribute("sift-paused") !== "true";
}
