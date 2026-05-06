import { PrismaClient, DoubtStatus, ReportDeliveryStatus, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { subDays } from "date-fns";
import "dotenv/config";

const prisma = new PrismaClient();
const now = new Date();

const topicPool = [
  "HTTP Request nodes",
  "Webhook triggers",
  "Google Sheets integration",
  "Conditional routing",
  "Data transformation",
  "Authentication headers",
  "Error handling patterns",
  "Retry logic",
  "Execution debugging",
  "CRM automation",
  "Notifications setup",
  "API testing"
];

const seededStudents = [
  {
    fullName: "Pooja Sharma",
    email: "pooja@example.com",
    whatsappNumber: "whatsapp:+919999999999",
    parentName: "Anita Sharma",
    parentPhone: "whatsapp:+918888888888",
    weekNumber: 5,
    sessions: [
      ["HTTP Request nodes", true, 90],
      ["API response mapping", true, 85],
      ["Error handling patterns", false, 0]
    ],
    assignments: [
      ["Webhook to API task", "HTTP Request nodes", 18, 20],
      ["Retry logic worksheet", "Error handling patterns", 13, 20]
    ],
    doubts: [
      ["How do I pass JSON from a webhook into an HTTP Request node?", "HTTP Request nodes", DoubtStatus.RESOLVED_INDEPENDENTLY],
      ["When should I use continue-on-fail vs retry?", "Error handling patterns", DoubtStatus.OPEN]
    ],
    milestone: ["Week 5 automation mini-project", "Build a webhook-driven report sender using HTTP Request nodes.", 80]
  },
  {
    fullName: "Arjun Mehta",
    email: "arjun@example.com",
    whatsappNumber: "whatsapp:+917777777777",
    parentName: "Neha Mehta",
    parentPhone: "whatsapp:+917666666666",
    weekNumber: 5,
    sessions: [
      ["Webhook triggers", true, 92],
      ["Data transformation", true, 88],
      ["Expression editor", true, 90]
    ],
    assignments: [
      ["Webhook trigger build", "Webhook triggers", 19, 20],
      ["Expression mapping quiz", "Expression editor", 17, 20]
    ],
    doubts: [
      ["How do I test webhook URLs before publishing?", "Webhook triggers", DoubtStatus.RESOLVED_BY_MENTOR]
    ],
    milestone: ["Lead capture automation", "Capture form leads and store clean JSON payloads.", 92]
  },
  {
    fullName: "Sara Khan",
    email: "sara@example.com",
    whatsappNumber: "whatsapp:+916555555555",
    parentName: "Imran Khan",
    parentPhone: "whatsapp:+916444444444",
    weekNumber: 5,
    sessions: [
      ["Google Sheets integration", true, 80],
      ["Data cleaning", false, 0],
      ["Conditional routing", true, 75]
    ],
    assignments: [
      ["Sheets append task", "Google Sheets integration", 15, 20],
      ["If node worksheet", "Conditional routing", 12, 20]
    ],
    doubts: [
      ["Why is my sheet column value coming empty?", "Google Sheets integration", DoubtStatus.OPEN],
      ["How do branches work after an IF node?", "Conditional routing", DoubtStatus.RESOLVED_BY_MENTOR]
    ],
    milestone: ["CRM update flow", "Route hot and cold leads into separate sheet tabs.", 62]
  },
  {
    fullName: "Rohan Iyer",
    email: "rohan@example.com",
    whatsappNumber: "whatsapp:+915333333333",
    parentName: "Lakshmi Iyer",
    parentPhone: "whatsapp:+915222222222",
    weekNumber: 5,
    sessions: [
      ["Error handling patterns", true, 95],
      ["Retry logic", true, 90],
      ["Execution debugging", true, 90]
    ],
    assignments: [
      ["Retry logic worksheet", "Retry logic", 20, 20],
      ["Debug failed execution", "Execution debugging", 18, 20]
    ],
    doubts: [
      ["Can I inspect failed item data inside the execution log?", "Execution debugging", DoubtStatus.RESOLVED_INDEPENDENTLY]
    ],
    milestone: ["Reliable report sender", "Add retry handling and failure audit checks.", 96]
  },
  {
    fullName: "Meera Nair",
    email: "meera@example.com",
    whatsappNumber: "whatsapp:+914111111111",
    parentName: "Dev Nair",
    parentPhone: "whatsapp:+914000000000",
    weekNumber: 5,
    sessions: [
      ["HTTP Request nodes", true, 70],
      ["Authentication headers", false, 0],
      ["API testing", true, 65]
    ],
    assignments: [
      ["API auth headers task", "Authentication headers", 10, 20],
      ["Postman to n8n practice", "API testing", 11, 20]
    ],
    doubts: [
      ["Where do I put bearer tokens in the HTTP Request node?", "Authentication headers", DoubtStatus.OPEN],
      ["Why am I getting 401 from the API?", "API testing", DoubtStatus.OPEN]
    ],
    milestone: ["API connector practice", "Connect a third-party API and normalize response data.", 48]
  }
];

const firstNames = [
  "Aarav",
  "Aisha",
  "Riya",
  "Kabir",
  "Maya",
  "Vikram",
  "Ananya",
  "Dev",
  "Nisha",
  "Sumit",
  "Priya",
  "Karan",
  "Ishita",
  "Sahil",
  "Neha",
  "Tanvi",
  "Rohan",
  "Ankit",
  "Sanya",
  "Arnav"
];

const lastNames = [
  "Patel",
  "Kumar",
  "Singh",
  "Shah",
  "Gupta",
  "Mehta",
  "Reddy",
  "Verma",
  "Malhotra",
  "Nair",
  "Khan",
  "Joshi",
  "Bhat",
  "Desai",
  "Bhatt",
  "Chopra",
  "Dubey",
  "Iyengar",
  "Jain",
  "Mishra"
];

const actions = [
  "review your session notes and capture the next improvement",
  "finish the current webhook flow and test the payload mapping",
  "complete the final automation step for one live use case",
  "update the project milestone with daily progress",
  "verify your API auth settings and rerun the test flow",
  "submit one high-priority assignment with improved comments"
];

function daysAgo(days: number) {
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  return date;
}

function makeGeneratedStudent(index: number) {
  const first = firstNames[index % firstNames.length];
  const last = lastNames[index % lastNames.length];
  const weekNumber = 3 + ((index + 1) % 6);
  const topicIndex = index % topicPool.length;

  return {
    fullName: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}.${index + 1}@example.com`,
    whatsappNumber: `whatsapp:+91920${String(100000 + index).slice(1)}`,
    parentName: `${last} Parent`,
    parentPhone: `whatsapp:+91930${String(100000 + index).slice(1)}`,
    weekNumber,
    sessions: [
      [topicPool[topicIndex], true, 82 + ((index * 3) % 18)],
      [topicPool[(topicIndex + 2) % topicPool.length], index % 4 !== 0, 50 + ((index * 2) % 30)],
      [topicPool[(topicIndex + 4) % topicPool.length], index % 5 === 0, 0]
    ],
    assignments: [
      [`${topicPool[topicIndex]} practice`, topicPool[topicIndex], 12 + ((index * 2) % 9), 20],
      [`${topicPool[(topicIndex + 1) % topicPool.length]} review`, topicPool[(topicIndex + 1) % topicPool.length], 10 + ((index * 3) % 11), 20]
    ],
    doubts: [
      [`Can I reuse ${topicPool[topicIndex]} logic in the next workflow?`, topicPool[topicIndex], index % 3 === 0 ? DoubtStatus.OPEN : DoubtStatus.RESOLVED_BY_MENTOR]
    ],
    milestone: [`Week ${weekNumber} mini-project`, `Complete the ${topicPool[topicIndex]} milestone and capture the final learning summary.`, 58 + ((index * 4) % 34)]
  };
}

const generatedStudents = Array.from({ length: 100 }, (_, index) => makeGeneratedStudent(index));
const allSeededStudents = [...seededStudents, ...generatedStudents];

function buildReport(student: any, sample: any) {
  const score = Math.min(100, Math.max(50, 63 + ((student.fullName.length * 3) % 30)));
  const masteredTopics = [sample.sessions[0][0].toString(), sample.assignments[0][1].toString()];
  const needsWorkTopics = [sample.sessions[2][0].toString(), sample.assignments[1][1].toString()];
  const focusActions = [
    `Review ${sample.sessions[1][0]} with one quick checklist.`,
    `Finish the next step in ${sample.assignments[1][1]} and share your progress.`
  ];

  return {
    score,
    learnedSummary: `This week ${student.fullName} made steady progress on ${masteredTopics.join(" and ")}.
      ${needsWorkTopics.length ? `Next, focus on ${needsWorkTopics.join(" and ")}.` : ""}`,
    focusActions,
    encouragement: `${student.fullName.split(" ")[0]}, keep the momentum and make today’s task the smallest possible next step.`,
    trajectory: score >= 85 ? "on track" : score >= 70 ? "steady with clear next targets" : "needs focused support next week",
    masteredTopics,
    needsWorkTopics,
    deliveryStatus: score >= 70 ? ReportDeliveryStatus.SENT : ReportDeliveryStatus.DRAFT
  };
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@pathpilot.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      fullName: "PathPilot Admin",
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: UserRole.ADMIN
    }
  });

  await prisma.weeklyReport.deleteMany();
  await prisma.student.deleteMany();

  for (const sample of allSeededStudents) {
    const student = await prisma.student.create({
      data: {
        fullName: sample.fullName,
        email: sample.email,
        whatsappNumber: sample.whatsappNumber,
        weekNumber: sample.weekNumber,
        parent: {
          create: {
            fullName: sample.parentName,
            email: `${sample.parentName.toLowerCase().replace(/\s+/g, ".")}@parent.example.com`,
            whatsappNumber: sample.parentPhone,
            receiveReports: true
          }
        }
      }
    });

    await prisma.attendance.createMany({
      data: sample.sessions.map(([topic, present, minutes], index) => ({
        studentId: student.id,
        sessionAt: daysAgo(6 - index),
        present: Boolean(present),
        minutes: Number(minutes),
        topic: String(topic)
      }))
    });

    await prisma.assignmentScore.createMany({
      data: sample.assignments.map(([title, topic, score, maxScore], index) => ({
        studentId: student.id,
        title: String(title),
        topic: String(topic),
        score: Number(score),
        maxScore: Number(maxScore),
        submittedAt: daysAgo(5 - index)
      }))
    });

    await prisma.doubt.createMany({
      data: sample.doubts.map(([question, topic, status], index) => ({
        studentId: student.id,
        question: String(question),
        topic: String(topic),
        status: status as DoubtStatus,
        openedAt: daysAgo(4 - index),
        resolvedAt: status === DoubtStatus.OPEN ? null : daysAgo(3 - index)
      }))
    });

    await prisma.projectMilestone.create({
      data: {
        studentId: student.id,
        title: sample.milestone[0] as string,
        description: sample.milestone[1] as string,
        progress: sample.milestone[2] as number,
        dueDate: daysAgo(-2)
      }
    });

    const report = buildReport(student, sample);

    await prisma.weeklyReport.create({
      data: {
        studentId: student.id,
        weekStart: daysAgo(6),
        weekEnd: now,
        weekNumber: student.weekNumber,
        score: report.score,
        learnedSummary: report.learnedSummary,
        focusActions: report.focusActions,
        encouragement: report.encouragement,
        trajectory: report.trajectory,
        masteredTopics: report.masteredTopics,
        needsWorkTopics: report.needsWorkTopics,
        deliveryStatus: report.deliveryStatus
      }
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
