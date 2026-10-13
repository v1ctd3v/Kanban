import { DestroyRef, effect, inject, Injectable } from '@angular/core';
import { BoardStore } from './board.store';

const ID = '[A-Za-z0-9_-]{1,20}';
const PATTERN = new RegExp(`^#/board/(${ID})(?:/card/(${ID}))?$`);

/**
 * Keeps the URL hash in sync with the open board and card, so cards can be linked,
 * bookmarked and reopened after a refresh, and Back closes an open card.
 *   #/board/<boardId>              a board
 *   #/board/<boardId>/card/<id>    a card open in the editor
 */
@Injectable({ providedIn: 'root' })
export class UrlStateService {
  private readonly store = inject(BoardStore);

  constructor() {
    this.apply(location.hash);
    const onPop = () => this.apply(location.hash);
    window.addEventListener('popstate', onPop);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('popstate', onPop));

    effect(() => {
      const board = this.store.active();
      const cardId = this.store.editing()?.card.id ?? null;
      document.title = `${board.name} · Kanban`;
      const target = UrlStateService.format(board.id, cardId);
      if (location.hash === target) return;

      const current = PATTERN.exec(location.hash);
      if (cardId) {
        history.pushState({ kanbanCard: cardId }, '', target);
      } else if (current?.[2] && history.state?.kanbanCard === current[2] && current[1] === board.id) {
        // Closing a card we opened: step back instead of piling up history entries.
        history.back();
      } else if (current && current[1] !== board.id) {
        history.pushState(null, '', target);
      } else {
        history.replaceState(null, '', target);
      }
    });
  }

  static format(boardId: string, cardId: string | null): string {
    return `#/board/${boardId}` + (cardId ? `/card/${cardId}` : '');
  }

  /** Current URL of a card, for sharing. */
  static linkTo(boardId: string, cardId: string): string {
    return location.href.split('#')[0] + UrlStateService.format(boardId, cardId);
  }

  private apply(hash: string): void {
    const match = PATTERN.exec(hash);
    if (!match) {
      if (this.store.editingCardId()) this.store.editingCardId.set(null);
      return;
    }
    const [, boardId, cardId] = match;
    const board = this.store.boards().find((b) => b.id === boardId);
    if (!board) return;
    if (this.store.activeId() !== boardId) this.store.selectBoard(boardId);
    const exists = !!cardId && board.columns.some((c) => c.cards.some((k) => k.id === cardId));
    this.store.editingCardId.set(exists ? cardId! : null);
  }
}
