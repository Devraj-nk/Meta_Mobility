import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { ArrowLeft, User, Mail, Phone, Trash2 } from 'lucide-react'

export default function SettingsPage() {
  const { user, refreshProfile } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    setName(user?.name || '')
    setEmail(user?.email || '')
    setPhone(user?.phone || '')
  }, [user])

  const onSave = async () => {
    setSaving(true)
    try {
      await api.updateProfile({ name, email, phone })
      await refreshProfile()
      alert('Profile updated')
    } catch (e) {
      alert(e.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return
    setDeleting(true)
    try {
      await api.deleteAccount()
      // Clear token and redirect to login/home
      localStorage.removeItem('token')
      alert('Your account has been deleted')
      navigate('/')
    } catch (e) {
      alert(e.message || 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/profile')} className="btn-secondary inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4"/> Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="space-y-4">
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2"><User className="w-4 h-4"/> Name</div>
              <input className="input-field w-full" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Your name"/>
            </label>
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2"><Mail className="w-4 h-4"/> Email</div>
              <input className="input-field w-full" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com"/>
            </label>
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2"><Phone className="w-4 h-4"/> Phone</div>
              <input className="input-field w-full" value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="10-digit phone"/>
            </label>
          </div>

          <div className="mt-5 flex items-center gap-2">
            <button disabled={saving} onClick={onSave} className="btn-primary">Save Changes</button>
            <button disabled={saving} onClick={()=>{setName(user?.name||''); setEmail(user?.email||''); setPhone(user?.phone||'')}} className="btn-secondary">Reset</button>
          </div>

          <div className="mt-8 border-t pt-5">
            <div className="text-sm font-semibold text-red-700 mb-2">Danger Zone</div>
            <button disabled={deleting} onClick={onDelete} className="btn-danger inline-flex items-center gap-2">
              <Trash2 className="w-4 h-4"/> Delete Account
            </button>
            <p className="text-xs text-gray-500 mt-1">This will deactivate your account immediately.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
