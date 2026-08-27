import { ConfigOption } from "./option";
import QuickSettingsDropdown from "./QuickSettingsDropdown";
import ConfirmationDialog from "./confiromationDialog";
import { showToast } from "./Toast";
import { LimitMinutes, LimitKey, UsageKey } from "@/utils/Config";

type Props = {
  key: string;
  config: PlatformConfiguration;
  collapsible?: boolean;
};

export const ConfigSection = (props: Props) => {
  let confirmDialogRef!: HTMLDialogElement;
  const [collapsed, setCollapsed] = createSignal(props.collapsible ?? false);

  const [values, resource] = createResource(async () => {
    return Promise.all(
      props.config.Keys.map(async (key) => ({
        config: key,
        value: await storage.getItem(key.Key, { fallback: key.Values[0] }),
      }))
    );
  });

  // Site controls are deliberately left out of the Default/Max templates below: resetting
  // the filters should not silently unblock a site or drop its daily limit.
  const [siteValues, siteResource] = createResource(async () => {
    return Promise.all(
      props.config.SiteKeys.map(async (key) => ({
        config: key,
        value: await storage.getItem(key.Key, { fallback: key.Values[0] }),
      }))
    );
  });

  const [usage] = createResource(async () => {
    const [limit, seconds] = await Promise.all([
      storage.getItem<string>(LimitKey(props.config.Platform)),
      storage.getItem<number>(UsageKey(props.config.Platform)),
    ]);
    const minutes = LimitMinutes(limit);
    if (minutes === 0) return null;
    return `${Math.round((seconds ?? 0) / 60)}m of ${minutes}m used today`;
  });

  const isMaxRequired = () => {
    for (const value of props.config.Keys) {
      if (value.Values[0] !== value.Max) return true;
    }
    return false;
  };

  const currentSetting = () => {
    const state = values() ?? [];
    let isDefault = true;
    let isMax = true;
    for (const value of state) {
      if (isDefault && value.value != value.config.Values[0]) isDefault = false;
      if (
        isMax &&
        value.value != value.config.Max &&
        value.value != value.config.Values[0]
      )
        isMax = false;
    }

    if (isMax && isDefault && !isMaxRequired()) return "Default";
    if (isDefault) return "Default";
    if (isMax) return "Max";
    return "Custom";
  };

  function applyDefault() {
    const items = (values() ?? []).map(({ config }) => ({
      key: config.Key,
      value: config.Values[0],
    }));
    storage.setItems(items);
    resource.refetch();
    showToast(`${props.config.HumanName}: Default`);
  }

  function applyMax() {
    const items = (values() ?? []).map(({ config }) => ({
      key: config.Key,
      value: config.Max,
    }));
    storage.setItems(items);
    resource.refetch();
    showToast(`${props.config.HumanName}: Max`);
  }

  function onChange(n: string) {
    if (n == "Custom") return;
    if (n == "Default") applyDefault();
    if (n == "Max") confirmDialogRef.showModal();
  }

  return (
    <section
      data-key={props.key}
      class="break-inside-avoid p-4 flex flex-col gap-2"
    >
      <div class="flex justify-between items-center">
        <button
          class="flex items-center gap-2 flex-1 text-left"
          onClick={() => props.collapsible && setCollapsed((c) => !c)}
          aria-expanded={!collapsed()}
          disabled={!props.collapsible}
        >
          <Show when={props.collapsible}>
            <span class="text-secondary text-xs w-3">{collapsed() ? "▶" : "▼"}</span>
          </Show>
          <h2 class="text-3xl font-bold">{props.config.HumanName}</h2>
        </button>
        <QuickSettingsDropdown
          name={props.key}
          currentSetting={currentSetting()}
          isMaxRequired={isMaxRequired()}
          onChange={onChange}
        />
      </div>
      <Show when={!props.collapsible || !collapsed()}>
        <h3 class="text-xs font-semibold tracking-wide text-secondary uppercase mt-1">Site</h3>
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
          <p class="text-xs text-secondary px-2">{usage()}</p>
        </Show>

        <h3 class="text-xs font-semibold tracking-wide text-secondary uppercase mt-2">
          Filtering
        </h3>
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
      </Show>
      <ConfirmationDialog
        ref={(el) => (confirmDialogRef = el)}
        message={`Apply maximum restrictions for ${props.config.HumanName}?`}
        onConfirm={applyMax}
      />
    </section>
  );
};
