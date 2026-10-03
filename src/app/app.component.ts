import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PRIORITIES } from './models/kanban.model';
import { BoardComponent } from './components/board.component';
import { CardDialogComponent } from './components/card-dialog.component';
import { IconComponent } from './components/icon.component';
import { BoardStore } from './services/board.store';
import { ThemeService } from './services/theme.service';
import { ToastService } from './services/toast.service';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, BoardComponent, CardDialogComponent, IconComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  title = 'Kanban';
  readonly store = inject(BoardStore);
  readonly theme = inject(ThemeService);
  readonly toasts = inject(ToastService);

  readonly priorities = PRIORITIES;
  readonly sidebarOpen = signal(window.innerWidth > 900);
  readonly addingBoard = signal(false);
  boardDraft = '';

  private readonly search = viewChild<ElementRef<HTMLInputElement>>('search');
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('file');

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    const target = e.target as HTMLElement;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
    if (e.key === '/' && !typing) {
      e.preventDefault();
      this.search()?.nativeElement.focus();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing && !e.shiftKey) {
      e.preventDefault();
      this.store.undo();
    }
  }

  navigate(id: string): void {
    this.store.selectBoard(id);
    if (window.innerWidth <= 900) this.sidebarOpen.set(false);
  }

  submitBoard(): void {
    this.store.addBoard(this.boardDraft);
    this.boardDraft = '';
    this.addingBoard.set(false);
  }

  togglePriority(p: (typeof PRIORITIES)[number]): void {
    this.store.priorityFilter.update((cur) => (cur === p ? null : p));
  }

  cardCount(boardId: string): number {
    const b = this.store.boards().find((x) => x.id === boardId);
    return b ? b.columns.reduce((n, c) => n + c.cards.length, 0) : 0;
  }

  exportBoards(): void {
    const blob = new Blob([this.store.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kanban-export.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  pickFile(): void {
    this.fileInput()?.nativeElement.click();
  }

  async importFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 5_000_000) {
      this.toasts.show('File is too large');
      return;
    }
    this.store.importJson(await file.text());
  }
}
