export type AvailabilityRuleState = {
  advanceCloseDays: number;
  weeklyClosedDays: number[];
  closedDates: string[];
  openedDates: string[];
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
    closedDates: draftRuleState.closedDates.slice(),
    openedDates: draftRuleState.openedDates.slice()
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

export type DayOverrideMode = 'manual-open' | 'manual-closed' | 'follow-rules';

export function getDateOverrideMode(
  dateStr: string,
  closedDates: string[],
  openedDates: string[]
): DayOverrideMode {
  if (openedDates.includes(dateStr)) {
    return 'manual-open';
  }

  if (closedDates.includes(dateStr)) {
    return 'manual-closed';
  }

  return 'follow-rules';
}

export function getNextDateOverrideMode(mode: DayOverrideMode): DayOverrideMode {
  if (mode === 'manual-closed') {
    return 'follow-rules';
  }

  if (mode === 'follow-rules') {
    return 'manual-open';
  }

  return 'manual-closed';
}

export function applyDateOverrideMode(
  dateStr: string,
  ruleState: AvailabilityRuleState,
  mode: DayOverrideMode
): AvailabilityRuleState {
  const closedDates = ruleState.closedDates.filter((item) => item !== dateStr);
  const openedDates = ruleState.openedDates.filter((item) => item !== dateStr);

  if (mode === 'manual-closed') {
    closedDates.push(dateStr);
  } else if (mode === 'manual-open') {
    openedDates.push(dateStr);
  }

  return {
    advanceCloseDays: ruleState.advanceCloseDays,
    weeklyClosedDays: ruleState.weeklyClosedDays.slice(),
    closedDates: closedDates.sort(),
    openedDates: openedDates.sort()
  };
}

export function getDayOverrideAction(mode: DayOverrideMode): {
  action: 'open' | 'close';
  label: string;
  buttonClassName: string;
} | {
  action: 'follow-rules';
  label: string;
  buttonClassName: string;
} {
  if (mode === 'manual-closed') {
    return {
      action: 'open',
      label: '打开当天',
      buttonClassName: 'btn btn-primary'
    };
  }

  if (mode === 'manual-open') {
    return {
      action: 'follow-rules',
      label: '遵循规律',
      buttonClassName: 'btn btn-secondary'
    };
  }

  return {
    action: 'close',
    label: '关闭当天',
    buttonClassName: 'btn btn-danger'
  };
}

export function hasBootstrapModalApi(bootstrapRuntime: unknown): boolean {
  if (!bootstrapRuntime || typeof bootstrapRuntime !== 'object') {
    return false;
  }

  const modal = (bootstrapRuntime as { Modal?: { getOrCreateInstance?: unknown } }).Modal;
  return Boolean(modal && typeof modal.getOrCreateInstance === 'function');
}
