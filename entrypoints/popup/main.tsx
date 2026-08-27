import "@/assets/tailwind.css";
import { ConfigSection } from "@/components/optionSection";
import { ConfigurationShape } from "@/utils/Config";
import { Toast, showToast } from "@/components/Toast";
import MotivationalQuote from "@/components/MotivationalQuote";
const DevPopup = lazy(() => import("./devPopup"));
import { ghostButton, ghostButtonActive, iconOnly, mutedText } from "@/components/ui";

function App() {
  const optionsUrl = browser.runtime.getURL("/options.html");
  const [currentConfig, setCurrentConfig] = createSignal<PlatformConfiguration | null>(null);
  const [configKey, setConfigKey] = createSignal<string>("");
  const [paused, setPaused] = createSignal(false);
  const [disabled, setDisabled] = createSignal(false);
  const [showDev, setShowDev] = createSignal(
    import.meta.env.DEV && import.meta.env.WXT_SHOW_DEV_POPUP == "true"
  );

  const hostnameAliases: Record<string, string> = {
    "x.com": "www.twitter.com",
    "www.x.com": "www.twitter.com",
    "twitter.com": "www.twitter.com",
    "m.twitch.tv": "www.twitch.tv",
    "m.youtube.com": "www.youtube.com",
    "pinterest.com": "www.pinterest.com",
    "old.reddit.com": "www.reddit.com",
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
        const [val, off] = await Promise.all([
          storage.getItem<string>(config.PauseKey),
          storage.getItem<string>(config.DisabledKey),
        ]);
        const isPaused = val === "true" || (!!val && val !== "false" && Date.now() < parseInt(val));
        setPaused(isPaused);
        setDisabled(off === "true");
      }
    } catch {}
  });

  async function togglePause() {
    const config = currentConfig();
    if (!config) return;
    const newPaused = !paused();
    await storage.setItem(config.PauseKey, String(newPaused));
    setPaused(newPaused);
  }

  async function pauseFor10m() {
    const config = currentConfig();
    if (!config) return;
    await storage.setItem(config.PauseKey, String(Date.now() + 10 * 60 * 1000));
    setPaused(true);
  }

  async function toggleDisabled() {
    const config = currentConfig();
    if (!config) return;
    const off = !disabled();
    await storage.setItem(config.DisabledKey, String(off));
    setDisabled(off);
    showToast(off ? `Sift off on ${config.HumanName}` : `Sift on for ${config.HumanName}`);
  }

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
        <Suspense>
          <DevPopup />
        </Suspense>
      </Show>
      <Show when={!showDev()}>
        <div class="flex flex-col min-w-80 max-h-[600px]">
          <div class="flex justify-between items-center px-4 pt-4 pb-2">
            <h1 class="flex items-center gap-2 text-xl font-bold text-primary">
              <img src={browser.runtime.getURL("/icon.svg")} class="w-[30px] h-[30px]" aria-hidden="true" />
              Sift
            </h1>
            <div class="flex items-center gap-2">
              <Show when={currentConfig()}>
                <button
                  onClick={toggleDisabled}
                  class={`${disabled() ? ghostButtonActive : ghostButton} ${iconOnly}`}
                  title={disabled() ? "Turn Sift back on for this site" : "Turn Sift off on this site"}
                  aria-pressed={disabled()}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M12 2v10" />
                    <path d="M18.4 6.6a9 9 0 1 1-12.77.04" />
                  </svg>
                </button>
                <Show when={!disabled()}>
                  <Show
                    when={paused()}
                    fallback={
                      <div class="flex items-center">
                        <button
                          onClick={togglePause}
                          class={`${ghostButton} ${iconOnly} rounded-r-none`}
                          title="Pause Sift"
                          aria-label="Pause Sift"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <rect x="6" y="4" width="4" height="16" rx="1.2" />
                            <rect x="14" y="4" width="4" height="16" rx="1.2" />
                          </svg>
                        </button>
                        <button
                          onClick={pauseFor10m}
                          class={`${ghostButton} rounded-l-none border-l-0`}
                          title="Pause for 10 minutes"
                        >
                          10m
                        </button>
                      </div>
                    }
                  >
                    <button onClick={togglePause} class={ghostButtonActive} title="Resume Sift">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Resume
                    </button>
                  </Show>
                </Show>
              </Show>
              <a
                href={optionsUrl}
                target="_blank"
                class={ghostButton}
                title="Open settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Settings
              </a>
            </div>
          </div>

          <Show when={disabled() && currentConfig()}>
            <p class={`${mutedText} px-4 pb-2`}>
              Sift is off on {currentConfig()!.HumanName}. Your settings are kept.
            </p>
          </Show>

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
          <div class="flex items-baseline justify-center gap-2 px-4 pb-3">
            <MotivationalQuote class="text-center" />
            <span class={mutedText}>v{import.meta.env.VITE_APP_VERSION}</span>
          </div>
        </div>
        <Toast />
      </Show>
    </>
  );
}

render(() => <App />, document.getElementById("app")!);
