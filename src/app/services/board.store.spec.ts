import { TestBed } from '@angular/core/testing';
import { BoardStore, sanitizeBoards } from './board.store';

describe('BoardStore', () => {
  let store: BoardStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(BoardStore);
  });

  const cols = () => store.active().columns;

  it('adds and removes cards, with undo', () => {
    const col = cols()[0];
    const before = col.cards.length;
    store.addCard(col.id, '  New card  ');
    expect(cols()[0].cards.length).toBe(before + 1);
    expect(cols()[0].cards[before].title).toBe('New card');
    store.undo();
    expect(cols()[0].cards.length).toBe(before);
  });

  it('ignores blank card titles', () => {
    const before = cols()[0].cards.length;
    store.addCard(cols()[0].id, '   ');
    expect(cols()[0].cards.length).toBe(before);
  });

  it('moves cards between columns', () => {
    const [a, b] = cols();
    const moved = a.cards[0];
    store.moveCard(a.id, b.id, 0, 0);
    expect(cols()[1].cards[0].id).toBe(moved.id);
    expect(cols()[0].cards.some((c) => c.id === moved.id)).toBeFalse();
  });

  it('reorders columns', () => {
    const first = cols()[0].id;
    store.moveColumn(0, 2);
    expect(cols()[2].id).toBe(first);
  });

  it('moves a card to another column when saved from the editor', () => {
    const card = cols()[0].cards[0];
    const target = cols()[3];
    store.saveCard({ ...card, title: 'Renamed' }, target.id);
    expect(cols()[3].cards.at(-1)?.title).toBe('Renamed');
    expect(cols()[0].cards.some((c) => c.id === card.id)).toBeFalse();
  });

  it('refuses to delete the last board', () => {
    store.deleteBoard(store.boards()[1].id);
    store.deleteBoard(store.boards()[0].id);
    expect(store.boards().length).toBe(1);
  });

  it('filters by query and priority', () => {
    store.query.set('zzzz-nothing');
    expect(cols().flatMap((c) => c.cards).some((c) => store.matches(c))).toBeFalse();
    store.query.set('');
    store.priorityFilter.set('urgent');
    expect(cols().flatMap((c) => c.cards).every((c) => !store.matches(c) || c.priority === 'urgent')).toBeTrue();
  });

  it('persists to localStorage', () => {
    store.addBoard('Persisted');
    TestBed.tick();
    expect(localStorage.getItem('kanban.v2')).toContain('Persisted');
  });

  it('sanitizes imported data', () => {
    expect(sanitizeBoards('nope')).toBeNull();
    expect(sanitizeBoards([{ columns: 'x' }])).toBeNull();
    const out = sanitizeBoards([
      { name: 'B', columns: [{ name: 'C', color: 'javascript:1', wip: -5, cards: [{ title: 'T', priority: 'bogus', due: 'x' }] }] },
    ])!;
    expect(out[0].columns[0].color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(out[0].columns[0].wip).toBeNull();
    expect(out[0].columns[0].cards[0].priority).toBe('medium');
    expect(out[0].columns[0].cards[0].due).toBeNull();
  });

  describe('archive', () => {
    it('archives a card, remembers its column and restores it there', () => {
      const col = cols()[1];
      const card = col.cards[0];
      store.archiveCard(card.id);
      expect(cols()[1].cards.some((c) => c.id === card.id)).toBeFalse();
      expect(store.active().archive[0]).toEqual(jasmine.objectContaining({ columnId: col.id, columnName: col.name }));
      store.restoreArchived(card.id);
      expect(cols()[1].cards.at(-1)!.id).toBe(card.id);
      expect(store.active().archive.length).toBe(0);
    });

    it('restores to the first column when the original column is gone', () => {
      const col = cols()[1];
      const card = col.cards[0];
      store.archiveCard(card.id);
      store.deleteColumn(col.id);
      store.restoreArchived(card.id);
      expect(cols()[0].cards.some((c) => c.id === card.id)).toBeTrue();
    });

    it('archives a whole column and can undo it', () => {
      const done = cols().at(-1)!;
      const n = done.cards.length;
      store.archiveColumn(done.id);
      expect(cols().at(-1)!.cards.length).toBe(0);
      expect(store.active().archive.length).toBe(n);
      store.undo();
      expect(cols().at(-1)!.cards.length).toBe(n);
    });

    it('deletes archived cards permanently', () => {
      const card = cols()[0].cards[0];
      store.archiveCard(card.id);
      store.deleteArchived(card.id);
      expect(store.active().archive.length).toBe(0);
      expect(cols().flatMap((c) => c.cards).some((c) => c.id === card.id)).toBeFalse();
    });

    it('keeps archived cards out of the board stats', () => {
      const before = store.stats().total;
      store.archiveCard(cols()[0].cards[0].id);
      expect(store.stats().total).toBe(before - 1);
    });

    it('sanitizes imported archives', () => {
      const out = sanitizeBoards([{ name: 'B', columns: [], archive: [{ card: { title: 'Old', priority: 'nope' }, columnName: 5 }, 'junk'] }])!;
      expect(out[0].archive.length).toBe(1);
      expect(out[0].archive[0].card.priority).toBe('medium');
      expect(out[0].archive[0].columnName).toBe('');
      expect(sanitizeBoards([{ name: 'B', columns: [] }])![0].archive).toEqual([]);
    });
  });
});
