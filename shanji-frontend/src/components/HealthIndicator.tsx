import type { ProjectHealth } from '../types';

export function HealthIndicator({ health, size = 'md' }: { health: ProjectHealth; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 10, md: 14, lg: 20 };
  const s = sizes[size];
  const colors = { green: '#10B981', amber: '#F59E0B', red: '#EF4444' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        width: s,
        height: s,
        borderRadius: '50%',
        backgroundColor: colors[health],
        border: `2px solid ${colors[health]}40`,
        flexShrink: 0,
      }} />
      <span style={{ textTransform: 'capitalize', fontSize: size === 'sm' ? '12px' : '14px', fontWeight: 600 }}>
        {health}
      </span>
    </div>
  );
}