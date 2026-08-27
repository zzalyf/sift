import { ConfigurationKey } from "../utils/Config";
import { fieldControl, mutedText } from "./ui";

type Props = {
  config: ConfigurationKey;
  value: string;
  onChange: (value: string) => void;
};

function isBooleanOption(options: string[]): boolean {
  const s = new Set(options);
  if (s.size != 2) return false;
  if (!s.has("false")) return false;
  if (!s.has("true")) return false;

  return true;
}

export const ConfigOption = (props: Props) => {
  return (
    <div class="flex flex-row items-center gap-3 bg-surface rounded-xl px-3 py-2.5">
      <label for={props.config.Key} class="flex-1 flex flex-col gap-0.5 cursor-pointer">
        <span class="text-sm">{props.config.HumanName}</span>
        <Show when={props.config.description}>
          <span class={mutedText}>{props.config.description}</span>
        </Show>
      </label>
      {isBooleanOption(props.config.Values) ? (
        <input
          type="checkbox"
          id={props.config.Key}
          checked={props.value == "true"}
          onChange={(e) => props.onChange(String(e.target.checked))}
          class="w-4.5 h-4.5 shrink-0 rounded-md border border-secondary accent-primary cursor-pointer"
        />
      ) : (
        <select
          id={props.config.Key}
          onChange={(e) => props.onChange(e.target.value)}
          class={`${fieldControl} shrink-0`}
        >
          <For each={props.config.Values}>
            {(opt) => <option selected={props.value == opt}>{opt}</option>}
          </For>
        </select>
      )}
    </div>
  );
};
