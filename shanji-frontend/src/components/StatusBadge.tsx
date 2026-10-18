export function StatusBadge({ status, className = '' }: { status: string; className?: string }) {
  const colorMap: Record<string, string> = {
    pending: '#6B7280',
    approved: '#10B981',
    rejected: '#EF4444',
    active: '#3B82F6',
    completed: '#059669',
    green: '#10B981',
    amber: '#F59E0B',
    red: '#EF4444',
    open: '#6B7280',
    closed: '#059669',
    draft: '#6B7280',
    in_progress: '#3B82F6',
    not_started: '#9CA3AF',
    blocked: '#EF4444',
    verified: '#10B981',
    needs_correction: '#EF4444',
    submitted_for_verification: '#F59E0B',
    initiated: '#3B82F6',
    planning: '#8B5CF6',
    at_risk: '#EF4444',
    on_hold: '#F59E0B',
    closure: '#8B5CF6',
  };

  const color = colorMap[status] || '#6B7280';

  return (
    <span className={className} style={{
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: 600,
      color,
      backgroundColor: `${color}15`,
      border: `1px solid ${color}40`,
    }}>
      {status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  );
}