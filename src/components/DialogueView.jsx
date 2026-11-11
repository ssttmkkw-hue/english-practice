import { Volume2, BookmarkPlus } from 'lucide-react'

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function HighlightedText({ text, highlights = [], activeWord = '', saved = [], onPhrase }) {
  const terms = [...highlights, activeWord].filter(Boolean)
  const unique = [...new Set(terms)].sort((a, b) => b.length - a.length)
  if (!unique.length) return text

  const pattern = new RegExp(`(${unique.map(escapeRegExp).join('|')})`, 'gi')
  const parts = String(text).split(pattern)
  const lowerActive = activeWord.toLowerCase()
  const savedSet = new Set(saved.map((item) => item.toLowerCase()))

  return parts.map((part, index) => {
    const hit = unique.some((term) => term.toLowerCase() === part.toLowerCase())
    if (!hit) return <span key={`${part}-${index}`}>{part}</span>
    const isActive = lowerActive && part.toLowerCase() === lowerActive
    const isSaved = savedSet.has(part.toLowerCase())
    if (!onPhrase) {
      return (
        <mark key={`${part}-${index}`} className={isActive ? 'is-active' : ''}>
          {part}
        </mark>
      )
    }
    return (
      <button
        type="button"
        className={`mark-btn ${isActive ? 'is-active' : ''} ${isSaved ? 'is-saved' : ''}`}
        key={`${part}-${index}`}
        title={isSaved ? '已在表达本' : '加入表达本'}
        onClick={(event) => {
          event.stopPropagation()
          onPhrase(part)
        }}
      >
        {part}
      </button>
    )
  })
}

function tipsForTurn(turn, vocabByWord) {
  return (turn.highlights || [])
    .map((word) => {
      const hit = vocabByWord.get(String(word).toLowerCase())
      if (!hit?.note && !hit?.zh) return null
      return { word, tip: hit.note || hit.zh }
    })
    .filter(Boolean)
}

export function DialogueView({
  dialogue,
  activeWord,
  onSpeak,
  showZh,
  vocabByWord,
  savedPhrases,
  onAddPhrase,
}) {
  const speakers = dialogue.speakers || { A: 'A', B: 'B' }

  return (
    <div className="dialogue-view">
      {dialogue.summary ? <p className="dialogue-summary">{dialogue.summary}</p> : null}
      <div className="turn-list">
        {(dialogue.turns || []).map((turn, index) => {
          const name = speakers[turn.speaker] || turn.speaker
          const tips = tipsForTurn(turn, vocabByWord)
          return (
            <div className={`turn turn-${turn.speaker.toLowerCase()}`} key={`${dialogue.id}-${index}`}>
              <div className="turn-meta">
                <span className="turn-who">
                  {turn.speaker}
                  <small>{name}</small>
                </span>
                <button type="button" className="icon-btn" onClick={() => onSpeak(turn.en)} title="朗读这句">
                  <Volume2 size={15} />
                </button>
              </div>
              <div className="bubble">
                <p className="en">
                  <HighlightedText
                    text={turn.en}
                    highlights={turn.highlights}
                    activeWord={activeWord}
                    saved={savedPhrases}
                    onPhrase={(phrase) =>
                      onAddPhrase({
                        phrase,
                        example: turn.en,
                        note: vocabByWord.get(phrase.toLowerCase())?.note || '',
                      })
                    }
                  />
                </p>
                {tips.length ? (
                  <div className="idiom-row">
                    {tips.map((item) => (
                      <button
                        type="button"
                        className="idiom-chip"
                        key={`${turn.en}-${item.word}`}
                        onClick={() =>
                          onAddPhrase({ phrase: item.word, example: turn.en, note: item.tip })
                        }
                      >
                        <BookmarkPlus size={12} />
                        <em>{item.word}</em>
                        <span>{item.tip}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {showZh && turn.zh ? <p className="zh">{turn.zh}</p> : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
