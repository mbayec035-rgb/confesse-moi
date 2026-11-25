const TABS = [
  {
    id: 'accueil',
    label: 'Accueil',
    icon: (
      <path d="M4 11.2 12 4.5l8 6.7V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
    ),
  },
  {
    id: 'ecrire',
    label: '+',
    icon: <path d="M12 5v14M5 12h14" />,
  },
  {
    id: 'reglages',
    label: 'Réglages',
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a1.6 1.6 0 1 1-2.3 2.3l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a1.6 1.6 0 1 1-3.2 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a1.6 1.6 0 1 1-2.3-2.3l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a1.6 1.6 0 1 1 0-3.2h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a1.6 1.6 0 1 1 2.3-2.3l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a1.6 1.6 0 1 1 3.2 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a1.6 1.6 0 1 1 2.3 2.3l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a1.6 1.6 0 1 1 0 3.2h-.1a1.6 1.6 0 0 0-1.5 1.1z" />
      </>
    ),
  },
]

export default function BottomNav({ tab, onChange }) {
  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {TABS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`nav-tab ${tab === item.id ? 'active' : ''} ${item.id === 'ecrire' ? 'nav-tab-add' : ''}`}
          onClick={() => onChange(item.id)}
          aria-label={item.id === 'ecrire' ? 'Nouvelle note' : item.label}
          aria-current={tab === item.id ? 'page' : undefined}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" fill={item.id === 'ecrire' ? 'none' : 'none'}>
            {item.icon}
          </svg>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
