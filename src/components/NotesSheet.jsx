import { excerpt, formatDate } from '../text.js'

export default function NotesSheet({ note, notes, onRename, onDelete, onCreate, onOpen, onClose }) {
  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div className="sheet" onClick={(event) => event.stopPropagation()} role="dialog" aria-label="Notes">
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div>
            <h2>Notes</h2>
            <p>Le titre de cette page et tes autres confessions.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <label className="setting-label" htmlFor="note-title">Titre</label>
        <div className="rename-row sheet-rename">
          <input
            id="note-title"
            value={note.title}
            onChange={(event) => onRename(event.target.value)}
            onBlur={() => { if (!note.title.trim()) onRename('Sans titre') }}
            placeholder="Titre de la note"
          />
        </div>

        <button type="button" className="sheet-action danger" onClick={() => onDelete(note.id)}>Supprimer cette note</button>
        <button type="button" className="sheet-action" onClick={onCreate}>+ Nouvelle note</button>

        <h3 className="sheet-subheading">Toutes les notes</h3>
        <div className="sheet-notes">
          {notes.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`sheet-note ${item.id === note.id ? 'selected' : ''}`}
              onClick={() => onOpen(item.id)}
            >
              <strong>{item.title || 'Sans titre'}</strong>
              <small>{excerpt(item.text) || 'Page encore blanche…'}</small>
              <time>{formatDate(item.updatedAt)}</time>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
