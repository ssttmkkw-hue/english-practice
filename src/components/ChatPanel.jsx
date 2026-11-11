import { useEffect, useRef } from 'react'
import { Send, LoaderCircle } from 'lucide-react'

export function ChatPanel({ lesson, messages, draft, setDraft, busy, error, onSend }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy])

  const submit = (event) => {
    event.preventDefault()
    onSend()
  }

  return (
    <aside className="chat-dock">
      <header className="chat-head">
        <div>
          <p className="eyebrow">继续聊 · 阿里云函数</p>
          <h2>围绕这一课提问</h2>
        </div>
        <p className="chat-hint">
          English-first replies. Chinese only for living idioms. Notebook phrases are sent with the question.
        </p>
      </header>

      <div className="chat-log">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <p>Try:</p>
            <ul>
              <li>What’s the difference between I’d like and Can I get?</li>
              <li>Make the first dialogue more casual.</li>
              <li>You be the other person. Let’s speak.</li>
            </ul>
          </div>
        ) : (
          messages.map((msg) => (
            <div className={`chat-bubble ${msg.role}`} key={msg.id}>
              <span>{msg.role === 'user' ? '你' : 'Coach'}</span>
              <p>{msg.text}</p>
            </div>
          ))
        )}
        {busy ? (
          <div className="chat-bubble assistant pending">
            <LoaderCircle size={16} className="spin" />
            正在向阿里云函数提问…
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      {error ? <p className="notice error">{error}</p> : null}

      <form className="chat-form" onSubmit={submit}>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`Ask about ${lesson.title}…`}
          rows={3}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              onSend()
            }
          }}
        />
        <button type="submit" className="primary-btn" disabled={busy || !draft.trim()}>
          <Send size={16} />
          发送
        </button>
      </form>
    </aside>
  )
}
