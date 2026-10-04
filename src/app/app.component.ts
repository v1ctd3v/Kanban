import { ChangeDetectionStrategy, Component, computed, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PRIORITIES } from './models/kanban.model';
import { BoardComponent } from './components/board.component';
import { ArchivePanelComponent } from './components/archive-panel.component';
import { CardDialogComponent } from './components/card-dialog.component';
import { CommandPaletteComponent } from './components/command-palette.component';
import { IconComponent } from './components/icon.component';
import { BoardStore } from './services/board.store';
import { downloadText } from './services/download';
import { ThemeService } from './services/theme.service';
import { ToastService } from './services/toast.service';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, BoardComponent, CardDialogComponent, ArchivePanelComponent, CommandPaletteComponent, IconComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  title = 'Kanban';
  readonly store = inject(BoardStore);
  readonly theme = inject(ThemeService);
  readonly toasts = inject(ToastService);

  readonly priorities = PRIORITIES;
  readonly modKey = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';
  readonly sidebarOpen = signal(window.innerWidth > 900);
  readonly addingBoard = signal(false);
  /** Any modal surface is open; the app behind it becomes inert. */
  readonly overlayOpen = computed(() => !!this.store.editing() || this.store.archiveOpen() || this.store.paletteOpen());
  boardDraft = '';

  private readonly search = viewChild<ElementRef<HTMLInputElement>>('search');
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('file');

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    const target = e.target as HTMLElement;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (this.store.paletteOpen()) this.store.paletteOpen.set(false);
      else if (!this.overlayOpen()) this.store.paletteOpen.set(true);
    } else if (e.key === '/' && !typing && !this.overlayOpen()) {
      e.preventDefault();
      this.search()?.nativeElement.focus();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing && !e.shiftKey && !this.overlayOpen()) {
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
    downloadText('kanban-export.json', this.store.exportJson());
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
