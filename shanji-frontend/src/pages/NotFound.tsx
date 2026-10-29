import { Link } from "react-router-dom";

function NotFound({ notImplemented = false }: { notImplemented?: boolean }) {
  return (
    <div style={{ padding: "48px", textAlign: "center" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "8px" }}>
        {notImplemented ? "Module not available" : "Page not found"}
      </h1>
      <p style={{ color: "#6B7280", fontSize: "14px", marginBottom: "20px" }}>
        {notImplemented
          ? "This module has no implementation in the restored application."
          : "The page you requested does not exist."}
      </p>
      <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
    </div>
  );
}

export default NotFound;
