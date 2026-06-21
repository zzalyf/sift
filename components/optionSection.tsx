import { ConfigOption } from "./option";
import QuickSettingsDropdown from "./QuickSettingsDropdown";
import ConfirmationDialog from "./confiromationDialog";
import { showToast } from "./Toast";

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
