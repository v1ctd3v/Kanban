import { parseDate, parseQuickAdd } from './quick-add';

describe('quick add parser', () => {
  // Wednesday 14 October 2026
  const today = new Date(2026, 9, 14);
  const parse = (s: string) => parseQuickAdd(s, today);

  it('extracts priority, labels and a trailing date', () => {
    expect(parse('Ship launch page fri !urgent #marketing #web')).toEqual({
      title: 'Ship launch page',
      priority: 'urgent',
      labels: ['marketing', 'web'],
      due: '2026-10-16',
    });
  });

  it('leaves plain titles alone', () => {
    expect(parse('Write onboarding emails')).toEqual({ title: 'Write onboarding emails', priority: null, labels: [], due: null });
  });

  it('does not treat a date word in the middle of a title as a due date', () => {
    expect(parse('Plan monday standup').due).toBeNull();
    expect(parse('Plan monday standup').title).toBe('Plan monday standup');
  });

  it('understands "due" and "@" anywhere', () => {
    expect(parse('due tomorrow call the bank')).toEqual(jasmine.objectContaining({ title: 'call the bank', due: '2026-10-15' }));
    expect(parse('Call @2026-11-02 the bank').due).toBe('2026-11-02');
  });

  it('keeps at least one word as the title', () => {
    expect(parse('tomorrow').title).toBe('tomorrow');
    expect(parse('tomorrow').due).toBeNull();
    expect(parse('#tag !high').title).toBe('#tag !high');
  });

  it('accepts priority shorthands', () => {
    expect(parse('a !1').priority).toBe('low');
    expect(parse('a !med').priority).toBe('medium');
    expect(parse('a !HIGH').priority).toBe('high');
    expect(parse('a !nope').title).toBe('a !nope');
  });

  it('parses relative and calendar dates', () => {
    expect(parseDate('today', today)).toBe('2026-10-14');
    expect(parseDate('tmr', today)).toBe('2026-10-15');
    expect(parseDate('wed', today)).toBe('2026-10-14'); // same day counts
    expect(parseDate('mon', today)).toBe('2026-10-19');
    expect(parseDate('next week', today)).toBe('2026-10-19');
    expect(parseDate('next fri', today)).toBe('2026-10-23');
    expect(parseDate('next month', today)).toBe('2026-11-14');
    expect(parseDate('in 3 days', today)).toBe('2026-10-17');
    expect(parseDate('in 2 weeks', today)).toBe('2026-10-28');
    expect(parseDate('oct 20', today)).toBe('2026-10-20');
    expect(parseDate('20th october', today)).toBe('2026-10-20');
    expect(parseDate('jan 3', today)).toBe('2027-01-03'); // already passed this year
    expect(parseDate('feb 31', today)).toBeNull();
    expect(parseDate('2026-02-30', today)).toBeNull();
    expect(parseDate('soon', today)).toBeNull();
  });
});
