import "./youtube_music.scss";

export default defineContentScript({
  matches: ["*://music.youtube.com/*"],
  runAt: "document_start",
  main(ctx) {
    Config(ConfigurationShape["music.youtube.com"]);
    NewObserver(unfeeder, ctx);

    unfeeder();
  },
});

function unfeeder() {
  AddPath();

  if (!IsActive()) return;

  // close the sidebar
  const menuButton = document.getElementById("guide-button");
  const menuButtonButton = document.querySelector("#guide-button #button");

  if (
    menuButton &&
    menuButtonButton &&
    menuButtonButton.getAttribute("aria-pressed") == "true" &&
    menuButton.getAttribute("sift-pressed") != "true"
  ) {
    menuButton.setAttribute("sift-pressed", "true");
    menuButton.click();
  }
}
