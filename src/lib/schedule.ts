/** Pure shared logic: accepts validated public data and an explicit instant. */
export const BUSINESS_TIME_ZONE = 'Europe/Prague';
export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export interface Slot {
  opens: string;
  closes: string;
}
export interface DayHours {
  slots: readonly Slot[];
  note_cs?: string;
  note_en?: string;
  assumed?: boolean;
}
export interface WeeklyHours extends DayHours {
  day: Weekday;
}
export interface ExceptionHours extends DayHours {
  from: string;
  to: string;
}
export interface Hours {
  weekly: readonly WeeklyHours[];
  exceptions: readonly ExceptionHours[];
  note_cs?: string;
  note_en?: string;
}
export interface Notice {
  enabled: boolean;
  level: 'info' | 'attention' | 'warning';
  from?: string;
  to?: string;
  text_cs: string;
  text_en: string;
}

export const isCalendarDate = (value: string): boolean => {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const clock = new Intl.DateTimeFormat('en-GB', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export const businessClock = (instant: Date): { date: string; time: string; day: Weekday } => {
  const parts = clock.formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => {
    const value = parts.find((item) => item.type === type)?.value;
    if (!value) throw new RangeError(`Missing business clock part: ${type}`);
    return value;
  };
  const date = `${part('year').padStart(4, '0')}-${part('month')}-${part('day')}`;
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const day = WEEKDAYS[(weekday + 6) % 7];
  if (!day || !isCalendarDate(date)) throw new RangeError('Unsupported business date');
  return { date, time: `${part('hour')}:${part('minute')}`, day };
};

/** Inclusive calendar bounds; lexicographic ordering requires validated YYYY-MM-DD. */
export const dateInRange = (date: string, range: { from?: string; to?: string }): boolean =>
  (!range.from || range.from <= date) && (!range.to || date <= range.to);

export const activeNotices = <T extends Notice>(notices: readonly T[], instant: Date): T[] => {
  const { date } = businessClock(instant);
  const priority = { warning: 0, attention: 1, info: 2 } as const;
  return notices
    .filter((notice) => notice.enabled && dateInRange(date, notice))
    .sort((a, b) => priority[a.level] - priority[b.level]);
};

export const scheduleAt = (hours: Hours, instant: Date) => {
  const current = businessClock(instant);
  const exception = hours.exceptions.find((row) => dateInRange(current.date, row));
  const row = exception ?? hours.weekly.find((item) => item.day === current.day);
  if (!row) throw new Error(`Missing weekly hours for ${current.day}`);
  return {
    ...current,
    source: exception ? ('exception' as const) : ('weekly' as const),
    row,
    // Empty slots mean no published walk-in interval, including installation-only days.
    isOpen: row.slots.some((slot) => slot.opens <= current.time && current.time < slot.closes),
  };
};
