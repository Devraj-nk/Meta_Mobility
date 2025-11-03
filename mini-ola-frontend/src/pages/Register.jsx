import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { User, Mail, Lock, Phone, AlertCircle, Car, FileText } from 'lucide-react'

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'rider',
    // Driver-specific fields
    vehicleType: 'sedan',
    vehicleNumber: '',
    vehicleModel: '',
    vehicleColor: '',
    licenseNumber: '',
    licenseExpiry: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    // Prepare data based on role
    const userData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      role: formData.role
    }

    // Add driver-specific fields
    if (formData.role === 'driver') {
      userData.vehicleType = formData.vehicleType
      userData.vehicleNumber = formData.vehicleNumber
      userData.vehicleModel = formData.vehicleModel
      userData.vehicleColor = formData.vehicleColor
      userData.licenseNumber = formData.licenseNumber
      userData.licenseExpiry = formData.licenseExpiry
    }

    const result = await register(userData)
    
    if (result.success) {
      navigate(formData.role === 'driver' ? '/driver/dashboard' : '/rider/dashboard')
    } else {
      setError(result.message)
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="card">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Car className="h-16 w-16 text-primary-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
            <p className="text-gray-600 mt-2">Join Mini Ola today</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                I want to
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'rider' })}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    formData.role === 'rider'
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <User className="h-8 w-8 mx-auto mb-2 text-primary-600" />
                  <div className="font-semibold">Book Rides</div>
                  <div className="text-sm text-gray-600">Rider</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'driver' })}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    formData.role === 'driver'
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Car className="h-8 w-8 mx-auto mb-2 text-primary-600" />
                  <div className="font-semibold">Earn Money</div>
                  <div className="text-sm text-gray-600">Driver</div>
                </button>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="9876543210"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="input-field"
                placeholder="you@example.com"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Driver-specific fields */}
            {formData.role === 'driver' && (
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold text-gray-900">Vehicle Information</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="vehicleType" className="block text-sm font-medium text-gray-700 mb-2">
                      Vehicle Type
                    </label>
                    <select
                      id="vehicleType"
                      name="vehicleType"
                      value={formData.vehicleType}
                      onChange={handleChange}
                      className="input-field"
                      required
                    >
                      <option value="bike">Bike</option>
                      <option value="mini">Mini</option>
                      <option value="sedan">Sedan</option>
                      <option value="suv">SUV</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="vehicleNumber" className="block text-sm font-medium text-gray-700 mb-2">
                      Vehicle Number
                    </label>
                    <input
                      id="vehicleNumber"
                      name="vehicleNumber"
                      type="text"
                      required
                      value={formData.vehicleNumber}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="KA01AB1234"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="vehicleModel" className="block text-sm font-medium text-gray-700 mb-2">
                      Vehicle Model
                    </label>
                    <input
                      id="vehicleModel"
                      name="vehicleModel"
                      type="text"
                      required
                      value={formData.vehicleModel}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="Honda City"
                    />
                  </div>

                  <div>
                    <label htmlFor="vehicleColor" className="block text-sm font-medium text-gray-700 mb-2">
                      Vehicle Color
                    </label>
                    <input
                      id="vehicleColor"
                      name="vehicleColor"
                      type="text"
                      value={formData.vehicleColor}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="White"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-2">
                      License Number
                    </label>
                    <input
                      id="licenseNumber"
                      name="licenseNumber"
                      type="text"
                      required
                      value={formData.licenseNumber}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="DL1234567890"
                    />
                  </div>

                  <div>
                    <label htmlFor="licenseExpiry" className="block text-sm font-medium text-gray-700 mb-2">
                      License Expiry
                    </label>
                    <input
                      id="licenseExpiry"
                      name="licenseExpiry"
                      type="date"
                      required
                      value={formData.licenseExpiry}
                      onChange={handleChange}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
