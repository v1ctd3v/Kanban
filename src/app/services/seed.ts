import { Board, Card, COLUMN_COLORS, newCard, newColumn, Priority } from '../models/kanban.model';

function card(
  title: string,
  priority: Priority,
  labels: string[] = [],
  extra: Partial<Card> = {},
): Card {
  return { ...newCard(title), priority, labels, ...extra };
}

function inDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const item = (text: string, done = false) => ({
  id: Math.random().toString(36).slice(2, 9),
  text,
  done,
});

export function demoBoards(): Board[] {
  const backlog = newColumn('Backlog', COLUMN_COLORS[7]);
  const todo = newColumn('To do', COLUMN_COLORS[0]);
  const doing = newColumn('In progress', COLUMN_COLORS[1]);
  doing.wip = 3;
  const review = newColumn('Review', COLUMN_COLORS[4]);
  const done = newColumn('Done', COLUMN_COLORS[2]);

  backlog.cards = [
    card('Explore dark-mode illustrations', 'low', ['design']),
    card('Keyboard shortcut cheat sheet', 'low', ['ux']),
  ];
  todo.cards = [
    card('Drag cards between columns', 'medium', ['tutorial'], {
      description: 'Grab any card and drop it in another column. Columns can be reordered by their header too.',
    }),
    card('Click a card to open the editor', 'medium', ['tutorial'], {
      description: 'Edit the description, priority, labels, due date and checklist. Ctrl/⌘+Enter saves.',
    }),
    card('Ship the public launch page', 'high', ['marketing'], { due: inDays(2) }),
  ];
  doing.cards = [
    card('Write onboarding emails', 'urgent', ['marketing', 'copy'], {
      due: inDays(-1),
      checklist: [item('Welcome email', true), item('Day-3 tips'), item('Day-7 nudge')],
    }),
    card('Polish card animations', 'medium', ['design'], { due: inDays(5) }),
  ];
  review.cards = [
    card('API rate-limit audit', 'high', ['backend'], {
      checklist: [item('Review limits', true), item('Load test', true), item('Write summary')],
    }),
  ];
  done.cards = [
    card('Set up CI pipeline', 'medium', ['devops']),
    card('Design system tokens', 'high', ['design'], {
      checklist: [item('Colors', true), item('Spacing', true), item('Type scale', true)],
    }),
  ];

  const now = Date.now();
  return [
    {
      id: 'demo-product',
      name: 'Product Launch',
      emoji: '🚀',
      createdAt: now,
      columns: [backlog, todo, doing, review, done],
      archive: [],
    },
    {
      id: 'demo-personal',
      name: 'Personal',
      emoji: '🌱',
      createdAt: now + 1,
      archive: [],
      columns: [
        { ...newColumn('Ideas', COLUMN_COLORS[3]), cards: [card('Learn to bake sourdough', 'low')] },
        { ...newColumn('This week', COLUMN_COLORS[0]), cards: [card('Book dentist', 'medium', [], { due: inDays(3) })] },
        newColumn('Done', COLUMN_COLORS[2]),
      ],
    },
  ];
}
