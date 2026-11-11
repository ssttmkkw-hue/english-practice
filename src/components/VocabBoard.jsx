import { Volume2, Plus } from 'lucide-react'

export function VocabBoard({ items = [], activeWord, savedPhrases = [], onPick, onSpeak, onAdd }) {
  if (!items.length) {
    return <p className="empty-hint">No living expressions extracted yet. Generate a lesson or import JSON.</p>
  }

  const saved = new Set(savedPhrases.map((item) => item.toLowerCase()))

  return (
    <div className="vocab-grid">
      {items.map((item) => {
        const selected = activeWord && item.word === activeWord
        const inBook = saved.has(item.word.toLowerCase())
        return (
          <div className={`vocab-card ${selected ? 'is-selected' : ''} ${inBook ? 'is-saved' : ''}`} key={item.word}>
            <button type="button" className="vocab-hit" onClick={() => onPick(selected ? '' : item.word)}>
              <div className="vocab-top">
                <strong>{item.word}</strong>
                <span className="vocab-meta">
                  <span>{item.pos}</span>
                  {item.ipa ? <span className="ipa">{item.ipa}</span> : null}
                </span>
              </div>
              {item.note ? <p className="vocab-note">{item.note}</p> : null}
              {item.example ? <p className="vocab-ex">{item.example}</p> : null}
            </button>
            <div className="vocab-actions">
              <button type="button" className="icon-btn ghost" onClick={() => onSpeak(item.word)} title="朗读">
                <Volume2 size={14} />
              </button>
              <button
                type="button"
                className="text-btn"
                disabled={inBook}
                onClick={() => onAdd({ phrase: item.word, note: item.note || item.zh || '', example: item.example || '' })}
              >
                <Plus size={14} />
                {inBook ? '已收' : '收入表达本'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
