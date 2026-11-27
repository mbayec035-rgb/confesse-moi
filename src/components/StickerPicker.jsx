import { STICKERS } from '../data.js'

export default function StickerPicker({
  onPick,
  onClose,
  title = 'Marqueurs',
  description = 'Ils se posent dans la marge, sur la ligne en cours.',
}) {
  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div className="sheet sticker-sheet" onClick={(event) => event.stopPropagation()} role="dialog" aria-label="Choisir un autocollant">
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className="sticker-grid">
          {STICKERS.map((sticker) => (
            <button
              type="button"
              key={sticker.id}
              className="sticker-choice"
              onClick={() => onPick(sticker.id)}
              aria-label={sticker.label}
              title={sticker.label}
            >
              <img src={sticker.image} alt="" draggable="false" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
