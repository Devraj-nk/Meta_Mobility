import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useNavigate } from 'react-router-dom'

const Field = ({ label, children, hint }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
    {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
  </div>
)

const DriverBank = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    branchName: '',
    upiId: '',
    qrCodeImage: '',
  })

  const [accountMasked, setAccountMasked] = useState('')

  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.driverBankDetails()
        const data = res.data?.data || {}
        setForm((prev) => ({
          ...prev,
          accountHolderName: data.accountHolderName || '',
          ifscCode: data.ifscCode || '',
          bankName: data.bankName || '',
          branchName: data.branchName || '',
          upiId: data.upiId || '',
          qrCodeImage: data.qrCodeImage || '',
          accountNumber: '', // never prefill full account number
        }))
        setAccountMasked(data.accountNumberMasked || '')
      } catch (err) {
        setError(err.message || 'Failed to load bank details')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const validate = () => {
    // Basic client-side validation mirroring backend
    if (form.accountHolderName && form.accountHolderName.trim().length < 2) {
      setError('Account holder name must be at least 2 characters')
      return false
    }
    if (form.accountNumber && !/^\d{9,18}$/.test(form.accountNumber)) {
      setError('Account number must be 9-18 digits')
      return false
    }
    if (form.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(form.ifscCode)) {
      setError('Invalid IFSC code')
      return false
    }
    if (form.upiId && !/^[a-zA-Z0-9._-]{2,}@[A-Za-z][A-Za-z0-9]{2,}$/.test(form.upiId)) {
      setError('Invalid UPI ID (e.g., username@bankhandle)')
      return false
    }
    if (form.qrCodeImage && !/^https?:\/\//i.test(form.qrCodeImage)) {
      setError('QR Code image must be a valid URL')
      return false
    }
    setError('')
    return true
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    setSuccess('')
    try {
      const payload = {
        accountHolderName: form.accountHolderName || undefined,
        ifscCode: form.ifscCode || undefined,
        bankName: form.bankName || undefined,
        branchName: form.branchName || undefined,
        upiId: form.upiId || undefined,
        qrCodeImage: form.qrCodeImage || undefined,
        // Only send accountNumber if user typed one; otherwise keep existing
        accountNumber: form.accountNumber ? form.accountNumber : undefined,
      }
      const res = await api.updateDriverBankDetails(payload)
      const data = res.data?.data || {}
      setAccountMasked(data.accountNumberMasked || '')
      setForm((prev) => ({ ...prev, accountNumber: '' }))
      setSuccess('Bank details saved')
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save bank details')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto">
          <div className="animate-pulse bg-white rounded-2xl p-6 shadow-sm">Loading bank details…</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Bank Details</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          {error ? (
            <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>
          ) : null}
          {success ? (
            <div className="mb-4 p-3 rounded bg-green-50 text-green-700 text-sm">{success}</div>
          ) : null}

          <form onSubmit={onSubmit}>
            <Field label="Bank Name">
              <input
                type="text"
                name="bankName"
                value={form.bankName}
                onChange={onChange}
                placeholder="e.g., HDFC Bank"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </Field>

            <Field label="Branch Name">
              <input
                type="text"
                name="branchName"
                value={form.branchName}
                onChange={onChange}
                placeholder="e.g., Koramangala Branch"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </Field>

            <Field label="Account Holder Name">
              <input
                type="text"
                name="accountHolderName"
                value={form.accountHolderName}
                onChange={onChange}
                placeholder="e.g., Priya Kumar"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </Field>

            <Field label="Account Number" hint={accountMasked ? `Saved: ${accountMasked} (leave blank to keep)` : undefined}>
              <input
                type="password"
                name="accountNumber"
                value={form.accountNumber}
                onChange={onChange}
                placeholder={accountMasked ? 'Leave blank to keep existing' : 'Enter account number'}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </Field>

            <Field label="IFSC Code">
              <input
                type="text"
                name="ifscCode"
                value={form.ifscCode}
                onChange={(e) => onChange({ target: { name: 'ifscCode', value: e.target.value.toUpperCase() } })}
                placeholder="e.g., HDFC0001234"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 uppercase"
              />
            </Field>

            <Field label="UPI ID" hint="Format: username@bankhandle">
              <input
                type="text"
                name="upiId"
                value={form.upiId}
                onChange={onChange}
                placeholder="e.g., priya.k@oksbi"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </Field>

            <Field label="QR Code Image URL" hint="Paste a publicly accessible image URL for your UPI QR">
              <input
                type="url"
                name="qrCodeImage"
                value={form.qrCodeImage}
                onChange={onChange}
                placeholder="https://.../your-qr.png"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </Field>

            {form.qrCodeImage ? (
              <div className="mb-4">
                <img src={form.qrCodeImage} alt="QR Code Preview" className="max-h-48 rounded border" onError={(e) => { e.currentTarget.style.display = 'none' }} />
              </div>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className={`w-full py-3 rounded-lg text-white font-medium ${saving ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} transition-colors`}
            >
              {saving ? 'Saving…' : 'Save Bank Details'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => navigate('/driver/dashboard')}
            className="w-full mt-3 py-3 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-4">Your bank details are stored securely and used only for payouts.</p>
      </div>
    </div>
  )
}

export default DriverBank
