import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../services/toast.service';
import { Card, COLUMN_COLORS, Column, dueState, formatDue, labelHue } from '../models/kanban.model';
import { BoardStore } from '../services/board.store';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DragDropModule, FormsModule, IconComponent],
  templateUrl: './board.component.html',
})
export class BoardComponent {
  readonly store = inject(BoardStore);
  private readonly toasts = inject(ToastService);
  readonly colors = COLUMN_COLORS;
  /** On touch screens a short press-and-hold starts a drag, so swiping still scrolls. */
  readonly dragDelay = { touch: 220, mouse: 0 };

  readonly addingTo = signal<string | null>(null);
  readonly menuFor = signal<string | null>(null);
  readonly renaming = signal<string | null>(null);
  readonly addingColumn = signal(false);
  draft = '';
  columnDraft = '';

  /** Columns with their cards after search / priority filtering. */
  readonly lanes = computed(() =>
    this.store.active().columns.map((column) => ({
      column,
      cards: column.cards.filter((c) => this.store.matches(c)),
      over: column.wip !== null && column.cards.length > column.wip,
    })),
  );

  @HostListener('document:keydown.escape')
  @HostListener('document:click')
  closeMenu(): void {
    if (this.menuFor()) this.menuFor.set(null);
  }

  toggleMenu(event: Event, id: string): void {
    event.stopPropagation();
    this.menuFor.update((cur) => (cur === id ? null : id));
  }

  dropCard(event: CdkDragDrop<string>): void {
    const card = event.item.data as Card;
    this.store.moveCard(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex,
    );
    this.announceMove(card, event.container.data, event.currentIndex);
  }

  /** Keyboard alternative to drag and drop: Alt + arrow keys. */
  onCardKey(event: KeyboardEvent, laneIndex: number, cardIndex: number, card: Card): void {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter') {
      this.store.editingCardId.set(card.id);
      return;
    }
    if (!event.altKey || this.store.filtering()) return;
    const columns = this.store.active().columns;
    const from = columns[laneIndex];
    let to = from;
    let position = cardIndex;
    switch (event.key) {
      case 'ArrowUp': position = cardIndex - 1; break;
      case 'ArrowDown': position = cardIndex + 1; break;
      case 'ArrowLeft': to = columns[laneIndex - 1] ?? from; position = Math.min(cardIndex, to.cards.length); break;
      case 'ArrowRight': to = columns[laneIndex + 1] ?? from; position = Math.min(cardIndex, to.cards.length); break;
      default: return;
    }
    event.preventDefault();
    const max = to === from ? from.cards.length - 1 : to.cards.length;
    if (position < 0 || position > max || (to === from && position === cardIndex)) return;
    this.store.moveCard(from.id, to.id, cardIndex, position);
    this.announceMove(card, to.id, position);
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-card-id="${card.id}"]`)?.focus(),
    );
  }

  private announceMove(card: Card, columnId: string, position: number): void {
    const column = this.store.active().columns.find((c) => c.id === columnId);
    if (column) {
      this.toasts.announce(`Moved ${card.title} to ${column.name}, position ${position + 1} of ${column.cards.length}`);
    }
  }

  cardLabel(card: Card, column: Column): string {
    const parts = [card.title, `${card.priority} priority`, `in ${column.name}`];
    if (card.due) parts.push(`due ${formatDue(card.due)}`);
    if (card.checklist.length) parts.push(`${this.done(card)} of ${card.checklist.length} checklist items done`);
    return parts.join(', ');
  }

  dropColumn(event: CdkDragDrop<unknown>): void {
    this.store.moveColumn(event.previousIndex, event.currentIndex);
  }

  startAdd(columnId: string): void {
    this.addingTo.set(columnId);
    this.draft = '';
  }

  submitCard(columnId: string, event?: Event): void {
    event?.preventDefault();
    this.store.addCard(columnId, this.draft);
    this.draft = '';
  }

  commitRename(column: Column, value: string): void {
    const name = value.trim();
    if (name && name !== column.name) this.store.updateColumn(column.id, { name: name.slice(0, 60) });
    this.renaming.set(null);
  }

  changeWip(column: Column, delta: number): void {
    const next = (column.wip ?? 0) + delta;
    this.store.updateColumn(column.id, { wip: next > 0 ? Math.min(next, 99) : null });
  }

  submitColumn(): void {
    if (this.columnDraft.trim()) this.store.addColumn(this.columnDraft);
    this.columnDraft = '';
    this.addingColumn.set(false);
  }

  done(card: Card): number {
    return card.checklist.filter((i) => i.done).length;
  }

  due(card: Card) {
    return { state: dueState(card.due), text: card.due ? formatDue(card.due) : '' };
  }

  hue = labelHue;

  trackById = (_: number, item: { id: string }) => item.id;
}
