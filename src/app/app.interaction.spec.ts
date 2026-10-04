import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { BoardStore } from './services/board.store';

describe('Board interactions', () => {
  let fixture: ComponentFixture<AppComponent>;
  let store: BoardStore;
  let el: HTMLElement;

  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const q = <T extends HTMLElement>(sel: string) => el.querySelector<T>(sel)!;
  const qa = (sel: string) => Array.from(el.querySelectorAll<HTMLElement>(sel));
  const type = async (input: HTMLInputElement | HTMLTextAreaElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await settle();
  };
  const columns = () => store.active().columns;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [AppComponent] }).compileComponents();
    fixture = TestBed.createComponent(AppComponent);
    el = fixture.nativeElement;
    store = TestBed.inject(BoardStore);
    await settle();
  });

  describe('card editor', () => {
    const open = async (title: string) => {
      qa('.card').find((c) => c.textContent!.includes(title))!.click();
      await settle();
    };

    it('opens with focus on the title and marks the background inert', async () => {
      await open('Ship the public launch page');
      expect(q('.dialog')).toBeTruthy();
      expect(document.activeElement).toBe(q('.dialog-title'));
      expect(q('.app').hasAttribute('inert')).toBeTrue();
    });

    it('saves edits', async () => {
      await open('Ship the public launch page');
      await type(q<HTMLInputElement>('.dialog-title'), 'Launch page v2');
      q<HTMLButtonElement>('.dialog-foot .btn.primary').click();
      await settle();
      expect(q('.dialog')).toBeNull();
      expect(columns().flatMap((c) => c.cards).some((c) => c.title === 'Launch page v2')).toBeTrue();
    });

    it('discards edits on cancel', async () => {
      await open('Ship the public launch page');
      await type(q<HTMLInputElement>('.dialog-title'), 'Should not stick');
      qa('.dialog-foot .btn.ghost').find((b) => b.textContent!.trim() === 'Cancel')!.click();
      await settle();
      expect(columns().flatMap((c) => c.cards).some((c) => c.title === 'Should not stick')).toBeFalse();
    });

    it('closes on Escape', async () => {
      await open('Ship the public launch page');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await settle();
      expect(q('.dialog')).toBeNull();
    });

    it('adds and completes checklist items', async () => {
      await open('Ship the public launch page');
      await type(q<HTMLInputElement>('.inline-add input'), 'Write copy');
      q<HTMLInputElement>('.inline-add input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      await settle();
      q<HTMLButtonElement>('.checklist .check').click();
      await settle();
      expect(q('.progress.big span').style.width).toBe('100%');
      q<HTMLButtonElement>('.dialog-foot .btn.primary').click();
      await settle();
      const card = columns().flatMap((c) => c.cards).find((c) => c.title.startsWith('Ship the public'))!;
      expect(card.checklist).toEqual([jasmine.objectContaining({ text: 'Write copy', done: true })]);
    });

    it('moves the card when the status changes', async () => {
      await open('Ship the public launch page');
      const select = q<HTMLSelectElement>('select');
      select.value = select.options[select.options.length - 1].value;
      select.dispatchEvent(new Event('change'));
      await settle();
      q<HTMLButtonElement>('.dialog-foot .btn.primary').click();
      await settle();
      expect(columns().at(-1)!.cards.some((c) => c.title.startsWith('Ship the public'))).toBeTrue();
    });

    it('traps Tab inside the dialog', async () => {
      await open('Ship the public launch page');
      const focusables = qa('.dialog button, .dialog input, .dialog textarea, .dialog select');
      focusables[focusables.length - 1].focus();
      const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
      document.dispatchEvent(event);
      expect(event.defaultPrevented).toBeTrue();
      expect(document.activeElement).toBe(focusables[0]);
    });
  });

  describe('column menu', () => {
    const openMenu = async (index = 0) => {
      qa('.column-head .icon-btn')[index].click();
      await settle();
    };

    it('exposes the expanded state', async () => {
      const btn = qa('.column-head .icon-btn')[0];
      expect(btn.getAttribute('aria-expanded')).toBe('false');
      await openMenu();
      expect(btn.getAttribute('aria-expanded')).toBe('true');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await settle();
      expect(q('.menu')).toBeNull();
    });

    it('changes the WIP limit', async () => {
      await openMenu();
      qa('.stepper button')[1].click();
      await settle();
      qa('.stepper button')[1].click();
      await settle();
      expect(columns()[0].wip).toBe(2);
      qa('.stepper button')[0].click();
      await settle();
      qa('.stepper button')[0].click();
      await settle();
      expect(columns()[0].wip).toBeNull();
    });

    it('changes the column color', async () => {
      await openMenu();
      qa('.swatch')[3].click();
      await settle();
      expect(columns()[0].color).toBe(store.active().columns[0].color);
      expect(columns()[0].color).toBe('#c0607d');
    });

    it('deletes a column and can undo it', async () => {
      const before = columns().length;
      await openMenu();
      q<HTMLButtonElement>('.menu-item.danger').click();
      fixture.detectChanges(); // not settle(): the Undo toast keeps a 5s timer pending
      expect(columns().length).toBe(before - 1);
      store.undo();
      fixture.detectChanges();
      expect(columns().length).toBe(before);
    });

    it('renames a column from the menu', async () => {
      await openMenu();
      qa('.menu-item')[0].click();
      await settle();
      const input = q<HTMLInputElement>('.rename');
      input.value = 'Ideas';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      await settle();
      expect(columns()[0].name).toBe('Ideas');
    });
  });

  describe('keyboard card moves', () => {
    const press = async (card: HTMLElement, key: string) => {
      card.dispatchEvent(new KeyboardEvent('keydown', { key, altKey: true, cancelable: true }));
      await settle();
    };

    it('moves a card to the next column with Alt+ArrowRight and announces it', async () => {
      const card = columns()[0].cards[0];
      await press(qa('.card')[0], 'ArrowRight');
      expect(columns()[1].cards.some((c) => c.id === card.id)).toBeTrue();
      expect(el.querySelector('[role=status]')!.textContent).toContain(`Moved ${card.title} to ${columns()[1].name}`);
    });

    it('reorders within a column with Alt+ArrowDown', async () => {
      const [first, second] = columns()[0].cards;
      await press(qa('.card')[0], 'ArrowDown');
      expect(columns()[0].cards.map((c) => c.id).slice(0, 2)).toEqual([second.id, first.id]);
    });

    it('does nothing at the edges', async () => {
      const ids = columns()[0].cards.map((c) => c.id);
      await press(qa('.card')[0], 'ArrowUp');
      await press(qa('.card')[0], 'ArrowLeft');
      expect(columns()[0].cards.map((c) => c.id)).toEqual(ids);
    });

    it('ignores arrows without Alt', async () => {
      const ids = columns()[0].cards.map((c) => c.id);
      qa('.card')[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      await settle();
      expect(columns()[0].cards.map((c) => c.id)).toEqual(ids);
    });

    it('opens the editor on Enter only when the card itself is focused', async () => {
      const card = qa('.card')[0];
      card.querySelector('button')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await settle();
      expect(q('.dialog')).toBeNull();
      card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      await settle();
      expect(q('.dialog')).toBeTruthy();
    });
  });

  describe('archive panel', () => {
    it('archives from a card, lists it in the panel and restores it', async () => {
      const title = columns()[0].cards[0].title;
      qa('.card')[0].querySelector<HTMLButtonElement>('[aria-label="Archive card"]')!.click();
      fixture.detectChanges();
      expect(columns()[0].cards.some((c) => c.title === title)).toBeFalse();

      q<HTMLButtonElement>('.archive-btn').click();
      fixture.detectChanges();
      expect(q('.drawer')).toBeTruthy();
      expect(q('.app').hasAttribute('inert')).toBeTrue();
      expect(q('.archive-title').textContent).toContain(title);

      q<HTMLButtonElement>('.archive-item .btn').click();
      fixture.detectChanges();
      expect(columns()[0].cards.some((c) => c.title === title)).toBeTrue();
      expect(q('.drawer-empty')).toBeTruthy();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();
      expect(q('.drawer')).toBeNull();
    });

    it('archives all cards in a column from the column menu', async () => {
      const last = qa('.column-head .icon-btn').length - 1;
      qa('.column-head .icon-btn')[last].click();
      fixture.detectChanges();
      qa('.menu-item').find((b) => b.textContent!.includes('Archive all cards'))!.click();
      fixture.detectChanges();
      expect(columns().at(-1)!.cards.length).toBe(0);
    });
  });

  describe('command palette', () => {
    const openPalette = async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, cancelable: true }));
      await settle();
    };
    const input = () => q<HTMLInputElement>('.palette-input input');
    const typeQuery = async (text: string) => {
      input().value = text;
      input().dispatchEvent(new Event('input'));
      await settle();
    };
    const key = async (k: string) => {
      input().dispatchEvent(new KeyboardEvent('keydown', { key: k, cancelable: true }));
      await settle();
    };

    it('opens with Ctrl+K, focuses the input, and closes with Escape', async () => {
      await openPalette();
      expect(q('.palette')).toBeTruthy();
      expect(document.activeElement).toBe(input());
      expect(q('.app').hasAttribute('inert')).toBeTrue();
      await key('Escape');
      expect(q('.palette')).toBeNull();
    });

    it('shows actions and boards, but cards only after typing', async () => {
      await openPalette();
      const groups = () => qa('.palette-group').map((g) => g.textContent!.trim());
      expect(groups()).toEqual(['Actions', 'Boards']);
      await typeQuery('onboarding');
      expect(groups()).toEqual(['Cards']);
      expect(q('.palette-option').textContent).toContain('Write onboarding emails');
    });

    it('moves the active option with the arrow keys', async () => {
      await openPalette();
      expect(input().getAttribute('aria-activedescendant')).toBe('palette-opt-0');
      await key('ArrowDown');
      expect(input().getAttribute('aria-activedescendant')).toBe('palette-opt-1');
      await key('ArrowUp');
      await key('ArrowUp');
      expect(input().getAttribute('aria-activedescendant')).toBe(`palette-opt-${qa('.palette-option').length - 1}`);
    });

    it('switches boards', async () => {
      await openPalette();
      await typeQuery('personal');
      await key('Enter');
      expect(q('.palette')).toBeNull();
      expect(store.active().name).toBe('Personal');
    });

    it('opens a card on another board', async () => {
      await openPalette();
      await typeQuery('sourdough');
      await key('Enter');
      expect(store.active().name).toBe('Personal');
      expect(q('.dialog')).toBeTruthy();
      expect(q<HTMLInputElement>('.dialog-title').value).toBe('Learn to bake sourdough');
    });

    it('creates a new card and opens it in the editor', async () => {
      const before = columns()[0].cards.length;
      await openPalette();
      await typeQuery('new card');
      await key('Enter');
      expect(columns()[0].cards.length).toBe(before + 1);
      expect(q('.dialog')).toBeTruthy();
    });

    it('does not list every card when the query is a board name', async () => {
      await openPalette();
      await typeQuery('launch');
      const cards = qa('.palette-option').filter((o) => o.textContent!.includes('Product Launch ·'));
      expect(cards.map((o) => o.querySelector('.palette-label')!.textContent)).toEqual(['Ship the public launch page']);
    });

    it('says when nothing matches', async () => {
      await openPalette();
      await typeQuery('zzzz');
      expect(q('.palette-empty')).toBeTruthy();
    });
  });
});
