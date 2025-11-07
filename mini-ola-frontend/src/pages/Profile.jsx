import { User, Star, HelpCircle, Package, CreditCard, MapPin, Shield, Gift, Zap, Bell, FileText, ChevronRight, Car, Settings } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const Profile = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  // Debug: Log user data
  console.log('User data in Profile:', user)
  console.log('User role:', user?.role)

  const handleMenuClick = (path) => {
    // Navigate directly for implemented driver routes
    if (path === '/driver/history' || path === '/driver/documents' || path === '/driver/account' || path === '/driver/bank') {
      navigate(path)
      return
    }
    // Existing shortcuts
    if (path === '/rides' || path === '/driver/trips') {
      navigate(user?.role === 'driver' ? '/driver/dashboard' : '/rider/dashboard')
      return
    }
    if (path === '/payment') {
      alert('Payment/Bank section - Coming soon!')
      return
    }
    // Default placeholder
    alert(`${path} - Coming soon!`)
  }

  // Rider-specific menu items
  const riderMenuItems = [
    { icon: MapPin, label: 'My Rides', path: '/rides' },
    { icon: CreditCard, label: 'Payment Methods', path: '/payment' },
    { icon: Package, label: 'Parcel - Send Items', path: '/parcel' },
    { icon: Gift, label: 'My Rewards', path: '/rewards' },
    { icon: Zap, label: 'Power Pass', path: '/power-pass' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
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
                alert('Edit Profile (Rider) - Coming soon!')
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

          {/* Rating */}
          {/* <div 
            className="w-full flex items-center justify-between py-3 rounded-lg px-2 -mx-2 cursor-default select-none bg-white pointer-events-none"
            aria-disabled="true"
          >
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              <span className="font-medium text-gray-900">{(typeof user?.rating === 'number' ? user.rating : 0).toFixed(2)} My Rating</span>
            </div>
          </div> */}
        </div>

        {/* Menu Items */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
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
