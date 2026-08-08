import React from 'react'
import { useAtom } from 'jotai'
import { toastsAtom } from '../atoms'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

const icons = {
  success: <CheckCircle size={18} color="#10b981" />,
  error: <XCircle size={18} color="#ef4444" />,
  info: <Info size={18} color="#06b6d4" />,
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useAtom(toastsAtom)

  const remove = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          {icons[toast.type]}
          <span style={{ flex: 1, fontSize: '0.875rem' }}>{toast.message}</span>
          <button
            onClick={() => remove(toast.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

export const useToast = () => {
  const [, setToasts] = useAtom(toastsAtom)

  const show = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  return {
    success: (msg: string) => show(msg, 'success'),
    error: (msg: string) => show(msg, 'error'),
    info: (msg: string) => show(msg, 'info'),
  }
}
