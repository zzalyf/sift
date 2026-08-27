import { ConfigOption } from "./option";
import ConfirmationDialog from "./confiromationDialog";
import { showToast } from "./Toast";
import { LimitMinutes, LimitKey, UsageKey } from "@/utils/Config";
import { ghostButton, groupHeading, mutedText } from "./ui";

type Props = {
  key: string;
  config: PlatformConfiguration;
  collapsible?: boolean;
};

export const ConfigSection = (props: Props) => {
  let confirmDialogRef!: HTMLDialogElement;
  const [collapsed, setCollapsed] = createSignal(props.collapsible ?? false);

  const load = (keys: ConfigurationKey[]) =>
    Promise.all(
      keys.map(async (key) => ({
        config: key,
        value: await storage.getItem(key.Key, { fallback: key.Values[0] }),
      }))
    );

  const [values, resource] = createResource(() => load(props.config.Keys));

  // Site controls are kept out of Reset: clearing the filters should not silently unblock a
  // site or drop the daily limit you set on it.
  const [siteValues, siteResource] = createResource(() => load(props.config.SiteKeys));

  const [usage] = createResource(async () => {
    const [limit, seconds] = await Promise.all([
      storage.getItem<string>(LimitKey(props.config.Platform)),
      storage.getItem<number>(UsageKey(props.config.Platform)),
    ]);
    const minutes = LimitMinutes(limit);
    if (minutes === 0) return null;
    return `${Math.round((seconds ?? 0) / 60)}m of ${minutes}m used today`;
  });

  const isDefault = () =>
    (values() ?? []).every((entry) => entry.value === entry.config.Values[0]);

  function applyDefault() {
    const items = (values() ?? []).map(({ config }) => ({
      key: config.Key,
      value: config.Values[0],
    }));
    storage.setItems(items);
    resource.refetch();
    showToast(`${props.config.HumanName}: filters reset`);
  }

  return (
    <section data-key={props.key} class="break-inside-avoid p-4 flex flex-col gap-3">
      <div class="flex justify-between items-center gap-2">
        <button
          class="flex items-center gap-2 flex-1 text-left cursor-pointer"
          onClick={() => props.collapsible && setCollapsed((c) => !c)}
          aria-expanded={!collapsed()}
          disabled={!props.collapsible}
        >
          <Show when={props.collapsible}>
            <span class="text-secondary text-xs w-3">{collapsed() ? "▶" : "▼"}</span>
          </Show>
          <h2 class="text-xl font-bold">{props.config.HumanName}</h2>
        </button>
        <Show
          when={!isDefault()}
          fallback={<span class={`${mutedText} px-1`}>Default</span>}
        >
          <button class={ghostButton} onClick={() => confirmDialogRef.showModal()}>
            Reset
          </button>
        </Show>
      </div>

      <Show when={!props.collapsible || !collapsed()}>
        <div class="flex flex-col gap-2">
          <h3 class={groupHeading}>Site</h3>
          <For each={siteValues() ?? []}>
            {(option) => (
              <ConfigOption
                {...option}
                onChange={(newValue) => {
                  storage.setItem(option.config.Key, newValue);
                  siteResource.refetch();
                  showToast(`${option.config.HumanName}: ${newValue}`);
                }}
              />
            )}
          </For>
          <Show when={usage()}>
            <p class={`${mutedText} px-1`}>{usage()}</p>
          </Show>
        </div>

        <div class="flex flex-col gap-2">
          <h3 class={groupHeading}>Filtering</h3>
          <For
            each={(values() ?? []).toSorted((a, b) =>
              a.config.HumanName.localeCompare(b.config.HumanName)
            )}
          >
            {(option) => (
              <ConfigOption
                {...option}
                onChange={(newValue) => {
                  storage.setItem(option.config.Key, newValue);
                  resource.refetch();
                  showToast(`${option.config.HumanName}: ${newValue}`);
                }}
              />
            )}
          </For>
        </div>
      </Show>

      <ConfirmationDialog
        ref={(el) => (confirmDialogRef = el)}
        message={`Reset ${props.config.HumanName} filters to their defaults?`}
        onConfirm={applyDefault}
      />
    </section>
  );
};
