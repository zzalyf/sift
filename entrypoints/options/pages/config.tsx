import { ConfigSection } from "@/components/optionSection";
import { ConfigurationShape } from "@/utils/Config";
import { showToast } from "@/components/Toast";

export default function ConfigPage() {
  const [query, setQuery] = createSignal("");
  let fileInputRef!: HTMLInputElement;

  const filteredKeys = createMemo(() => {
    const q = query().toLowerCase().trim();
    return Object.keys(ConfigurationShape).filter(
      (key) => q === "" || ConfigurationShape[key].HumanName.toLowerCase().includes(q)
    );
  });

  async function exportSettings() {
    const allKeys = Object.values(ConfigurationShape).flatMap((c) => [
      c.PauseKey,
      ...c.Keys.map((k) => k.Key),
    ]);
    const entries = await Promise.all(
      allKeys.map(async (key) => [key, await storage.getItem<string>(key)] as const)
    );
    const data = Object.fromEntries(entries.filter(([, v]) => v !== null));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sift-settings.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Settings exported");
  }

  async function importSettings(file: File) {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as Record<string, string>;
      const items = Object.entries(data).map(([key, value]) => ({ key, value }));
      await storage.setItems(items as any);
      showToast("Settings imported");
    } catch {
      showToast("Import failed: invalid file");
    }
  }

  return (
    <main class="bg-background min-h-svh text-text">
      <header class="sticky top-0 z-10 bg-background border-b border-surface px-6 py-4 flex items-center gap-3">
        <img src="/icon.svg" class="w-8 h-8" aria-hidden="true" />
        <span class="text-2xl font-bold text-primary flex-1">Sift</span>
        <button
          onClick={exportSettings}
          class="text-sm text-accent hover:text-primary transition-colors px-2 py-1"
          title="Export settings"
        >
          Export
        </button>
        <button
          onClick={() => fileInputRef.click()}
          class="text-sm text-accent hover:text-primary transition-colors px-2 py-1"
          title="Import settings"
        >
          Import
        </button>
        <input
          ref={(el) => (fileInputRef = el)}
          type="file"
          accept=".json"
          class="hidden"
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            if (file) importSettings(file);
            e.currentTarget.value = "";
          }}
        />
        <input
          type="search"
          placeholder="Search sites..."
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
          class="bg-surface text-text placeholder-secondary text-sm rounded-lg px-3 py-1.5 border border-secondary focus:border-primary focus:outline-none w-48"
        />
      </header>
      <div class="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-4">
        <For each={filteredKeys()}>
          {(key) => <ConfigSection key={key} config={ConfigurationShape[key]} />}
        </For>
        <Show when={filteredKeys().length === 0}>
          <p class="text-secondary text-sm text-center py-8">No sites found</p>
        </Show>
      </div>
    </main>
  );
}
