## Webpage Monitor

Periodically captures screenshots of the sites listed in `sitelist.txt`,
computes visual diffs, and serves a small UI to browse history.

### Setup

1. Install dependencies (already done once):

```bash
npm install
```

2. Install Playwright browser binaries (at least Chromium):

```bash
npx playwright install chromium
```

### Configuration

Key settings (see `src/config.ts`):

- **Screenshot schedule**: `SCREENSHOT_CRON` env var (cron syntax, default `*/15 * * * *`).
- **Retention**: `RETENTION_DAYS` env var (days to keep, default `7`).
- **Viewport**: `VIEWPORT` in `src/config.ts`.
- **Server port**: `PORT` env var (default `3000`).

### Running

- **Run the scheduler only** (periodic captures + cleanup):

```bash
npm run dev:monitor
```

- **Run a one-off capture + cleanup**:

```bash
npm run capture-once
```

- **Start the web UI server**:

```bash
npm run dev:server
```

Then open `http://localhost:3000` in your browser.

### Data layout

- Screenshots and diffs: `data/<site-id>/<timestamp>.png` and
  `data/<site-id>/<timestamp>_diff.png`.
- Metadata per site: `data/<site-id>/meta.json`.
