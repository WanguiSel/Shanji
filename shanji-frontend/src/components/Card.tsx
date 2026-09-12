import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function Card({ children, style, className }: CardProps) {
  return (
    <div style={{
      background: 'white',
      padding: '24px',
      borderRadius: '8px',
      border: '1px solid #E5E7EB',
      ...style,
    }} className={className}>
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}

export function StatCard({ title, value, subtitle, color = '#1F2937' }: StatCardProps) {
  return (
    <div style={{
      background: 'white',
      padding: '24px',
      borderRadius: '8px',
      border: '1px solid #E5E7EB',
    }}>
      <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
        {title}
      </p>
      <p style={{ fontSize: '28px', fontWeight: 700, color, margin: '0 0 4px' }}>
        {value}
      </p>
      {subtitle && <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>{subtitle}</p>}
    </div>
  );
}