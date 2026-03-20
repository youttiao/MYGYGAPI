import { describe, expect, it } from 'vitest';
import {
  formatClosedDateRange,
  hasBootstrapModalApi,
  getDayOverrideAction,
  getVisibleCalendarOffsets,
  getCalendarRuleState,
  groupClosedDatesIntoRanges,
  type AvailabilityRuleState
} from '../src/routes/ui/availabilityWorkbench.js';

describe('availability workbench helpers', () => {
  it('uses saved advance close and weekly rules for calendar rendering', () => {
    const savedRuleState: AvailabilityRuleState = {
      advanceCloseDays: 3,
      weeklyClosedDays: [2, 4],
      closedDates: ['2026-03-28']
    };
    const draftRuleState: AvailabilityRuleState = {
      advanceCloseDays: 14,
      weeklyClosedDays: [1, 3, 5],
      closedDates: ['2026-03-28', '2026-03-29']
    };

    expect(getCalendarRuleState(savedRuleState, draftRuleState)).toEqual({
      advanceCloseDays: 3,
      weeklyClosedDays: [2, 4],
      closedDates: ['2026-03-28', '2026-03-29']
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
    expect(getDayOverrideAction('2026-03-27', ['2026-03-27'])).toEqual({
      action: 'open',
      label: '打开当天日历',
      buttonClassName: 'btn btn-primary'
    });

    expect(getDayOverrideAction('2026-03-27', ['2026-03-28'])).toEqual({
      action: 'close',
      label: '关闭当天日历',
      buttonClassName: 'btn btn-danger'
    });
  });

  it('detects whether the bootstrap modal api is safely available', () => {
    expect(hasBootstrapModalApi(undefined)).toBe(false);
    expect(hasBootstrapModalApi({})).toBe(false);
    expect(hasBootstrapModalApi({ Modal: {} })).toBe(false);
    expect(hasBootstrapModalApi({ Modal: { getOrCreateInstance: () => ({}) } })).toBe(true);
  });
});
