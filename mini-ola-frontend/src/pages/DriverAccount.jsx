import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'

const DriverAccount = () => {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [changingPwd, setChangingPwd] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleting, setDeleting] = useState(false)

  const [profile, setProfile] = useState({ name: '', email: '', phone: '' })
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' })

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return }
    if (user?.role !== 'driver') { navigate('/rider/dashboard'); return }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user])

  const load = async () => {
    try {
      setLoading(true)
      setError(''); setSuccess('')
      const res = await api.profile()
      const u = res.data?.data?.user || res.data?.data || res.data
      setProfile({ name: u?.name || '', email: u?.email || '', phone: u?.phone || '' })
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to load account')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileChange = (e) => {
    const { name, value } = e.target
    setProfile((p) => ({ ...p, [name]: value }))
    setError(''); setSuccess('')
  }
  const handlePwdChange = (e) => {
    const { name, value } = e.target
    setPwd((p) => ({ ...p, [name]: value }))
    setError(''); setSuccess('')
  }

  const saveProfile = async (e) => {
    e.preventDefault()
    try {
      setSavingProfile(true)
      const payload = { ...profile }
      if (payload.phone) payload.phone = (payload.phone || '').replace(/\D/g, '')
      await api.updateProfile(payload)
      setSuccess('Profile updated successfully')
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    try {
      setChangingPwd(true)
      setError(''); setSuccess('')
      // Client-side validations matching registration requirements
      if (!pwd.currentPassword) {
        setError('Current password is required')
        setChangingPwd(false)
        return
      }
      if (pwd.newPassword !== pwd.confirmNewPassword) {
        setError('New passwords do not match');
        setChangingPwd(false);
        return;
      }
      if (!pwd.newPassword || pwd.newPassword.length < 6) {
        setError('Password must be at least 6 characters')
        setChangingPwd(false)
        return
      }
      await api.changePassword({ currentPassword: pwd.currentPassword, newPassword: pwd.newPassword })
      // Force re-login after password change
      logout()
      navigate('/login', { state: { message: 'Password changed successfully. Please log in again.' } })
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to change password')
    } finally {
      setChangingPwd(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Account</h1>
        <p className="text-gray-600">Manage your personal details and password</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded">{success}</div>}

      {loading ? (
        <div className="text-center py-10 text-gray-600">Loading...</div>
      ) : (
        <div className="space-y-8">
          <form onSubmit={saveProfile} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Profile Details</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input name="name" className="input-field" value={profile.name} onChange={handleProfileChange} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input name="phone" className="input-field" value={profile.phone} onChange={handleProfileChange} placeholder="9876543210" required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input name="email" type="email" className="input-field" value={profile.email} onChange={handleProfileChange} required />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={load} disabled={savingProfile}>Reset</button>
              <button type="submit" className="btn-primary" disabled={savingProfile}>{savingProfile ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>

          <form onSubmit={changePassword} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input name="currentPassword" type="password" className="input-field" value={pwd.currentPassword} onChange={handlePwdChange} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input name="newPassword" type="password" className="input-field" value={pwd.newPassword} onChange={handlePwdChange} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input name="confirmNewPassword" type="password" className="input-field" value={pwd.confirmNewPassword} onChange={handlePwdChange} required />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button type="submit" className="btn-primary" disabled={changingPwd}>{changingPwd ? 'Changing...' : 'Change Password'}</button>
            </div>
          </form>

          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4 border border-red-200">
            <h2 className="text-lg font-semibold text-red-700">Danger Zone</h2>
            <p className="text-sm text-red-600">Deleting your account is irreversible. Your profile will be removed and you will be logged out immediately.</p>
            <div className="flex items-center justify-end">
              <button
                type="button"
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                disabled={deleting}
                onClick={async () => {
                  if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return
                  try {
                    setDeleting(true)
                    await api.deleteAccount()
                    logout()
                    navigate('/', { state: { message: 'Account deleted successfully.' } })
                  } catch (e) {
                    setError(e?.response?.data?.message || e.message || 'Failed to delete account')
                  } finally {
                    setDeleting(false)
                  }
                }}
              >
                {deleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DriverAccount
