import { AfterViewInit, ChangeDetectionStrategy, Component, computed, ElementRef, HostListener, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
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
export class CardDialogComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly opener = document.activeElement as HTMLElement | null;
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

  ngAfterViewInit(): void {
    this.host.nativeElement.querySelector<HTMLElement>('.dialog-title')?.focus();
  }

  ngOnDestroy(): void {
    const id = this.card().id;
    // Return focus to the card that opened the editor (it may have re-rendered after a move).
    setTimeout(() => {
      const target = document.querySelector<HTMLElement>(`[data-card-id="${id}"]`) ?? this.opener;
      target?.focus?.();
    });
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

  archive(): void {
    this.store.archiveCard(this.card().id);
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
    else if (e.key === 'Tab') this.trapFocus(e);
  }

  private trapFocus(e: KeyboardEvent): void {
    const dialog = this.host.nativeElement.querySelector<HTMLElement>('.dialog');
    if (!dialog) return;
    const items = Array.from(
      dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])'),
    ).filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (!dialog.contains(active)) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }
}
