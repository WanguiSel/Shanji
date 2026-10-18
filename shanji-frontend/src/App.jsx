import { BrowserRouter, Routes, Route } from "react-router-dom"

import Login from "./pages/Login"
import RoleSelection from "./pages/RoleSelection"
import Dashboard from "./pages/Dashboard"
import ProjectWorkspace from "./pages/ProjectWorkspace"
import MainLayout from "./layouts/MainLayout"
import Projects from "./pages/Projects"
import ProtectedRoute from "./components/ProtectedRoute"
import NotFound from "./pages/NotFound"


function App() {

  return (
    <BrowserRouter>

      <Routes>

        <Route 
          path="/" 
          element={<Login />} 
        />

        <Route 
          path="/role"
          element={<ProtectedRoute />}
        >
          <Route index element={<RoleSelection />} />
        </Route>

        <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>

          <Route 
            path="/dashboard"
            element={<Dashboard />}
          />
          <Route 
  path="/projects"
  element={<Projects />}
/>


          <Route 
            path="/projects/:id"
            element={<ProjectWorkspace />}
          />

          <Route path="/workplans" element={<NotFound notImplemented />} />
          <Route path="/risks" element={<NotFound notImplemented />} />
          <Route path="/reports" element={<NotFound notImplemented />} />

        </Route>
        </Route>

        <Route path="*" element={<NotFound />} />

      </Routes>

    </BrowserRouter>
  )
}

export default App