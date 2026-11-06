import { describe, expect, it } from "vite-plus/test";

import {
  formatDayAwareMonthTimestamp,
  formatDayAwareTimestamp,
  formatShortTimestamp,
  formatUpcomingTimestamp,
} from "./timestampFormat";

describe("timestamps in an explicit time zone", () => {
  // 23:00 UTC on July 1 is 7 PM on July 1 in New York, whatever the host zone.
  const now = Date.parse("2026-07-01T23:00:00.000Z");
  const zone = "America/New_York";

  it("picks relative days from the calendar in that zone", () => {
    expect(formatUpcomingTimestamp("2026-07-02T00:30:00.000Z", "12-hour", now, zone)).not.toMatch(
      /tomorrow/,
    );
    expect(formatUpcomingTimestamp("2026-07-02T05:30:00.000Z", "12-hour", now, zone)).toMatch(
      /^tomorrow at /,
    );
    expect(formatDayAwareTimestamp("2026-07-01T03:30:00.000Z", "12-hour", now, zone)).toMatch(
      /^yesterday at /,
    );
  });
});

describe("formatDayAwareMonthTimestamp", () => {
  const iso = (y: number, monthIndex: number, d: number, h: number, mi: number) =>
    new Date(y, monthIndex, d, h, mi).toISOString();
  const now = new Date(2026, 8, 26, 12, 0).getTime();
  const time = (isoDate: string) => formatShortTimestamp(isoDate, "12-hour");

  it("names the month for older dates and adds the year once it differs", () => {
    const sameYear = iso(2026, 8, 24, 8, 53);
    const lastYear = iso(2025, 8, 24, 8, 53);
    const monthDay = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
    const monthDayYear = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    expect(formatDayAwareMonthTimestamp(sameYear, "12-hour", now)).toBe(
      `${monthDay.format(new Date(sameYear))} ${time(sameYear)}`,
    );
    expect(formatDayAwareMonthTimestamp(lastYear, "12-hour", now)).toBe(
      `${monthDayYear.format(new Date(lastYear))} ${time(lastYear)}`,
    );
  });

  it("keeps today and yesterday in the same form as chat timestamps", () => {
    const today = iso(2026, 8, 26, 9, 30);
    const yesterday = iso(2026, 8, 25, 23, 30);
    expect(formatDayAwareMonthTimestamp(today, "12-hour", now)).toBe(time(today));
    expect(formatDayAwareMonthTimestamp(yesterday, "12-hour", now)).toBe(
      `yesterday at ${time(yesterday)}`,
    );
  });
});
