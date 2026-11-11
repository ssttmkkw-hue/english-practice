import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  BookmarkPlus,
  Download,
  FolderOpen,
  Sparkles,
  Upload,
  Volume2,
  Languages,
  Trash2,
  Copy,
  ClipboardPaste,
  RefreshCcw,
} from 'lucide-react'
import { askFc } from './api/fc'
import { buildChatPrompt, buildCodexFilePrompt, buildGeneratePrompt } from './api/prompts'
import { loadBundledLessons } from './data/loadLessons'
import { normalizeLesson } from './lib/parseLesson'
import { speakEnglish } from './lib/speech'
import { fetchDiskLessons, persistFcRaw, persistLesson } from './lib/disk'
import {
  fetchNotebook,
  makeNotebookItem,
  persistNotebook,
  upsertItem,
} from './lib/notebook'
import {
  downloadJson,
  loadChats,
  loadLocalLessons,
  loadOpenMap,
  saveChat,
  saveLocalLesson,
  saveOpenMap,
  slugify,
} from './lib/storage'
import { ChatPanel } from './components/ChatPanel'
import { CollapsibleCard } from './components/CollapsibleCard'
import { DialogueView } from './components/DialogueView'
import { NotebookPanel } from './components/NotebookPanel'
import { VocabBoard } from './components/VocabBoard'

const bundled = loadBundledLessons().map((lesson) =>
  normalizeLesson(lesson, { source: lesson.source || 'seed', topic: lesson.topic }),
)

const defaultOpen = {
  lecture: true,
  vocab: true,
  notebook: true,
}

const emptyDraft = { phrase: '', note: '', example: '' }

function mergeLessons(disk, local) {
  const map = new Map()
  bundled.forEach((item) => map.set(item.id, item))
  disk.forEach((item) => map.set(item.id, item))
  local.forEach((item) => map.set(item.id, item))
  return [...map.values()]
}

function sourceLabel(source) {
  if (source === 'fc') return '云函数生成'
  if (source === 'codex') return '本地 AI'
  if (source === 'codex-paste') return '剪贴板导入'
  if (source === 'import') return '导入'
  return '内置课'
}

export default function App() {
  const fileRef = useRef(null)
  const [localLessons, setLocalLessons] = useState(() => loadLocalLessons())
  const [diskLessons, setDiskLessons] = useState([])
  const lessons = useMemo(() => mergeLessons(diskLessons, localLessons), [diskLessons, localLessons])
  const [activeId, setActiveId] = useState(lessons[0]?.id || '')
  const [topic, setTopic] = useState(lessons[0]?.topic || '')
  const [generating, setGenerating] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [showZh, setShowZh] = useState(false)
  const [activeWord, setActiveWord] = useState('')
  const [openMap, setOpenMap] = useState(() => ({ ...defaultOpen, ...(loadOpenMap() || {}) }))
  const [chats, setChats] = useState(() => loadChats())
  const [draft, setDraft] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
  const [chatError, setChatError] = useState('')
  const [notebook, setNotebook] = useState({ items: [] })
  const [notebookDisk, setNotebookDisk] = useState(false)
  const [nbDraft, setNbDraft] = useState(emptyDraft)

  const lesson = lessons.find((item) => item.id === activeId) || lessons[0]
  const vocabByWord = useMemo(() => {
    const map = new Map()
    ;(lesson?.vocab || []).forEach((item) => map.set(String(item.word).toLowerCase(), item))
    return map
  }, [lesson])
  const savedPhrases = (notebook.items || []).map((item) => item.phrase)

  const refreshDiskLessons = async () => {
    const list = await fetchDiskLessons()
    setDiskLessons(
      list.map((item) => normalizeLesson(item, { source: item.source || 'codex', topic: item.topic })),
    )
  }

  useEffect(() => {
    fetchNotebook().then(({ data, disk }) => {
      setNotebook(data)
      setNotebookDisk(disk)
    })
    refreshDiskLessons()
  }, [])

  useEffect(() => {
    if (!lesson) return
    setActiveWord('')
    setChatError('')
  }, [lesson?.id])

  const persistOpen = (next) => {
    setOpenMap(next)
    saveOpenMap(next)
  }

  const writeNotebook = async (items) => {
    const result = await persistNotebook({ ...notebook, items })
    setNotebook(result.data)
    setNotebookDisk(result.disk)
    setStatus(
      result.disk
        ? `表达本已写入 content/notebook.json（${result.data.items.length} 条）`
        : '表达本只写进了浏览器。用 npm run dev 打开时才会落到本地文件。',
    )
  }

  const addToNotebook = async (payload) => {
    const phrase = String(payload.phrase || '').trim()
    if (!phrase) return
    const item = makeNotebookItem({
      ...payload,
      phrase,
      lessonId: lesson?.id || '',
      lessonTitle: lesson?.title || '',
    })
    await writeNotebook(upsertItem(notebook.items || [], item))
    setNbDraft(emptyDraft)
    persistOpen({ ...openMap, notebook: true })
  }

  const toggleCard = (id) => {
    persistOpen({ ...openMap, [id]: !openMap[id] })
  }

  const selectLesson = (item) => {
    setActiveId(item.id)
    setTopic(item.topic || item.titleZh || item.title)
    setError('')
    setStatus('')
  }

  const rememberLesson = async (next) => {
    saveLocalLesson(next)
    setLocalLessons(loadLocalLessons())
    const saved = await persistLesson(next)
    await refreshDiskLessons()
    setActiveId(next.id)
    persistOpen({
      lecture: true,
      vocab: true,
      notebook: true,
      ...(next.dialogues || []).reduce((acc, d, i) => ({ ...acc, [d.id]: i === 0 }), {}),
    })
    return saved
  }

  const handleGenerate = async () => {
    const input = topic.trim()
    if (!input) {
      setError('先写一个话题，例如：机场值机 / 和同事午饭 / 看医生。')
      return
    }
    setGenerating(true)
    setError('')
    setStatus('正在请阿里云函数展开课程（讲解 + 4 段对话 + 单词）…')
    try {
      const { text, finishReason } = await askFc(buildGeneratePrompt(input, notebook.items), {
        timeoutMs: 120000,
        maxTokens: 4096,
      })
      await persistFcRaw(text)
      const next = normalizeLesson(text, { source: 'fc', topic: input })
      if (!next.dialogues.length) {
        throw new Error('模型没有返回对话。原始回复已写入 content/lessons/_last-fc-raw.txt')
      }
      const saved = await rememberLesson(next)
      const cut = finishReason === 'length' ? ' 回复可能被截断，缺的段落可再点一次生成。' : ''
      setStatus(
        saved.disk
          ? `已生成「${next.title}」，并写入 ${saved.path}。刷新课库即可看到卡片。${cut}`
          : `已生成「${next.title}」，但没写进磁盘：${saved.error || '请检查 npm run dev'}。卡片已在浏览器课库。${cut}`,
      )
    } catch (err) {
      setError(`${err.message || String(err)} 可看 content/lessons/_last-fc-raw.txt，或把 JSON 用「从剪贴板导入」。`)
      setStatus('')
    } finally {
      setGenerating(false)
    }
  }

  const handleImport = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const next = normalizeLesson(text, { source: 'import', topic: file.name })
      await rememberLesson(next)
      setTopic(next.topic || next.title)
      setStatus(`已导入并写入 content/lessons/${next.id}.json`)
      setError('')
    } catch (err) {
      setError(`导入失败：${err.message}`)
    }
  }

  const handleExport = () => {
    if (!lesson) return
    downloadJson(`${slugify(lesson.id || lesson.title)}.json`, lesson)
    setStatus(`已下载 ${lesson.id}.json。把它放到 content/lessons/ 后刷新，就会进入本地课库。`)
  }

  const handleCopyPrompt = async () => {
    const input = topic.trim() || lesson?.topic || 'everyday English'
    const suggestedId = slugify(input)
    const prompt = buildCodexFilePrompt(input, notebook.items, suggestedId)
    await navigator.clipboard.writeText(prompt)
    setStatus(
      `已复制给 Codex。它应直接写入 content/lessons/${suggestedId}.json，不要把 JSON 贴到聊天或网页。写完后点「刷新课库」。`,
    )
  }

  const handlePasteJson = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const next = normalizeLesson(text, { source: 'codex-paste', topic: topic || 'pasted lesson' })
      if (!next.dialogues.length) throw new Error('剪贴板里的 JSON 没有 dialogues')
      const saved = await rememberLesson(next)
      setTopic(next.topic || next.title)
      setStatus(
        saved.disk
          ? `已从剪贴板导入「${next.title}」，写入 ${saved.path}`
          : `已导入「${next.title}」，但没写进磁盘。`,
      )
      setError('')
    } catch (err) {
      setError(`剪贴板导入失败：${err.message}`)
    }
  }

  const handleDelete = (id) => {
    const next = loadLocalLessons().filter((item) => item.id !== id)
    localStorage.setItem('ai-langlearning.lessons', JSON.stringify(next))
    setLocalLessons(next)
    const remaining = mergeLessons(diskLessons, next)
    if (activeId === id) setActiveId(remaining[0]?.id || '')
  }

  const sendChat = async () => {
    if (!lesson || !draft.trim() || chatBusy) return
    const text = draft.trim()
    const history = chats[lesson.id] || []
    const userMsg = { id: `u-${Date.now()}`, role: 'user', text }
    const nextHistory = [...history, userMsg]
    setDraft('')
    setChats((current) => ({ ...current, [lesson.id]: nextHistory }))
    saveChat(lesson.id, nextHistory)
    setChatBusy(true)
    setChatError('')
    try {
      const { text: reply } = await askFc(
        buildChatPrompt({
          lesson,
          history: nextHistory,
          userText: text,
          notebookItems: notebook.items,
        }),
        { maxTokens: 1024 },
      )
      const assistantMsg = { id: `a-${Date.now()}`, role: 'assistant', text: reply }
      const saved = [...nextHistory, assistantMsg]
      setChats((current) => ({ ...current, [lesson.id]: saved }))
      saveChat(lesson.id, saved)
    } catch (err) {
      setChatError(err.message || String(err))
    } finally {
      setChatBusy(false)
    }
  }

  if (!lesson) {
    return (
      <main className="app-shell empty-app">
        <h1>还没有课程</h1>
        <p>在上方输入话题生成，或把 JSON 放到 content/lessons/。</p>
      </main>
    )
  }

  const messages = chats[lesson.id] || []

  return (
    <div className="app-shell">
      <header className="studio-bar">
        <div className="brand">
          <p className="eyebrow">English oral studio</p>
          <h1>AI Lang Learning</h1>
          <p className="lead">
            英语够用，缺的是开口。课文以外的地道说法才给提示。卡住的短语收进表达本，写入本地 JSON，后面的 AI 会优先照顾。
          </p>
        </div>
        <div className="studio-controls">
          <label className="topic-field">
            话题
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="例如：看医生 / 租房看房 / 和同事午饭"
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleGenerate()
              }}
            />
          </label>
          <button type="button" className="primary-btn" onClick={handleGenerate} disabled={generating}>
            <Sparkles size={16} />
            {generating ? '生成中…' : '生成课程'}
          </button>
          <button type="button" className="ghost-btn" onClick={() => fileRef.current?.click()}>
            <Upload size={16} />
            导入 JSON
          </button>
          <button type="button" className="ghost-btn" onClick={handleExport}>
            <Download size={16} />
            导出这一课
          </button>
          <button type="button" className="ghost-btn" onClick={handleCopyPrompt}>
            <Copy size={16} />
            复制给 Codex
          </button>
          <button type="button" className="ghost-btn" onClick={handlePasteJson}>
            <ClipboardPaste size={16} />
            从剪贴板导入
          </button>
          <button type="button" className="ghost-btn" onClick={() => refreshDiskLessons().then(() => setStatus('已重新读取 content/lessons/'))}>
            <RefreshCcw size={16} />
            刷新课库
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={handleImport} />
        </div>
      </header>

      {status ? <p className="notice">{status}</p> : null}
      {error ? <p className="notice error">{error}</p> : null}

      <div className="workspace">
        <aside className="library">
          <div className="pane-title">
            <FolderOpen size={16} />
            课程库
          </div>
          <p className="pane-note">
            课库读 content/lessons/*.json。Codex 必须把课写进这个目录，不要把 JSON 贴到网页。点「刷新课库」加载新文件。
          </p>
          <div className="lesson-list">
            {lessons.map((item) => (
              <div className={`lesson-row ${item.id === lesson.id ? 'is-active' : ''}`} key={item.id}>
                <button type="button" className="lesson-hit" onClick={() => selectLesson(item)}>
                  <strong>{item.title}</strong>
                  <span>{item.titleZh}</span>
                  <small>
                    {item.levelRange} · {sourceLabel(item.source)}
                  </small>
                </button>
                {item.source !== 'seed' ? (
                  <button type="button" className="icon-btn ghost" onClick={() => handleDelete(item.id)} title="从浏览器课库移除">
                    <Trash2 size={14} />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </aside>

        <main className="stage">
          <section className="lesson-hero">
            <div>
              <p className="eyebrow">
                {lesson.levelRange} · {lesson.dialogues.length} dialogues · {lesson.vocab.length} living phrases
              </p>
              <h2>
                {lesson.title}
                {lesson.titleZh ? <span>{lesson.titleZh}</span> : null}
              </h2>
              <p>{lesson.scene}</p>
            </div>
            <div className="hero-actions">
              <button type="button" className={`chip ${showZh ? 'on' : ''}`} onClick={() => setShowZh((v) => !v)}>
                <Languages size={15} />
                {showZh ? '全文翻译开' : '全文翻译关'}
              </button>
              <button
                type="button"
                className="chip"
                onClick={() => {
                  const first = lesson.dialogues[0]?.turns?.[0]?.en
                  if (first) speakEnglish(first)
                }}
              >
                <Volume2 size={15} />
                听第一句
              </button>
            </div>
            {lesson.goals?.length ? (
              <ul className="goal-list">
                {lesson.goals.map((goal) => (
                  <li key={goal}>{goal}</li>
                ))}
              </ul>
            ) : null}
          </section>

          <CollapsibleCard
            id="lecture"
            open={Boolean(openMap.lecture)}
            onToggle={toggleCard}
            eyebrow="Coach notes"
            title="How to speak this"
            subtitle={lesson.lecture.overview}
            extra={<BookOpen size={16} />}
          >
            <div className="lecture-grid">
              <article>
                <h3>Say it this way</h3>
                <div className="pattern-list">
                  {(lesson.lecture.patterns || []).map((pattern) => (
                    <button
                      type="button"
                      className="pattern-card"
                      key={pattern.en}
                      onClick={() => speakEnglish(pattern.en)}
                    >
                      <strong>{pattern.en}</strong>
                      {pattern.note ? <small>{pattern.note}</small> : pattern.zh ? <small>{pattern.zh}</small> : null}
                    </button>
                  ))}
                </div>
              </article>
              <article>
                <h3>Speaking notes</h3>
                <ul className="tip-list">
                  {(lesson.lecture.tips || []).map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </article>
            </div>
          </CollapsibleCard>

          {lesson.dialogues.map((dialogue, index) => (
            <CollapsibleCard
              key={dialogue.id}
              id={dialogue.id}
              open={openMap[dialogue.id] ?? index === 0}
              onToggle={toggleCard}
              accent={`lv-${index}`}
              eyebrow={`Dialogue ${index + 1} · ${dialogue.level}`}
              title={dialogue.titleEn || dialogue.title}
              subtitle={dialogue.title !== dialogue.titleEn ? dialogue.title : ''}
              extra={`${dialogue.turns.length} 轮`}
            >
              <DialogueView
                dialogue={dialogue}
                activeWord={activeWord}
                showZh={showZh}
                vocabByWord={vocabByWord}
                savedPhrases={savedPhrases}
                onSpeak={speakEnglish}
                onAddPhrase={addToNotebook}
              />
            </CollapsibleCard>
          ))}

          <CollapsibleCard
            id="vocab"
            open={Boolean(openMap.vocab)}
            onToggle={toggleCard}
            eyebrow="Living English"
            title="Textbook-outside phrases"
            subtitle="Click a card to highlight it in the dialogues. Add the ones you actually don't know."
          >
            <VocabBoard
              items={lesson.vocab}
              activeWord={activeWord}
              savedPhrases={savedPhrases}
              onPick={setActiveWord}
              onSpeak={speakEnglish}
              onAdd={addToNotebook}
            />
          </CollapsibleCard>

          <CollapsibleCard
            id="notebook"
            open={Boolean(openMap.notebook)}
            onToggle={toggleCard}
            eyebrow="Personal notebook"
            title="表达本"
            subtitle="这次卡住的说法。本地文件给后面的 AI 读。"
            extra={
              <span className="fold-extra">
                <BookmarkPlus size={14} /> {notebook.items.length}
              </span>
            }
          >
            <NotebookPanel
              items={notebook.items}
              draft={nbDraft}
              setDraft={setNbDraft}
              disk={notebookDisk}
              lessonTitle={lesson.title}
              onAdd={addToNotebook}
              onRemove={(id) => writeNotebook((notebook.items || []).filter((item) => item.id !== id))}
              onToggleStatus={(id) =>
                writeNotebook(
                  (notebook.items || []).map((item) =>
                    item.id === id
                      ? { ...item, status: item.status === 'known' ? 'learning' : 'known' }
                      : item,
                  ),
                )
              }
            />
          </CollapsibleCard>
        </main>

        <ChatPanel
          lesson={lesson}
          messages={messages}
          draft={draft}
          setDraft={setDraft}
          busy={chatBusy}
          error={chatError}
          onSend={sendChat}
        />
      </div>
    </div>
  )
}
