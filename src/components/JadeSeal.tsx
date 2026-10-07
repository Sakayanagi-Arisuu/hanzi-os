/** Original vector ornament: no remote asset or decorative animation. */
export function JadeSeal() {
  return <svg className="jade-seal" viewBox="0 0 80 80" aria-hidden="true" focusable="false">
    <circle cx="40" cy="40" r="37" fill="#0c3028" stroke="#85cdb6" />
    <circle cx="40" cy="40" r="33" fill="none" stroke="#4b8d76" strokeWidth="3" />
    <circle cx="40" cy="40" r="27" fill="#081e19" stroke="#d7b66a" strokeWidth=".7" />
    {Array.from({ length: 8 }, (_, index) => <g key={index} transform={`rotate(${index * 45} 40 40)`}>
      <path d="M35 9 Q40 4 45 9 L42 14 L40 11 L38 14 Z" fill="#b3e9d2" />
      <path d="M33 18 Q40 13 47 18" fill="none" stroke="#7fbea6" strokeWidth="1.2" />
    </g>)}
    <text x="40" y="51" textAnchor="middle" fill="#c5efdd" fontSize="32" fontFamily="serif">汉</text>
  </svg>;
}

