import React from "react"
import ReactDOM from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import App from "./App"
import { AuthProvider } from "./contexts/AuthContext"
import { ProjectProvider } from "./contexts/ProjectContext"
import { NotificationProvider } from "./contexts/NotificationContext"
import { DataSyncProvider } from "./contexts/DataSyncContext"
import "./index.css"

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProjectProvider>
          <NotificationProvider>
            <DataSyncProvider>
              <App />
            </DataSyncProvider>
          </NotificationProvider>
        </ProjectProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
