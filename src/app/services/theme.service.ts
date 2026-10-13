import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';

export type Theme = 'dark' | 'light';
export type ThemeMode = 'system' | Theme;
export type UiStyle = 'functional' | 'editorial';
export type Density = 'comfortable' | 'compact';
export type Accent = 'blue' | 'violet' | 'green' | 'rust' | 'pink' | 'graphite';

export interface Appearance {
  style: UiStyle;
  mode: ThemeMode;
  accent: Accent;
  density: Density;
}

export const STYLES: { id: UiStyle; label: string; hint: string }[] = [
  { id: 'functional', label: 'Functional', hint: 'Clear, dense, sans-serif' },
  { id: 'editorial', label: 'Editorial', hint: 'Serif titles, airy, warm' },
];
export const MODES: ThemeMode[] = ['system', 'light', 'dark'];
export const DENSITIES: Density[] = ['comfortable', 'compact'];
/** Swatch colours shown in the picker (the light-mode accent). */
export const ACCENTS: { id: Accent; label: string; swatch: string }[] = [
  { id: 'blue', label: 'Blue', swatch: '#2563eb' },
  { id: 'violet', label: 'Violet', swatch: '#7c3aed' },
  { id: 'green', label: 'Green', swatch: '#15803d' },
  { id: 'rust', label: 'Rust', swatch: '#b3471d' },
  { id: 'pink', label: 'Pink', swatch: '#be185d' },
  { id: 'graphite', label: 'Graphite', swatch: '#374151' },
];

const KEY = 'kanban.appearance';
const LEGACY_KEY = 'kanban.theme';
const DEFAULTS: Appearance = { style: 'functional', mode: 'system', accent: 'blue', density: 'comfortable' };

/** Appearance preferences: visual style, light/dark mode, accent colour and density. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly appearance = signal<Appearance>(ThemeService.load());
  private readonly systemDark = signal(ThemeService.prefersDark());

  /** The light/dark theme actually in use (resolves "system"). */
  readonly theme = computed<Theme>(() => {
    const mode = this.appearance().mode;
    return mode === 'system' ? (this.systemDark() ? 'dark' : 'light') : mode;
  });

  constructor() {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => this.systemDark.set(e.matches);
    query?.addEventListener?.('change', onChange);
    inject(DestroyRef).onDestroy(() => query?.removeEventListener?.('change', onChange));

    effect(() => {
      const a = this.appearance();
      const root = document.documentElement.dataset;
      root['theme'] = this.theme();
      root['style'] = a.style;
      root['accent'] = a.accent;
      root['density'] = a.density;
      try {
        localStorage.setItem(KEY, JSON.stringify(a));
      } catch {
        /* storage unavailable */
      }
    });
  }

  set(patch: Partial<Appearance>): void {
    this.appearance.update((a) => ({ ...a, ...patch }));
  }

  /** Flip between light and dark (pins the mode instead of following the system). */
  toggle(): void {
    this.set({ mode: this.theme() === 'dark' ? 'light' : 'dark' });
  }

  private static prefersDark(): boolean {
    return !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  }

  private static load(): Appearance {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const v = JSON.parse(raw) ?? {};
        return {
          style: STYLES.some((s) => s.id === v.style) ? v.style : DEFAULTS.style,
          mode: MODES.includes(v.mode) ? v.mode : DEFAULTS.mode,
          accent: ACCENTS.some((x) => x.id === v.accent) ? v.accent : DEFAULTS.accent,
          density: DENSITIES.includes(v.density) ? v.density : DEFAULTS.density,
        };
      }
      // Earlier versions only stored "light" or "dark".
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy === 'light' || legacy === 'dark') return { ...DEFAULTS, mode: legacy };
    } catch {
      /* fall back to defaults */
    }
    return { ...DEFAULTS };
  }
}
