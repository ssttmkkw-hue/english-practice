# english-practice

练习英语 / English practice

英语口语网页课。围绕一个话题展开讲解、四段由浅入深的对话，以及关键单词。网页提问走阿里云函数；课程 JSON 放在 `content/lessons/`，Cursor / Codex 也可以往这个目录写课。

## 启动

```bash
npm install
npm run dev
```

浏览器打开终端里给出的本地地址（默认 `http://localhost:5174`）。电脑网页版即可。

## 页面上能做什么

- 左侧课库：内置课来自 `content/lessons/*.json`
- 默认不显示整句中文。地道说法在对话下方用短提示标出
- 点黄色高亮或「收入表达本」，写入 `content/notebook.json`
- 顶部输入话题，点「生成课程」：调用阿里云 FC，并带上表达本
- 右侧继续聊也会把表达本发给函数
- 「全文翻译」是开关，需要时才打开
- 「复制给 Codex」会复制一段**写文件指令**：Codex 应写入 `content/lessons/<id>.json`，不要把 JSON 贴到聊天或网页
- 「刷新课库」重新读取该目录；「从剪贴板导入」是误贴 JSON 时的补救
- 「生成课程」走阿里云函数，成功后写入 `content/lessons/<id>.json`。若解析失败，原始回复在 `content/lessons/_last-fc-raw.txt`

## 网页和本地怎么对应

| 谁来写 | 写到哪里 | 网页怎么看见 |
|---|---|---|
| Codex / Cursor | **直接写** `content/lessons/<id>.json` | 点「刷新课库」 |
| 用户圈出的地道说法 | `content/notebook.json` | 表达本；后续 AI 必读 |
| 阿里云函数「生成课程」 | `content/lessons/<id>.json` | 生成成功后自动出现 |

`npm run dev` 时，表达本通过 `/api/notebook` 写磁盘。只开静态页面时，浏览器里仍有一份，可再点「下载一份」。

函数地址只出现在开发代理里，前端不放 API Key。
