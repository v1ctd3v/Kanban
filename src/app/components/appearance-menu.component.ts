import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { ACCENTS, DENSITIES, MODES, STYLES, ThemeService } from '../services/theme.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-appearance-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <button #trigger class="icon-btn" type="button" aria-label="Appearance" title="Appearance" aria-haspopup="dialog"
            [attr.aria-expanded]="open()" (click)="toggle()">
      <app-icon name="palette" />
    </button>
    @if (open()) {
      <div class="appearance" role="dialog" aria-label="Appearance">
        <fieldset class="appearance-group">
          <legend>Style</legend>
          <div class="style-options">
            @for (s of styles; track s.id) {
              <label class="style-option" [class.on]="theme.appearance().style === s.id">
                <input type="radio" name="ui-style" [value]="s.id" [checked]="theme.appearance().style === s.id"
                       (change)="theme.set({ style: s.id })" />
                <span class="style-preview" [attr.data-preview]="s.id" aria-hidden="true">
                  <i></i><i></i><i></i>
                </span>
                <span class="style-name">{{ s.label }}</span>
                <span class="style-hint">{{ s.hint }}</span>
              </label>
            }
          </div>
        </fieldset>

        <fieldset class="appearance-group">
          <legend>Mode</legend>
          <div class="seg">
            @for (m of modes; track m) {
              <label [class.on]="theme.appearance().mode === m">
                <input type="radio" name="ui-mode" [value]="m" [checked]="theme.appearance().mode === m"
                       (change)="theme.set({ mode: m })" />
                <app-icon [name]="m === 'system' ? 'monitor' : m === 'light' ? 'sun' : 'moon'" [size]="14" />
                {{ m }}
              </label>
            }
          </div>
        </fieldset>

        <fieldset class="appearance-group">
          <legend>Accent</legend>
          <div class="accent-options">
            @for (a of accents; track a.id) {
              <label class="accent-option" [title]="a.label">
                <input type="radio" name="ui-accent" [value]="a.id" [checked]="theme.appearance().accent === a.id"
                       [attr.aria-label]="a.label" (change)="theme.set({ accent: a.id })" />
                <span [style.background]="a.swatch" aria-hidden="true"></span>
              </label>
            }
          </div>
        </fieldset>

        <fieldset class="appearance-group">
          <legend>Density</legend>
          <div class="seg">
            @for (d of densities; track d) {
              <label [class.on]="theme.appearance().density === d">
                <input type="radio" name="ui-density" [value]="d" [checked]="theme.appearance().density === d"
                       (change)="theme.set({ density: d })" />
                {{ d }}
              </label>
            }
          </div>
        </fieldset>
      </div>
    }
  `,
  styles: [':host{position:relative;display:inline-flex}'],
})
export class AppearanceMenuComponent {
  readonly theme = inject(ThemeService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly open = signal(false);

  readonly styles = STYLES;
  readonly modes = MODES;
  readonly accents = ACCENTS;
  readonly densities = DENSITIES;

  toggle(): void {
    this.open.update((v) => !v);
    if (this.open()) {
      // Move focus to the selected style so the panel is usable from the keyboard right away.
      setTimeout(() => this.host.nativeElement.querySelector<HTMLInputElement>('.appearance input:checked')?.focus());
    }
  }

  @HostListener('document:mousedown', ['$event'])
  onOutside(e: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node)) this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.host.nativeElement.querySelector<HTMLElement>('button')?.focus();
  }
}
