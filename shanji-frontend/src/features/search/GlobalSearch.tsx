import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Card } from "../../components/Card";
import { Loading } from "../../components/Loading";

function GlobalSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Debounced search to avoid excessive API calls
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      if (term.trim()) {
        performSearch(term);
      } else {
        setResults({});
        setShowResults(false);
      }
    }, 300),
    []
  );

  const performSearch = async (term: string) => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Build search query with proper permission checks
      const searchPromises = [];

      // Search projects (user has access to these through organization roles)
      searchPromises.push(
        supabase
          .from("projects")
          .select("id, project_name, project_code, client_name, status, progress, organization_id")
          .or(`organization_id.in.(${user.organization_ids || []}),project_id.in.(select id from project_members where user_id = ${user.id})`)
          .ilike("project_name", `%${term}%`)
          .limit(10)
      );

      // Search tasks (tasks are linked to projects user has access to)
      searchPromises.push(
        supabase
          .from("workplan_items")
          .select(
             `id, task_title, status, priority, end_date, project_id, workplan:workplans(project_name, project_code)`
           )
           .in(
             "project_id",
             (
               await supabase
                 .from("projects")
                 .select("id")
                 .or(`organization_id.in.(${user.organization_ids || []}),id.in.(select project_id from project_members where user_id = ${user.id})`)
             ).data || []
           )
          .ilike("task_title", `%${term}%`)
          .limit(10)
      );

      // Search people (profiles)
      searchPromises.push(
        supabase
          .from("profiles")
          .select("id, full_name, email, role, organization_id, department")
          .eq("organization_id", user.organization_id || "")
          .ilike("full_name", `%${term}%`)
          .limit(10)
      );

      // Search evidence records
      searchPromises.push(
        supabase
          .from("evidence_records")
          .select(
             `id, title, evidence_type, created_at, project_id, task_id, uploader_id`
           )
           .in(
             "project_id",
             (
               await supabase
                 .from("projects")
                 .select("id")
                 .or(`organization_id.in.(${user.organization_ids || []}),id.in.(select project_id from project_members where user_id = ${user.id})`)
             ).data || []
           )
          .ilike("title", `%${term}%`)
          .limit(10)
      );

      // Search approvals
      searchPromises.push(
        supabase
          .from("approvals")
          .select(
            `id, title, item_type, status, requested_at, project_id, requested_by`
          )
           .ilike("title", `%${term}%`)
          .limit(5)
      );

      const [projects, tasks, people, evidence, approvals] = await Promise.all(searchPromises);

      const searchResults = {
        projects: projects || [],
        tasks: tasks || [],
        people: people || [],
        evidence: evidence || [],
        approvals: approvals || [],
      };

      setResults(searchResults);
      setShowResults(true);
    } catch (err) {
      setError("Search failed. Please try again.");
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value;
    setSearchTerm(term);
    debouncedSearch(term);
  };

  const getEntityColor = (type: string) => {
    const colors: Record<string, string> = {
      projects: "#0D6B4E",
      tasks: "#2563EB",
      people: "#F59E0B",
      evidence: "#059669",
      approvals: "#8B5CF6",
    };
    return colors[type] || "#6B7280";
  };

  const getEntityIcon = (type: string) => {
    const icons: Record<string, string> = {
      projects: "📁",
      tasks: "✅",
      people: "👤",
      evidence: "🖼️",
      approvals: "🔄",
    };
    return icons[type] || "📄";
  };

  const navigateToEntity = (type: string, id: string, projectId?: string) => {
    switch (type) {
      case "projects":
        navigate(`/projects/${id}`);
        break;
      case "tasks":
        if (projectId) navigate(`/projects/${projectId}?tab=tasks`);
        break;
      case "people":
        navigate(`/people/${id}`);
        break;
      case "evidence":
        navigate(`/projects/${projectId}?tab=evidence`);
        break;
      case "approvals":
        navigate(`/projects/${projectId}?tab=approvals`);
        break;
      default:
        break;
    }
  };

  return (
    <div>
      <div style={styles.searchContainer}>
        <div style={styles.searchHeader}>
          <h1>Global Search</h1>
          <div style={styles.searchInputWrapper}>
            <input
              type="text"
              placeholder="Search projects, tasks, people, evidence, approvals..."
              value={searchTerm}
              onChange={handleSearchChange}
              style={styles.searchInput}
            />
            {loading && <div style={styles.spinner}>⏳</div>}
          </div>
        </div>

        {error && (
          <div style={styles.errorMessage}>{error}</div>
        )}

        {showResults && (
          <div style={styles.resultsContainer}>
            {Object.entries(results as Record<string, any[]>).map(([type, items]) => {
              if (!items || items.length === 0) return null;

              return (
                <div key={type} style={styles.resultSection}>
                  <div style={styles.resultHeader}>
                    <span style={{ fontSize: "18px", marginRight: "8px" }}>{getEntityIcon(type)}</span>
                    <h2 style={{ fontSize: "16px", margin: 0, color: getEntityColor(type) }}>
                      {type.charAt(0).toUpperCase() + type.slice(1)} ({items.length})
                    </h2>
                  </div>

                  <div style={styles.resultGrid}>
                    {items.map((item: any) => (
                      <div
                        key={item.id}
                        style={styles.resultCard}
                        onClick={() => navigateToEntity(type, item.id, item.project_id)}
                      >
                        <div style={styles.cardContent}>
                          <div style={{ fontWeight: 600, marginBottom: "4px" }}>{item.title || item.project_name || item.task_title || item.full_name}</div>
                          <div style={{ fontSize: "13px", color: "#6B7280", marginBottom: "8px" }}>
                            {item.project_code || item.client_name || item.role || item.evidence_type || item.status}
                          </div>
                          <div style={{ fontSize: "12px", color: "#9CA3AF" }}>
                            {item.end_date ? new Date(item.end_date).toLocaleDateString() : item.requested_at ? new Date(item.requested_at).toLocaleDateString() : "-"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showResults && Object.keys(results).length === 0 && (
          <div style={styles.noResults}>No results found for "{searchTerm}"</div>
        )}
      </div>
    </div>
  );
}

// Debounce utility function
function debounce(func: Function, wait: number): (...args: any[]) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const styles: Record<string, React.CSSProperties> = {
  searchList: { padding: "24px", maxWidth: "1200px", margin: "0 auto" },
  searchInput: {
    width: "100%",
    padding: "12px 16px",
    fontSize: "16px",
    border: "1px solid #D1D5DB",
    borderRadius: "8px",
    outline: "none",
  },
  searchInputWrapper: {
    position: "relative",
    marginTop: "16px",
  },
  spinner: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "14px",
    color: "#6B7280",
  },
  resultSection: {
    marginBottom: "32px",
    background: "white",
    padding: "20px",
    borderRadius: "8px",
    border: "1px solid #E5E7EB",
  },
  resultHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: "16px",
    paddingBottom: "8px",
    borderBottom: "1px solid #F3F4F6",
  },
  resultGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
    gap: "12px",
  },
  resultCard: {
    padding: "12px",
    background: "#F9FAFB",
    borderRadius: "6px",
    border: "1px solid #E5E7EB",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  cardContent: {
    display: "flex",
    flexDirection: "column",
  },
  errorMessage: {
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    color: "#DC2626",
    padding: "12px",
    borderRadius: "6px",
    marginBottom: "16px",
  },
  noResults: {
    textAlign: "center",
    color: "#6B7280",
    padding: "32px",
    fontSize: "14px",
  },
};

export default GlobalSearch;