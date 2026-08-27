import { ghostButton, primaryButton } from "./ui";

type ConfirmationDialogProps = {
  onConfirm: () => void;
  message: string;
  // Change type to match Solid's ref-forwarding (element or callback)
  ref?: HTMLDialogElement | ((el: HTMLDialogElement) => void);
};

export default function ConfirmationDialog(props: ConfirmationDialogProps) {
  let dialogRef: HTMLDialogElement;

  return (
    <dialog
      ref={(el) => {
        dialogRef = el;
        if (typeof props.ref === "function") props.ref(el);
        else if (props.ref) (props as any).ref = el;
      }}
      class="m-auto bg-surface text-text p-5 rounded-2xl backdrop:bg-black backdrop:opacity-50"
    >
      <p class="text-sm">{props.message}</p>
      <div class="flex flex-row gap-3 justify-end mt-4">
        <button class={ghostButton} onClick={() => dialogRef.close()}>
          Cancel
        </button>
        <button
          class={primaryButton}
          onClick={() => {
            dialogRef.close();
            props.onConfirm();
          }}
        >
          Confirm
        </button>
      </div>
    </dialog>
  );
}
