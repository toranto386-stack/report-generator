import { generateWeeklyReports } from "../services/reportGenerator.js";
import { previousSundayWeek } from "../utils/week.js";

const range = previousSundayWeek();
const reports = await generateWeeklyReports(range.weekStart, range.weekEnd);
console.log(`Generated ${reports.length} weekly reports.`);
