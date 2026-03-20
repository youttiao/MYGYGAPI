export type AvailabilityRuleState = {
  advanceCloseDays: number;
  weeklyClosedDays: number[];
  closedDates: string[];
};

export type ClosedDateRange = {
  from: string;
  to: string;
  dates: string[];
};

export function getCalendarRuleState(
  savedRuleState: AvailabilityRuleState,
  draftRuleState: AvailabilityRuleState
): AvailabilityRuleState {
  return {
    advanceCloseDays: savedRuleState.advanceCloseDays,
    weeklyClosedDays: savedRuleState.weeklyClosedDays.slice(),
    closedDates: draftRuleState.closedDates.slice()
  };
}

export function groupClosedDatesIntoRanges(closedDates: string[]): ClosedDateRange[] {
  const uniqueDates = Array.from(new Set(closedDates)).sort();
  if (!uniqueDates.length) {
    return [];
  }

  const nextDate = (dateStr: string): string => {
    const value = new Date(`${dateStr}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() + 1);
    return value.toISOString().slice(0, 10);
  };

  const ranges: ClosedDateRange[] = [];
  let currentDates = [uniqueDates[0]];

  for (let index = 1; index < uniqueDates.length; index += 1) {
    const dateStr = uniqueDates[index];
    const previous = currentDates[currentDates.length - 1];
    if (dateStr === nextDate(previous)) {
      currentDates.push(dateStr);
      continue;
    }

    ranges.push({
      from: currentDates[0],
      to: currentDates[currentDates.length - 1],
      dates: currentDates
    });
    currentDates = [dateStr];
  }

  ranges.push({
    from: currentDates[0],
    to: currentDates[currentDates.length - 1],
    dates: currentDates
  });

  return ranges;
}

export function formatClosedDateRange(range: ClosedDateRange): string {
  return range.from === range.to ? range.from : `${range.from} ~ ${range.to}`;
}

export function getVisibleCalendarOffsets(calendarOffset: number, monthCount = 4): number[] {
  return Array.from({ length: monthCount }, (_, index) => calendarOffset + index);
}
