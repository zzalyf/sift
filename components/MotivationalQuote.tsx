import { mutedText } from "./ui";

export default function MotivationalQuote(props: { class?: string }) {
  return (
    <p class={`${mutedText} italic select-none ${props.class ?? ""}`}>
      "Boredom is the birthplace of ideas."
    </p>
  );
}
