import { BrowserRouter, Routes, Route } from "react-router-dom"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Projects from "./pages/Projects"
import ProjectWorkspace from "./pages/ProjectWorkspace"
import MainLayout from "./layouts/MainLayout"
import RoleSelection from "./pages/RoleSelection"
import NotFound from "./pages/NotFound"
import ProtectedRoute from "./components/ProtectedRoute"
import { ErrorBoundary } from "./components/ErrorBoundary"
import TasksPage from "./features/tasks/TasksPage"
import WorkplanPage from "./features/workplans/WorkplanPage"
import DependencyEngine from "./features/dependencies/DependencyEngine"
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
import GlobalSearch from "./features/search/GlobalSearch"
import ActivityPage from "./pages/Activity"
import ProjectComments from "./pages/ProjectComments"

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/role" element={<RoleSelection />} />
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectWorkspace />} />
              <Route path="/projects/:id/workplan" element={<WorkplanPage />} />
              <Route path="/projects/:id/tasks" element={<TasksPage />} />
              <Route path="/projects/:id/dependencies" element={<DependencyEngine />} />
              <Route path="/projects/:id/timeline" element={<TimelinePage />} />
              <Route path="/projects/:id/approvals" element={<ApprovalsPage />} />
              <Route path="/projects/:id/risks" element={<RisksPage />} />
              <Route path="/projects/:id/issues" element={<IssuesPage />} />
              <Route path="/projects/:id/procurement" element={<ProcurementPage />} />
              <Route path="/projects/:id/finance" element={<FinancePage />} />
              <Route path="/projects/:id/evidence" element={<EvidencePage />} />
              <Route path="/projects/:id/site" element={<SitePage />} />
              <Route path="/projects/:id/hseq" element={<HSEQPage />} />
              <Route path="/projects/:id/documents" element={<DocumentsPage />} />
              <Route path="/projects/:id/comments" element={<ProjectComments />} />
              <Route path="/projects/:id/reports" element={<ReportsPage />} />
              <Route path="/projects/:id/change-requests" element={<ChangeRequestsPage />} />
              <Route path="/projects/:id/handover" element={<HandoverPage />} />
              <Route path="/projects/:id/notifications" element={<NotificationsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/search" element={<GlobalSearch />} />
              <Route path="/activity" element={<ActivityPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
