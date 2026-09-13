import type { Schedule } from "../shared/types";

/**
 * @param dayOfWeek 0 = Sunday .. 6 = Saturday (local time, matches Date#getDay)
 * @param nowMinute minutes since local midnight, [0, 1440)
 */
export function isWithinSchedule(schedule: Schedule, dayOfWeek: number, nowMinute: number): boolean {
  if (!schedule.enabled) return false;
  const { startMinute, endMinute, days } = schedule;
  if (startMinute === endMinute) return false;

  if (startMinute < endMinute) {
    return days.includes(dayOfWeek) && nowMinute >= startMinute && nowMinute < endMinute;
  }

  // Overnight window (e.g. 22:00 -> 06:00): active late on a scheduled day, and early
  // the following calendar day even if that next day isn't itself in `days`.
  const previousDay = (dayOfWeek + 6) % 7;
  const inLateSegment = days.includes(dayOfWeek) && nowMinute >= startMinute;
  const inEarlySegment = days.includes(previousDay) && nowMinute < endMinute;
  return inLateSegment || inEarlySegment;
}
