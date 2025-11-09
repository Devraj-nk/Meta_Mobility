import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { Power, PowerOff, DollarSign, Star, Award, TrendingUp, Navigation, CheckCircle, MapPin } from 'lucide-react'

const DriverDashboard = () => {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [driverProfile, setDriverProfile] = useState(null)
  const [kpis, setKpis] = useState({ earnings: 0, rides: 0, acceptanceRate: 0 })
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [showLocationMap, setShowLocationMap] = useState(false)
  const [locationLoading, setLocationLoading] = useState(true)
  const [editingVehicle, setEditingVehicle] = useState(false)
  const [vehicleForm, setVehicleForm] = useState({
    vehicleType: '',
    vehicleNumber: '',
    vehicleModel: '',
    vehicleColor: ''
  })
  const [rideOffers, setRideOffers] = useState([])
  const pollingRef = useRef(null)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    if (user?.role !== 'driver') {
      navigate('/rider/dashboard')
      return
    }
    fetchDriverProfile()
    getCurrentLocationOnLoad()
  }, [isAuthenticated, user, navigate])

  // Poll for nearby ride requests when online and free
  useEffect(() => {
    const shouldPoll = !!driverProfile?.isAvailable && !driverProfile?.currentRide
    if (!shouldPoll) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      return
    }

    const fetchOffers = async () => {
      try {
        const res = await api.driverRideRequests()
        setRideOffers(res.data?.data?.requests || [])
      } catch (e) {
        // ignore
      }
    }

    // Initial + interval
    fetchOffers()
    pollingRef.current = setInterval(fetchOffers, 5000)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [driverProfile?.isAvailable, driverProfile?.currentRide])

  const getCurrentLocationOnLoad = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords
          console.log('DriverDashboard - initial location received:', { latitude, longitude, accuracy })
          setCurrentLocation({ lat: latitude, lng: longitude })
          setLocationLoading(false)
        },
        (error) => {
          console.error('Error getting location:', error)
          setLocationLoading(false)
          // Set default location if permission denied
          setCurrentLocation({ lat: 12.9716, lng: 77.5946 })
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    } else {
      setLocationLoading(false)
      setCurrentLocation({ lat: 12.9716, lng: 77.5946 })
    }
  }

  const fetchDriverProfile = async () => {
    try {
      const response = await api.profile()
      const profile = response.data.data?.user?.driverProfile || response.data.data?.driverProfile
      setDriverProfile(profile)
      // Set vehicle form with current data
      if (profile) {
        setVehicleForm({
          vehicleType: profile.vehicleType || '',
          vehicleNumber: profile.vehicleNumber || '',
          vehicleModel: profile.vehicleModel || '',
          vehicleColor: profile.vehicleColor || ''
        })
      }
    } catch (error) {
      console.error('Failed to fetch driver profile:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch ride history to compute KPIs (only completed & paid rides contribute to earnings, rides)
  const computeKPIs = async () => {
    try {
      // Page through history respecting API limit (max 100)
      const limit = 100
      let page = 1
      let totalPages = 1
      const all = []
      do {
        const historyRes = await api.rideHistory({ page, limit })
        const data = historyRes.data?.data
        const ridesPage = Array.isArray(data?.rides) ? data.rides : Array.isArray(data) ? data : []
        totalPages = data?.totalPages || 1
        all.push(...ridesPage)
        page += 1
      } while (page <= totalPages && page <= 5) // cap to 5 pages for performance

      const rides = all
      const paidCompleted = rides.filter(r => r.status === 'completed' && r.paymentStatus === 'completed')
      const earnings = paidCompleted.reduce((sum, r) => {
        const fare = Number(r.fare?.finalFare ?? r.fare?.estimatedFare ?? 0) || 0
        return sum + fare
      }, 0)
      const completedCount = paidCompleted.length

      // Acceptance rate heuristic
      const accepted = rides.filter(r => ['accepted','driver-arrived','in-progress','completed'].includes(r.status)).length
      const offers = rides.filter(r => ['requested','driver-selected','cancelled','accepted','driver-arrived','in-progress','completed'].includes(r.status)).length
      const acceptanceRate = offers > 0 ? Math.round((accepted / offers) * 100) : 100

      setKpis({ earnings, rides: completedCount, acceptanceRate })
    } catch (e) {
      // silent fail; keep previous KPIs
    }
  }

  useEffect(() => {
    if (isAuthenticated && user?.role === 'driver') {
      computeKPIs()
    }
  }, [isAuthenticated, user])

  const handleUpdateVehicle = async () => {
    try {
      // Note: You'll need to add an API endpoint in the backend for this
      // For now, we'll just update the local state
      alert('Vehicle information updated! (Note: Backend endpoint needed for persistence)')
      setDriverProfile({
        ...driverProfile,
        ...vehicleForm
      })
      setEditingVehicle(false)
    } catch (error) {
      console.error('Failed to update vehicle:', error)
      alert('Failed to update vehicle information')
    }
  }

  const toggleAvailability = async () => {
    setUpdatingStatus(true)
    try {
      const newStatus = !driverProfile?.isAvailable
      
      // Get current location when going online
      if (newStatus && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude, accuracy } = position.coords
            console.log('toggleAvailability - location:', { latitude, longitude, accuracy })
            try {
              const response = await api.toggleAvailability({
                isAvailable: newStatus,
                latitude: latitude,
                longitude: longitude,
                address: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`
              })
              
              setDriverProfile(response.data.data.driver || response.data.data)
              setCurrentLocation({ lat: latitude, lng: longitude })
              alert(`You are now ONLINE at your current location!\nLat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`)
              setUpdatingStatus(false)
            } catch (error) {
              console.error('Failed to update availability:', error)
              alert(error.response?.data?.message || 'Failed to update status')
              setUpdatingStatus(false)
            }
          },
          async (error) => {
            console.error('Error getting location:', error)
            // Fallback to current location state or default
            const lat = currentLocation?.lat || 12.9716
            const lng = currentLocation?.lng || 77.5946
            try {
              const response = await api.toggleAvailability({
                isAvailable: newStatus,
                latitude: lat,
                longitude: lng,
                address: `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`
              })
              
              setDriverProfile(response.data.data.driver || response.data.data)
              alert(`Location access denied. Using fallback location.\nYou are now ONLINE!`)
              setUpdatingStatus(false)
            } catch (error) {
              console.error('Failed to update availability:', error)
              alert(error.response?.data?.message || 'Failed to update status')
              setUpdatingStatus(false)
            }
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        )
      } else {
        // When going offline, no location needed
        const response = await api.toggleAvailability({
          isAvailable: newStatus,
          latitude: currentLocation?.lat || 12.9716,
          longitude: currentLocation?.lng || 77.5946,
          address: 'Offline'
        })
        
        setDriverProfile(response.data.data.driver || response.data.data)
        alert(`You are now OFFLINE!`)
        setUpdatingStatus(false)
      }
    } catch (error) {
      console.error('Failed to update availability:', error)
      alert(error.response?.data?.message || 'Failed to update status')
      setUpdatingStatus(false)
    }
  }

  const handleGetCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords
          console.log('Driver manual location:', { latitude, longitude, accuracy })
          setCurrentLocation({ lat: latitude, lng: longitude })
          setShowLocationMap(true)
        },
        (error) => {
          console.error('Error getting location:', error)
          alert('Unable to get your location. Please enable location services.')
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    } else {
      alert('Geolocation is not supported by your browser')
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const kycStatus = driverProfile?.kycStatus || 'pending'
  const isKycApproved = kycStatus === 'approved'
  // Use driver profile rating; clamp between 0 and 5, default 0
  const rating = Math.max(0, Math.min(5, Number(driverProfile?.rating) || 0))

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Driver Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back, {user?.name}!</p>
      </div>

      {/* KYC Warning */}
      {!isKycApproved && (
        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>KYC Verification {kycStatus === 'pending' ? 'Pending' : 'Required'}</strong>
                <br />
                Your KYC verification is {kycStatus}. You won't be able to go online until your documents are approved.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Location Map Modal */}
      {showLocationMap && currentLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Your Current Location</h2>
              <button
                onClick={() => setShowLocationMap(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-5 w-5 text-primary-600" />
                  <span className="font-semibold">Coordinates:</span>
                </div>
                <p className="text-gray-700">
                  Latitude: {currentLocation.lat.toFixed(6)}
                  <br />
                  Longitude: {currentLocation.lng.toFixed(6)}
                </p>
              </div>
              
              {/* Embedded Map */}
              <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height: '400px' }}>
                <iframe
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  style={{ border: 0 }}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${currentLocation.lng - 0.01},${currentLocation.lat - 0.01},${currentLocation.lng + 0.01},${currentLocation.lat + 0.01}&layer=mapnik&marker=${currentLocation.lat},${currentLocation.lng}`}
                  allowFullScreen
                ></iframe>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    try {
                      await api.updateLocation({
                        latitude: currentLocation.lat,
                        longitude: currentLocation.lng,
                        address: `Lat: ${currentLocation.lat.toFixed(4)}, Lng: ${currentLocation.lng.toFixed(4)}`
                      })
                      alert('Location updated successfully!')
                      setShowLocationMap(false)
                      fetchDriverProfile()
                    } catch (error) {
                      alert('Failed to update location: ' + (error.response?.data?.message || error.message))
                    }
                  }}
                  className="btn-primary flex-1"
                >
                  Update My Location
                </button>
                <button
                  onClick={() => setShowLocationMap(false)}
                  className="btn-secondary flex-1"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Availability Toggle */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {driverProfile?.isAvailable ? 'You are Online' : 'You are Offline'}
                </h2>
                <p className="text-gray-600 mt-1">
                  {driverProfile?.isAvailable 
                    ? 'Ready to accept rides' 
                    : 'Turn on to start accepting rides'}
                </p>
              </div>
              <button
                onClick={toggleAvailability}
                disabled={updatingStatus || !isKycApproved}
                className={`relative inline-flex h-16 w-32 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  driverProfile?.isAvailable
                    ? 'bg-primary-600 focus:ring-primary-500'
                    : 'bg-gray-300 focus:ring-gray-500'
                } ${(!isKycApproved || updatingStatus) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`inline-flex h-12 w-12 transform items-center justify-center rounded-full bg-white shadow-lg transition-transform ${
                    driverProfile?.isAvailable ? 'translate-x-16' : 'translate-x-2'
                  }`}
                >
                  {driverProfile?.isAvailable ? (
                    <Power className="h-6 w-6 text-primary-600" />
                  ) : (
                    <PowerOff className="h-6 w-6 text-gray-600" />
                  )}
                </span>
              </button>
            </div>

            {/* Complete/Clear Active Ride Button */}
            {driverProfile?.currentRide && (
              <div className="mt-4 p-4 bg-green-50 border border-green-300 rounded-lg">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-900 text-sm mb-1">🚗 Active Ride</h4>
                    <p className="text-xs text-green-800 mb-3">
                      You have a ride assigned. Click below to complete the ride and mark it as finished.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (confirm('Complete this ride?\n\nThis will:\n• Mark the ride as completed\n• Update your earnings\n• Make you available for new rides\n• Notify the rider')) {
                            try {
                              const response = await api.clearStuckRide()
                              alert('✅ Ride completed successfully!\n\n' + 
                                    (response.data?.data?.message || 'You are now available for new rides.'))
                              fetchDriverProfile()
                            } catch (error) {
                              alert('❌ ' + (error.response?.data?.message || 'Failed to complete ride'))
                            }
                          }
                        }}
                        className="text-xs bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold transition-colors"
                      >
                        ✓ Complete Ride
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('⚠️ Clear stuck ride?\n\nUse this only if the ride is stuck or already completed.\n\nFor active rides, use "Complete Ride" instead.')) {
                            try {
                              await api.clearStuckRide()
                              alert('✅ Ride cleared!')
                              fetchDriverProfile()
                            } catch (error) {
                              alert('❌ ' + (error.response?.data?.message || 'Failed to clear ride'))
                            }
                          }
                        }}
                        className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Incoming Ride Offers */}
            {driverProfile?.isAvailable && !driverProfile?.currentRide && (
              <div className="mt-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Incoming Ride Requests</h3>
                {rideOffers.length === 0 ? (
                  <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded p-3">
                    No requests nearby yet. Waiting for offers...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rideOffers.map((r) => (
                      <div key={r._id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold capitalize">{r.rideType}</span>
                          <span className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <div className="mt-2 text-sm text-gray-700">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-green-600 mt-0.5" />
                            <span>{r.pickupLocation?.address}</span>
                          </div>
                          <div className="flex items-start gap-2 mt-1">
                            <Navigation className="h-4 w-4 text-red-600 mt-0.5" />
                            <span>{r.dropoffLocation?.address}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                const otp = prompt('Enter rider OTP to accept this ride:')
                                if (!otp) return
                                const resp = await api.driverAccept(r._id, { otp })
                                alert('✅ Ride accepted after OTP verification!')
                                // Refresh profile to reflect currentRide
                                fetchDriverProfile()
                              } catch (err) {
                                const status = err.response?.status
                                let msg = err.response?.data?.message
                                if (!msg) {
                                  if (status === 400) msg = 'Invalid OTP'
                                  else if (status === 409) msg = 'Ride already accepted'
                                  else msg = err.message || 'Failed to accept ride'
                                }
                                alert(msg)
                                // Refresh offers
                                try { const rr = await api.driverRideRequests(); setRideOffers(rr.data?.data?.requests || []) } catch {}
                              }
                            }}
                            className="btn-primary text-sm"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => setRideOffers(rideOffers.filter(o => o._id !== r._id))}
                            className="btn-secondary text-sm"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Driver Location Status */}
            {driverProfile?.currentLocation && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900 text-sm mb-1">Your Location in System:</h4>
                    <p className="text-sm text-blue-800">
                      📍 Lat: {driverProfile.currentLocation.coordinates?.[1]?.toFixed(4) || 'Not set'}, 
                      Lng: {driverProfile.currentLocation.coordinates?.[0]?.toFixed(4) || 'Not set'}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      {driverProfile.currentLocation.address || 'No address set'}
                    </p>
                    {driverProfile.isAvailable && (
                      <p className="text-xs text-green-600 mt-2">
                        ✅ You will receive ride requests from riders within 5km of this location
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Live Location Map */}
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Your Location</span>
                <button
                  onClick={handleGetCurrentLocation}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  Refresh
                </button>
              </div>
              {locationLoading ? (
                <div className="bg-gray-100 rounded-lg h-40 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto mb-2"></div>
                    <p className="text-xs text-gray-600">Getting location...</p>
                  </div>
                </div>
              ) : currentLocation ? (
                <div className="space-y-2">
                  <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height: '150px' }}>
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      style={{ border: 0 }}
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${currentLocation.lng - 0.01},${currentLocation.lat - 0.01},${currentLocation.lng + 0.01},${currentLocation.lat + 0.01}&layer=mapnik&marker=${currentLocation.lat},${currentLocation.lng}`}
                      allowFullScreen
                    ></iframe>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>
                      <MapPin className="h-3 w-3 inline mr-1" />
                      {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-100 rounded-lg h-40 flex items-center justify-center">
                  <p className="text-xs text-gray-600">Location unavailable</p>
                </div>
              )}
            </div>
          </div>

          {/* Earnings Overview */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Earnings</p>
                  <p className="text-2xl font-bold text-primary-600">₹{kpis.earnings.toFixed(2)}</p>
                </div>
                <DollarSign className="h-12 w-12 text-primary-200" />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Rides</p>
                  <p className="text-2xl font-bold text-blue-600">{kpis.rides}</p>
                </div>
                <CheckCircle className="h-12 w-12 text-blue-200" />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Acceptance Rate</p>
                  <p className="text-2xl font-bold text-green-600">{kpis.acceptanceRate}%</p>
                </div>
                <TrendingUp className="h-12 w-12 text-green-200" />
              </div>
            </div>
          </div>

          {/* Vehicle Info */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Vehicle Information</h3>
              <button
                onClick={() => setEditingVehicle(!editingVehicle)}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {editingVehicle ? 'Cancel' : 'Edit'}
              </button>
            </div>
            
            {editingVehicle ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                  <select
                    value={vehicleForm.vehicleType}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleType: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Select Type</option>
                    <option value="bike">Bike</option>
                    <option value="auto">Auto</option>
                    <option value="mini">Mini</option>
                    <option value="sedan">Sedan</option>
                    <option value="suv">SUV</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    value={vehicleForm.vehicleNumber}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleNumber: e.target.value })}
                    className="input-field"
                    placeholder="e.g., KA01AB1234"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Model</label>
                  <input
                    type="text"
                    value={vehicleForm.vehicleModel}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleModel: e.target.value })}
                    className="input-field"
                    placeholder="e.g., Honda City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Color</label>
                  <input
                    type="text"
                    value={vehicleForm.vehicleColor}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleColor: e.target.value })}
                    className="input-field"
                    placeholder="e.g., White"
                  />
                </div>
                <button
                  onClick={handleUpdateVehicle}
                  className="btn-primary w-full"
                >
                  Save Changes
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Type</p>
                  <p className="font-semibold text-gray-900 capitalize">
                    {driverProfile?.vehicleType || vehicleForm.vehicleType || 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Number</p>
                  <p className="font-semibold text-gray-900">
                    {driverProfile?.vehicleNumber || vehicleForm.vehicleNumber || 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Model</p>
                  <p className="font-semibold text-gray-900">
                    {driverProfile?.vehicleModel || vehicleForm.vehicleModel || 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Color</p>
                  <p className="font-semibold text-gray-900 capitalize">
                    {driverProfile?.vehicleColor || vehicleForm.vehicleColor || 'Not set'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Driver Stats */}
          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Driver Rating</h3>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600 mb-2">Rating</div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = star <= Math.round(rating)
                    return (
                      <Star
                        key={star}
                        aria-hidden
                        className={`h-5 w-5 pointer-events-none transition-colors ${
                          active
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300 fill-transparent stroke-gray-400'
                        }`}
                      />
                    )
                  })}
                  <span className="ml-2 text-sm font-semibold text-gray-700">{rating.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Badges */}
          {driverProfile?.badges && driverProfile.badges.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Badges</h3>
              <div className="space-y-2">
                {driverProfile.badges.map((badge, index) => (
                  <div key={index} className="flex items-center p-2 bg-primary-50 rounded-lg">
                    <Award className="h-5 w-5 text-primary-600 mr-2" />
                    <span className="font-semibold text-primary-900">{badge.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                className="w-full btn-secondary text-left"
                onClick={() => navigate('/driver/history')}
              >
                View History
              </button>
              <button
                className="w-full btn-secondary text-left"
                onClick={() => navigate('/help')}
              >
                Contact Support
              </button>
              <button
                className="w-full btn-secondary text-left"
                onClick={() => navigate('/safety')}
              >
                Safety
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DriverDashboard
