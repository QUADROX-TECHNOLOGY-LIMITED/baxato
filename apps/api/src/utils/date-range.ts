import { ValidationError } from '@baxato/common';

const ISO_PLAIN_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function resolveIanaOffsetMs(utcProbeMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  }).formatToParts(new Date(utcProbeMs));

  const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT';
  if (tzPart === 'GMT' || tzPart === 'UTC') {
    return 0;
  }

  const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(tzPart);
  if (!match) {
    return 0;
  }

  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  return sign * (hours * 60 + minutes) * 60_000;
}

/**
 * Converts a location-agnostic calendar date (`YYYY-MM-DD`) into an exact start-of-day
 * or end-of-day `Date` instant anchored to an explicit IANA time zone (defaults to `Africa/Lagos`).
 * Uses native `Temporal.PlainDate` + `toZonedDateTime` when available, with an IANA `Intl`
 * epoch-millisecond fallback so hand-built ISO timestamp strings are never passed to `new Date(...)`.
 */
export function calendarDateToZonedBoundary(
  plainDateStr: string,
  endOfDay: boolean,
  timeZone = 'Africa/Lagos',
): Date {
  const trimmed = plainDateStr.trim();
  const match = ISO_PLAIN_DATE_RE.exec(trimmed);
  if (!match) {
    throw new ValidationError(`Invalid date '${plainDateStr}'. Expected YYYY-MM-DD.`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  // Verify real calendar date (rejects e.g. 2026-02-31)
  const utcCheck = new Date(Date.UTC(year, month - 1, day));
  if (
    utcCheck.getUTCFullYear() !== year ||
    utcCheck.getUTCMonth() !== month - 1 ||
    utcCheck.getUTCDate() !== day
  ) {
    throw new ValidationError(`Invalid calendar date '${plainDateStr}'.`);
  }

  const temporalApi = (globalThis as Record<string, any>).Temporal;
  if (temporalApi?.PlainDate && temporalApi?.PlainTime) {
    const plainDate = temporalApi.PlainDate.from({ year, month, day, calendar: 'iso8601' });
    const plainTime = endOfDay
      ? temporalApi.PlainTime.from({ hour: 23, minute: 59, second: 59, millisecond: 999 })
      : temporalApi.PlainTime.from({ hour: 0, minute: 0, second: 0, millisecond: 0 });
    const instant = plainDate.toZonedDateTime({ timeZone, plainTime }).toInstant();
    return new Date(instant.epochMilliseconds);
  }

  const hour = endOfDay ? 23 : 0;
  const minute = endOfDay ? 59 : 0;
  const second = endOfDay ? 59 : 0;
  const millisecond = endOfDay ? 999 : 0;

  const naiveUtcMs = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  const offsetMs = resolveIanaOffsetMs(naiveUtcMs, timeZone);
  return new Date(naiveUtcMs - offsetMs);
}

export interface ParsedDateRange {
  start?: Date;
  end?: Date;
}

export function parseZonedDateRange(
  startDate?: string,
  endDate?: string,
  timeZone = 'Africa/Lagos',
): ParsedDateRange {
  const start =
    startDate && startDate.trim()
      ? calendarDateToZonedBoundary(startDate, false, timeZone)
      : undefined;
  const end =
    endDate && endDate.trim()
      ? calendarDateToZonedBoundary(endDate, true, timeZone)
      : undefined;

  return { start, end };
}
