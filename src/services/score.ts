import { Attendance, AssignmentScore, Doubt, DoubtStatus, ProjectMilestone } from "@prisma/client";

export type WeeklySignals = {
  attendances: Attendance[];
  assignments: AssignmentScore[];
  doubts: Doubt[];
  milestones: ProjectMilestone[];
};

export function calculateProgressScore(signals: WeeklySignals) {
  const attendancePct = percent(
    signals.attendances.filter((item) => item.present).length,
    Math.max(signals.attendances.length, 1)
  );

  const assignmentPct = signals.assignments.length
    ? average(signals.assignments.map((item) => (item.score / item.maxScore) * 100))
    : 0;

  const resolved = signals.doubts.filter((item) => item.status !== DoubtStatus.OPEN).length;
  const independent = signals.doubts.filter((item) => item.status === DoubtStatus.RESOLVED_INDEPENDENTLY).length;
  const doubtPct = signals.doubts.length ? Math.min(100, percent(resolved, signals.doubts.length) + independent * 10) : 75;

  const projectPct = signals.milestones.length ? average(signals.milestones.map((item) => item.progress)) : 50;

  const score =
    attendancePct * 0.2 +
    assignmentPct * 0.3 +
    doubtPct * 0.2 +
    projectPct * 0.2 +
    trajectoryBonus(signals) * 0.1;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function summarizeMastery(signals: WeeklySignals) {
  const topicScores = new Map<string, number[]>();
  for (const assignment of signals.assignments) {
    topicScores.set(assignment.topic, [...(topicScores.get(assignment.topic) ?? []), (assignment.score / assignment.maxScore) * 100]);
  }

  const masteredTopics = [...topicScores.entries()]
    .filter(([, scores]) => average(scores) >= 80)
    .map(([topic]) => topic);

  const needsWorkTopics = [...topicScores.entries()]
    .filter(([, scores]) => average(scores) < 75)
    .map(([topic]) => topic);

  for (const doubt of signals.doubts) {
    if (doubt.status === DoubtStatus.RESOLVED_INDEPENDENTLY && !masteredTopics.includes(doubt.topic)) {
      masteredTopics.push(doubt.topic);
    }
    if (doubt.status === DoubtStatus.OPEN && !needsWorkTopics.includes(doubt.topic)) {
      needsWorkTopics.push(doubt.topic);
    }
  }

  return { masteredTopics, needsWorkTopics };
}

function trajectoryBonus(signals: WeeklySignals) {
  const projectMomentum = signals.milestones.length ? average(signals.milestones.map((item) => item.progress)) : 50;
  const independence = signals.doubts.some((item) => item.status === DoubtStatus.RESOLVED_INDEPENDENTLY) ? 100 : 60;
  return average([projectMomentum, independence]);
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function percent(value: number, total: number) {
  return (value / total) * 100;
}
