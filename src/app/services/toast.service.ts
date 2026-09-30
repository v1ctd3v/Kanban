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
  private next = 1;

  show(text: string, action?: { label: string; run: () => void }, ms = 5000): void {
    const id = this.next++;
    this.items.update((l) => [
      ...l.slice(-3),
      { id, text, actionLabel: action?.label, action: action?.run },
    ]);
    setTimeout(() => this.dismiss(id), ms);
  }

  dismiss(id: number): void {
    this.items.update((l) => l.filter((t) => t.id !== id));
  }
}
