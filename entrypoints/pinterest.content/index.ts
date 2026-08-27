import "./pinterest.scss";

export default defineContentScript({
  matches: ["*://*.pinterest.com/*"],
  runAt: "document_start",
  main(ctx) {
    Config(ConfigurationShape["www.pinterest.com"]);
    NewObserver(unfeeder, ctx);
    unfeeder();
  },
});

function unfeeder() {
  AddPath();
}
