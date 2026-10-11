import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** Minimal native <dialog> modal matching the dashboard card styling. */
export function Modal({ title, open, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      onClose={onClose}
      onCancel={onClose}
      onClick={(event) => {
        // Clicking the backdrop (the dialog itself) closes the modal.
        if (event.target === dialogRef.current) {
          onClose();
        }
      }}
    >
      <div className="modal-header">
        <h2>{title}</h2>
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          ✕
        </button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}
