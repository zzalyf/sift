import "./youtube.scss";

let shortform = "show";
let hideNextFeed = "true";
let hidePosts = "false";
let hidePlayables = "true";
let hideTopicShelves = "true";
let hideLive = "true";

export default defineContentScript({
  matches: ["*://www.youtube.com/*"],
  runAt: "document_start",
  allFrames: true,
  main(ctx) {
    Config(ConfigurationShape["www.youtube.com"], onUpdate);
    NewObserver(unfeeder, ctx);
    AddNoScroll(scrollBlockerActive, ["ArrowDown", "ArrowUp"]);
    unfeeder();
  },
});

function scrollBlockerActive(event: Event) {
  if (!IsActive()) return false;
  const inComments =
    (event.target as HTMLElement).closest(
      `[target-id="engagement-panel-comments-section"]`
    ) !== null;
  return document.URL.includes("shorts") && shortform !== "show" && !inComments;
}

function onUpdate(key: string, value: string) {
  if (key === "sync:youtube-shortform") shortform = value;
  if (key === "sync:youtube-hide-up-next-feed") hideNextFeed = value;
  if (key === "sync:youtube-hide-community-posts") hidePosts = value;
  if (key === "sync:youtube-hide-playables") hidePlayables = value;
  if (key === "sync:youtube-hide-topic-shelves") hideTopicShelves = value;
  if (key === "sync:youtube-hide-live") hideLive = value;
}

// A feed cell keeps its contents inside a shadow root, where :has() cannot reach, so hiding the
// post or shelf alone leaves the cell behind as a gap in the grid. Mark the cell from JS
// instead — the same trick twitch.content uses for its sidebar sections.
const FEED_CELLS = "ytd-rich-item-renderer, ytd-rich-section-renderer";

function feedClutterSelector() {
  const targets: string[] = [];
  if (hidePosts === "true") targets.push("ytd-post-renderer", "ytd-backstage-post-thread-renderer");
  if (hidePlayables === "true") targets.push("ytd-mini-game-card-view-model", "mini-game-card-view-model");
  if (hideTopicShelves === "true") targets.push("chips-shelf-with-video-shelf-renderer");
  // live is matched by structure, never by the badge text, which is translated
  if (hideLive === "true") targets.push(LIVE_MARKERS);
  return targets.join(", ");
}

const LIVE_MARKERS = 'ytd-thumbnail[is-live-video], .ytBadgeShapeLive';
const SUGGESTED_ITEMS = "ytd-compact-video-renderer, yt-lockup-view-model";

function mark(cells: string, selector: string) {
  document.querySelectorAll<HTMLElement>(cells).forEach((cell) => {
    const holds =
      selector !== "" &&
      !!(cell.querySelector(selector) ?? cell.shadowRoot?.querySelector(selector));
    if (holds) cell.setAttribute("data-sift-hide", "true");
    else if (cell.hasAttribute("data-sift-hide")) cell.removeAttribute("data-sift-hide");
  });
}

function markFeedClutter() {
  const path = GetPath();
  const onFeed = path === "/" || path === "/feed/subscriptions/";
  mark(FEED_CELLS, onFeed ? feedClutterSelector() : "");

  // Suggested videos beside a video hide their badge in a shadow root too, so :has() is no
  // more use here than it is in the feed.
  const onWatch = path.startsWith("/watch");
  mark(SUGGESTED_ITEMS, onWatch && hideLive === "true" ? LIVE_MARKERS : "");
}

function clearFeedMarks() {
  if (!document.querySelector("[data-sift-hide]")) return;
  document.querySelectorAll("[data-sift-hide]").forEach((el) => el.removeAttribute("data-sift-hide"));
}

function unfeeder() {
  AddPath();

  if (!IsActive()) {
    clearFeedMarks();
    return;
  }

  markFeedClutter();

  // close the sidebar
  const menuButton = document.getElementById("guide-button");
  const menuButtonButton = document.querySelector("#guide-button #button");

  if (
    menuButton &&
    menuButtonButton &&
    menuButtonButton.getAttribute("aria-pressed") == "true" &&
    menuButton.getAttribute("feedless-pressed") != "true"
  ) {
    menuButton.setAttribute("feedless-pressed", "true");
    menuButton.click();
  }

  if (shortform !== "show" && document.URL.includes("results")) {
    document.querySelectorAll("yt-chip-cloud-chip-renderer").forEach((e) => {
      if (e.textContent?.includes("Shorts")) {
        e.remove();
      }
    });
  }

  if (hideNextFeed === "true") {
    (
      document.querySelector(
        "button.ytp-autonav-toggle:has([aria-checked='true']"
      ) as HTMLButtonElement | undefined
    )?.click();
  }
}
