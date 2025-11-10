import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { MapPin, Navigation, DollarSign, Clock, Car as CarIcon, User, Phone, Wallet, Locate } from 'lucide-react'

const RiderDashboard = () => {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [rideHistory, setRideHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [bookingRide, setBookingRide] = useState(false)
  const [fareEstimate, setFareEstimate] = useState(null)
  const [activeRide, setActiveRide] = useState(null)
  const [searchingDriver, setSearchingDriver] = useState(false)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [showLocationMap, setShowLocationMap] = useState(false)
  const [locationLoading, setLocationLoading] = useState(true)
  const [pickupSuggestions, setPickupSuggestions] = useState([])
  const [dropoffSuggestions, setDropoffSuggestions] = useState([])
  const [showPickupDropdown, setShowPickupDropdown] = useState(false)
  const [showDropoffDropdown, setShowDropoffDropdown] = useState(false)
  const [showDebugInfo, setShowDebugInfo] = useState(false)
  const [debugInfo, setDebugInfo] = useState(null)
  const [locationInitialized, setLocationInitialized] = useState(false)
  const [typeEstimates, setTypeEstimates] = useState({})
  const [estimatingTypes, setEstimatingTypes] = useState(false)
  // Deprecated: manual driver selection removed in favor of auto-assignment
  
  const [rideForm, setRideForm] = useState({
    pickupLat: 0,
    pickupLng: 0,
    pickupAddress: '',
    dropoffLat: 0,
    dropoffLng: 0,
    dropoffAddress: '',
    rideType: 'sedan',
    isGroupRide: false,
    groupSize: 1
  })

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    if (user?.role !== 'rider') {
      navigate('/driver/dashboard')
      return
    }
    console.log('RiderDashboard - User object:', user)
    fetchRideHistory()
    fetchActiveRide()
    getCurrentLocationOnLoad()
  }, [isAuthenticated, user, navigate])

  // Auto-refresh active ride every 10 seconds normally
  useEffect(() => {
    if (activeRide && ['requested', 'accepted', 'driver-arrived', 'in-progress'].includes(activeRide.status)) {
      const interval = setInterval(() => {
        console.log('🔄 Auto-refreshing active ride...')
        fetchActiveRide()
      }, 10000) // Refresh every 10 seconds

      return () => clearInterval(interval)
    }
  }, [activeRide])

  // When waiting for driver assignment, poll faster (3s)
  useEffect(() => {
    if (activeRide?.status === 'requested') {
      setSearchingDriver(true)
      const interval = setInterval(() => {
        fetchActiveRide()
      }, 3000)
      return () => clearInterval(interval)
    } else {
      setSearchingDriver(false)
    }
  }, [activeRide?.status])

  // Auto-estimate fares for all ride types when both locations are set
  useEffect(() => {
    const hasPickup = rideForm.pickupLat && rideForm.pickupLng
    const hasDrop = rideForm.dropoffLat && rideForm.dropoffLng
    if (!hasPickup || !hasDrop) {
      setTypeEstimates({})
      return
    }

    // Debounce rapid changes
    const t = setTimeout(async () => {
      try {
        setEstimatingTypes(true)
        const rideTypes = ['bike', 'mini', 'sedan', 'suv']
        const results = {}
        await Promise.all(
          rideTypes.map(async (rt) => {
            try {
              const res = await api.fareEstimate({
                pickupLat: rideForm.pickupLat,
                pickupLng: rideForm.pickupLng,
                dropoffLat: rideForm.dropoffLat,
                dropoffLng: rideForm.dropoffLng,
                rideType: rt,
                isGroupRide: rt === 'bike' ? false : !!rideForm.isGroupRide
              })
              results[rt] = res.data?.data?.estimatedFare
            } catch (e) {
              // ignore individual failures
            }
          })
        )
        setTypeEstimates(results)
      } finally {
        setEstimatingTypes(false)
      }
    }, 500)

    return () => clearTimeout(t)
  }, [rideForm.pickupLat, rideForm.pickupLng, rideForm.dropoffLat, rideForm.dropoffLng, rideForm.isGroupRide])

  // Enforce group ride rules when ride type changes
  useEffect(() => {
    const maxForType = (type) => {
      if (type === 'bike') return 1
      if (type === 'mini') return 3
      return 4 // sedan and suv
    }
    const max = maxForType(rideForm.rideType)
    setRideForm((prev) => {
      const next = { ...prev }
      // Bikes cannot be group rides
      if (prev.rideType === 'bike') {
        next.isGroupRide = false
        next.groupSize = 1
      } else {
        // Clamp group size
        next.groupSize = Math.max(1, Math.min(prev.groupSize || 1, max))
      }
      return next
    })
  }, [rideForm.rideType])

  // If group ride disabled manually, reset group size
  useEffect(() => {
    if (!rideForm.isGroupRide && rideForm.groupSize !== 1) {
      setRideForm(prev => ({ ...prev, groupSize: 1 }))
    }
  }, [rideForm.isGroupRide])

  const getCurrentLocationOnLoad = () => {
    console.log('🔍 Requesting location...')
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords
          console.log('✅ Location received:', { latitude, longitude, accuracy })
          setCurrentLocation({ lat: latitude, lng: longitude })
          
          // Automatically set pickup location to current location
          if (!locationInitialized) {
            console.log('📍 Setting as pickup location')
            setRideForm(prev => ({
              ...prev,
              pickupLat: latitude,
              pickupLng: longitude,
              pickupAddress: `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
            }))
            setLocationInitialized(true)
          }
          
          setLocationLoading(false)
        },
        (error) => {
          console.error('❌ Error getting location:', error.message)
          setLocationLoading(false)
          // Set default Bangalore location if permission denied
          const defaultLat = 12.9716
          const defaultLng = 77.5946
          console.log('⚠️ Using default location:', { defaultLat, defaultLng })
          setCurrentLocation({ lat: defaultLat, lng: defaultLng })
          
          if (!locationInitialized) {
            setRideForm(prev => ({
              ...prev,
              pickupLat: defaultLat,
              pickupLng: defaultLng,
              pickupAddress: `Default Location (${defaultLat}, ${defaultLng})`
            }))
            setLocationInitialized(true)
            alert('⚠️ Location access denied. Using default Bangalore location.\n\n' +
                  'To use your actual location:\n' +
                  '1. Enable location permissions in your browser\n' +
                  '2. Click the "Refresh" button in the Location card\n' +
                  '3. Click "Use as Pickup" button')
          }
        }
      , { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 })
    } else {
      console.log('❌ Geolocation not supported')
      setLocationLoading(false)
      const defaultLat = 12.9716
      const defaultLng = 77.5946
      setCurrentLocation({ lat: defaultLat, lng: defaultLng })
      
      if (!locationInitialized) {
        setRideForm(prev => ({
          ...prev,
          pickupLat: defaultLat,
          pickupLng: defaultLng,
          pickupAddress: `Default Location (${defaultLat}, ${defaultLng})`
        }))
        setLocationInitialized(true)
      }
    }
  }

  const searchLocation = async (query, isPickup = true) => {
    if (query.length < 3) {
      isPickup ? setPickupSuggestions([]) : setDropoffSuggestions([])
      isPickup ? setShowPickupDropdown(false) : setShowDropoffDropdown(false)
      return
    }

    try {
      // Using Nominatim (OpenStreetMap) geocoding API with User-Agent
      // Add city context for better results
      const searchQuery = query.includes('bangalore') || query.includes('bengaluru') 
        ? query 
        : `${query}, Bangalore, Karnataka, India`
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=8&addressdetails=1`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'MiniOla/1.0'
          }
        }
      )
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      console.log('Search results for:', query, data)
      
      const suggestions = data.map(item => ({
        display_name: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        address: item.address
      }))

      if (isPickup) {
        setPickupSuggestions(suggestions)
        setShowPickupDropdown(suggestions.length > 0)
      } else {
        setDropoffSuggestions(suggestions)
        setShowDropoffDropdown(suggestions.length > 0)
      }
    } catch (error) {
      console.error('Error searching location:', error)
      // Don't show alert, just log the error
      // Fallback: show a message in the dropdown
      const errorSuggestion = [{
        display_name: 'Unable to search. Please type full address or use coordinates below.',
        lat: 0,
        lng: 0
      }]
      if (isPickup) {
        setPickupSuggestions(errorSuggestion)
        setShowPickupDropdown(true)
      } else {
        setDropoffSuggestions(errorSuggestion)
        setShowDropoffDropdown(true)
      }
    }
  }

  const handlePickupChange = (value) => {
    setRideForm({ ...rideForm, pickupAddress: value })
    
    if (value.length >= 3) {
      // Immediate search, no debounce delay
      searchLocation(value, true)
    } else {
      setShowPickupDropdown(false)
      setPickupSuggestions([])
    }
  }

  const handleDropoffChange = (value) => {
    setRideForm({ ...rideForm, dropoffAddress: value })
    
    if (value.length >= 3) {
      // Immediate search, no debounce delay
      searchLocation(value, false)
    } else {
      setShowDropoffDropdown(false)
      setDropoffSuggestions([])
    }
  }

  const selectPickupLocation = (suggestion) => {
    setRideForm({
      ...rideForm,
      pickupAddress: suggestion.display_name,
      pickupLat: suggestion.lat,
      pickupLng: suggestion.lng
    })
    setShowPickupDropdown(false)
    setPickupSuggestions([])
  }

  const selectDropoffLocation = (suggestion) => {
    setRideForm({
      ...rideForm,
      dropoffAddress: suggestion.display_name,
      dropoffLat: suggestion.lat,
      dropoffLng: suggestion.lng
    })
    setShowDropoffDropdown(false)
    setDropoffSuggestions([])
  }

  const fetchRideHistory = async () => {
    try {
      const response = await api.rideHistory({ page: 1, limit: 10 })
      const data = response.data?.data
      const rides = Array.isArray(data) ? data : (data?.rides || [])
      setRideHistory(rides)
    } catch (error) {
      console.error('Failed to fetch ride history:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchActiveRide = async () => {
    try {
      const response = await api.activeRide()
      setActiveRide(response.data?.data?.ride || response.data?.data || null)
    } catch (error) {
      setActiveRide(null)
    }
  }

  const handleEstimateFare = async () => {
    try {
      const response = await api.fareEstimate({
        pickupLat: rideForm.pickupLat,
        pickupLng: rideForm.pickupLng,
        dropoffLat: rideForm.dropoffLat,
        dropoffLng: rideForm.dropoffLng,
        rideType: rideForm.rideType,
        isGroupRide: rideForm.rideType === 'bike' ? false : !!rideForm.isGroupRide
      })
      setFareEstimate(response.data.data)
    } catch (error) {
      console.error('Failed to estimate fare:', error)
      alert(error.response?.data?.message || 'Failed to estimate fare')
    }
  }

  const handleBookRide = async (e) => {
    e.preventDefault()
    
    // Validate locations are set
    if (rideForm.pickupLat === 0 || rideForm.pickupLng === 0) {
      alert('⚠️ Please set your pickup location first!\n\n' +
            'Use "Current Location" button or search for a location.')
      return
    }
    
    if (rideForm.dropoffLat === 0 || rideForm.dropoffLng === 0) {
      alert('⚠️ Please set your dropoff location!\n\n' +
            'Search for a destination or enter coordinates.')
      return
    }
    
    setBookingRide(true)
    
    try {
      // Request ride — system will auto-notify nearby available drivers
      const response = await api.requestRide({
        ...rideForm,
        isGroupRide: rideForm.rideType === 'bike' ? false : !!rideForm.isGroupRide
      })
      const data = response?.data?.data || {}
      const rideFromResp = data.ride
      // Start polling for assignment if a ride was created
      if (rideFromResp) {
        setSearchingDriver(true)
      }
      
      // Keep pickup location but clear addresses and reset dropoff
      const currentPickupLat = rideForm.pickupLat
      const currentPickupLng = rideForm.pickupLng
      setRideForm({
        ...rideForm,
        pickupAddress: '',
        dropoffLat: 0,
        dropoffLng: 0,
        dropoffAddress: ''
      })
      setFareEstimate(null)
      fetchRideHistory()
      fetchActiveRide()
      // Polling is handled by the activeRide effect
    } catch (error) {
      console.error('Failed to book ride:', error)
      const errorMsg = error.response?.data?.message || 'Failed to book ride'
      alert('❌ ' + errorMsg + '\n\n' + 
            `📍 Your pickup location: ${rideForm.pickupLat.toFixed(4)}, ${rideForm.pickupLng.toFixed(4)}\n` +
            `📍 Dropoff location: ${rideForm.dropoffLat.toFixed(4)}, ${rideForm.dropoffLng.toFixed(4)}\n\n` +
            'Possible reasons:\n' +
            '• No drivers are online in the system\n' +
            '• Drivers don\'t have their location enabled\n' +
            '• No drivers within 5km of your pickup location\n\n' +
            'Click "Check Drivers" button to see available drivers.')
    } finally {
      setBookingRide(false)
    }
  }


  const handleCancelRide = async (rideId) => {
    try {
      await api.cancelRide(rideId, { reason: 'User cancelled from app' })
      alert('Ride cancelled')
      fetchActiveRide()
      fetchRideHistory()
    } catch (error) {
      alert(error.response?.data?.message || error.message || 'Failed to cancel ride')
    }
  }

  const handlePayNow = (rideId, fareAmount) => {
    // Navigate to payment confirmation page
    navigate(`/payment/confirm?rideId=${rideId}&amount=${fareAmount}`)
  }

  const getStatusColor = (status) => {
    const colors = {
      requested: 'bg-yellow-100 text-yellow-800',
      'driver-selected': 'bg-indigo-100 text-indigo-800',
      accepted: 'bg-blue-100 text-blue-800',
      'in-progress': 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const handleGetCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords
          console.log('Current Location (manual):', { latitude, longitude, accuracy })
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

  const handleCheckDrivers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/drivers/debug/available')
      const data = await response.json()
      setDebugInfo(data.data)
      setShowDebugInfo(true)
    } catch (error) {
      console.error('Failed to fetch debug info:', error)
      alert('Failed to fetch driver information')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rider Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back, {user?.name || 'Rider'}!</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCheckDrivers}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <CarIcon className="h-5 w-5" />
            Check Drivers
          </button>
          <button
            onClick={handleGetCurrentLocation}
            className="btn-secondary flex items-center gap-2"
          >
            <Locate className="h-5 w-5" />
            Current Location
          </button>
        </div>
      </div>

      {/* Debug Modal */}
      {showDebugInfo && debugInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">🚗 Available Drivers Debug</h2>
              <button
                onClick={() => setShowDebugInfo(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-sm text-blue-600">Total Drivers</div>
                  <div className="text-3xl font-bold text-blue-900">{debugInfo.totalDrivers}</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-sm text-green-600">Available Drivers</div>
                  <div className="text-3xl font-bold text-green-900">{debugInfo.availableDrivers}</div>
                </div>
              </div>

              {/* Your Location */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-semibold text-purple-900 mb-2">📍 Your Pickup Location:</h3>
                <p className="text-purple-800">
                  Lat: {rideForm.pickupLat.toFixed(6)}, Lng: {rideForm.pickupLng.toFixed(6)}
                </p>
                <p className="text-sm text-purple-600 mt-1">
                  Looking for drivers within 5km (5000 meters) of this location
                </p>
              </div>

              {/* Driver List */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">All Drivers in System:</h3>
                <div className="space-y-3">
                  {debugInfo.drivers.map((driver) => (
                    <div 
                      key={driver._id || driver.email} 
                      className={`border rounded-lg p-4 ${
                        driver.canAcceptRides 
                          ? 'bg-green-50 border-green-300' 
                          : 'bg-gray-50 border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-lg">{driver.name}</h4>
                          <p className="text-sm text-gray-600">{driver.phone || driver.email}</p>
                          <p className="text-xs text-gray-500">{driver.vehicleType} - {driver.vehicleNumber}</p>
                        </div>
                        <div className="text-right">
                          {driver.canAcceptRides ? (
                            <span className="px-3 py-1 bg-green-600 text-white rounded-full text-xs font-semibold">
                              ✓ Can Accept Rides
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-gray-400 text-white rounded-full text-xs font-semibold">
                              ✗ Not Available
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-sm mt-3">
                        <div>
                          <span className="text-gray-600">Online:</span>
                          <span className={`ml-2 font-semibold ${driver.isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                            {driver.isAvailable ? '✓ Yes' : '✗ No'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">KYC:</span>
                          <span className={`ml-2 font-semibold ${
                            driver.kycStatus === 'approved' ? 'text-green-600' : 
                            driver.kycStatus === 'pending' ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {driver.kycStatus}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Active Ride:</span>
                          <span className={`ml-2 font-semibold ${
                            driver.currentRide === 'No active ride' ? 'text-green-600' : 'text-orange-600'
                          }`}>
                            {driver.currentRide === 'No active ride' ? '✓ Free' : '✗ Busy'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-sm">
                          <span className="text-gray-600">Location:</span>
                          {driver.location.coordinates && driver.location.coordinates.length === 2 ? (
                            <div className="mt-1">
                              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                Lat: {driver.location.coordinates[1].toFixed(6)}, 
                                Lng: {driver.location.coordinates[0].toFixed(6)}
                              </span>
                              <p className="text-xs text-gray-500 mt-1">{driver.location.address}</p>
                              {/* Calculate distance */}
                              {(() => {
                                const R = 6371; // Earth's radius in km
                                const dLat = (driver.location.coordinates[1] - rideForm.pickupLat) * Math.PI / 180;
                                const dLon = (driver.location.coordinates[0] - rideForm.pickupLng) * Math.PI / 180;
                                const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                                         Math.cos(rideForm.pickupLat * Math.PI / 180) * Math.cos(driver.location.coordinates[1] * Math.PI / 180) *
                                         Math.sin(dLon/2) * Math.sin(dLon/2);
                                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                                const distance = R * c;
                                const withinRange = distance <= 5;
                                return (
                                  <p className={`text-xs mt-1 font-semibold ${withinRange ? 'text-green-600' : 'text-red-600'}`}>
                                    📏 Distance from your pickup: {distance.toFixed(2)} km 
                                    {withinRange ? ' ✓ Within 5km range' : ' ✗ Outside 5km range'}
                                  </p>
                                );
                              })()}
                            </div>
                          ) : (
                            <span className="ml-2 text-red-600 font-semibold">
                              ⚠️ No location set - Driver needs to go online with location enabled!
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Reset Driver Button if stuck */}
                      {driver.currentRide !== 'No active ride' && driver.currentRideStatus && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                            <p className="text-xs text-yellow-800 mb-2">
                              ⚠️ Driver has stuck ride (Status: {driver.currentRideStatus})
                            </p>
                            <button
                              onClick={async () => {
                                if (confirm(`Reset driver ${driver.name}? This will clear their current ride and make them available.`)) {
                                  try {
                                    const response = await fetch(`http://localhost:5000/api/drivers/debug/reset/${driver._id}`, {
                                      method: 'POST'
                                    })
                                    const data = await response.json()
                                    if (data.success) {
                                      alert('✅ Driver reset successfully! Click "Check Drivers" again to refresh.')
                                      handleCheckDrivers() // Refresh the list
                                    } else {
                                      alert('Failed to reset driver: ' + data.message)
                                    }
                                  } catch (error) {
                                    alert('Error resetting driver: ' + error.message)
                                  }
                                }
                              }}
                              className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded transition-colors"
                            >
                              🔄 Reset Driver Status
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setShowDebugInfo(false)}
                className="btn-primary w-full"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location Map Modal */}
      {showLocationMap && currentLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Your Current Location</h2>
              <button
                onClick={() => setShowLocationMap(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <strong>💡 Tip:</strong> Adjust the coordinates below to refine your exact location
              </div>

              {/* Adjustable Coordinates */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-5 w-5 text-primary-600" />
                  <span className="font-semibold">Refine Location:</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={currentLocation.lat}
                      onChange={(e) => setCurrentLocation({ ...currentLocation, lat: parseFloat(e.target.value) })}
                      className="input-field text-sm"
                    />
                    <div className="flex gap-1 mt-1">
                      <button
                        onClick={() => setCurrentLocation({ ...currentLocation, lat: currentLocation.lat + 0.001 })}
                        className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                      >
                        ↑ +0.001
                      </button>
                      <button
                        onClick={() => setCurrentLocation({ ...currentLocation, lat: currentLocation.lat - 0.001 })}
                        className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                      >
                        ↓ -0.001
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={currentLocation.lng}
                      onChange={(e) => setCurrentLocation({ ...currentLocation, lng: parseFloat(e.target.value) })}
                      className="input-field text-sm"
                    />
                    <div className="flex gap-1 mt-1">
                      <button
                        onClick={() => setCurrentLocation({ ...currentLocation, lng: currentLocation.lng - 0.001 })}
                        className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                      >
                        ← -0.001
                      </button>
                      <button
                        onClick={() => setCurrentLocation({ ...currentLocation, lng: currentLocation.lng + 0.001 })}
                        className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                      >
                        → +0.001
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  ~0.001 = approximately 100 meters
                </p>
              </div>
              
              {/* Embedded Map */}
              <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height: '400px' }}>
                <iframe
                  key={`${currentLocation.lat}-${currentLocation.lng}`}
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
                  onClick={() => {
                    setRideForm({
                      ...rideForm,
                      pickupLat: currentLocation.lat,
                      pickupLng: currentLocation.lng,
                      pickupAddress: `Lat: ${currentLocation.lat.toFixed(4)}, Lng: ${currentLocation.lng.toFixed(4)}`
                    })
                    setShowLocationMap(false)
                    alert('Refined location set as pickup point!')
                  }}
                  className="btn-primary flex-1"
                >
                  Use This Location as Pickup
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

      {/* Manual driver selection has been removed. The system auto-assigns by broadcasting to nearby drivers. */}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Book Ride Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Ride */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Active Ride</h2>
              {activeRide && ['requested', 'accepted', 'driver-arrived', 'in-progress'].includes(activeRide.status) && (
                <button
                  onClick={() => {
                    fetchActiveRide()
                    fetchRideHistory()
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                >
                  🔄 Refresh
                </button>
              )}
            </div>
            {!activeRide ? (
              <p className="text-gray-600">No active ride right now.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(activeRide.status)}`}>
                    {activeRide.status}
                  </span>
                  <span className="text-sm text-gray-600">
                    OTP: <span className="font-mono font-semibold">{activeRide.otp || '—'}</span>
                  </span>
                </div>
                {['requested', 'driver-selected', 'accepted', 'driver-arrived', 'in-progress'].includes(activeRide.status) && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-800">
                    {activeRide.status === 'driver-selected' ? 'Driver selected. Awaiting driver acceptance. Auto-refreshing every 10s.' : 'ℹ️ Auto-refreshing every 10 seconds. Status will update as the driver progresses.'}
                  </div>
                )}
                <div className="text-sm space-y-1">
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 text-green-600 mr-2 mt-0.5" />
                    <span>{activeRide.pickupLocation?.address}</span>
                  </div>
                  <div className="flex items-start">
                    <Navigation className="h-4 w-4 text-red-600 mr-2 mt-0.5" />
                    <span>{activeRide.dropoffLocation?.address}</span>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  {(activeRide.status === 'requested' || activeRide.status === 'accepted') && (
                    <button className="btn-secondary" onClick={() => handleCancelRide(activeRide._id)}>
                      Cancel Ride
                    </button>
                  )}
                  {activeRide.status === 'completed' && activeRide.paymentStatus !== 'completed' && (
                    <button className="btn-primary" onClick={() => handlePayNow(activeRide._id, activeRide.fare?.finalFare || activeRide.fare?.estimatedFare)}>
                      Pay Now
                    </button>
                  )}
                  {activeRide.status === 'completed' && activeRide.paymentStatus === 'completed' && (
                    <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      ✅ Payment Completed
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Book a Ride</h2>
            
            <form onSubmit={handleBookRide} className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Location
                  {rideForm.pickupLat !== 0 && rideForm.pickupLng !== 0 && (
                    <span className="ml-2 text-xs text-green-600 font-normal">
                      ✓ Set to your location
                    </span>
                  )}
                </label>
                {locationInitialized && rideForm.pickupLat !== 0 && (
                  <div className="mb-2 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-2 py-1">
                    📍 Auto-detected: {rideForm.pickupLat.toFixed(4)}, {rideForm.pickupLng.toFixed(4)}
                  </div>
                )}
                <div className="relative">
                  <input
                    type="text"
                    value={rideForm.pickupAddress}
                    onChange={(e) => handlePickupChange(e.target.value)}
                    onFocus={() => {
                      if (pickupSuggestions.length > 0) setShowPickupDropdown(true)
                      else if (rideForm.pickupAddress.length >= 3) searchLocation(rideForm.pickupAddress, true)
                    }}
                    onBlur={() => setTimeout(() => setShowPickupDropdown(false), 300)}
                    className="input-field"
                    placeholder="Search pickup location or use current location"
                    autoComplete="off"
                  />
                  {showPickupDropdown && pickupSuggestions.length > 0 && (
                    <div 
                      className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {pickupSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            selectPickupLocation(suggestion)
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <div className="flex items-start">
                            <MapPin className="h-4 w-4 text-primary-600 mr-2 mt-1 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{suggestion.display_name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <input
                    type="number"
                    step="0.0001"
                    value={rideForm.pickupLat || ''}
                    onChange={(e) => setRideForm({ ...rideForm, pickupLat: parseFloat(e.target.value) || 0 })}
                    className="input-field text-sm"
                    placeholder="Latitude"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    value={rideForm.pickupLng || ''}
                    onChange={(e) => setRideForm({ ...rideForm, pickupLng: parseFloat(e.target.value) || 0 })}
                    className="input-field text-sm"
                    placeholder="Longitude"
                  />
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dropoff Location
                  {rideForm.dropoffLat !== 0 && rideForm.dropoffLng !== 0 && (
                    <span className="ml-2 text-xs text-green-600 font-normal">
                      ✓ Location set
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={rideForm.dropoffAddress}
                    onChange={(e) => handleDropoffChange(e.target.value)}
                    onFocus={() => {
                      if (dropoffSuggestions.length > 0) setShowDropoffDropdown(true)
                      else if (rideForm.dropoffAddress.length >= 3) searchLocation(rideForm.dropoffAddress, false)
                    }}
                    onBlur={() => setTimeout(() => setShowDropoffDropdown(false), 300)}
                    className="input-field"
                    placeholder="Search dropoff location (required)"
                    autoComplete="off"
                    required
                  />
                  {showDropoffDropdown && dropoffSuggestions.length > 0 && (
                    <div 
                      className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {dropoffSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            selectDropoffLocation(suggestion)
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <div className="flex items-start">
                            <Navigation className="h-4 w-4 text-red-600 mr-2 mt-1 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{suggestion.display_name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <input
                    type="number"
                    step="0.0001"
                    value={rideForm.dropoffLat || ''}
                    onChange={(e) => setRideForm({ ...rideForm, dropoffLat: parseFloat(e.target.value) || 0 })}
                    className="input-field text-sm"
                    placeholder="Latitude"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    value={rideForm.dropoffLng || ''}
                    onChange={(e) => setRideForm({ ...rideForm, dropoffLng: parseFloat(e.target.value) || 0 })}
                    className="input-field text-sm"
                    placeholder="Longitude"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ride Type {estimatingTypes && (
                      <span className="ml-2 text-xs text-blue-600">(updating…)</span>
                    )}
                  </label>
                  <select
                    value={rideForm.rideType}
                    onChange={(e) => setRideForm({ ...rideForm, rideType: e.target.value })}
                    className="input-field"
                  >
                    <option value="bike">{`Bike (${typeEstimates.bike ? `₹${typeEstimates.bike} est` : '₹35 base'})`}</option>
                    <option value="mini">{`Mini (${typeEstimates.mini ? `₹${typeEstimates.mini} est` : '₹55 base'})`}</option>
                    <option value="sedan">{`Sedan (${typeEstimates.sedan ? `₹${typeEstimates.sedan} est` : '₹90 base'})`}</option>
                    <option value="suv">{`SUV (${typeEstimates.suv ? `₹${typeEstimates.suv} est` : '₹130 base'})`}</option>
                  </select>
                </div>
                {/* Group Ride Toggle */}
                {rideForm.rideType !== 'bike' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Group Ride Option</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setRideForm(prev => ({ ...prev, isGroupRide: !prev.isGroupRide }))}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${rideForm.isGroupRide ? 'bg-green-600 text-white border-green-600' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'}`}
                      >
                        {rideForm.isGroupRide ? '✓ Group Ride Enabled' : 'Enable Group Ride'}
                      </button>
                      {rideForm.isGroupRide && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-600">Passengers (incl. you)</label>
                          <input
                            type="number"
                            min={1}
                            max={rideForm.rideType === 'mini' ? 3 : 4}
                            value={rideForm.groupSize}
                            onChange={(e) => {
                              const raw = parseInt(e.target.value || '1', 10)
                              const max = rideForm.rideType === 'mini' ? 3 : 4
                              const clamped = Math.max(1, Math.min(raw, max))
                              setRideForm(prev => ({ ...prev, groupSize: clamped }))
                            }}
                            className="w-20 input-field text-sm"
                          />
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      {rideForm.rideType === 'mini' ? 'Max 3 passengers (including you).' : 'Max 4 passengers (including you).'} Group rides apply a flat 20% fare discount.
                    </p>
                  </div>
                )}
              </div>

              {/* Location Summary */}
              {(rideForm.pickupLat !== 0 || rideForm.dropoffLat !== 0) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                  <h4 className="font-semibold text-blue-900 mb-2">📍 Your Booking Location:</h4>
                  <div className="space-y-1 text-blue-800">
                    <div>
                      <strong>Pickup:</strong> {rideForm.pickupLat !== 0 ? `${rideForm.pickupLat.toFixed(4)}, ${rideForm.pickupLng.toFixed(4)}` : '❌ Not set'}
                    </div>
                    <div>
                      <strong>Dropoff:</strong> {rideForm.dropoffLat !== 0 ? `${rideForm.dropoffLat.toFixed(4)}, ${rideForm.dropoffLng.toFixed(4)}` : '❌ Not set'}
                    </div>
                    <div className="text-xs text-blue-600 mt-2">
                      ℹ️ System will search for drivers within 5km of pickup location
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleEstimateFare}
                  className="btn-secondary flex-1"
                >
                  <DollarSign className="inline h-4 w-4 mr-2" />
                  Estimate Fare
                </button>
                <button
                  type="submit"
                  disabled={bookingRide}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {bookingRide ? 'Booking...' : 'Book Ride'}
                </button>
              </div>
            </form>

            {fareEstimate && (
              <div className="mt-6 p-4 bg-primary-50 rounded-lg border border-primary-200">
                <h3 className="font-semibold text-primary-900 mb-2">Fare Estimate</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Distance:</span>
                    <span className="ml-2 font-semibold">{fareEstimate.breakdown?.distance}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Time:</span>
                    <span className="ml-2 font-semibold">{fareEstimate.breakdown?.estimatedTime}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Estimated Fare:</span>
                    <span className="ml-2 font-bold text-primary-600 text-xl">
                      ₹{fareEstimate.estimatedFare}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Ride History */}
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Ride History</h2>
            
            {loading ? (
              <p className="text-gray-600 text-center py-8">Loading...</p>
            ) : rideHistory.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No rides yet. Book your first ride!</p>
            ) : (
              <div className="space-y-4">
                {rideHistory.map((ride) => (
                  <div key={ride._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(ride.status)}`}>
                        {ride.status}
                      </span>
                      <span className="text-sm text-gray-600">
                        {new Date(ride.createdAt).toLocaleDateString()} • {new Date(ride.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 text-green-600 mr-2 mt-0.5" />
                        <span className="text-gray-700">{ride.pickupLocation?.address || ride.pickupAddress || 'Pickup location'}</span>
                      </div>
                      <div className="flex items-start">
                        <Navigation className="h-4 w-4 text-red-600 mr-2 mt-0.5" />
                        <span className="text-gray-700">{ride.dropoffLocation?.address || ride.dropoffAddress || 'Dropoff location'}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-gray-600">{ride.rideType}</span>
                        <span className="font-bold text-primary-600">₹{ride.fare?.finalFare || ride.fare?.estimatedFare || ride.fare || '—'}</span>
                      </div>
                      {ride.status === 'cancelled' && ride.cancelledBy === 'system' && ride.cancellationReason && (
                        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2 mt-2">
                          Cancelled by system: {ride.cancellationReason}
                        </div>
                      )}
                      {ride.endTime && (
                        <div className="text-xs text-gray-500 mt-1">
                          Ended: {new Date(ride.endTime).toLocaleDateString()} • {new Date(ride.endTime).toLocaleTimeString()}
                        </div>
                      )}
                      {ride.status === 'driver-selected' && ride.driverSelectedAt && (
                        <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
                          Awaiting driver acceptance since {new Date(ride.driverSelectedAt).toLocaleTimeString()}
                        </div>
                      )}
                      {ride.status === 'completed' && ride.paymentStatus !== 'completed' && (
                        <div className="pt-3">
                          <button className="btn-primary" onClick={() => handlePayNow(ride._id, ride.fare?.finalFare || ride.fare?.estimatedFare || ride.fare)}>
                            Pay Now
                          </button>
                        </div>
                      )}
                      {ride.status === 'completed' && ride.paymentStatus === 'completed' && (
                        <div className="pt-3">
                          <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Payment Completed
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Live Location Map */}
          <div className="card">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-gray-900">Your Location</h3>
              <button
                onClick={handleGetCurrentLocation}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Refresh
              </button>
            </div>
            {locationLoading ? (
              <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Getting your location...</p>
                </div>
              </div>
            ) : currentLocation && currentLocation.lat !== 0 && currentLocation.lng !== 0 ? (
              <div className="space-y-2">
                <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height: '200px' }}>
                  <iframe
                    key={`${currentLocation.lat}-${currentLocation.lng}`}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${currentLocation.lng - 0.01},${currentLocation.lat - 0.01},${currentLocation.lng + 0.01},${currentLocation.lat + 0.01}&layer=mapnik&marker=${currentLocation.lat},${currentLocation.lng}`}
                    allowFullScreen
                  ></iframe>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded p-2">
                  <div className="text-xs font-semibold text-blue-900 mb-1">📍 Your Current Location:</div>
                  <div className="text-xs text-blue-800 font-mono">
                    Lat: {currentLocation.lat.toFixed(6)}<br/>
                    Lng: {currentLocation.lng.toFixed(6)}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setRideForm({
                      ...rideForm,
                      pickupLat: currentLocation.lat,
                      pickupLng: currentLocation.lng,
                      pickupAddress: `Current Location (${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)})`
                    })
                    alert('✅ Current location set as pickup point!\n' +
                          `📍 Lat: ${currentLocation.lat.toFixed(4)}, Lng: ${currentLocation.lng.toFixed(4)}`)
                  }}
                  className="btn-primary w-full text-sm py-2"
                >
                  Use as Pickup
                </button>
              </div>
            ) : (
              <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center">
                <p className="text-sm text-gray-600">Location unavailable</p>
              </div>
            )}
          </div>

          {/* Profile Card */}
          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Profile</h3>
            {/* Debug user data */}
            {console.log('Profile Section - user:', user)}
            {console.log('Profile Section - user.name:', user?.name)}
            {console.log('Profile Section - user.phone:', user?.phone)}
            <div className="space-y-3">
              <div className="flex items-center">
                <User className="h-5 w-5 text-gray-400 mr-3" />
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Name</div>
                  <div className="font-semibold text-gray-900">{user?.name || 'Not set'}</div>
                </div>
              </div>
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-gray-400 mr-3" />
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Phone</div>
                  <div className="font-semibold text-gray-900">{user?.phone || user?.email || 'Not set'}</div>
                </div>
              </div>
              <div className="flex items-center">
                <Wallet className="h-5 w-5 text-green-400 mr-3" />
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Wallet Balance</div>
                  <div className="font-semibold text-green-600">₹{(user?.walletBalance || 0).toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Your Stats</h3>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600">Total Rides</div>
                <div className="text-2xl font-bold text-primary-600">{user?.ridesCompleted || 0}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Pending Rides</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {rideHistory.filter(r => r.status === 'requested' || r.status === 'accepted').length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RiderDashboard
