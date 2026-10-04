# Kanban

A fast, good-looking Kanban board built with Angular 21 (standalone components + signals) and the CDK drag-and-drop module. No UI framework: the design system lives in `src/styles.scss`.

## Features

- Multiple boards, with columns you can add, rename (double-click), recolor, reorder and delete
- Drag and drop for cards and columns
- Card editor with description, priority, labels, due date and a checklist with progress
- WIP limits per column, progress ring, overdue counter
- Search (`/`), priority filters, dark/light theme
- Keyboard friendly: `Enter` opens a card, `Alt`+arrow keys move it between and within columns (announced to screen readers), `/` focuses search
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
- `.github/workflows/deploy-pages.yml` publishes to GitHub Pages when run manually (one-time setup: Settings → Pages → Source: *GitHub Actions*).
- The page ships with a strict Content-Security-Policy (`src/index.html`); production builds therefore keep font inlining off.
- Dependabot groups Angular and test-tooling updates.
