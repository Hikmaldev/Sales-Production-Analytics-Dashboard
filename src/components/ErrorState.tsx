interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
}

// PRD FR-DAT-03: a failed fetch shows an error state with a retry option,
// never a blank screen.
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="empty-panel" role="alert">
      <div>
        <span className="empty-icon error-icon" aria-hidden="true">
          !
        </span>
        <h2>Could not load data.</h2>
        {message ? <p>{message}</p> : null}
        <button
          type="button"
          className="button-secondary retry-button"
          onClick={onRetry}
        >
          Retry
        </button>
      </div>
    </div>
  );
}
