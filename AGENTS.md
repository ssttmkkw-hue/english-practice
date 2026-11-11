# AGENTS.md

This is an English oral-practice web app.

## Do this when asked to create / expand a lesson

1. Read `content/notebook.json` first.
2. **Write a file.** Do not paste JSON in chat. Do not send JSON to the webpage.
3. Path:

```text
content/lessons/<kebab-id>.json
```

Example: topic "seeing a doctor" → `content/lessons/seeing-a-doctor.json`

4. After writing, tell the user to refresh `http://localhost:5174/`. The left library reads that folder.
5. Follow `CONTENT.md` for the JSON schema.
6. English-first. Chinese only for living idioms, not full-line translation.

## Do not

- Dump the lesson JSON into the chat for the user to copy.
- Change React code unless the user asked to change the UI.
- Put API keys in files.
