import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  LogOut,
  Mail,
  MessageSquareText,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  Trash2,
  Users
} from "lucide-react";
import "./styles.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const TOKEN_KEY = "pathpilot_token";

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentPageId, setStudentPageId] = useState(() => parseHashStudentId());
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

  const api = useMemo(() => createApi(token), [token]);

  useEffect(() => {
    if (!token) return;
    loadDashboard();
  }, [token]);

  useEffect(() => {
    const handleHashChange = () => setStudentPageId(parseHashStudentId());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      const [me, reportData, studentData] = await Promise.all([api.get("/auth/me"), api.get("/reports"), api.get("/students")]);
      setUser(me);
      setReports(reportData);
      setStudents(studentData);
    } catch (err) {
      setError(err.message);
      if (err.message.includes("token")) handleLogout();
    } finally {
      setLoading(false);
    }
  }

  function handleLogin(nextToken, nextUser) {
    localStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setReports([]);
    setStudents([]);
    setStudentPageId(null);
  }

  function parseHashStudentId() {
    const hash = window.location.hash;
    return hash.startsWith("#student-") ? hash.replace("#student-", "") : null;
  }

  function navigateToStudentPage(studentId) {
    window.history.pushState(null, "", `#student-${studentId}`);
    setStudentPageId(studentId);
  }

  function clearStudentPage() {
    window.history.pushState(null, "", window.location.pathname + window.location.search);
    setStudentPageId(null);
  }

  if (!token) {
    return <SignIn onLogin={handleLogin} />;
  }

  return (
    <Dashboard
      user={user}
      students={students}
      reports={reports}
      loading={loading}
      error={error}
      studentPageId={studentPageId}
      onOpenStudent={navigateToStudentPage}
      onCloseStudent={clearStudentPage}
      onRefresh={loadDashboard}
      onLogout={handleLogout}
    />
  );
}

function SignIn({ onLogin }) {
  const [email, setEmail] = useState("admin@pathpilot.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await createApi().post("/auth/login", { email, password });
      onLogin(result.token, result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="brand-panel">
        <div className="brand-mark">
          <BarChart3 size={34} />
        </div>
        <p className="eyebrow">PathPilot Reports</p>
        <h1>Weekly progress intelligence for every student.</h1>
        <p className="brand-copy">
          Generate personalized progress scores, mastery summaries, next-week actions, and WhatsApp updates from real LMS data.
        </p>
        <div className="signal-row">
          <span><CheckCircle2 size={18} /> Gemini reports</span>
          <span><ShieldCheck size={18} /> Secure coach login</span>
          <span><Clock3 size={18} /> 100+ seeded students</span>
        </div>
      </section>

      <section className="login-panel">
        <div>
          <p className="eyebrow">Coach Portal</p>
          <h2>Sign in</h2>
        </div>
        <form onSubmit={submit} className="login-form">
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            <LockKeyhole size={18} />
            {loading ? "Signing in..." : "Sign in"}
            <ArrowRight size={18} />
          </button>
        </form>
      </section>
    </main>
  );
}

function Dashboard({ user, students, reports, loading, error, studentPageId, onOpenStudent, onCloseStudent, onRefresh, onLogout }) {
  const [activeView, setActiveView] = useState("reports");
  const averageScore = reports.length ? Math.round(reports.reduce((sum, report) => sum + report.score, 0) / reports.length) : 0;
  const atRiskCount = reports.filter((report) => report.score < 65).length;
  const pageStudent = studentPageId ? students.find((student) => student.id === studentPageId) : null;

  return (
    <main className="dashboard-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <BarChart3 size={28} />
          <span>PathPilot</span>
        </div>
        <nav>
          <button className={activeView === "reports" ? "active" : ""} onClick={() => setActiveView("reports")}>
            <BarChart3 size={18} /> Reports
          </button>
          <button className={activeView === "students" ? "active" : ""} onClick={() => setActiveView("students")}>
            <Users size={18} /> Students
          </button>
        </nav>
        <button className="ghost-button" onClick={onLogout}>
          <LogOut size={18} /> Sign out
        </button>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Coach Dashboard</p>
            <h1>PathPilot Operations</h1>
            <p className="subhead">
              Signed in as {user?.fullName || "Coach"} · {user?.role || "COACH"}
            </p>
          </div>
          <button className="icon-button" onClick={onRefresh} disabled={loading} title="Refresh dashboard">
            <RefreshCw size={18} />
            Refresh
          </button>
        </header>

        {error && <p className="error banner">{error}</p>}

        <section className="metrics">
          <Metric label="Students" value={students.length} />
          <Metric label="Reports generated" value={reports.length} />
          <Metric label="Average score" value={reports.length ? `${averageScore}/100` : "N/A"} />
        </section>

        {activeView === "reports" ? (
          <ReportsView loading={loading} reports={reports} onRefresh={onRefresh} />
        ) : pageStudent ? (
          <StudentPage student={pageStudent} onBack={onCloseStudent} />
        ) : (
          <StudentsView loading={loading} students={students} onOpenStudent={onOpenStudent} />
        )}
      </section>
    </main>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric-card">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function ReportRow({ report, selected, onClick }) {
  return (
    <button className={`report-row ${selected ? "selected" : ""}`} onClick={onClick}>
      <div className="row-main">
        <h3>{report.student?.fullName || "Student"}</h3>
        <p>{report.learnedSummary}</p>
        <div className="detail-grid">
          <span>Trajectory: {report.trajectory}</span>
          <span>Status: {report.deliveryStatus}</span>
          <span>Week: {report.weekNumber}</span>
        </div>
        <div className="topic-row">
          {(report.masteredTopics || []).map((topic) => (
            <span key={topic} className="topic mastered">{topic}</span>
          ))}
          {(report.needsWorkTopics || []).map((topic) => (
            <span key={topic} className="topic needs-work">{topic}</span>
          ))}
        </div>
        {report.focusActions?.length ? (
          <ol className="actions-list">
            {report.focusActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ol>
        ) : null}
        <p className="encouragement">{report.encouragement}</p>
      </div>
      <div className={`score-pill ${scoreTone(report.score)}`}>{report.score}/100</div>
    </button>
  );
}

function ReportsView({ loading, reports, onRefresh }) {
  const [query, setQuery] = useState("");
  const [studentName, setStudentName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateMessage, setGenerateMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const reportsPerPage = 10;

  const filteredReports = reports.filter((report) => {
    const haystack = [
      report.student?.fullName,
      report.learnedSummary,
      report.trajectory,
      ...(report.masteredTopics || []),
      ...(report.needsWorkTopics || [])
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  const totalPages = Math.ceil(filteredReports.length / reportsPerPage);
  const startIndex = (currentPage - 1) * reportsPerPage;
  const paginatedReports = filteredReports.slice(startIndex, startIndex + reportsPerPage);
  const [selectedId, setSelectedId] = useState(null);
  const selectedReport = paginatedReports.find((report) => report.id === selectedId) || paginatedReports[0];

  async function handleGenerate(event) {
    event.preventDefault();
    if (!studentName.trim()) {
      setGenerateMessage("Enter a student name to generate a report.");
      return;
    }

    setGenerateLoading(true);
    setGenerateMessage("");
    try {
      const payload = { studentName: studentName.trim() };
      if (email.trim()) payload.email = email.trim();
      if (whatsappNumber.trim()) payload.whatsappNumber = whatsappNumber.trim();
      const result = await createApi().post("/reports/generate", payload);
      setGenerateMessage(`Generated ${result.count} report(s) for ${studentName.trim()}.`);
      setStudentName("");
      setEmail("");
      setWhatsappNumber("");
      await onRefresh();
    } catch (err) {
      setGenerateMessage(err.message);
    } finally {
      setGenerateLoading(false);
    }
  }

  return (
    <section className="workspace-grid">
      <div className="table-section">
        <div className="section-heading">
          <div>
            <h2>Weekly reports</h2>
            <p>Click a student report to inspect mastery, focus areas, and delivery status.</p>
          </div>
          <div className="search-box">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reports" />
          </div>
        </div>
        <div className="generate-panel">
          <div>
            <p className="eyebrow">Ad hoc report</p>
            <h3>Generate report by student name</h3>
            <p className="small-copy">
              Enter a full or partial student name and create a fresh progress report for that student.
            </p>
          </div>
          <form className="generate-form" onSubmit={handleGenerate}>
            <input
              value={studentName}
              onChange={(event) => setStudentName(event.target.value)}
              placeholder="Type student name"
              aria-label="Student name"
              required
            />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email (optional)"
              aria-label="Email"
            />
            <input
              value={whatsappNumber}
              onChange={(event) => setWhatsappNumber(event.target.value)}
              placeholder="WhatsApp number (optional)"
              aria-label="WhatsApp number"
            />
            <button type="submit" disabled={generateLoading}>
              {generateLoading ? "Generating..." : "Generate report"}
            </button>
          </form>
          {generateMessage && <p className="generate-status">{generateMessage}</p>}
        </div>
        <div className="report-list">
          {loading ? (
            <p className="muted">Loading reports...</p>
          ) : paginatedReports.length ? (
            paginatedReports.map((report) => (
              <ReportRow key={report.id} report={report} selected={selectedReport?.id === report.id} onClick={() => setSelectedId(report.id)} />
            ))
          ) : (
            <p className="muted">No reports match your search.</p>
          )}
        </div>
        {totalPages > 1 && (
          <div className="pagination">
            <button 
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} 
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button 
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} 
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      <ReportDetail report={selectedReport} onRefresh={onRefresh} />
    </section>
  );
}

function StudentsView({ loading, students, onOpenStudent }) {
  const [query, setQuery] = useState("");
  const filteredStudents = students.filter((student) => `${student.fullName} ${student.email}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <section className="workspace-grid">
      <div className="table-section">
        <div className="section-heading">
          <div>
            <h2>Students</h2>
            <p>Click a student to open a separate detail page for that student.</p>
          </div>
          <div className="search-box">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search students" />
          </div>
        </div>
        <div className="student-list">
          {loading ? (
            <p className="muted">Loading students...</p>
          ) : filteredStudents.length ? (
            filteredStudents.map((student) => (
              <button
                className="student-row"
                key={student.id}
                onClick={() => onOpenStudent(student.id)}
              >
                <div>
                  <h3>{student.fullName}</h3>
                  <p>{student.email}</p>
                </div>
                <div className="student-meta">
                  <span>Week {student.weekNumber}</span>
                  <span>{student.parent?.receiveReports ? "Parent updates on" : "Parent updates off"}</span>
                </div>
              </button>
            ))
          ) : (
            <p className="muted">No students match your search.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function StudentPage({ student, onBack }) {
  return (
    <section className="workspace-grid">
      <div className="table-section">
        <div className="section-heading">
          <div>
            <h2>{student.fullName}</h2>
            <p>Student detail page for a single student.</p>
          </div>
          <button className="ghost-button" onClick={onBack}>
            <ArrowRight size={18} style={{ transform: "rotate(180deg)" }} /> Back to list
          </button>
        </div>
      </div>
      <StudentDetail student={student} />
    </section>
  );
}

function ReportDetail({ report, onRefresh }) {
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this report?")) return;
    
    setActionLoading(true);
    setActionMessage("");
    try {
      await createApi().delete(`/reports/${report.id}`);
      setActionMessage("Report deleted successfully.");
      await onRefresh();
    } catch (err) {
      setActionMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSendWhatsapp() {
    setActionLoading(true);
    setActionMessage("");
    try {
      const result = await createApi().post(`/reports/${report.id}/send-whatsapp`);
      setActionMessage(result.message);
      await onRefresh();
    } catch (err) {
      setActionMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSendEmail() {
    setActionLoading(true);
    setActionMessage("");
    try {
      const result = await createApi().post(`/reports/${report.id}/send-email`);
      setActionMessage(result.message);
      await onRefresh();
    } catch (err) {
      setActionMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  if (!report) {
    return <aside className="detail-panel"><p className="muted">Select a report to view details.</p></aside>;
  }

  return (
    <aside className="detail-panel">
      <div className="detail-header">
        <p className="eyebrow">Report Detail</p>
        <h2>{report.student?.fullName || "Student"}</h2>
        <div className={`large-score ${scoreTone(report.score)}`}>{report.score}/100</div>
      </div>

      <div className="insight-block">
        <h3><BarChart3 size={18} /> This week</h3>
        <p>{report.learnedSummary}</p>
      </div>

      <div className="insight-block">
        <h3><Target size={18} /> Focus next week</h3>
        <ol>
          {(report.focusActions || []).map((action) => <li key={action}>{action}</li>)}
        </ol>
      </div>

      <div className="insight-block">
        <h3><MessageSquareText size={18} /> Encouragement</h3>
        <p>{report.encouragement}</p>
      </div>

      <div className="action-buttons">
        <button onClick={handleSendWhatsapp} disabled={actionLoading}>
          <MessageSquareText size={16} /> Send WhatsApp
        </button>
        <button onClick={handleSendEmail} disabled={actionLoading}>
          <Mail size={16} /> Send Email
        </button>
        <button onClick={handleDelete} disabled={actionLoading} className="danger">
          <Trash2 size={16} /> Delete
        </button>
      </div>

      {actionMessage && <p className="action-status">{actionMessage}</p>}

      <div className="detail-stats">
        <span>Delivery: {report.deliveryStatus}</span>
        <span>Trajectory: {report.trajectory}</span>
        <span>Week {report.weekNumber}</span>
      </div>
    </aside>
  );
}

function StudentDetail({ student }) {
  if (!student) {
    return <aside className="detail-panel"><p className="muted">Select a student to view details.</p></aside>;
  }

  return (
    <aside className="detail-panel">
      <div className="detail-header">
        <p className="eyebrow">Student Profile</p>
        <h2>{student.fullName}</h2>
        <div className="large-score neutral">Week {student.weekNumber}</div>
      </div>

      <div className="insight-block">
        <h3><Users size={18} /> Student contact</h3>
        <p>{student.email}</p>
        <p>{student.whatsappNumber || "No WhatsApp number"}</p>
      </div>

      <div className="insight-block">
        <h3><ShieldCheck size={18} /> Parent visibility</h3>
        <p>{student.parent?.fullName || "No parent linked"}</p>
        <p>{student.parent?.whatsappNumber || "No parent WhatsApp number"}</p>
      </div>

      <div className="detail-stats">
        <span>{student.parent?.receiveReports ? "Parent reports enabled" : "Parent reports disabled"}</span>
        <span>Created {new Date(student.createdAt).toLocaleDateString()}</span>
      </div>
    </aside>
  );
}

function scoreTone(score) {
  if (score >= 85) return "excellent";
  if (score >= 70) return "steady";
  return "attention";
}

function createApi(token) {
  async function request(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Request failed");
    }
    return data;
  }

  return {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
    delete: (path) => request(path, { method: "DELETE" })
  };
}

createRoot(document.getElementById("root")).render(<App />);
