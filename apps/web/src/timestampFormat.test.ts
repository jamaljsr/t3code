import { describe, expect, it } from "vite-plus/test";

import { formatDayAwareMonthTimestamp, formatShortTimestamp } from "./timestampFormat";

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
