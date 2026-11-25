// Décoration facultative : uniquement sur Accueil et Studio, et seulement si
// le réglage « Afficher la machine » est activé. Jamais sur l’écran d’écriture.
export default function MachineDecor({ capsuleColor = '#3A3836' }) {
  return (
    <svg className="machine-decor" viewBox="0 0 320 220" role="img" aria-label="Petite machine à écrire décorative">
      <defs>
        <linearGradient id="decor-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#464A51" />
          <stop offset="55%" stopColor="#2B2D31" />
          <stop offset="100%" stopColor="#1B1D20" />
        </linearGradient>
      </defs>
      <path d="M28 86 Q160 70 292 86 L292 102 Q160 92 28 102 Z" fill="#E9DFC8" stroke="#CBBDA0" />
      <rect x="22" y="102" width="276" height="10" rx="5" fill="#2A2D31" />
      <circle cx="22" cy="107" r="7" fill="#0B0B0C" />
      <circle cx="298" cy="107" r="7" fill="#0B0B0C" />
      <rect x="118" y="99" width="60" height="16" rx="8" fill={capsuleColor} />
      <path d="M148 99 V86 H136 M148 86 H160" stroke="#141414" strokeWidth="3" fill="none" />
      <path d="M34 122 H286 L268 194 Q160 204 52 194 Z" fill="url(#decor-body)" stroke="#545861" />
      {[0, 1, 2].map((row) => Array.from({ length: 8 - row }, (_, column) => (
        <circle key={`${row}-${column}`} cx={82 + column * 21 + row * 10} cy={146 + row * 18} r="6" fill="#D8D4CA" stroke="#8E8A82" />
      )))}
      <rect x="118" y="188" width="84" height="7" rx="3.5" fill="#D8D4CA" />
    </svg>
  )
}
