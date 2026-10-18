import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { load } from 'js-yaml';
import {
  activeNotices,
  businessClock,
  isCalendarDate,
  scheduleAt,
  type Hours,
  type Notice,
} from '../src/lib/schedule.ts';

const hours: Hours = {
  weekly: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => ({
    day: day as Hours['weekly'][number]['day'],
    slots: [
      { opens: '08:00', closes: '12:00' },
      { opens: '13:00', closes: '15:00' },
    ],
  })),
  exceptions: [{ from: '2026-12-24', to: '2027-01-03', slots: [] }],
};

test('calendar dates are real, fixed-width dates, including leap years', () => {
  for (const date of ['2024-02-29', '2026-12-31']) assert.equal(isCalendarDate(date), true);
  for (const date of ['2026-02-29', '2026-04-31', '2026-2-01', '0000-01-01', 'garbage']) {
    assert.equal(isCalendarDate(date), false, date);
  }
});

test('Prague calendar and clock cross midnight and DST independently of runner timezone', () => {
  assert.deepEqual(businessClock(new Date('2026-12-31T23:00:00Z')), {
    date: '2027-01-01',
    time: '00:00',
    day: 'fri',
  });
  assert.equal(businessClock(new Date('2026-03-29T00:59:00Z')).time, '01:59');
  assert.equal(businessClock(new Date('2026-03-29T01:00:00Z')).time, '03:00');
  assert.equal(businessClock(new Date('2026-10-25T00:30:00Z')).time, '02:30');
  assert.equal(businessClock(new Date('2026-10-25T01:30:00Z')).time, '02:30');
  assert.throws(() => businessClock(new Date('invalid')), RangeError);
});

test('opening intervals are half-open, lunch is closed and inclusive exceptions replace a day', () => {
  const at = (iso: string) => scheduleAt(hours, new Date(iso));
  assert.equal(at('2026-10-19T06:00:00Z').isOpen, true);
  assert.equal(at('2026-10-19T10:00:00Z').isOpen, false);
  assert.equal(at('2026-10-19T11:00:00Z').isOpen, true);
  assert.equal(at('2026-10-19T13:00:00Z').isOpen, false);
  assert.equal(at('2026-12-24T09:00:00Z').source, 'exception');
  assert.equal(at('2027-01-03T09:00:00Z').isOpen, false);
  assert.equal(at('2027-01-04T09:00:00Z').source, 'weekly');
  const special: Hours = {
    ...hours,
    exceptions: [
      {
        from: '2026-10-19',
        to: '2026-10-19',
        slots: [{ opens: '10:00', closes: '11:00' }],
        note_en: 'Special hours',
      },
    ],
  };
  assert.equal(scheduleAt(special, new Date('2026-10-19T06:00:00Z')).isOpen, false);
  assert.equal(scheduleAt(special, new Date('2026-10-19T08:00:00Z')).isOpen, true);
  assert.equal(scheduleAt(special, new Date('2026-10-19T09:00:00Z')).isOpen, false);
  assert.equal(scheduleAt(special, new Date('2026-10-19T08:00:00Z')).row.note_en, 'Special hours');
});

test('notices have inclusive local dates, optional bounds, severity then stable file order', () => {
  const base: Notice = { enabled: true, level: 'info', text_cs: 'Zpráva', text_en: 'Notice' };
  const notices: Notice[] = [
    base,
    { ...base, level: 'warning', from: '2026-12-31', to: '2026-12-31' },
    { ...base, level: 'attention' },
    { ...base, level: 'warning', text_en: 'Second warning', to: '2026-12-31' },
    { ...base, enabled: false },
    { ...base, from: '2027-01-01' },
  ];
  const original = structuredClone(notices);
  assert.deepEqual(activeNotices(notices, new Date('2026-12-30T23:00:00Z')), [
    notices[1],
    notices[3],
    notices[2],
    notices[0],
  ]);
  assert.deepEqual(activeNotices(notices, new Date('2026-12-31T23:00:00Z')), [
    notices[2],
    notices[0],
    notices[5],
  ]);
  assert.deepEqual(notices, original);
});

const holidayHours: Hours = { ...hours, exceptions: [], holidays_closed: true };

test('holiday closure covers exactly the 13 Czech public holiday dates in 2026 and 2027', () => {
  const fixed = [
    '01-01',
    '05-01',
    '05-08',
    '07-05',
    '07-06',
    '09-28',
    '10-28',
    '11-17',
    '12-24',
    '12-25',
    '12-26',
  ];
  for (const [year, easter] of [
    [2026, ['04-03', '04-06']],
    [2027, ['03-26', '03-29']],
  ] as const) {
    const expected = new Set([...fixed, ...easter].map((day) => `${year}-${day}`));
    const observed: string[] = [];
    const instant = new Date(`${year}-01-01T09:00:00Z`);
    while (instant.getUTCFullYear() === year) {
      const current = scheduleAt(holidayHours, instant);
      if (expected.has(current.date)) {
        assert.equal(current.source, 'holiday', current.date);
        assert.equal(current.isOpen, false, current.date);
        assert.deepEqual(current.row.slots, []);
        assert.equal(current.row.note_cs, 'Dnes je svátek. Zavřeno.');
        assert.equal(current.row.note_en, 'Today is a Czech public holiday. Closed.');
      } else {
        // Includes significant days and Easter Sunday, which are not extra public holidays.
        assert.equal(current.source, 'weekly', current.date);
        assert.equal(current.isOpen, true, current.date);
      }
      if (current.source === 'holiday') observed.push(current.date);
      instant.setUTCDate(instant.getUTCDate() + 1);
    }
    assert.deepEqual(observed, [...expected].sort());
    assert.equal(observed.length, 13);
  }
});

test('Easter closures are calculated for future years, including a non-leap century', () => {
  for (const date of ['2038-04-23', '2038-04-26', '2100-03-26', '2100-03-29']) {
    const current = scheduleAt(holidayHours, new Date(`${date}T09:00:00Z`));
    assert.equal(current.source, 'holiday', date);
    assert.equal(current.isOpen, false, date);
  }
  for (const date of ['2038-04-22', '2038-04-27', '2100-03-25', '2100-03-30']) {
    assert.equal(scheduleAt(holidayHours, new Date(`${date}T09:00:00Z`)).source, 'weekly', date);
  }
});

test('holiday closure follows Prague midnight in winter and across Easter DST', () => {
  for (const [before, start, end, after] of [
    [
      '2026-12-31T22:59:59Z',
      '2026-12-31T23:00:00Z',
      '2027-01-01T22:59:59Z',
      '2027-01-01T23:00:00Z',
    ],
    [
      '2027-03-25T22:59:59Z',
      '2027-03-25T23:00:00Z',
      '2027-03-26T22:59:59Z',
      '2027-03-26T23:00:00Z',
    ],
    [
      '2027-03-28T21:59:59Z',
      '2027-03-28T22:00:00Z',
      '2027-03-29T21:59:59Z',
      '2027-03-29T22:00:00Z',
    ],
  ]) {
    assert.equal(scheduleAt(holidayHours, new Date(before)).source, 'weekly', before);
    assert.equal(scheduleAt(holidayHours, new Date(start)).source, 'holiday', start);
    assert.equal(scheduleAt(holidayHours, new Date(end)).source, 'holiday', end);
    assert.equal(scheduleAt(holidayHours, new Date(after)).source, 'weekly', after);
  }
});

test('disabled or omitted holiday policy retains weekly hours', () => {
  for (const policy of [false, undefined]) {
    for (const date of ['2026-04-03', '2026-04-06', '2026-10-28']) {
      const current = scheduleAt(
        { ...holidayHours, holidays_closed: policy },
        new Date(`${date}T09:00:00Z`),
      );
      assert.equal(current.source, 'weekly');
      assert.equal(current.isOpen, true);
    }
  }
});

test('explicit date exceptions override holiday closure on both inclusive boundaries', () => {
  const exception = {
    from: '2026-04-03',
    to: '2026-04-06',
    slots: [{ opens: '10:00', closes: '12:00' }],
    note_cs: 'Výjimečně otevřeno',
    note_en: 'Special opening',
  };
  const special: Hours = { ...holidayHours, exceptions: [exception] };
  for (const date of ['2026-04-03', '2026-04-06']) {
    const current = scheduleAt(special, new Date(`${date}T09:00:00Z`));
    assert.equal(current.source, 'exception');
    assert.equal(current.row, exception);
    assert.equal(current.isOpen, true);
    assert.equal(scheduleAt(special, new Date(`${date}T10:00:00Z`)).isOpen, false);
    const closed = scheduleAt(
      { ...special, exceptions: [{ ...exception, slots: [] }] },
      new Date(`${date}T09:00:00Z`),
    );
    assert.equal(closed.source, 'exception');
    assert.equal(closed.isOpen, false);
  }
  assert.equal(scheduleAt(special, new Date('2026-04-07T09:00:00Z')).source, 'weekly');
});

test('published hours confirm weekends closed and preserve Friday installation work', () => {
  const published = load(
    readFileSync(new URL('../src/data/hours.yaml', import.meta.url), 'utf8'),
  ) as Hours;
  assert.equal(published.holidays_closed, true);
  for (const date of ['2026-10-17', '2026-10-18']) {
    const current = scheduleAt(published, new Date(`${date}T09:00:00Z`));
    assert.equal(current.source, 'weekly');
    assert.equal(current.isOpen, false);
    assert.deepEqual(current.row.slots, []);
    assert.ok(!current.row.assumed);
    assert.equal(current.row.note_cs, 'Zavřeno');
    assert.equal(current.row.note_en, 'Closed');
  }
  const friday = scheduleAt(published, new Date('2026-10-16T09:00:00Z'));
  assert.equal(friday.source, 'weekly');
  assert.equal(friday.isOpen, false);
  assert.equal(friday.row.note_cs, 'Realizace montáží');
  assert.equal(friday.row.note_en, 'Installation work');
  assert.equal(scheduleAt(published, new Date('2026-10-19T09:00:00Z')).isOpen, true);
  assert.equal(scheduleAt(published, new Date('2026-04-03T09:00:00Z')).source, 'holiday');
});
