/**
 * Shared Back button for the main SDGs experience (src/components/GameBackButton.tsx).
 * Always navigates to the main site at `/` — never history.back() — so returning
 * works reliably no matter how the game was opened. Kept in sync by hand.
 */
export function navigateHome(): void {
  window.location.href = '/'
}

export function BackButton({ label = 'Back to the experience' }: { label?: string }) {
  return (
    <button
      type="button"
      className="game-back-btn"
      onClick={navigateHome}
      aria-label={label}
    >
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
        <path
          d="M19 12H5m0 0 6 6m-6-6 6-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>Back</span>
    </button>
  )
}

export default BackButton
