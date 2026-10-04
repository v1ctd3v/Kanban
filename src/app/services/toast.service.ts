import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  text: string;
  actionLabel?: string;
  action?: () => void;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly items = signal<Toast[]>([]);
  /** Text for the screen-reader-only live region. */
  readonly announcement = signal('');
  private next = 1;

  show(text: string, action?: { label: string; run: () => void }, ms = 5000): void {
    const id = this.next++;
    this.items.update((l) => [
      ...l.slice(-3),
      { id, text, actionLabel: action?.label, action: action?.run },
    ]);
    setTimeout(() => this.dismiss(id), ms);
  }

  announce(text: string): void {
    // Toggle a trailing space so repeating the same message is announced again.
    this.announcement.update((cur) => (cur === text ? text + '\u00a0' : text));
  }

  dismiss(id: number): void {
    this.items.update((l) => l.filter((t) => t.id !== id));
  }
}
