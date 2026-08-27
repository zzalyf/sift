// Shared class strings, so the popup, the options page and the dialogs look like one product
// instead of three. Import these rather than hand-rolling another button.

// Every button is the same height. An icon is a replaced element, so a button holding one
// would otherwise come out shorter than its text-only neighbours — hence the fixed height and
// inline-flex centering rather than vertical padding.
const buttonBase =
  "inline-flex items-center justify-center gap-1.5 h-[30px] px-2.5 rounded-lg text-sm transition-colors cursor-pointer";

/** Outlined button: pause, reset, export, and every other secondary action. */
export const ghostButton = `${buttonBase} border border-secondary text-secondary hover:border-primary hover:text-primary`;

/** The same button while it is holding a state on (Sift off on this site, for instance). */
export const ghostButtonActive = `${buttonBase} border border-primary text-primary`;

/** Add to a ghost button that holds nothing but an icon, to keep it square. */
export const iconOnly = "w-[30px] px-0";

/** Filled button: the one action a dialog is really asking about. */
export const primaryButton = `${buttonBase} bg-primary text-primary-foreground hover:opacity-90`;

/** Group label above a run of options. */
export const groupHeading =
  "text-[11px] font-semibold uppercase tracking-wider text-secondary";

/** Selects and text inputs. */
export const fieldControl =
  "text-sm bg-background text-text border border-secondary rounded-lg px-2 py-1 focus:border-primary focus:outline-none cursor-pointer";

/** Small print: descriptions, usage counters, the quote. */
export const mutedText = "text-xs text-secondary";
