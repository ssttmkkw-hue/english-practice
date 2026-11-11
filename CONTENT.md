# AI Lang Learning · 给 Codex / Cursor 的课源说明

这个项目是英语口语网页课。

## 禁止

- **不要把课程 JSON 贴进聊天。**
- **不要把 JSON 发到网页里。**
- **不要让用户自己复制粘贴一整课。**

## 必须做

1. 先读 `content/notebook.json`。
2. 用文件工具 **直接写入**：

```text
content/lessons/<kebab-id>.json
```

例如话题是 seeing a doctor，就写到：

```text
content/lessons/seeing-a-doctor.json
```

3. 写完后告诉用户：刷新 http://localhost:5174/ ，左侧课库会出现这一课。

## 必读：表达本

`content/notebook.json` 是用户自己圈出来的、课本里不太会教的地道说法。生成新课、改对话时：

1. 能自然用上的短语，优先写进对话。
2. 给一句很短的提示，说明它为什么不像课本英语。
3. 不要把这些短语当成普通单词再翻译一整句。
4. `status: "learning"` 的条目要重点照顾；`known` 可以少提。

用户能读懂英语。缺的是开口，以及生活化表达。

## 你要做的事

1. 围绕用户给的话题，展开成一节口语课。
2. 生成 **4 段由浅入深的对话**（A2 → A2+ → B1 → B1+）。
3. 抽出 **8–14 个课本外的短语**，重点是 note（为什么地道），不要中学词汇表。
4. 保存为 `content/lessons/<id>.json`。
5. `id` 用 kebab-case，并与文件名一致。

## JSON schema

```json
{
  "id": "cafe-order",
  "title": "Ordering Coffee",
  "titleZh": "点咖啡",
  "topic": "ordering a drink at a cafe",
  "levelRange": "A2–B1+",
  "scene": "A customer orders at a busy neighborhood cafe.",
  "goals": ["place a simple order", "customize a drink"],
  "lecture": {
    "overview": "English speaking notes. Do not translate the whole lesson.",
    "patterns": [
      { "en": "I'd like a ..., please.", "note": "safer and more polite than I want" }
    ],
    "tips": ["English speaking tip"]
  },
  "dialogues": [
    {
      "id": "d1",
      "level": "A2",
      "title": "A simple order",
      "titleEn": "A simple order",
      "summary": "one English line",
      "speakers": { "A": "Customer", "B": "Barista" },
      "turns": [
        { "speaker": "A", "en": "Could you remake it?", "highlights": ["remake it"] }
      ]
    }
  ],
  "vocab": [
    {
      "word": "do the trick",
      "ipa": "/duː ðə trɪk/",
      "pos": "idiom",
      "note": "管用，不是 trick 那个把戏",
      "example": "This should do the trick."
    }
  ],
  "source": "codex"
}
```

## 规则

- 正好 4 段对话，难度标签依次：`A2` `A2+` `B1` `B1+`
- 每段 8–12 轮，speaker 只能是 `A` 或 `B`
- `highlights` 必须是英文原句里的连续子串，而且应是生活化表达，不是 coffee / Saturday / hot
- **不要给整句中文翻译**。中文只出现在地道短语的 note 里
- 网页侧栏会按文件自动出现新课；表达本由网页写入 `content/notebook.json`
