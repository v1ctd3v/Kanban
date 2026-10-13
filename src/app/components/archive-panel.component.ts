import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, OnDestroy } from '@angular/core';
import { BoardStore } from '../services/board.store';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-archive-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="backdrop drawer-backdrop" (mousedown)="close()">
      <div class="drawer" role="dialog" aria-modal="true" aria-labelledby="archive-heading" (mousedown)="$event.stopPropagation()">
        <header class="drawer-head">
          <div>
            <h2 id="archive-heading" class="drawer-title">Archive</h2>
            <p class="drawer-sub">{{ store.active().archive.length }} card{{ store.active().archive.length === 1 ? '' : 's' }} in {{ store.active().name }}</p>
          </div>
          <button class="icon-btn" type="button" aria-label="Close archive" (click)="close()"><app-icon name="x" /></button>
        </header>
        @if (store.active().archive.length) {
          <ul class="archive-list">
            @for (a of store.active().archive; track a.card.id) {
              <li class="archive-item">
                <div class="archive-text">
                  <span class="archive-title">{{ a.card.title }}</span>
                  <span class="archive-meta">{{ a.columnName || 'Unknown column' }} · {{ date(a.archivedAt) }}</span>
                </div>
                <button class="btn ghost sm" type="button" [attr.aria-label]="'Restore ' + a.card.title" (click)="store.restoreArchived(a.card.id)">Restore</button>
                <button class="icon-btn tiny danger" type="button" [attr.aria-label]="'Delete ' + a.card.title + ' permanently'"
                        (click)="store.deleteArchived(a.card.id)"><app-icon name="trash" [size]="13" /></button>
              </li>
            }
          </ul>
        } @else {
          <p class="drawer-empty">Nothing archived yet. Archive finished cards from a card's menu, or clear a whole column from its options.</p>
        }
      </div>
    </div>
  `,
})
export class ArchivePanelComponent implements AfterViewInit, OnDestroy {
  readonly store = inject(BoardStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly opener = document.activeElement as HTMLElement | null;

  ngAfterViewInit(): void {
    this.host.nativeElement.querySelector<HTMLElement>('.drawer .icon-btn')?.focus();
  }

  ngOnDestroy(): void {
    setTimeout(() => this.opener?.focus?.());
  }

  close(): void {
    this.store.archiveOpen.set(false);
  }

  date(ts: number): string {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.close();
    } else if (e.key === 'Tab') {
      // Keep focus inside the drawer.
      const items = Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('.drawer button'));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!this.host.nativeElement.contains(active) || (e.shiftKey && active === first)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
}
