import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./contexts/AuthContext"
import { ProjectProvider } from "./contexts/ProjectContext"
import { NotificationProvider } from "./contexts/NotificationContext"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Projects from "./pages/Projects"
import ProjectWorkspace from "./pages/ProjectWorkspace"
import MainLayout from "./layouts/MainLayout"
import RoleSelection from "./pages/RoleSelection"
import { ErrorBoundary } from "./components/ErrorBoundary"
import TasksPage from "./features/tasks/TasksPage"
import ApprovalsPage from "./features/approvals/ApprovalsPage"
import RisksPage from "./features/risks/RisksPage"
import IssuesPage from "./features/issues/IssuesPage"
import ProcurementPage from "./features/procurement/ProcurementPage"
import FinancePage from "./features/finance/FinancePage"
import EvidencePage from "./features/evidence/EvidencePage"
import SitePage from "./features/site/SitePage"
import HSEQPage from "./features/hseq/HSEQPage"
import DocumentsPage from "./features/documents/DocumentsPage"
import NotificationsPage from "./features/notifications/NotificationsPage"
import ReportsPage from "./features/reports/ReportsPage"
import ChangeRequestsPage from "./features/change/ChangeRequestsPage"
import HandoverPage from "./features/handover/HandoverPage"
import TimelinePage from "./features/timeline/TimelinePage"
import ActivityPage from "./pages/Activity"

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProjectProvider>
          <NotificationProvider>
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/role" element={<RoleSelection />} />
                <Route element={<MainLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/projects/:id" element={<ProjectWorkspace />} />
                  <Route path="/projects/:id/tasks" element={<TasksPage />} />
                  <Route path="/projects/:id/approvals" element={<ApprovalsPage />} />
                  <Route path="/projects/:id/risks" element={<RisksPage />} />
                  <Route path="/projects/:id/issues" element={<IssuesPage />} />
                  <Route path="/projects/:id/procurement" element={<ProcurementPage />} />
                  <Route path="/projects/:id/finance" element={<FinancePage />} />
                  <Route path="/projects/:id/evidence" element={<EvidencePage />} />
                  <Route path="/projects/:id/site" element={<SitePage />} />
                  <Route path="/projects/:id/hseq" element={<HSEQPage />} />
                  <Route path="/projects/:id/documents" element={<DocumentsPage />} />
                  <Route path="/projects/:id/notifications" element={<NotificationsPage />} />
                  <Route path="/projects/:id/reports" element={<ReportsPage />} />
                  <Route path="/projects/:id/change-requests" element={<ChangeRequestsPage />} />
                  <Route path="/projects/:id/handover" element={<HandoverPage />} />
                  <Route path="/projects/:id/timeline" element={<TimelinePage />} />
                  <Route path="/activity" element={<ActivityPage />} />
                </Route>
              </Routes>
            </ErrorBoundary>
          </NotificationProvider>
        </ProjectProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
