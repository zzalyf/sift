export default function ConfigPage() {
  const [query, setQuery] = createSignal("");

  const filteredKeys = createMemo(() => {
    const q = query().toLowerCase().trim();
    return Object.keys(ConfigurationShape).filter(
      (key) => q === "" || ConfigurationShape[key].HumanName.toLowerCase().includes(q)
    );
  });

  return (
    <main class="bg-background min-h-svh text-text">
      <header class="sticky top-0 z-10 bg-background border-b border-surface px-6 py-4 flex items-center gap-3">
        <img src="/icon.svg" class="w-8 h-8" aria-hidden="true" />
        <span class="text-2xl font-bold text-primary flex-1">Sift</span>
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
