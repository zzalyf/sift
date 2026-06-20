import "./instagram.scss";

let shortform = "show";
let hideForYou: string | null = null;

export default defineContentScript({
  matches: ["*://*.instagram.com/*"],
  runAt: "document_start",
  main(ctx) {
    Config(ConfigurationShape["www.instagram.com"], onUpdate);
    NewObserver(unfeeder, ctx);
    AddNoScroll(scrollBlockerActive, ["ArrowDown", "ArrowUp", " "]);
    unfeeder();
  },
});

function scrollBlockerActive(event: Event) {
  const inComments =
    (event.target as HTMLElement).closest("div:has(a img):not(:has(video))") !==
    null;
  return document.URL.includes("reel") && shortform !== "show" && !inComments;
}

function onUpdate(key: string, value: string) {
  if (key === "local:instagram-shortform") shortform = value;
  if (key === "local:instagram-hide-for-you-feed") {
    hideForYou = value;
    redirectToFollowing();
  }
}

function redirectToFollowing() {
  if (
    hideForYou === "true" &&
    location.pathname === "/" &&
    !location.search.includes("variant=following")
  ) {
    location.replace("/?variant=following");
  }
}

function unfeeder() {
  AddPath();
  redirectToFollowing();
}
