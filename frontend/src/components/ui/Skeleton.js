import React from 'react';

const shimmerStyle = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .skeleton-shimmer {
    background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-secondary) 50%, var(--bg-tertiary) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }
`;

export const Skeleton = ({ width = '100%', height = '20px', borderRadius = '4px', style = {} }) => (
  <div style={{ width, height, borderRadius, ...style }}>
    <style>{shimmerStyle}</style>
    <div className="skeleton-shimmer" style={{ width: '100%', height: '100%', borderRadius }} />
  </div>
);

export const CardSkeleton = () => (
  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 14, padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
    <style>{shimmerStyle}</style>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div className="skeleton-shimmer" style={{ width: 44, height: 44, borderRadius: 12 }} />
      <div style={{ flex: 1 }}>
        <Skeleton width="60%" height="12px" style={{ marginBottom: 8 }} />
        <Skeleton width="40%" height="28px" />
      </div>
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5, columns = 6 }) => (
  <div style={{ width: '100%' }}>
    <style>{shimmerStyle}</style>
    {/* Header */}
    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} width={`${100 / columns}%`} height="16px" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} width={`${100 / columns}%`} height="14px" />
        ))}
      </div>
    ))}
  </div>
);

export const ChartSkeleton = ({ height = 200 }) => (
  <div style={{ width: '100%', height }}>
    <style>{shimmerStyle}</style>
    <div className="skeleton-shimmer" style={{ width: '100%', height: '100%', borderRadius: 8 }} />
  </div>
);

export const FormSkeleton = ({ fields = 3 }) => (
  <div style={{ display: 'grid', gap: 16 }}>
    <style>{shimmerStyle}</style>
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i}>
        <Skeleton width="30%" height="12px" style={{ marginBottom: 8 }} />
        <Skeleton width="100%" height="40px" borderRadius="8px" />
      </div>
    ))}
  </div>
);

export const ListSkeleton = ({ items = 5 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <style>{shimmerStyle}</style>
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div className="skeleton-shimmer" style={{ width: 40, height: 40, borderRadius: '50%' }} />
        <div style={{ flex: 1 }}>
          <Skeleton width="60%" height="14px" style={{ marginBottom: 4 }} />
          <Skeleton width="40%" height="12px" />
        </div>
      </div>
    ))}
  </div>
);
