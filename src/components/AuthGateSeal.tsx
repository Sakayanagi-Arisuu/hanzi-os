/** Original vector artwork for the HANZI entrance; decorative, never a loading indicator. */
export function AuthGateSeal({ recovery }: { recovery: boolean }) {
  return <div className="auth-gate-seal" aria-hidden="true">
    <svg viewBox="0 0 160 160" fill="none">
      <g className="auth-seal-orbit"><circle cx="80" cy="80" r="70" /><circle cx="80" cy="80" r="63" strokeDasharray="2 12" />
        <path d="M80 4v14m0 124v14M4 80h14m124 0h14M26 26l10 10m88 88 10 10M26 134l10-10m88-88 10-10" /></g>
      <g className="auth-seal-core"><path d="M80 26 134 80 80 134 26 80Z" /><path d="M80 36 124 80 80 124 36 80Z" />
        <path className="auth-seal-light" d="m80 26 54 54-54 54" /></g>
      <circle className="auth-seal-star" cx="80" cy="10" r="3" />
    </svg>
    <span>{recovery ? '归' : '学'}</span>
  </div>;
}
