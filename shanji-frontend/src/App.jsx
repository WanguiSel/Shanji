import { BrowserRouter, Routes, Route } from "react-router-dom"

import Login from "./pages/Login"
import RoleSelection from "./pages/RoleSelection"
import Dashboard from "./pages/Dashboard"
import ProjectWorkspace from "./pages/ProjectWorkspace"
import MainLayout from "./layouts/MainLayout"
import Projects from "./pages/Projects"


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
          element={<RoleSelection />}
        />

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

        </Route>

      </Routes>

    </BrowserRouter>
  )
}

export default App