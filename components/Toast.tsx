const [message, setMessage] = createSignal<string | null>(null);
let timer: ReturnType<typeof setTimeout> | null = null;

export function showToast(msg: string) {
  if (timer) clearTimeout(timer);
  setMessage(msg);
  timer = setTimeout(() => setMessage(null), 2000);
}

export function Toast() {
  return (
    <Show when={message()}>
      <div class="fixed bottom-4 right-4 z-50 bg-surface border border-secondary text-text text-sm px-4 py-2 rounded-xl shadow-lg pointer-events-none">
        {message()}
      </div>
    </Show>
  );
}
