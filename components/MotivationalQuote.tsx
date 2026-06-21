export default function MotivationalQuote(props: { class?: string }) {
  return (
    <p class={`text-xs text-secondary italic select-none ${props.class ?? ""}`}>
      "Boredom is the birthplace of ideas."
    </p>
  );
}
