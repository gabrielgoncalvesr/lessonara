import { addDays, weekday } from "./dates";
import type { Schedule } from "./ledger";

export function weeklyScheduleLimit(lessons: number | undefined) {
  return lessons && lessons > 0 ? Math.max(1, Math.floor(lessons / 4)) : 0;
}

export function firstScheduleDate(startsOn: string, day: number) {
  return addDays(startsOn, (day - weekday(startsOn) + 7) % 7);
}

/** Considera as datas das aulas efetivas, inclusive horários futuros já cadastrados. */
export function canAddWeeklySchedule(schedules: Schedule[], limit: number, startsOn: string, day: number) {
  if (limit <= 0) return false;
  const first = firstScheduleDate(startsOn, day);
  const intervals = schedules.map((schedule) => ({
    start: firstScheduleDate(schedule.starts_on, schedule.weekday),
    end: schedule.ends_on ? addDays(schedule.ends_on, -((weekday(schedule.ends_on) - schedule.weekday + 7) % 7)) : null,
  })).filter((interval) => !interval.end || (interval.end >= first && interval.end >= interval.start));
  const boundaries = [first, ...intervals.filter((interval) => interval.start > first).map((interval) => interval.start)];
  return boundaries.every((date) => intervals.filter((interval) => interval.start <= date && (!interval.end || interval.end >= date)).length < limit);
}
