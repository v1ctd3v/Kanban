# Kanban

A fast, good-looking Kanban board built with Angular 21 (standalone components + signals) and the CDK drag-and-drop module. No UI framework: the design system lives in `src/styles.scss`.

## Features

- Multiple boards, with columns you can add, rename (double-click), recolor, reorder and delete
- Drag and drop for cards and columns
- Card editor with description, priority, labels, due date and a checklist with progress
- WIP limits per column, progress ring, overdue counter
- Search (`/`), priority filters, dark/light theme
- Undo for every change (`Ctrl/⌘+Z`, or the toast button)
- Auto-saved to `localStorage`; JSON import/export (imports are validated and sanitized)

## Development

```
npm install
npm start      # http://localhost:4200
npm run build
npm test
```
