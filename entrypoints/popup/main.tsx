import "@/assets/tailwind.css";
import { ConfigSection } from "@/components/optionSection";
import DevPopup from "./devPopup";

function App() {
  const optionsUrl = browser.runtime.getURL("/options.html");
  const [currentConfig, setCurrentConfig] = createSignal<PlatformConfiguration | null>(null);
  const [configKey, setConfigKey] = createSignal<string>("");
  const [showDev, setShowDev] = createSignal(
    import.meta.env.DEV && import.meta.env.WXT_SHOW_DEV_POPUP == "true"
  );

  const hostnameAliases: Record<string, string> = {
    "x.com": "www.twitter.com",
    "www.x.com": "www.twitter.com",
    "twitter.com": "www.twitter.com",
  };

  onMount(async () => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const url = tabs[0]?.url;
    if (!url) return;
    try {
      const hostname = new URL(url).hostname;
      const key = hostnameAliases[hostname] ?? hostname;
      const config = ConfigurationShape[key];
      if (config) {
        setCurrentConfig(config);
        setConfigKey(key);
      }
    } catch {}
  });

  return (
    <>
      <Show when={import.meta.env.DEV && import.meta.env.WXT_SHOW_DEV_POPUP == "true"}>
        <button
          onclick={() => setShowDev((p) => !p)}
          class="text-center w-full cursor-pointer text-primary p-2"
        >
          DEV ONLY, switch to {showDev() ? "Prod" : "Dev"} Popup
        </button>
      </Show>
      <Show when={showDev()}>
        <DevPopup />
      </Show>
      <Show when={!showDev()}>
        <div class="flex flex-col min-w-80 max-h-[600px]">
          <div class="flex justify-between items-center px-4 pt-4 pb-2">
            <h1 class="flex items-center gap-2 text-xl font-bold text-primary">
              <img src={browser.runtime.getURL("/icon.svg")} class="w-6 h-6" aria-hidden="true" />
              Sift
            </h1>
            <a
              href={optionsUrl}
              target="_blank"
              class="flex flex-row gap-1 items-center text-sm text-accent hover:text-primary transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Settings
            </a>
          </div>

          <Show
            when={currentConfig()}
            fallback={
              <div class="flex flex-col items-center justify-center gap-2 p-8 text-secondary text-sm">
                <p>No settings for this site</p>
              </div>
            }
          >
            <div class="overflow-y-auto">
              <ConfigSection key={configKey()} config={currentConfig()!} />
            </div>
          </Show>
        </div>
      </Show>
    </>
  );
}

render(() => <App />, document.getElementById("app")!);
