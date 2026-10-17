import assert from 'node:assert/strict';
import test from 'node:test';
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
