export function Loading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
      <p>{message}</p>
    </div>
  );
}

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center', color: '#9CA3AF' }}>
      <p style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px', color: '#6B7280' }}>{title}</p>
      {message && <p style={{ fontSize: '14px' }}>{message}</p>}
    </div>
  );
}