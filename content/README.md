# 课程内容目录

这个文件夹是网页和本地 AI（Cursor / Codex）共用的课源。

网页会通过 Vite 打包加载 `content/lessons/*.json`。  
用户也可以在对话里让 Codex 按同样 schema 写新文件，刷新后就会出现在左侧课程库。

**表达本**在 `content/notebook.json`。这是用户自己不会的地道说法。后续 AI 生成或改课时必须先读它。

## 放哪里

| 路径 | 用途 |
|---|---|
| `content/lessons/*.json` | 正式课程。网页启动时自动加载 |
| 浏览器「导出 JSON」 | 把网页里生成的课保存成文件，再丢进上面这个目录 |
| `localStorage` | 网页当场生成的课，刷新还在，但不会自动写成磁盘文件 |

## 最小写法

每个 JSON 必须是一个对象，字段见根目录 `CONTENT.md`。

文件名建议：

```text
cafe-order.json
weekend-plans.json
airport-checkin.json
```

`id` 和文件名（去掉 `.json`）保持一致。
