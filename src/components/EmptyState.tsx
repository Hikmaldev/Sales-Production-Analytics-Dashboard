interface EmptyStateProps {
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

// Design system section 5.5: centered in the card, one line of text followed
// by a "Clear filters" text link.
export function EmptyState({
  message = "No data for the selected filters.",
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="empty-panel" role="status">
      <div>
        <span className="empty-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path d="M5 19h14" />
            <path d="M7 16v-5" />
            <path d="M12 16V6" />
            <path d="M17 16v-8" />
          </svg>
        </span>
        <h2>{message}</h2>
        {actionLabel && onAction ? (
          <button type="button" className="text-button" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
