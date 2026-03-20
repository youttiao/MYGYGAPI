import { describe, expect, it } from 'vitest';
import {
  applyDateOverrideMode,
  combineAdvanceCloseDuration,
  formatClosedDateRange,
  hasBootstrapModalApi,
  getDayOverrideAction,
  getDateOverrideMode,
  getNextDateOverrideMode,
  getVisibleCalendarOffsets,
  getCalendarRuleState,
  groupClosedDatesIntoRanges,
  prunePastDates,
  splitAdvanceCloseHours,
  type AvailabilityRuleState
} from '../src/routes/ui/availabilityWorkbench.js';

describe('availability workbench helpers', () => {
  it('uses saved advance close and weekly rules for calendar rendering', () => {
    const savedRuleState: AvailabilityRuleState = {
      advanceCloseDays: 3,
      advanceCloseHours: 5,
      weeklyClosedDays: [2, 4],
      closedDates: ['2026-03-28'],
      openedDates: ['2026-03-30']
    };
    const draftRuleState: AvailabilityRuleState = {
      advanceCloseDays: 14,
      advanceCloseHours: 7,
      weeklyClosedDays: [1, 3, 5],
      closedDates: ['2026-03-28', '2026-03-29'],
      openedDates: ['2026-03-30', '2026-03-31']
    };

    expect(getCalendarRuleState(savedRuleState, draftRuleState)).toEqual({
      advanceCloseDays: 3,
      advanceCloseHours: 5,
      weeklyClosedDays: [2, 4],
      closedDates: ['2026-03-28'],
      openedDates: ['2026-03-30']
    });
  });

  it('groups contiguous closed dates into display ranges', () => {
    expect(
      groupClosedDatesIntoRanges([
        '2026-03-24',
        '2026-03-25',
        '2026-03-26',
        '2026-03-28',
        '2026-03-30',
        '2026-03-31'
      ]).map(formatClosedDateRange)
    ).toEqual(['2026-03-24 ~ 2026-03-26', '2026-03-28', '2026-03-30 ~ 2026-03-31']);
  });

  it('shows four calendar months by default from the current offset', () => {
    expect(getVisibleCalendarOffsets(0)).toEqual([0, 1, 2, 3]);
    expect(getVisibleCalendarOffsets(2)).toEqual([2, 3, 4, 5]);
  });

  it('uses one primary day action in the detail modal based on manual override state', () => {
    expect(getDayOverrideAction('manual-closed')).toEqual({
      action: 'open',
      label: '打开当天',
      buttonClassName: 'btn btn-primary'
    });

    expect(getDayOverrideAction('manual-open')).toEqual({
      action: 'follow-rules',
      label: '遵循规律',
      buttonClassName: 'btn btn-secondary'
    });

    expect(getDayOverrideAction('follow-rules')).toEqual({
      action: 'close',
      label: '关闭当天',
      buttonClassName: 'btn btn-danger'
    });
  });

  it('detects whether the bootstrap modal api is safely available', () => {
    expect(hasBootstrapModalApi(undefined)).toBe(false);
    expect(hasBootstrapModalApi({})).toBe(false);
    expect(hasBootstrapModalApi({ Modal: {} })).toBe(false);
    expect(hasBootstrapModalApi({ Modal: { getOrCreateInstance: () => ({}) } })).toBe(true);
  });

  it('tracks per-day manual override mode separately from automatic rules', () => {
    expect(getDateOverrideMode('2026-03-20', ['2026-03-20'], [])).toBe('manual-closed');
    expect(getDateOverrideMode('2026-03-20', [], ['2026-03-20'])).toBe('manual-open');
    expect(getDateOverrideMode('2026-03-20', [], [])).toBe('follow-rules');
  });

  it('cycles quick-toggle mode through closed, follow-rules, and open', () => {
    expect(getNextDateOverrideMode('manual-closed')).toBe('follow-rules');
    expect(getNextDateOverrideMode('follow-rules')).toBe('manual-open');
    expect(getNextDateOverrideMode('manual-open')).toBe('manual-closed');
  });

  it('applies a single-date override mode without mutating other dates', () => {
    expect(
      applyDateOverrideMode(
        '2026-03-20',
        {
          advanceCloseDays: 0,
          advanceCloseHours: 0,
          weeklyClosedDays: [],
          closedDates: ['2026-03-21'],
          openedDates: ['2026-03-22']
        },
        'manual-open'
      )
    ).toEqual({
      advanceCloseDays: 0,
      advanceCloseHours: 0,
      weeklyClosedDays: [],
      closedDates: ['2026-03-21'],
      openedDates: ['2026-03-20', '2026-03-22']
    });

    expect(
      applyDateOverrideMode(
        '2026-03-22',
        {
          advanceCloseDays: 0,
          advanceCloseHours: 0,
          weeklyClosedDays: [],
          closedDates: ['2026-03-21'],
          openedDates: ['2026-03-22']
        },
        'follow-rules'
      )
    ).toEqual({
      advanceCloseDays: 0,
      advanceCloseHours: 0,
      weeklyClosedDays: [],
      closedDates: ['2026-03-21'],
      openedDates: []
    });
  });

  it('prunes past special-date overrides and keeps today onward', () => {
    expect(prunePastDates(['2026-03-18', '2026-03-20', '2026-03-21'], '2026-03-20')).toEqual([
      '2026-03-20',
      '2026-03-21'
    ]);
  });

  it('splits and combines advance close day-hour durations', () => {
    expect(splitAdvanceCloseHours(0)).toEqual({ days: 0, hours: 0 });
    expect(splitAdvanceCloseHours(49)).toEqual({ days: 2, hours: 1 });
    expect(combineAdvanceCloseDuration(2, 1)).toBe(49);
  });
});
