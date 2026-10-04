import { computed, effect, inject, Injectable, signal } from '@angular/core';
import {
  ArchivedCard, Board, Card, ChecklistItem, COLUMN_COLORS, Column, newCard, newColumn, PRIORITIES, Priority, uid,
} from '../models/kanban.model';
import { demoBoards } from './seed';
import { ToastService } from './toast.service';

const STORAGE_KEY = 'kanban.v2';
const HISTORY_LIMIT = 50;
const EMOJIS = ['📌', '🎯', '🧠', '🛠️', '📚', '🎨', '🌍', '⚡', '🔥', '🧪'];

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '');

function sanitizeCard(k: any): Card | null {
  if (!k || typeof k !== 'object') return null;
  const checklist: ChecklistItem[] = (Array.isArray(k.checklist) ? k.checklist : [])
    .slice(0, 100)
    .map((i: ChecklistItem) => ({ id: str(i?.id, 20) || uid(), text: str(i?.text, 200), done: !!i?.done }));
  return {
    id: str(k.id, 20) || uid(),
    title: str(k.title, 200) || 'Untitled',
    description: str(k.description, 5000),
    priority: PRIORITIES.includes(k.priority) ? k.priority : 'medium',
    labels: (Array.isArray(k.labels) ? k.labels : []).filter((l: unknown) => typeof l === 'string').slice(0, 10).map((l: string) => l.slice(0, 24)),
    due: typeof k.due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k.due) ? k.due : null,
    checklist,
    createdAt: typeof k.createdAt === 'number' ? k.createdAt : Date.now(),
  };
}

function sanitizeArchive(input: unknown): ArchivedCard[] {
  const out: ArchivedCard[] = [];
  for (const a of Array.isArray(input) ? input.slice(0, 500) : []) {
    const card = a && typeof a === 'object' ? sanitizeCard((a as ArchivedCard).card) : null;
    if (!card) continue;
    out.push({
      card,
      columnId: str((a as ArchivedCard).columnId, 20),
      columnName: str((a as ArchivedCard).columnName, 60),
      archivedAt: typeof (a as ArchivedCard).archivedAt === 'number' ? (a as ArchivedCard).archivedAt : Date.now(),
    });
  }
  return out;
}

/** Validates untrusted JSON (localStorage / imported files) and rebuilds clean objects. */
export function sanitizeBoards(input: unknown): Board[] | null {
  if (!Array.isArray(input)) return null;
  const boards: Board[] = [];
  for (const b of input.slice(0, 50)) {
    if (!b || typeof b !== 'object' || !Array.isArray((b as Board).columns)) continue;
    const columns: Column[] = [];
    for (const c of (b as Board).columns.slice(0, 50)) {
      if (!c || typeof c !== 'object') continue;
      const cards: Card[] = [];
      for (const k of Array.isArray(c.cards) ? c.cards.slice(0, 1000) : []) {
        const card = sanitizeCard(k);
        if (card) cards.push(card);
      }
      columns.push({
        id: str(c.id, 20) || uid(),
        name: str(c.name, 60) || 'Untitled',
        color: typeof c.color === 'string' && /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : COLUMN_COLORS[0],
        wip: typeof c.wip === "number" && Number.isInteger(c.wip) && c.wip > 0 && c.wip < 100 ? c.wip : null,
        cards,
      });
    }
    boards.push({
      id: str((b as Board).id, 20) || uid(),
      name: str((b as Board).name, 60) || 'Untitled board',
      emoji: str((b as Board).emoji, 8) || '📌',
      createdAt: typeof (b as Board).createdAt === 'number' ? (b as Board).createdAt : Date.now(),
      columns,
      archive: sanitizeArchive((b as Board).archive),
    });
  }
  return boards.length ? boards : null;
}

@Injectable({ providedIn: 'root' })
export class BoardStore {
  private readonly toasts = inject(ToastService);

  readonly boards = signal<Board[]>(this.load());
  readonly activeId = signal<string>(this.boards()[0].id);
  readonly query = signal('');
  readonly priorityFilter = signal<Priority | null>(null);
  readonly editingCardId = signal<string | null>(null);
  readonly archiveOpen = signal(false);
  readonly paletteOpen = signal(false);

  private history: Board[][] = [];
  readonly undoDepth = signal(0);

  readonly active = computed(() => this.boards().find((b) => b.id === this.activeId()) ?? this.boards()[0]);
  readonly filtering = computed(() => this.query().trim() !== '' || this.priorityFilter() !== null);

  readonly stats = computed(() => {
    const cols = this.active().columns;
    const total = cols.reduce((n, c) => n + c.cards.length, 0);
    const done = cols.length > 1 ? cols[cols.length - 1].cards.length : 0;
    const today = new Date().toISOString().slice(0, 10);
    const overdue = cols
      .slice(0, Math.max(cols.length - 1, 1))
      .reduce((n, c) => n + c.cards.filter((k) => k.due && k.due < today).length, 0);
    return { total, done, overdue, percent: total ? Math.round((done / total) * 100) : 0 };
  });

  readonly editing = computed(() => {
    const id = this.editingCardId();
    if (!id) return null;
    for (const column of this.active().columns) {
      const card = column.cards.find((c) => c.id === id);
      if (card) return { card, column };
    }
    return null;
  });

  constructor() {
    effect(() => {
      const data = JSON.stringify(this.boards());
      try {
        localStorage.setItem(STORAGE_KEY, data);
      } catch {
        /* storage unavailable (private mode / quota) – keep working in memory */
      }
    });
  }

  private load(): Board[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? sanitizeBoards(JSON.parse(raw)) : null;
      if (parsed) return parsed;
    } catch {
      /* fall through to demo data */
    }
    return demoBoards();
  }

  matches(card: Card): boolean {
    const p = this.priorityFilter();
    if (p && card.priority !== p) return false;
    const q = this.query().trim().toLowerCase();
    if (!q) return true;
    return (
      card.title.toLowerCase().includes(q) ||
      card.description.toLowerCase().includes(q) ||
      card.labels.some((l) => l.toLowerCase().includes(q))
    );
  }

  // ---------- history ----------
  private commit(next: Board[]): void {
    this.history.push(this.boards());
    if (this.history.length > HISTORY_LIMIT) this.history.shift();
    this.undoDepth.set(this.history.length);
    this.boards.set(next);
  }

  private mutateActive(fn: (b: Board) => Board): void {
    const id = this.active().id;
    this.commit(this.boards().map((b) => (b.id === id ? fn(b) : b)));
  }

  undo(): void {
    const prev = this.history.pop();
    this.undoDepth.set(this.history.length);
    if (!prev) return;
    this.boards.set(prev);
    if (!prev.some((b) => b.id === this.activeId())) this.activeId.set(prev[0].id);
    this.toasts.show('Undone');
  }

  // ---------- boards ----------
  selectBoard(id: string): void {
    this.activeId.set(id);
    this.query.set('');
    this.priorityFilter.set(null);
  }

  addBoard(name: string): void {
    const clean = name.trim();
    if (!clean) return;
    const board: Board = {
      id: uid(),
      name: clean.slice(0, 60),
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      createdAt: Date.now(),
      columns: [newColumn('To do', COLUMN_COLORS[0]), newColumn('Doing', COLUMN_COLORS[1]), newColumn('Done', COLUMN_COLORS[2])],
      archive: [],
    };
    this.commit([...this.boards(), board]);
    this.selectBoard(board.id);
  }

  renameBoard(name: string): void {
    const clean = name.trim().slice(0, 60);
    if (clean && clean !== this.active().name) this.mutateActive((b) => ({ ...b, name: clean }));
  }

  deleteBoard(id: string): void {
    if (this.boards().length <= 1) {
      this.toasts.show('You need at least one board');
      return;
    }
    const name = this.boards().find((b) => b.id === id)?.name;
    this.commit(this.boards().filter((b) => b.id !== id));
    if (this.activeId() === id) this.activeId.set(this.boards()[0].id);
    this.toasts.show(`Deleted “${name}”`, { label: 'Undo', run: () => this.undo() });
  }

  // ---------- columns ----------
  addColumn(name: string): void {
    const clean = name.trim().slice(0, 60);
    if (!clean) return;
    this.mutateActive((b) => ({
      ...b,
      columns: [...b.columns, newColumn(clean, COLUMN_COLORS[b.columns.length % COLUMN_COLORS.length])],
    }));
  }

  updateColumn(id: string, patch: Partial<Pick<Column, 'name' | 'color' | 'wip'>>): void {
    this.mutateActive((b) => ({
      ...b,
      columns: b.columns.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }

  deleteColumn(id: string): void {
    const col = this.active().columns.find((c) => c.id === id);
    if (!col) return;
    this.mutateActive((b) => ({ ...b, columns: b.columns.filter((c) => c.id !== id) }));
    this.toasts.show(`Deleted column “${col.name}”`, { label: 'Undo', run: () => this.undo() });
  }

  moveColumn(from: number, to: number): void {
    if (from === to) return;
    this.mutateActive((b) => {
      const columns = [...b.columns];
      const [col] = columns.splice(from, 1);
      columns.splice(to, 0, col);
      return { ...b, columns };
    });
  }

  // ---------- cards ----------
  /** Adds a card and returns its id (null if the title was blank). */
  addCard(columnId: string, title: string): string | null {
    const clean = title.trim().slice(0, 200);
    if (!clean) return null;
    const card = newCard(clean);
    this.mutateActive((b) => ({
      ...b,
      columns: b.columns.map((c) => (c.id === columnId ? { ...c, cards: [...c.cards, card] } : c)),
    }));
    return card.id;
  }

  moveCard(fromCol: string, toCol: string, from: number, to: number): void {
    this.mutateActive((b) => {
      const columns = b.columns.map((c) => ({ ...c, cards: [...c.cards] }));
      const src = columns.find((c) => c.id === fromCol);
      const dst = columns.find((c) => c.id === toCol);
      const [card] = src?.cards.splice(from, 1) ?? [];
      if (!src || !dst || !card) return b;
      dst.cards.splice(to, 0, card);
      return { ...b, columns };
    });
  }

  /** Saves an edited card; moves it to the end of `columnId` if that differs from where it lives. */
  saveCard(draft: Card, columnId: string): void {
    this.mutateActive((b) => {
      const clean: Card = {
        ...draft,
        title: draft.title.trim().slice(0, 200) || 'Untitled',
        description: draft.description.slice(0, 5000),
        checklist: draft.checklist.filter((i) => i.text.trim()),
      };
      const columns = b.columns.map((c) => ({ ...c, cards: c.cards.filter((k) => k.id !== draft.id) }));
      const origin = b.columns.find((c) => c.cards.some((k) => k.id === draft.id));
      const target = columns.find((c) => c.id === columnId) ?? columns.find((c) => c.id === origin?.id);
      if (!target) return b;
      if (origin && origin.id === target.id) {
        const at = origin.cards.findIndex((k) => k.id === draft.id);
        target.cards.splice(at, 0, clean);
      } else {
        target.cards.push(clean);
      }
      return { ...b, columns };
    });
  }

  deleteCard(id: string): void {
    this.mutateActive((b) => ({
      ...b,
      columns: b.columns.map((c) => ({ ...c, cards: c.cards.filter((k) => k.id !== id) })),
    }));
    if (this.editingCardId() === id) this.editingCardId.set(null);
    this.toasts.show('Card deleted', { label: 'Undo', run: () => this.undo() });
  }

  // ---------- archive ----------
  archiveCard(id: string): void {
    const column = this.active().columns.find((c) => c.cards.some((k) => k.id === id));
    if (!column) return;
    this.archiveCards(column.id, [id]);
    if (this.editingCardId() === id) this.editingCardId.set(null);
    this.toasts.show('Card archived', { label: 'Undo', run: () => this.undo() });
  }

  /** Archives every card in a column ("clear done"). */
  archiveColumn(columnId: string): void {
    const column = this.active().columns.find((c) => c.id === columnId);
    if (!column?.cards.length) return;
    const n = column.cards.length;
    this.archiveCards(columnId, column.cards.map((k) => k.id));
    this.toasts.show(`Archived ${n} card${n > 1 ? 's' : ''}`, { label: 'Undo', run: () => this.undo() });
  }

  private archiveCards(columnId: string, ids: string[]): void {
    const now = Date.now();
    this.mutateActive((b) => {
      const column = b.columns.find((c) => c.id === columnId)!;
      const moved = column.cards
        .filter((k) => ids.includes(k.id))
        .map((card) => ({ card, columnId, columnName: column.name, archivedAt: now }));
      return {
        ...b,
        columns: b.columns.map((c) => (c.id === columnId ? { ...c, cards: c.cards.filter((k) => !ids.includes(k.id)) } : c)),
        archive: [...moved.reverse(), ...b.archive],
      };
    });
  }

  /** Puts an archived card back at the end of its original column (or the first column if that's gone). */
  restoreArchived(cardId: string): void {
    const board = this.active();
    const entry = board.archive.find((a) => a.card.id === cardId);
    if (!entry) return;
    const target = board.columns.find((c) => c.id === entry.columnId) ?? board.columns[0];
    if (!target) {
      this.toasts.show('Add a column first');
      return;
    }
    this.mutateActive((b) => ({
      ...b,
      archive: b.archive.filter((a) => a.card.id !== cardId),
      columns: b.columns.map((c) => (c.id === target.id ? { ...c, cards: [...c.cards, entry.card] } : c)),
    }));
    this.toasts.show(`Restored to ${target.name}`, { label: 'Undo', run: () => this.undo() });
  }

  deleteArchived(cardId: string): void {
    this.mutateActive((b) => ({ ...b, archive: b.archive.filter((a) => a.card.id !== cardId) }));
    this.toasts.show('Deleted permanently', { label: 'Undo', run: () => this.undo() });
  }

  duplicateCard(id: string): void {
    this.mutateActive((b) => ({
      ...b,
      columns: b.columns.map((c) => {
        const at = c.cards.findIndex((k) => k.id === id);
        if (at < 0) return c;
        const src = c.cards[at];
        const copy: Card = {
          ...src,
          id: uid(),
          title: `${src.title} (copy)`.slice(0, 200),
          checklist: src.checklist.map((i) => ({ ...i, id: uid() })),
          createdAt: Date.now(),
        };
        const cards = [...c.cards];
        cards.splice(at + 1, 0, copy);
        return { ...c, cards };
      }),
    }));
    this.toasts.show('Card duplicated');
  }

  // ---------- import / export ----------
  exportJson(): string {
    return JSON.stringify({ app: 'kanban', version: 2, boards: this.boards() }, null, 2);
  }

  importJson(text: string): boolean {
    try {
      const data = JSON.parse(text);
      const boards = sanitizeBoards(Array.isArray(data) ? data : data?.boards);
      if (!boards) throw new Error('invalid');
      this.commit(boards);
      this.activeId.set(boards[0].id);
      this.toasts.show(`Imported ${boards.length} board${boards.length > 1 ? 's' : ''}`, {
        label: 'Undo',
        run: () => this.undo(),
      });
      return true;
    } catch {
      this.toasts.show('That file is not a valid Kanban export');
      return false;
    }
  }

  resetDemo(): void {
    const boards = demoBoards();
    this.commit(boards);
    this.activeId.set(boards[0].id);
    this.toasts.show('Demo data restored', { label: 'Undo', run: () => this.undo() });
  }
}
