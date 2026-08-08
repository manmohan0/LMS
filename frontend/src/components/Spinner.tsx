import React from 'react'

interface SpinnerProps { size?: number; className?: string }
export const Spinner: React.FC<SpinnerProps> = ({ size = 24, className = '' }) => (
  <div
    className={`spinner ${className}`}
    style={{ width: size, height: size }}
  />
)

export const PageLoader: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
    <Spinner size={40} />
    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading…</p>
  </div>
)
