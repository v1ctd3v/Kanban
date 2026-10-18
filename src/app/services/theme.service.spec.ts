import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  const root = () => document.documentElement.dataset;
  const make = () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const svc = TestBed.inject(ThemeService);
    TestBed.tick();
    return svc;
  };

  beforeEach(() => localStorage.clear());

  it('defaults to the functional style, following the system mode', () => {
    const svc = make();
    expect(svc.appearance()).toEqual({ style: 'functional', mode: 'system', accent: 'blue', density: 'comfortable' });
    expect(root()['style']).toBe('functional');
    expect(root()['accent']).toBe('blue');
    expect(['light', 'dark']).toContain(root()['theme']!);
  });

  it('applies and persists changes', () => {
    const svc = make();
    svc.set({ style: 'editorial', mode: 'dark', accent: 'green', density: 'compact' });
    TestBed.tick();
    expect(root()['style']).toBe('editorial');
    expect(root()['theme']).toBe('dark');
    expect(root()['density']).toBe('compact');
    expect(make().appearance()).toEqual({ style: 'editorial', mode: 'dark', accent: 'green', density: 'compact' });
  });

  it('migrates the old light/dark setting', () => {
    localStorage.setItem('kanban.theme', 'dark');
    expect(make().appearance().mode).toBe('dark');
  });

  it('ignores invalid saved values', () => {
    localStorage.setItem('kanban.appearance', JSON.stringify({ style: 'neon', mode: 'sepia', accent: 'gold', density: 9 }));
    expect(make().appearance()).toEqual({ style: 'functional', mode: 'system', accent: 'blue', density: 'comfortable' });
  });

  it('toggle pins the opposite of the current theme', () => {
    const svc = make();
    svc.set({ mode: 'light' });
    svc.toggle();
    expect(svc.appearance().mode).toBe('dark');
    expect(svc.theme()).toBe('dark');
  });
});
