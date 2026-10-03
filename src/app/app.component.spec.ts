import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    return TestBed.configureTestingModule({ imports: [AppComponent] }).compileComponents();
  });

  it('renders the active board with its columns and cards', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.column:not(.new-column)').length).toBeGreaterThan(2);
    expect(el.querySelectorAll('.card').length).toBeGreaterThan(0);
  });
});
