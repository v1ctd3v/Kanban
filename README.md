# Kanban

A fast, good-looking Kanban board built with Angular 21 (standalone components + signals) and the CDK drag-and-drop module. No UI framework: the design system lives in `src/styles.scss` — warm neutrals, hairline borders and a single accent, set in Instrument Serif, Geist and Geist Mono (self-hosted via Fontsource, so the app makes no third-party requests).

## Features

- Multiple boards, with columns you can add, rename (double-click), recolor, reorder and delete
- Drag and drop for cards and columns
- Card editor with description, priority, labels, due date and a checklist with progress
- WIP limits per column, board progress meter, overdue counter
- Command palette (`⌘K` / `Ctrl+K`): jump to any board or card, create cards and boards, switch theme, export
- Search (`/`), priority filters, dark/light theme
- Works on phones: press-and-hold to drag, one column per screen, card editor as a bottom sheet
- Keyboard friendly: `Enter` opens a card, `Alt`+arrow keys move it between and within columns (announced to screen readers), `/` focuses search
- Archive finished cards (one at a time, or a whole column at once) and restore them from the archive panel
- Undo for every change (`Ctrl/⌘+Z`, or the toast button)
- Auto-saved to `localStorage`; JSON import/export (imports are validated and sanitized)

## Development

```
npm install
npm start      # http://localhost:4200
npm run build
npm test       # headless Chrome, single run
npm run test:watch
```

## CI and deployment

- `.github/workflows/ci.yml` builds, tests and audits production dependencies on every PR and push to `master`.
- `.github/workflows/deploy-pages.yml` publishes to GitHub Pages automatically once CI passes on `master` (it deploys the exact commit CI tested), and can also be run manually. One-time setup: Settings → Pages → Source: *GitHub Actions*. To redeploy, use **Run workflow** rather than re-running an old run.
- The page ships with a strict Content-Security-Policy (`src/index.html`): scripts, styles and fonts load only from the app's own origin. Production builds keep font inlining off because it injects an inline handler.
- Dependabot groups Angular and test-tooling updates.
