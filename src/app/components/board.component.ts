import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  readonly colors = COLUMN_COLORS;

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

  @HostListener('document:click')
  closeMenu(): void {
    if (this.menuFor()) this.menuFor.set(null);
  }

  toggleMenu(event: Event, id: string): void {
    event.stopPropagation();
    this.menuFor.update((cur) => (cur === id ? null : id));
  }

  dropCard(event: CdkDragDrop<string>): void {
    this.store.moveCard(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex,
    );
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
