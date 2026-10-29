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
      const [projectResult, taskResult, peopleResult, approvalResult] = await Promise.all([
        supabase.from("projects").select("*").limit(100),
        supabase.from("tasks").select("*").limit(200),
        supabase.from("Profiles").select("*").limit(100),
        supabase.from("approvals").select("*").limit(100),
      ]);

      const needle = term.toLowerCase();
      const matches = (value: unknown) => String(value || "").toLowerCase().includes(needle);

      const searchResults = {
        projects: (projectResult.data || []).filter((p: any) =>
          matches(p.project_name) || matches(p.project_code) || matches(p.client_name) || matches(p.description)
        ).slice(0, 10),
        tasks: (taskResult.data || []).filter((t: any) =>
          matches(t.description) || matches(t.task_title) || matches(t.title)
        ).slice(0, 10),
        people: (peopleResult.data || []).filter((p: any) =>
          matches(p.full_name) || matches(p.email)
        ).slice(0, 10),
        approvals: (approvalResult.data || []).filter((a: any) =>
          matches(a.title) || matches(a.status) || matches(a.item_type)
        ).slice(0, 10),
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
        // No dedicated people route exists in the recovered application.
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
                          <div style={{ fontWeight: 600, marginBottom: "4px" }}>{item.title || item.project_name || item.task_title || item.description || item.full_name}</div>
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