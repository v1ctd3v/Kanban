import { ChangeDetectionStrategy, Component, computed, HostListener, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Card, Column, labelHue, PRIORITIES, uid } from '../models/kanban.model';
import { BoardStore } from '../services/board.store';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-card-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent],
  templateUrl: './card-dialog.component.html',
})
export class CardDialogComponent implements OnInit {
  readonly store = inject(BoardStore);
  readonly card = input.required<Card>();
  readonly column = input.required<Column>();

  readonly priorities = PRIORITIES;
  readonly draft = signal<Card | null>(null);
  readonly columnId = signal('');
  labelInput = '';
  itemInput = '';

  readonly progress = computed(() => {
    const items = this.draft()?.checklist ?? [];
    return items.length ? Math.round((items.filter((i) => i.done).length / items.length) * 100) : 0;
  });

  hue = labelHue;

  ngOnInit(): void {
    this.draft.set(structuredClone(this.card()));
    this.columnId.set(this.column().id);
  }

  patch(p: Partial<Card>): void {
    this.draft.update((d) => (d ? { ...d, ...p } : d));
  }

  addLabel(): void {
    const label = this.labelInput.trim().toLowerCase().slice(0, 24);
    const d = this.draft();
    if (label && d && !d.labels.includes(label) && d.labels.length < 10) {
      this.patch({ labels: [...d.labels, label] });
    }
    this.labelInput = '';
  }

  removeLabel(label: string): void {
    this.patch({ labels: this.draft()!.labels.filter((l) => l !== label) });
  }

  addItem(): void {
    const text = this.itemInput.trim().slice(0, 200);
    const d = this.draft();
    if (text && d) this.patch({ checklist: [...d.checklist, { id: uid(), text, done: false }] });
    this.itemInput = '';
  }

  toggleItem(id: string): void {
    this.patch({ checklist: this.draft()!.checklist.map((i) => (i.id === id ? { ...i, done: !i.done } : i)) });
  }

  editItem(id: string, text: string): void {
    this.patch({ checklist: this.draft()!.checklist.map((i) => (i.id === id ? { ...i, text } : i)) });
  }

  removeItem(id: string): void {
    this.patch({ checklist: this.draft()!.checklist.filter((i) => i.id !== id) });
  }

  save(): void {
    const d = this.draft();
    if (d) this.store.saveCard(d, this.columnId());
    this.close();
  }

  remove(): void {
    this.store.deleteCard(this.card().id);
  }

  close(): void {
    this.store.editingCardId.set(null);
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') this.close();
    else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) this.save();
  }
}
