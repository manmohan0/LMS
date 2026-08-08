import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAtom } from 'jotai'
import { accessTokenAtom, refreshTokenAtom, currentUserAtom } from '../../atoms'
import { authAPI } from '../../api'
import { useToast } from '../../components/Toast'
import { GraduationCap, User, Mail, Lock, Phone, ArrowRight } from 'lucide-react'

export const RegisterPage: React.FC = () => {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm_password: '', role: 'student', phone: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const [, setToken] = useAtom(accessTokenAtom)
  const [, setRefresh] = useAtom(refreshTokenAtom)
  const [, setUser] = useAtom(currentUserAtom)
  const navigate = useNavigate()
  const toast = useToast()

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.full_name.trim()) e.full_name = 'Full name required'
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required'
    if (form.password.length < 6) e.password = 'Password must be at least 6 characters'
    if (form.password !== form.confirm_password) e.confirm_password = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const res = await authAPI.register({ full_name: form.full_name, email: form.email, password: form.password, role: form.role, phone: form.phone })
      setToken(res.data.access_token)
      setRefresh(res.data.refresh_token)
      setUser(res.data.user)
      toast.success('Account created successfully!')
      const map: Record<string, string> = { admin: '/admin', instructor: '/instructor', student: '/student' }
      navigate(map[res.data.user.role])
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const inputField = (label: string, field: string, type: string, placeholder: string, icon: React.ReactNode) => (
    <div className="form-group">
      <label>{label}</label>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>{icon}</span>
        <input
          className="input"
          style={{ paddingLeft: 42 }}
          type={type}
          placeholder={placeholder}
          value={(form as any)[field]}
          onChange={set(field)}
        />
      </div>
      {errors[field] && <span className="form-error">{errors[field]}</span>}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '1rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 480, position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <GraduationCap size={32} color="white" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }} className="gradient-text">Create Account</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Join the LearnHub community</p>
        </div>

        <div className="glass" style={{ padding: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {inputField('Full Name', 'full_name', 'text', 'John Doe', <User size={16} />)}
            {inputField('Email', 'email', 'email', 'you@example.com', <Mail size={16} />)}
            {inputField('Phone (optional)', 'phone', 'tel', '+91 9876543210', <Phone size={16} />)}
            {inputField('Password', 'password', 'password', '••••••••', <Lock size={16} />)}
            {inputField('Confirm Password', 'confirm_password', 'password', '••••••••', <Lock size={16} />)}

            <div className="form-group">
              <label>Role</label>
              <select className="input" value={form.role} onChange={set('role')}>
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
              </select>
            </div>

            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', marginTop: '0.5rem' }}>
              {loading ? <div className="spinner" style={{ width: 18, height: 18 }} /> : <ArrowRight size={18} />}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
