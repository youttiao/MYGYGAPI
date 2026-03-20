import { describe, expect, it } from 'vitest';
import {
  formatClosedDateRange,
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
});
