import "./youtube.scss";

let shortform = "show";
let hideNextFeed = "true";
let hidePosts = "false";

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
}

// A feed cell keeps its post inside a shadow root, where :has() cannot reach, so hiding the
// post alone leaves the cell behind as a gap in the grid. Mark the cell from JS instead —
// the same trick twitch.content uses for its sidebar sections.
const POST_SELECTOR = "ytd-post-renderer, ytd-backstage-post-thread-renderer";

function markCommunityPosts() {
  const path = GetPath();
  const onFeed = path === "/" || path === "/feed/subscriptions/";
  const hiding = hidePosts === "true" && onFeed;

  document
    .querySelectorAll<HTMLElement>("ytd-rich-item-renderer, ytd-rich-section-renderer")
    .forEach((cell) => {
      const holdsPost =
        hiding &&
        !!(cell.querySelector(POST_SELECTOR) ?? cell.shadowRoot?.querySelector(POST_SELECTOR));
      if (holdsPost) cell.setAttribute("data-sift-hide", "true");
      else if (cell.hasAttribute("data-sift-hide")) cell.removeAttribute("data-sift-hide");
    });
}

function clearPostMarks() {
  if (!document.querySelector("[data-sift-hide]")) return;
  document
    .querySelectorAll("[data-sift-hide]")
    .forEach((el) => el.removeAttribute("data-sift-hide"));
}

function unfeeder() {
  AddPath();

  if (!IsActive()) {
    clearPostMarks();
    return;
  }

  markCommunityPosts();

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
