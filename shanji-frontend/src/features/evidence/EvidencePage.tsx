import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import type { EvidenceRecord, ActivityLog } from "../../types";
import { Card } from "../../components/Card";
import { Loading, EmptyState } from "../../components/Loading";
import { Modal } from "../../components/Modal";
import { useToast } from "../../hooks/useToast";

const EVIDENCE_BUCKET = "evidence";

function EvidencePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toasts, showToast } = useToast();

  useEffect(() => { loadEvidence(); }, []);

  async function loadEvidence() {
    if (!id) return;
    try {
      const { data } = await supabase.from("evidence_records").select("*").eq("project_id", id).order("created_at", { ascending: false });
      setEvidence((data || []) as EvidenceRecord[]);
      await loadSignedUrls(data || []);
    } catch (e) {
      setError("Failed to load evidence");
    } finally {
      setLoading(false);
    }
  }

  async function loadSignedUrls(records: EvidenceRecord[]) {
    const urls: Record<string, string> = {};
    for (const rec of records) {
      if (rec.file_path) {
        const { data } = await supabase.storage.from(EVIDENCE_BUCKET).createSignedUrl(rec.file_path, 3600);
        if (data?.signedUrl) {
          urls[rec.id] = data.signedUrl;
        }
      }
    }
    setSignedUrls((prev) => ({ ...prev, ...urls }));
  }

  async function logActivity(action: string, description: string, entityType: string, entityId?: string) {
    if (!id || !user?.id) return;
    await supabase.from("activity_logs").insert({
      project_id: id,
      actor_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      description,
      metadata: {},
    }).then(({ error }) => {
      if (error) console.error("Activity log failed:", error);
    });
  }

  async function uploadEvidence() {
    if (!id || !uploadTitle.trim() || !uploadFile || !user?.id) return;

    const fileExt = uploadFile.name.split(".").pop();
    const filePath = `evidence/${id}/${Date.now()}-${uploadFile.name}`;

    const { error: uploadError } = await supabase.storage.from(EVIDENCE_BUCKET).upload(filePath, uploadFile, {
      cacheControl: "3600",
      upsert: false,
    });

    if (uploadError) {
      showToast("error", "Failed to upload file");
      return;
    }

    const { data, error: dbError } = await supabase.from("evidence_records").insert({
      project_id: id,
      task_id: null,
      uploader_id: user.id,
      title: uploadTitle.trim(),
      description: uploadDesc || null,
      file_path: filePath,
      file_name: uploadFile.name,
      mime_type: uploadFile.type,
      evidence_type: "document",
      verification_status: "pending",
    }).select().single();

    if (dbError) {
      showToast("error", "Failed to save evidence record");
      return;
    }

    setShowUpload(false);
    setUploadTitle("");
    setUploadDesc("");
    setUploadFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    showToast("success", "Evidence uploaded");
    await logActivity("upload_evidence", `Evidence "${uploadTitle.trim()}" uploaded`, "evidence", data.id);
    loadEvidence();
  }

  async function verifyEvidence(evId: string, status: string) {
    if (!user?.id) return;
    const { error } = await supabase.from("evidence_records").update({
      verification_status: status,
      verified_by: user.id,
      verified_at: new Date().toISOString(),
      verification_comment: status === "rejected" ? "Rejected by reviewer" : status === "verified" ? "Verified" : null,
    }).eq("id", evId);
    if (!error) {
      showToast("success", `Evidence ${status}`);
      await logActivity("verify_evidence", `Evidence ${status}`, "evidence", evId);
      loadEvidence();
    }
  }

  if (loading) return <Loading />;

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1>Evidence</h1>
          <p style={{ color: "#6B7280", fontSize: "14px", marginTop: "4px" }}>Photos, documents, and verification records</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowUpload(true)}>+ Upload Evidence</button>
      </div>

      {error && (
        <Card>
          <EmptyState title="Error" message={error} />
        </Card>
      )}

      {evidence.length === 0 ? (
        <Card>
          <EmptyState title="No evidence" message="Upload evidence to support task completion." />
        </Card>
      ) : (
        <div style={styles.grid}>
          {evidence.map((ev) => (
            <Card key={ev.id}>
              <div style={styles.evHeader}>
                <div style={{ fontWeight: 600 }}>{ev.title}</div>
                <span style={{
                  padding: "4px 8px", borderRadius: "4px", fontSize: "12px",
                  background: ev.verification_status === "verified" ? "#ECFDF5" : ev.verification_status === "rejected" ? "#FEF2F2" : "#F3F4F6",
                  color: ev.verification_status === "verified" ? "#059669" : ev.verification_status === "rejected" ? "#DC2626" : "#6B7280",
                }}>
                  {ev.verification_status}
                </span>
              </div>
              {ev.description && <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "8px" }}>{ev.description}</p>}
              <div style={styles.evMeta}>
                <span>Type: {ev.evidence_type}</span>
                <span>By: {ev.uploader_id?.slice(0, 8) || "—"}</span>
                <span>{new Date(ev.created_at).toLocaleDateString()}</span>
              </div>
              {ev.file_path && signedUrls[ev.id] && (
                <div style={{ marginTop: "8px" }}>
                  <a
                    href={signedUrls[ev.id]}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: "12px", color: "#2563EB", textDecoration: "underline" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Preview file
                  </a>
                </div>
              )}
              {ev.verification_status === "pending" && user && (
                <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                  <button className="btn btn-sm btn-primary" onClick={() => verifyEvidence(ev.id, "verified")}>Verify</button>
                  <button className="btn btn-sm btn-secondary" onClick={() => verifyEvidence(ev.id, "rejected")}>Reject</button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showUpload} onClose={() => setShowUpload(false)} title="Upload Evidence">
        <label style={styles.label}>Title *</label>
        <input className="input" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} style={{ marginBottom: "12px" }} />
        <label style={styles.label}>File *</label>
        <input ref={fileInputRef} type="file" className="input" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} style={{ marginBottom: "12px" }} />
        <label style={styles.label}>Description</label>
        <textarea className="input" rows={3} value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)} style={{ marginBottom: "16px" }} />
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={() => setShowUpload(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={uploadEvidence}>Upload</button>
        </div>
      </Modal>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" },
  evHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  evMeta: { display: "flex", gap: "12px", fontSize: "12px", color: "#6B7280", marginTop: "8px", flexWrap: "wrap" },
  label: { fontSize: "13px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "4px" },
};

export default EvidencePage;
