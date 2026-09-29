/**
 * Shown while the panel is fetching.
 *
 * The panel opens before its content exists, so this is the first thing a
 * reader sees on every pull request. It says what is being waited for rather
 * than just spinning, because "Reading #412 from GitHub" is the difference
 * between a slow tool and a broken one.
 */
export function Waiting({ text }: { text: string }) {
  return (
    <div className="fp-message fp-waiting">
      <span className="fp-spinner" aria-hidden="true" />
      {text}
    </div>
  )
}
