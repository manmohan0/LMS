import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { authAPI } from '../../api'
import { useToast } from '../../components/Toast'
import { GraduationCap, Mail, ArrowLeft, CheckCircle } from 'lucide-react'

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [resetToken, setResetToken] = useState('')
  const toast = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      const res = await authAPI.forgotPassword(email)
      setResetToken(res.data.reset_token || '')
      setSent(true)
      toast.success('Reset token generated!')
    } catch {
      toast.error('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <GraduationCap size={32} color="white" />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }} className="gradient-text">
            {sent ? 'Check Your Email' : 'Forgot Password?'}
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {sent ? 'A reset token has been generated.' : "Enter your email and we'll send a reset link."}
          </p>
        </div>

        <div className="glass" style={{ padding: '2rem' }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto 1rem' }} />
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                In a production environment, an email would be sent. For this demo, here is your reset token:
              </p>
              <div style={{ background: 'var(--bg-input)', borderRadius: 8, padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all', color: 'var(--accent)', marginBottom: '1.5rem' }}>
                {resetToken}
              </div>
              <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <ArrowLeft size={16} /> Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label>Email address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    className="input"
                    style={{ paddingLeft: 42 }}
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '0.875rem' }}>
                {loading ? <div className="spinner" style={{ width: 18, height: 18 }} /> : null}
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>

              <Link to="/login" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <ArrowLeft size={14} /> Back to Login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
