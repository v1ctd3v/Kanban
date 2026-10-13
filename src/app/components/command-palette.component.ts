import { AfterViewInit, ChangeDetectionStrategy, Component, computed, ElementRef, inject, OnDestroy, output, signal, viewChild } from '@angular/core';
import { BoardStore } from '../services/board.store';
import { ThemeService } from '../services/theme.service';
import { IconComponent } from './icon.component';

interface Command {
  id: string;
  group: 'Actions' | 'Boards' | 'Cards';
  label: string;
  hint?: string;
  /** Extra text to match against (defaults to label + hint). */
  search?: string;
  icon: string;
  run: () => void;
}

const MAX_CARDS = 30;

@Component({
  selector: 'app-command-palette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="backdrop palette-backdrop" (mousedown)="close()">
      <div class="palette" role="dialog" aria-modal="true" aria-label="Command menu" (mousedown)="$event.stopPropagation()">
        <div class="palette-input">
          <app-icon name="search" [size]="16" />
          <input #input type="text" role="combobox" aria-label="Type a command or search" aria-expanded="true"
                 aria-controls="palette-list" aria-autocomplete="list" autocomplete="off" spellcheck="false"
                 [attr.aria-activedescendant]="results().length ? 'palette-opt-' + active() : null"
                 placeholder="Type a command, board or card…" [value]="query()"
                 (input)="onInput(input.value)" (keydown)="onKey($event)" />
          <kbd>esc</kbd>
        </div>
        <div class="palette-list" id="palette-list" role="listbox" aria-label="Results">
          @for (group of groups(); track group.name) {
            <div role="group" [attr.aria-label]="group.name">
              <div class="palette-group" aria-hidden="true">{{ group.name }}</div>
              @for (item of group.items; track item.cmd.id) {
                <div class="palette-option" role="option" [id]="'palette-opt-' + item.index"
                     [attr.aria-selected]="item.index === active()" [class.active]="item.index === active()"
                     (mousemove)="active.set(item.index)" (click)="run(item.cmd)">
                  <app-icon [name]="item.cmd.icon" [size]="15" />
                  <span class="palette-label">{{ item.cmd.label }}</span>
                  @if (item.cmd.hint) { <span class="palette-hint">{{ item.cmd.hint }}</span> }
                </div>
              }
            </div>
          } @empty {
            <p class="palette-empty">No results for “{{ query() }}”</p>
          }
        </div>
      </div>
    </div>
  `,
})
export class CommandPaletteComponent implements AfterViewInit, OnDestroy {
  private readonly store = inject(BoardStore);
  private readonly theme = inject(ThemeService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly opener = document.activeElement as HTMLElement | null;
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');

  /** Export needs the app's download helper; the shell handles it. */
  readonly exportRequested = output<void>();

  readonly query = signal('');
  readonly active = signal(0);

  private readonly commands = computed<Command[]>(() => {
    const board = this.store.active();
    const first = board.columns[0];
    const actions: Command[] = [];
    if (first) {
      actions.push({ id: 'new-card', group: 'Actions', icon: 'plus', label: 'New card', hint: `in ${first.name}`, run: () => this.newCard() });
    }
    actions.push(
      { id: 'new-board', group: 'Actions', icon: 'layout', label: 'New board', run: () => this.newBoard() },
      { id: 'search', group: 'Actions', icon: 'search', label: 'Search cards', hint: '/', run: () => this.focus('.search input') },
      {
        id: 'theme', group: 'Actions', icon: this.theme.theme() === 'dark' ? 'sun' : 'moon',
        label: `Switch to ${this.theme.theme() === 'dark' ? 'light' : 'dark'} theme`, run: () => this.theme.toggle(),
      },
      { id: 'archive', group: 'Actions', icon: 'archive', label: 'Open archive', hint: `${board.archive.length}`, run: () => this.store.archiveOpen.set(true) },
      { id: 'export', group: 'Actions', icon: 'download', label: 'Export boards as JSON', run: () => this.exportRequested.emit() },
    );
    if (this.store.undoDepth()) {
      actions.push({ id: 'undo', group: 'Actions', icon: 'undo', label: 'Undo last change', run: () => this.store.undo() });
    }

    const boards: Command[] = this.store.boards()
      .filter((b) => b.id !== board.id)
      .map((b) => ({ id: 'board-' + b.id, group: 'Boards', icon: 'arrow', label: b.name, hint: 'Go to board', run: () => this.store.selectBoard(b.id) }));

    const cards: Command[] = this.store.boards().flatMap((b) =>
      b.columns.flatMap((c) =>
        c.cards.map((k) => ({
          id: 'card-' + k.id, group: 'Cards' as const, icon: 'text', label: k.title, hint: `${b.name} · ${c.name}`,
          // Match the card's own text, not the board name, so typing a board name doesn't list every card.
          search: `${k.title} ${k.labels.join(' ')} ${c.name}`,
          run: () => {
            this.store.selectBoard(b.id);
            this.store.editingCardId.set(k.id);
          },
        })),
      ),
    );
    return [...actions, ...boards, ...cards];
  });

  /** Commands matching every word of the query; cards only appear once you type. */
  readonly results = computed(() => {
    const words = this.query().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return this.commands().filter((c) => c.group !== 'Cards');
    const hits = this.commands().filter((c) => {
      const text = (c.search ?? `${c.label} ${c.hint ?? ''}`).toLowerCase();
      return words.every((w) => text.includes(w));
    });
    const cards = hits.filter((c) => c.group === 'Cards').slice(0, MAX_CARDS);
    return [...hits.filter((c) => c.group !== 'Cards'), ...cards];
  });

  readonly groups = computed(() => {
    const out: { name: string; items: { cmd: Command; index: number }[] }[] = [];
    this.results().forEach((cmd, index) => {
      let group = out.find((g) => g.name === cmd.group);
      if (!group) out.push((group = { name: cmd.group, items: [] }));
      group.items.push({ cmd, index });
    });
    return out;
  });

  ngAfterViewInit(): void {
    this.input().nativeElement.focus();
  }

  ngOnDestroy(): void {
    // Hand focus back unless the command moved it somewhere on purpose (e.g. opened the editor).
    setTimeout(() => {
      if (document.activeElement === document.body || !document.activeElement) this.opener?.focus?.();
    });
  }

  onInput(value: string): void {
    this.query.set(value);
    this.active.set(0);
  }

  onKey(e: KeyboardEvent): void {
    const n = this.results().length;
    if (e.key === 'ArrowDown' && n) {
      e.preventDefault();
      this.active.update((i) => (i + 1) % n);
      this.scrollActive();
    } else if (e.key === 'ArrowUp' && n) {
      e.preventDefault();
      this.active.update((i) => (i - 1 + n) % n);
      this.scrollActive();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = this.results()[this.active()];
      if (cmd) this.run(cmd);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
    } else if (e.key === 'Tab') {
      e.preventDefault(); // the input is the only focus stop
    }
  }

  run(cmd: Command): void {
    this.close();
    cmd.run();
  }

  close(): void {
    this.store.paletteOpen.set(false);
  }

  private scrollActive(): void {
    requestAnimationFrame(() =>
      this.host.nativeElement.querySelector('.palette-option.active')?.scrollIntoView({ block: 'nearest' }),
    );
  }

  private newCard(): void {
    const first = this.store.active().columns[0];
    const id = first ? this.store.addCard(first.id, 'Untitled') : null;
    if (id) this.store.editingCardId.set(id);
  }

  private newBoard(): void {
    this.store.addBoard('Untitled board');
    this.focus('.board-title', true);
  }

  private focus(selector: string, select = false): void {
    setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>(selector);
      el?.focus();
      if (select) el?.select();
    });
  }
}
