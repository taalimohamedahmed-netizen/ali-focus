# Ali Focus — Desktop (Electron)

Wraps the live web app (`https://taalimohamedahmed-netizen.github.io/ali-focus/`)
and adds **silent screenshot capture** — no permission prompt, no "sharing
screen" banner. Same Supabase backend as the web version, so desktop and web
users share all data (tasks, scores, screenshots).

## Run in dev

```bash
cd electron
npm install
npm start
```

Point it at a local web build instead of the live site:

```bash
ALI_FOCUS_URL=http://localhost:3000 npm start
```

## Build the Windows installer (.exe)

```bash
cd electron
npm install
npm run dist:win
```

Output lands in `electron/dist/`. Share the `.exe` with the team — one-click
install, no admin needed.

## How capture works

1. Web app (loaded inside Electron) detects `window.electronCapture` and skips
   the browser share prompt.
2. On session start it schedules 1-3 random captures during the session.
3. Each capture calls the main process (`desktopCapturer`), which grabs the
   full screen silently and returns it to the renderer.
4. The renderer uploads to the Supabase `screenshots` bucket — same as web.

## Notes

- Requires the Supabase `screenshots` table + bucket (see `../supabase/schema.sql`).
- Loads the live URL, so any web deploy is reflected immediately — no rebuild
  needed unless you change `main.js`/`preload.js`.
