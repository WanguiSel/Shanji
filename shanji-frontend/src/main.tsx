import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import { AuthProvider } from "./contexts/AuthContext"
import { ProjectProvider } from "./contexts/ProjectContext"
import { NotificationProvider } from "./contexts/NotificationContext"
import { DataSyncProvider } from "./contexts/DataSyncContext"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <ProjectProvider>
        <NotificationProvider>
          <DataSyncProvider>
            <App />
          </DataSyncProvider>
        </NotificationProvider>
      </ProjectProvider>
    </AuthProvider>
  </React.StrictMode>
)
