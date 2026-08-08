import React from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  maxWidth?: number
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = 520 }) => {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, transition: 'color 0.15s' }}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message: string
  confirmLabel?: string
  loading?: boolean
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen, onClose, onConfirm, title = 'Confirm Action',
  message, confirmLabel = 'Confirm', loading
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth={400}>
    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>{message}</p>
    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
      <button className="btn-secondary" onClick={onClose}>Cancel</button>
      <button className="btn-danger" onClick={onConfirm} disabled={loading}>
        {loading ? <div className="spinner" style={{ width: 16, height: 16 }} /> : null}
        {confirmLabel}
      </button>
    </div>
  </Modal>
)
