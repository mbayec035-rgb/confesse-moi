export function Range({ label, value, min, max, step = 1, display, onChange }) {
  return (
    <label className="range-field">
      <span className="range-label">
        <span>{label}</span>
        <strong>{display ?? value}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

export function Swatches({ colors, value, onChange, label }) {
  return (
    <div className="swatch-group" role="group" aria-label={label}>
      {colors.map((color) => (
        <button
          type="button"
          key={color.valeur}
          className={`swatch ${value === color.valeur ? 'selected' : ''}`}
          style={{ backgroundColor: color.valeur }}
          onClick={() => onChange(color.valeur)}
          aria-label={color.nom}
          aria-pressed={value === color.valeur}
          title={color.nom}
        />
      ))}
      <label className="swatch custom" title="Autre couleur">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} aria-label={`Autre couleur pour ${label}`} />
        <span>+</span>
      </label>
    </div>
  )
}

export function SegmentGroup({ options, value, onChange, label }) {
  return (
    <div className="segment-group" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          type="button"
          key={option.id}
          className={value === option.id ? 'active' : ''}
          onClick={() => onChange(option.id)}
          aria-pressed={value === option.id}
        >
          {option.nom}
        </button>
      ))}
    </div>
  )
}
