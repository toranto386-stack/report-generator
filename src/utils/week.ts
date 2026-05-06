import { endOfWeek, startOfWeek, subWeeks } from "date-fns";

export function previousSundayWeek(now = new Date()) {
  const lastWeek = subWeeks(now, 1);
  return {
    weekStart: startOfWeek(lastWeek, { weekStartsOn: 1 }),
    weekEnd: endOfWeek(lastWeek, { weekStartsOn: 1 })
  };
}
