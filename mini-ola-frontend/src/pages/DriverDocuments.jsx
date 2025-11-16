import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'

const Input = ({ label, name, type = 'text', value, onChange, placeholder, required }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <input
      id={name}
      name={name}
      type={type}
      value={value || ''}
      onChange={onChange}
      className="input-field"
      placeholder={placeholder}
      required={required}
    />
  </div>
)

const Select = ({ label, name, value, onChange }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <select id={name} name={name} value={value || ''} onChange={onChange} className="input-field">
      <option value="">Select Type</option>
      <option value="bike">Bike</option>
      <option value="mini">Mini</option>
      <option value="sedan">Sedan</option>
      <option value="suv">SUV</option>
    </select>
  </div>
)

const DriverDocuments = () => {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    vehicleType: '',
    vehicleNumber: '',
    vehicleModel: '',
    vehicleColor: '',
    licenseNumber: '',
    licenseExpiry: ''
  })

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return }
    if (user?.role !== 'driver') { navigate('/rider/dashboard'); return }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user])

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await api.driverDocuments()
      const data = res.data?.data || res.data
      setForm({
        vehicleType: data.vehicleType || '',
        vehicleNumber: data.vehicleNumber || '',
        vehicleModel: data.vehicleModel || '',
        vehicleColor: data.vehicleColor || '',
        licenseNumber: data.licenseNumber || '',
        licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry).toISOString().slice(0,10) : ''
      })
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    setError(''); setSuccess('')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      setError(''); setSuccess('')
      const payload = { ...form }
      // Empty strings shouldn't overwrite; remove them
      Object.keys(payload).forEach((k) => { if (payload[k] === '') delete payload[k] })
      const res = await api.updateDriverDocuments(payload)
      setSuccess(res?.data?.message || 'Updated successfully')
      await load()
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to update documents')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Driver Documents</h1>
        <p className="text-gray-600">Manage your vehicle and license details</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded">{success}</div>}

      {loading ? (
        <div className="text-center py-10 text-gray-600">Loading...</div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6 bg-white rounded-2xl shadow-sm p-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Select label="Vehicle Type" name="vehicleType" value={form.vehicleType} onChange={handleChange} />
            <Input label="Vehicle Number" name="vehicleNumber" value={form.vehicleNumber} onChange={handleChange} placeholder="KA01AB1234" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="Vehicle Model" name="vehicleModel" value={form.vehicleModel} onChange={handleChange} placeholder="Honda City" />
            <Input label="Vehicle Color" name="vehicleColor" value={form.vehicleColor} onChange={handleChange} placeholder="White" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="License Number" name="licenseNumber" value={form.licenseNumber} onChange={handleChange} placeholder="DL1234567890" />
            <Input label="License Expiry" name="licenseExpiry" type="date" value={form.licenseExpiry} onChange={handleChange} />
          </div>
          <div className="flex items-center justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={load} disabled={saving}>Reset</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      )}
    </div>
  )
}

export default DriverDocuments
