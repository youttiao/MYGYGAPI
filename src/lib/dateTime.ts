function parseOffset(timeZoneName: string): string {
  const match = timeZoneName.match(/^GMT([+-]\d{1,2})(?::?(\d{2}))?$/);
  if (!match) {
    return '+00:00';
  }
  const hourRaw = match[1];
  const minuteRaw = match[2] ?? '00';
  const sign = hourRaw.startsWith('-') ? '-' : '+';
  const hour = hourRaw.replace('+', '').replace('-', '').padStart(2, '0');
  const minute = minuteRaw.padStart(2, '0');
  return `${sign}${hour}:${minute}`;
}

export function toGygDateTime(date: Date, timeZone?: string): string {
  const safeTimeZone = timeZone && timeZone.trim().length > 0 ? timeZone : 'UTC';
  const dtf = new Intl.DateTimeFormat('en-GB', {
    timeZone: safeTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'longOffset'
  });

  const parts = dtf.formatToParts(date);
  const valueOf = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const year = valueOf('year');
  const month = valueOf('month');
  const day = valueOf('day');
  const hour = valueOf('hour');
  const minute = valueOf('minute');
  const second = valueOf('second');
  const offset = parseOffset(valueOf('timeZoneName'));

  return `${year}-${month}-${day}T${hour}:${minute}:${second}${offset}`;
}
