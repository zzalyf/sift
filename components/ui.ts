// Shared class strings, so the popup, the options page and the dialogs look like one product
// instead of three. Import these rather than hand-rolling another button.

/** Outlined button: pause, reset, export, and every other secondary action. */
export const ghostButton =
  "text-sm px-2.5 py-1 rounded-lg border border-secondary text-secondary hover:border-primary hover:text-primary transition-colors cursor-pointer";

/** The same button while it is holding a state on (Sift off on this site, for instance). */
export const ghostButtonActive =
  "text-sm px-2.5 py-1 rounded-lg border border-primary text-primary transition-colors cursor-pointer";

/** Filled button: the one action a dialog is really asking about. */
export const primaryButton =
  "text-sm px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer";

/** Group label above a run of options. */
export const groupHeading =
  "text-[11px] font-semibold uppercase tracking-wider text-secondary";

/** Selects and text inputs. */
export const fieldControl =
  "text-sm bg-background text-text border border-secondary rounded-lg px-2 py-1 focus:border-primary focus:outline-none cursor-pointer";

/** Small print: descriptions, usage counters, the quote. */
export const mutedText = "text-xs text-secondary";
