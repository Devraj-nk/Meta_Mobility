import {
  User,
  Star,
  HelpCircle,
  Package,
  CreditCard,
  MapPin,
  Shield,
  Gift,
  Zap,
  Bell,
  FileText,
  ChevronRight,
  Car,
  Settings,
  DollarSign,
  Clock,
  TrendingUp,
  Award,
  Wallet,
  Plus,
  Minus
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { api } from '../api/client'

const Profile = () => {
  const { user, refreshProfile } = useAuth()
  const navigate = useNavigate()
  
  // Debug: Log user data
  console.log('User data in Profile:', user)
  console.log('User role:', user?.role)

  const handleMenuClick = (path) => {
    // Navigate directly for implemented driver routes
    if (
      path === '/driver/history' ||
      path === '/driver/documents' ||
      path === '/driver/account' ||
      path === '/driver/bank'
    ) {
      navigate(path)
      return
    }

    // Existing shortcuts and general pages
    if (path === '/rides' || path === '/driver/trips') {
      navigate(user?.role === 'driver' ? '/driver/dashboard' : '/rider/dashboard')
      return
    }

    if (path === '/safety') {
      navigate('/safety')
      return
    }

    if (path === '/help') {
      navigate('/help')
      return
    }

    if (path === '/settings') {
      navigate('/settings')
      return
    }

    if (path === '/payment' || path === '/driver/bank') {
      navigate(path)
      return
    }

    // Default placeholder
    alert(`${path} - Coming soon!`)
  }

  // Rider-specific menu items
  const riderMenuItems = [
    { icon: MapPin, label: 'My Rides', path: '/rides' },
    { icon: Shield, label: 'Safety', path: '/safety' },
    { icon: HelpCircle, label: 'Help & Support', path: '/help' },
  ]

  // Driver-specific menu items
  const driverMenuItems = [
    { icon: FileText, label: 'History', path: '/driver/history' },
    { icon: CreditCard, label: 'Bank Details', path: '/driver/bank' },
    { icon: FileText, label: 'Documents', path: '/driver/documents' },
    { icon: Shield, label: 'Safety', path: '/safety' },
    { icon: HelpCircle, label: 'Help & Support', path: '/help' },
  ]

  const menuItems = user?.role === 'driver' ? driverMenuItems : riderMenuItems
  const [topupOpen, setTopupOpen] = useState(false)
  const [amount, setAmount] = useState(100)
  const [loading, setLoading] = useState(false)

  const handleTopup = async () => {
    setLoading(true)
    try {
      const res = await api.walletTopup({ amount, method: 'upi' })
      const newBalance = res.data?.data?.balance
      // refresh global profile so all screens show updated balance
      await refreshProfile()
      alert('Wallet topped up! New balance: ₹' + (newBalance?.toFixed ? newBalance.toFixed(2) : newBalance))
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Top-up failed')
    } finally {
      setLoading(false)
      setTopupOpen(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            user?.role === 'driver' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {user?.role === 'driver' ? 'Driver' : 'Rider'} ({user?.role || 'no role'})
          </span>
        </div>

        {/* User Card */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <button
            onClick={() => {
              if (user?.role === 'driver') {
                navigate('/driver/account')
              } else {
                navigate('/settings')
              }
            }}
            className="w-full flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors rounded-lg p-2 -m-2"
          >
            <div className="flex items-center space-x-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                user?.role === 'driver' ? 'bg-green-100' : 'bg-blue-100'
              }`}>
                {user?.role === 'driver' ? (
                  <Car className="w-6 h-6 text-green-600" />
                ) : (
                  <User className="w-6 h-6 text-blue-600" />
                )}
              </div>
              <div className="text-left">
                <h2 className="font-semibold text-gray-900">{user?.name || 'User'}</h2>
                <p className="text-sm text-gray-500">{user?.phone || user?.email}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          {/* Rating removed as requested */}
        </div>

        {/* Menu Items */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Wallet card for riders */}
          {user?.role !== 'driver' && (
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-green-600" />
                  <span className="text-gray-900 font-semibold">Wallet</span>
                </div>
                <span className="font-bold text-green-700">₹{user?.walletBalance?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => setTopupOpen(true)} className="btn-primary text-sm flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add Money
                </button>
              </div>
            </div>
          )}

          {/* Top-up modal */}
          {topupOpen && (
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-5 h-5 text-primary-600" />
                <span className="font-semibold">Add Money to Wallet</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-secondary px-3 py-1" onClick={() => setAmount(Math.max(1, amount-50))}><Minus className="w-4 h-4"/></button>
                <input type="number" className="input-field w-32" value={amount} onChange={(e)=>setAmount(parseInt(e.target.value||'0'))} />
                <button className="btn-secondary px-3 py-1" onClick={() => setAmount(amount+50)}><Plus className="w-4 h-4"/></button>
                <button disabled={loading} onClick={handleTopup} className="btn-primary ml-auto">Pay via UPI</button>
                <button disabled={loading} onClick={()=>setTopupOpen(false)} className="btn-secondary">Cancel</button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Top-up is simulated for demo. Balance updates instantly.</p>
            </div>
          )}

          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => handleMenuClick(item.path)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0 cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <item.icon className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">{item.label}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Profile
