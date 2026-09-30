import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const PATHS: Record<string, string[]> = {
  plus: ['M12 5v14M5 12h14'],
  x: ['M18 6L6 18M6 6l12 12'],
  trash: ['M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6'],
  search: ['M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14z', 'M21 21l-4.3-4.3'],
  sun: ['M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z', 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'],
  moon: ['M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'],
  undo: ['M3 7v6h6', 'M3 13a9 9 0 1 0 3-7.7L3 8'],
  download: ['M12 3v12M7 10l5 5 5-5M5 21h14'],
  upload: ['M12 15V3M7 8l5-5 5 5M5 21h14'],
  menu: ['M3 6h18M3 12h18M3 18h18'],
  calendar: ['M4 6h16v14H4zM4 10h16M8 3v4M16 3v4'],
  check: ['M5 13l4 4L19 7'],
  copy: ['M9 9h11v11H9z', 'M5 15V4h11'],
  more: ['M5 12h.01M12 12h.01M19 12h.01'],
  list: ['M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2'],
  text: ['M4 6h16M4 12h16M4 18h10'],
  layout: ['M4 4h6v16H4zM14 4h6v9h-6z'],
  sparkle: ['M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z'],
  alert: ['M12 3l10 18H2z', 'M12 10v5M12 18h.01'],
  refresh: ['M21 12a9 9 0 1 1-3-6.7L21 8', 'M21 3v5h-5'],
};

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         aria-hidden="true">
      @for (d of paths(); track $index) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
  styles: [':host{display:inline-flex;line-height:0;flex:none}'],
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly size = input(16);
  readonly paths = computed(() => PATHS[this.name()] ?? []);
}
