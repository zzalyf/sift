import "./twitter.scss";

let hideLive = "true";

export default defineContentScript({
  matches: ["*://*.twitter.com/*", "*://*.x.com/*"],
  runAt: "document_start",
  main(ctx) {
    Config(ConfigurationShape["www.twitter.com"], update);
    NewObserver(unfeeder, ctx);
    unfeeder();
  },
});

function update(key: string, value: string) {
  if (key === "sync:twitter-hide-live") hideLive = value;
  markLiveModule();
}

// The "Live on X" module carries no href, no data-testid and no class of its own — checked
// against a signed-in session. All it has is its heading, so this matches that and walks up to
// the block that holds it: the first ancestor with more than one child, which is the header
// plus the list. Heading text is per-language, hence the list.
const LIVE_HEADINGS = /^(live on x|ao vivo no x|em direto no x|en vivo en x|en direct sur x)$/i;

function markLiveModule() {
  if (!IsActive() || hideLive === "false") {
    document
      .querySelectorAll("[data-sift-hide]")
      .forEach((el) => el.removeAttribute("data-sift-hide"));
    return;
  }

  const sidebar = document.querySelector("[data-testid='sidebarColumn']");
  if (!sidebar) return;

  sidebar.querySelectorAll("h2").forEach((heading) => {
    if (!LIVE_HEADINGS.test(heading.textContent?.trim() ?? "")) return;

    let module: HTMLElement | null = heading.parentElement;
    for (let depth = 0; module && depth < 6; depth++) {
      if (module.children.length > 1) {
        module.setAttribute("data-sift-hide", "true");
        return;
      }
      module = module.parentElement;
    }
  });
}

function unfeeder() {
  AddPath();
  markLiveModule();
}
