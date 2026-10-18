import { Priority } from '../models/kanban.model';

/**
 * Natural-language quick add: "Ship launch page fri !urgent #marketing"
 *   !low !med !high !urgent   priority (also !1 … !4)
 *   #word                     label
 *   due <date> / @<date>      due date anywhere in the text
 *   <date> at the end         due date ("… tomorrow", "… next fri", "… oct 20", "… in 3 days")
 * A date word in the middle of a title ("Plan monday standup") is left alone.
 */
export interface QuickAdd {
  title: string;
  priority: Priority | null;
  labels: string[];
  due: string | null;
}

const PRIORITY: Record<string, Priority> = {
  low: 'low', l: 'low', '1': 'low',
  med: 'medium', medium: 'medium', m: 'medium', '2': 'medium',
  high: 'high', hi: 'high', h: 'high', '3': 'high',
  urgent: 'urgent', u: 'urgent', '4': 'urgent',
};

const WEEKDAYS: Record<string, number> = {
  sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6,
};

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5,
  jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10,
  dec: 11, december: 11,
};

const iso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const addDays = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Parses a short date phrase ("tomorrow", "next fri", "oct 20", "in 2 weeks") relative to `today`. */
export function parseDate(phrase: string, today: Date): string | null {
  const w = phrase.toLowerCase().replace(/[,.]/g, '').split(/\s+/).filter(Boolean);
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (w.length === 1) {
    const [a] = w;
    if (a === 'today' || a === 'tod') return iso(base);
    if (a === 'tomorrow' || a === 'tmr' || a === 'tmrw' || a === 'tom') return iso(addDays(base, 1));
    if (a in WEEKDAYS) return iso(addDays(base, (WEEKDAYS[a] - base.getDay() + 7) % 7));
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(a);
    if (m) {
      const d = new Date(+m[1], +m[2] - 1, +m[3]);
      return d.getMonth() === +m[2] - 1 ? iso(d) : null;
    }
    return null;
  }

  if (w.length === 2) {
    const [a, b] = w;
    if (a === 'next' && b === 'week') return iso(addDays(base, ((1 - base.getDay() + 7) % 7) || 7));
    if (a === 'next' && b === 'month') return iso(new Date(base.getFullYear(), base.getMonth() + 1, base.getDate()));
    if (a === 'next' && b in WEEKDAYS) {
      // The given weekday in the week that starts next Monday.
      const nextMonday = addDays(base, ((1 - base.getDay() + 7) % 7) || 7);
      return iso(addDays(nextMonday, (WEEKDAYS[b] + 6) % 7));
    }
    const day = (s: string) => /^(\d{1,2})(st|nd|rd|th)?$/.exec(s)?.[1];
    const [month, dd] = a in MONTHS ? [MONTHS[a], day(b)] : b in MONTHS ? [MONTHS[b], day(a)] : [undefined, undefined];
    if (month !== undefined && dd) {
      let d = new Date(base.getFullYear(), month, +dd);
      if (d.getMonth() !== month) return null; // e.g. "feb 31"
      if (d < base) d = new Date(base.getFullYear() + 1, month, +dd);
      return iso(d);
    }
    return null;
  }

  if (w.length === 3 && w[0] === 'in' && /^\d{1,3}$/.test(w[1])) {
    const n = +w[1];
    if (/^days?$/.test(w[2])) return iso(addDays(base, n));
    if (/^weeks?$/.test(w[2])) return iso(addDays(base, n * 7));
  }
  return null;
}

export function parseQuickAdd(text: string, today = new Date()): QuickAdd {
  let priority: Priority | null = null;
  let due: string | null = null;
  const labels: string[] = [];
  const words: string[] = [];

  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    const p = /^!(\w+)$/.exec(word);
    if (p && p[1].toLowerCase() in PRIORITY) {
      priority = PRIORITY[p[1].toLowerCase()];
      continue;
    }
    const tag = /^#([\p{L}\p{N}_-]{1,24})$/u.exec(word);
    if (tag) {
      const label = tag[1].toLowerCase();
      if (!labels.includes(label) && labels.length < 10) labels.push(label);
      continue;
    }
    const at = /^@(.+)$/.exec(word);
    if (at && parseDate(at[1], today)) {
      due = parseDate(at[1], today);
      continue;
    }
    words.push(word);
  }

  // "due <phrase>" anywhere, trying the longest phrase first.
  if (!due) {
    for (let i = 0; i < words.length - 1 && !due; i++) {
      if (words[i].toLowerCase() !== 'due') continue;
      for (const len of [3, 2, 1]) {
        const d = i + len < words.length ? parseDate(words.slice(i + 1, i + 1 + len).join(' '), today) : null;
        if (d) {
          due = d;
          words.splice(i, len + 1);
          break;
        }
      }
    }
  }

  // A date phrase at the very end of the title.
  if (!due) {
    for (const len of [3, 2, 1]) {
      if (words.length <= len) continue; // keep at least one word of title
      const d = parseDate(words.slice(-len).join(' '), today);
      if (d) {
        due = d;
        words.splice(-len, len);
        break;
      }
    }
  }

  const title = words.join(' ').trim();
  return { title: title || text.trim(), priority, labels, due };
}
