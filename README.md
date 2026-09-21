# Action Buttons Chat Demo

**Live demo:** https://stoffberg.github.io/vite-solid-tailwind-starter/

SolidJS + Vite + Tailwind demo of assistant **action buttons**: confirm, choose an option, or open a file picker. These are client actions, not suggested follow-up prompts.

No API keys. The assistant is a local mock with a few scripted paths.

## Try this

1. Send `Schedule a meeting`, then click **Yes** / **No**. The label is sent as your next message.
2. Send `What times work?` and pick **Morning** / **Afternoon** / **Evening**.
3. Send `Read the uploaded file`, click **Choose file**, pick any local file. The demo attaches it and auto-sends `I've attached the file to this message (filename)`.

## Develop

```bash
npm install
npm run dev
```

Open http://localhost:3000/

```bash
npm run build
npm run preview
```

## Deploy

Static `dist/` output. `vercel.json` rewrites all routes to `index.html`.

- Public demo (no login): https://stoffberg.github.io/vite-solid-tailwind-starter/
- Same demo at the user Pages root: https://stoffberg.github.io/
- Existing Vercel project still serves the old starter: `https://vite-solid-tailwind-starter.vercel.app`
