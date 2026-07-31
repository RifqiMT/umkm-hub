'use client';

type ProfileFeedbackProps = {
  error: string;
  message: string;
  onDismiss: () => void;
};

export function ProfileFeedback({ error, message, onDismiss }: ProfileFeedbackProps) {
  if (!error && !message) return null;

  return (
    <div
      className={`umkm-profile-feedback${error ? ' is-error' : ' is-success'}`}
      role={error ? 'alert' : 'status'}
    >
      <p>{error || message}</p>
      <button
        type="button"
        className="umkm-profile-feedback-dismiss"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
