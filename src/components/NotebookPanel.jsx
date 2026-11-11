import { Plus, Trash2, BookmarkPlus, HardDrive, Download } from 'lucide-react'
import { downloadJson } from '../lib/storage'

export function NotebookPanel({
  items = [],
  draft,
  setDraft,
  disk,
  onAdd,
  onRemove,
  onToggleStatus,
  lessonTitle,
}) {
  const submit = (event) => {
    event.preventDefault()
    onAdd({
      phrase: draft.phrase,
      note: draft.note,
      example: draft.example,
    })
  }

  return (
    <div className="notebook">
      <p className="notebook-lead">
        只收课本里不太会碰到的说法。点对话里的高亮，或自己写下。保存到 <code>content/notebook.json</code>
        ，后面 Codex / Cursor 读这个目录时会优先用这些。
      </p>
      <p className={`disk-flag ${disk ? 'ok' : 'warn'}`}>
        <HardDrive size={14} />
        {disk ? '已写入本地文件' : '当前只在浏览器里。用 npm run dev 打开时才会落到磁盘。'}
      </p>

      <form className="notebook-form" onSubmit={submit}>
        <input
          value={draft.phrase}
          onChange={(event) => setDraft((current) => ({ ...current, phrase: event.target.value }))}
          placeholder="phrase, e.g. do the trick"
        />
        <input
          value={draft.note}
          onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
          placeholder="why it is not textbook English"
        />
        <input
          value={draft.example}
          onChange={(event) => setDraft((current) => ({ ...current, example: event.target.value }))}
          placeholder="example from this lesson"
        />
        <button type="submit" className="primary-btn" disabled={!draft.phrase.trim()}>
          <Plus size={16} />
          加入表达本
        </button>
      </form>

      {!items.length ? (
        <p className="empty-hint">还是空的。在对话里点黄色高亮，或把这课里卡住的说法记进来。</p>
      ) : (
        <div className="notebook-list">
          {items.map((item) => (
            <article className={`nb-card ${item.status}`} key={item.id}>
              <div className="nb-top">
                <strong>{item.phrase}</strong>
                <div className="nb-actions">
                  <button type="button" className="text-btn" onClick={() => onToggleStatus(item.id)}>
                    {item.status === 'known' ? '还要练' : '先放一放'}
                  </button>
                  <button type="button" className="icon-btn ghost" onClick={() => onRemove(item.id)} title="移除">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {item.note ? <p className="nb-note">{item.note}</p> : null}
              {item.example ? <p className="nb-ex">{item.example}</p> : null}
              <small>
                {item.lessonTitle || lessonTitle || 'untagged'}
                {item.status === 'known' ? ' · parked' : ''}
              </small>
            </article>
          ))}
        </div>
      )}

      <div className="notebook-foot">
        <span>
          <BookmarkPlus size={14} /> {items.length} 条
        </span>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => downloadJson('notebook.json', { updatedAt: new Date().toISOString(), items })}
        >
          <Download size={14} />
          下载一份
        </button>
      </div>
    </div>
  )
}
