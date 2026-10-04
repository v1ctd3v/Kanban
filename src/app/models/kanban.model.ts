export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent'];

export const COLUMN_COLORS = [
  '#5b7bd5', '#c9962b', '#4f9a6d', '#c0607d',
  '#8070c8', '#c4623a', '#3d9a9a', '#8b8d93',
];

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Card {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  labels: string[];
  /** ISO date (yyyy-mm-dd) or null */
  due: string | null;
  checklist: ChecklistItem[];
  createdAt: number;
}

export interface Column {
  id: string;
  name: string;
  color: string;
  /** Work-in-progress limit, null = unlimited */
  wip: number | null;
  cards: Card[];
}

export interface ArchivedCard {
  card: Card;
  /** Where the card lived, so it can be restored there. */
  columnId: string;
  columnName: string;
  archivedAt: number;
}

export interface Board {
  id: string;
  name: string;
  emoji: string;
  columns: Column[];
  archive: ArchivedCard[];
  createdAt: number;
}

export const uid = (): string =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

export function newCard(title: string): Card {
  return {
    id: uid(),
    title,
    description: '',
    priority: 'medium',
    labels: [],
    due: null,
    checklist: [],
    createdAt: Date.now(),
  };
}

export function newColumn(name: string, color = COLUMN_COLORS[0]): Column {
  return { id: uid(), name, color, wip: null, cards: [] };
}

export function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export type DueState = 'none' | 'overdue' | 'today' | 'soon' | 'later';

export function dueState(due: string | null): DueState {
  if (!due) return 'none';
  const today = todayIso();
  if (due < today) return 'overdue';
  if (due === today) return 'today';
  const diff = (Date.parse(due) - Date.parse(today)) / 86_400_000;
  return diff <= 3 ? 'soon' : 'later';
}

export function formatDue(due: string): string {
  const d = new Date(due + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Deterministic hue for a label so the same label always has the same color. */
export function labelHue(label: string): number {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) % 360;
  return h;
}
