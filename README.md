# PathPilot Reports

PathPilot Reports is a full-stack weekly student progress reporting system.

It uses:

- React.js frontend sign-in and dashboard
- Express.js backend API
- PostgreSQL database
- Prisma ORM
- Redis + BullMQ worker for scalable background report generation
- Gemini API for personalized report writing
- Twilio WhatsApp integration
- n8n workflows for LMS ingestion, Sunday scheduling, and delivery audit

## Full File Structure

```text
new project folder/
├── .env.example
├── .gitignore
├── docker-compose.yml
├── package.json
├── package-lock.json
├── README.md
├── tsconfig.json
├── frontend/
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       └── styles.css
├── n8n-workflows/
│   ├── agent-1-lms-ingestion.json
│   ├── agent-2-sunday-report-generator.json
│   └── agent-3-delivery-audit.json
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── sample-lms-events/
│   ├── assignment-score.json
│   └── attendance.json
└── src/
    ├── app.ts
    ├── server.ts
    ├── config/
    │   └── env.ts
    ├── db/
    │   └── prisma.ts
    ├── jobs/
    │   ├── runWeeklyReports.ts
    │   └── worker.ts
    ├── middleware/
    │   └── auth.ts
    ├── queue/
    │   └── reportQueue.ts
    ├── routes/
    │   ├── auth.ts
    │   ├── health.ts
    │   ├── ingest.ts
    │   ├── reports.ts
    │   └── students.ts
    ├── services/
    │   ├── gemini.ts
    │   ├── reportGenerator.ts
    │   ├── score.ts
    │   └── whatsapp.ts
    └── utils/
        └── week.ts
```

## 1. Install Requirements

Install these first:

- Docker Desktop
- Node.js 22 or newer
- VS Code

Because Windows PowerShell may block `npm.ps1`, use `npm.cmd` commands.

## 2. Install Backend Packages

From the project root:

```powershell
npm.cmd install
```

## 3. Install React.js Frontend Packages

```powershell
npm.cmd --prefix frontend install
```

## 4. Create Environment Files

Create backend `.env`:

```powershell
copy .env.example .env
```

Edit `.env`:

```env
NODE_ENV=development
PORT=4001
APP_BASE_URL=http://localhost:4001

DATABASE_URL=postgresql://progress_user:progress_pass@localhost:5433/progress_reports?schema=public
REDIS_URL=redis://localhost:6379

GEMINI_API_KEY=AIzaSyBCYh7tf-IaYfXAQlcuj486oqPi7uXPbzI
GEMINI_MODEL=gemini-2.0-flash

REPORT_TIMEZONE=Asia/Kolkata
SCHEDULER_SECRET=change_this_secret_123
JWT_SECRET=change_this_to_a_very_long_random_login_secret

ADMIN_EMAIL=admin@pathpilot.local
ADMIN_PASSWORD=ChangeMe123!

SEND_WHATSAPP=false
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

Create frontend `.env`:

```powershell
copy frontend\.env.example frontend\.env
```

Frontend `.env`:

```env
VITE_API_BASE_URL=http://localhost:4001
```

## 5. Start Postgres, Redis, and n8n

```powershell
docker compose up -d
```

Running services:

- Backend API: `http://localhost:4001`
- React frontend: `http://localhost:5173`
- n8n: `http://localhost:5679`
- Postgres: `localhost:5433`
- Redis: `localhost:6379`

## 6. Create Database Tables

Generate Prisma client:

```powershell
npm.cmd run db:generate
```

Run database migration:

```powershell
npm.cmd run db:migrate -- --name init
```

Seed admin user and sample student:

```powershell
npm.cmd run db:seed
```

Default login after seeding:

```text
Email: admin@pathpilot.local
Password: ChangeMe123!
```

If you changed `ADMIN_EMAIL` or `ADMIN_PASSWORD` in `.env`, use those values.

## 7. Run Backend API

Open terminal 1:

```powershell
npm.cmd run dev
```

Test backend:

```powershell
curl http://localhost:4001/health
```

Expected:

```json
{"ok":true,"database":"connected"}
```

## 8. Run Background Worker

Open terminal 2:

```powershell
npm.cmd run worker
```

This worker processes queued weekly report jobs using Redis.

## 9. Run React.js Frontend

Open terminal 3:

```powershell
npm.cmd run frontend:dev
```

Open:

```text
http://localhost:5173
```

Sign in with:

```text
admin@pathpilot.local
ChangeMe123!
```

## 10. Generate a Weekly Report

Generate immediately:

```powershell
curl -X POST http://localhost:4001/reports/generate -H "Content-Type: application/json" -d "{}"
```

Or queue the scalable job:

```powershell
curl -X POST http://localhost:4001/reports/enqueue -H "Content-Type: application/json" -H "x-scheduler-secret: change_this_secret_123" -d "{}"
```

Refresh the React dashboard after generation.

## 11. n8n Agent Setup

Open:

```text
http://localhost:5679
```

Import these workflows:

- `n8n-workflows/agent-1-lms-ingestion.json`
- `n8n-workflows/agent-2-sunday-report-generator.json`
- `n8n-workflows/agent-3-delivery-audit.json`

In Agent 2, replace:

```text
CHANGE_TO_YOUR_SCHEDULER_SECRET
```

with your `.env` value:

```text
change_this_secret_123
```

## 12. Agent Responsibilities

Agent 1: LMS Data Ingestion

- Receives attendance, assignment, doubt, and project milestone events.
- Sends the data to backend API.
- Backend stores everything in Postgres.

Agent 2: Sunday Weekly Report Generator

- Runs every Sunday evening.
- Calls backend queue endpoint.
- Worker creates reports with Gemini.

Agent 3: Delivery Audit

- Checks generated reports.
- Finds failed delivery statuses.
- Can be extended to alert an admin.

## 13. Real LMS Event Example

Send this to the n8n LMS webhook:

```json
{
  "kind": "attendance",
  "backendBaseUrl": "http://host.docker.internal:4001",
  "payload": {
    "studentEmail": "pooja@example.com",
    "sessionAt": "2026-05-03T13:00:00.000Z",
    "present": true,
    "minutes": 90,
    "topic": "HTTP Request nodes"
  }
}
```

Supported event kinds:

- `attendance`
- `assignment_score`
- `doubt`
- `project_milestone`

## 14. WhatsApp Setup

Keep this while testing:

```env
SEND_WHATSAPP=false
```

When Twilio WhatsApp is ready:

```env
SEND_WHATSAPP=true
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

Reports are saved to Postgres even when WhatsApp is disabled.

## 15. Useful Commands

Type-check backend:

```powershell
npm.cmd run lint
```

Build backend:

```powershell
npm.cmd run build
```

Build React frontend:

```powershell
npm.cmd run frontend:build
```

Stop Docker services:

```powershell
docker compose down
```

## Important Notes

- The website name is **PathPilot Reports**.
- The frontend is built with **React.js** in `frontend/src/main.jsx`.
- Authentication is real backend authentication with Postgres users, bcrypt password hashing, and JWT login tokens.
- Gemini API is used through your real `GEMINI_API_KEY`.
- This project does not use fake LMS APIs. LMS/n8n sends real data into your backend ingestion routes.
